
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useDragControls } from 'motion/react';
import { ChatSession } from '../services/geminiService';
import { ChatMessage, Translations } from '../types';
import { X, ChefHat, Mic, Send, Maximize2 } from 'lucide-react';

interface Props {
  chatSession: ChatSession;
  t: Translations;
  onClose: () => void;
}

const FloatingAssistant: React.FC<Props> = ({ chatSession, t, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [size, setSize] = useState({ width: 350, height: 500 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'model',
        text: t.languageLabel === 'ITALIANO' || t.languageLabel === 'LINGUA' 
          ? 'Salve! Sono l\'assistente di Chef Omoikane. Come posso aiutarti oggi?' 
          : 'Greetings! I am the Chef Omoikane assistant. How can I help you today?'
      }]);
    }
  }, [t.languageLabel, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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
    if (!SpeechRecognition) return;

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

  const handleResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(300, Math.min(600, startWidth + (moveEvent.clientX - startX)));
      const newHeight = Math.max(400, Math.min(800, startHeight + (moveEvent.clientY - startY)));
      setSize({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <motion.div 
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragListener={false}
      dragConstraints={{ 
        left: 0, 
        right: window.innerWidth - size.width, 
        top: 0, 
        bottom: window.innerHeight - size.height 
      }}
      initial={{ 
        x: window.innerWidth - size.width - 24, 
        y: window.innerHeight - size.height - 24, 
        opacity: 0, 
        scale: 0.9 
      }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed z-[100] flex flex-col border shadow-2xl overflow-hidden" 
      style={{ 
        backgroundColor: 'var(--bg-color)', 
        borderColor: 'var(--border-color)',
        width: size.width,
        height: size.height
      }}
    >
      {/* Header - Drag Handle */}
      <div 
        onPointerDown={(e) => dragControls.start(e)}
        className="p-4 border-b flex justify-between items-center cursor-move select-none" 
        style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          <ChefHat className="w-5 h-5" style={{ color: 'var(--text-color)' }} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-color)' }}>
            OMOI_BOT // INTERCOM
          </span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-color)' }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-3 text-[12px] border ${
              msg.role === 'user' ? '' : 'bg-white/5'
            }`} style={msg.role === 'user' 
              ? { backgroundColor: 'var(--text-color)', color: 'var(--bg-color)', borderColor: 'var(--text-color)' }
              : { borderColor: 'var(--border-color)', color: 'var(--text-color)' }
            }>
              <div className="text-[7px] uppercase font-bold mb-1 opacity-50 tracking-widest">
                {msg.role === 'user' ? t.unitPilot : t.chefOmoikaneLabel}
              </div>
              <p className="font-mono leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="px-3 py-1 bg-white/5 border border-white/10 text-[9px] animate-pulse tracking-widest uppercase">
              {t.processing}
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t flex gap-2" style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--border-color)' }}>
        <div className="flex-1 relative flex items-center border border-white/10 px-3 bg-black/10">
          <input 
            type="text"
            className="w-full bg-transparent outline-none py-3 text-xs font-mono placeholder:opacity-20"
            style={{ color: 'var(--text-color)' }}
            placeholder={t.chatPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button
            type="button"
            onClick={startVoiceInput}
            className={`p-1.5 transition-all ${isListening ? 'text-red-500 animate-pulse' : 'opacity-30 hover:opacity-100'}`}
            style={{ color: isListening ? '#ff0000' : 'var(--text-color)' }}
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
        <button 
          type="submit"
          disabled={isTyping || !input.trim()}
          className="w-12 flex items-center justify-center transition-all disabled:opacity-20 hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'var(--text-color)', color: 'var(--bg-color)' }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Resize Handle */}
      <div 
        onMouseDown={handleResize}
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center hover:bg-white/10 group"
      >
        <Maximize2 className="w-3 h-3 opacity-20 rotate-90 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-color)' }} />
      </div>
    </motion.div>
  );
};

export default FloatingAssistant;
