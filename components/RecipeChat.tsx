
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatSession } from '../services/geminiService';
import { ChatMessage, Translations } from '../types';

interface Props {
  chatSession: ChatSession;
  t: Translations;
}

const RecipeChat: React.FC<Props> = ({ chatSession, t }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputFocus = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const result = await chatSession.sendMessage(userMessage);
      setMessages(prev => [...prev, { role: 'model', text: result.response.text || '...' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: t.criticalErrorChat }]);
    } finally {
      setIsTyping(false);
    }
  };

  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    };

    recognition.start();
  }, []);

  return (
    <div className="mt-12 border flex flex-col min-h-[350px]" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
      <div className="border-b px-4 py-2 flex justify-between items-center" style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--border-color)' }}>
        <span className="header-font text-[10px] tracking-widest font-bold uppercase" style={{ color: 'var(--text-color)' }}>{t.intercom}</span>
        <div className="flex gap-1">
          <div className="w-1 h-1 animate-pulse" style={{ backgroundColor: 'var(--text-color)' }}></div>
          <div className="w-1 h-1 opacity-40" style={{ backgroundColor: 'var(--text-color)' }}></div>
          <div className="w-1 h-1 opacity-40" style={{ backgroundColor: 'var(--text-color)' }}></div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto overflow-x-auto font-mono text-sm max-h-[500px] scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-[10px] italic opacity-40" style={{ color: 'var(--text-color)' }}>
            // {t.chatPlaceholder}
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[95%] p-4 border ${
              msg.role === 'user' 
                ? 'inverted-msg' 
                : ''
            }`} style={msg.role === 'user' 
                ? { backgroundColor: 'var(--text-color)', color: 'var(--bg-color)', borderColor: 'var(--text-color)' } 
                : { backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }
            }>
              <div className="text-[7px] uppercase font-bold mb-3 tracking-widest border-b pb-1 inline-block" style={{ borderColor: 'currentColor' }}>
                {msg.role === 'user' ? t.unitPilot : t.chefOmoikaneLabel}
              </div>
              <div className="leading-relaxed text-[13px] whitespace-pre-wrap overflow-x-auto custom-scrollbar">
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="text-[9px] animate-pulse tracking-widest uppercase px-2 py-1" style={{ backgroundColor: 'var(--sub-bg)', color: 'var(--text-color)' }}>
               {t.processing}
             </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form 
        ref={formRef}
        onSubmit={handleSend} 
        className="p-4 border-t flex gap-3" 
        style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--border-color)' }}
      >
        <span className="font-bold self-center" style={{ color: 'var(--text-color)' }}>{'>'}</span>
        <div className="flex-1 flex gap-2 relative">
          <input 
            type="text"
            className="flex-1 bg-transparent outline-none text-sm font-mono placeholder:opacity-20 pr-10"
            style={{ color: 'var(--text-color)' }}
            placeholder={t.chatPlaceholder}
            value={input}
            onFocus={handleInputFocus}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button
            type="button"
            onClick={startVoiceInput}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 transition-all ${isListening ? 'recording-pulse' : 'opacity-30 hover:opacity-100'}`}
            style={{ color: 'var(--text-color)' }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </button>
        </div>
        <button 
          type="submit"
          disabled={isTyping || !input.trim()}
          className="px-6 py-2 text-[10px] font-bold uppercase hover:opacity-90 disabled:opacity-10 transition-colors"
          style={{ backgroundColor: 'var(--text-color)', color: 'var(--bg-color)' }}
        >
          {t.send}
        </button>
      </form>
    </div>
  );
};

export default RecipeChat;
