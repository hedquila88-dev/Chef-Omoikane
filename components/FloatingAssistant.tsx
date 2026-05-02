
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useDragControls } from 'motion/react';
import { ChatSession } from '../services/geminiService';
import { ChatMessage, Translations } from '../types';
import { X, ChefHat, Mic, Send, Maximize2, Minus } from 'lucide-react';

interface Props {
  chatSession: ChatSession;
  t: Translations;
  language: string;
  onClose: () => void;
  onAction?: (action: string, args: any) => void;
}

const FloatingAssistant: React.FC<Props> = ({ chatSession, t, language, onClose, onAction }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const isMobile = window.innerWidth < 768;
    const initialWidth = isMobile ? window.innerWidth - 32 : 350;
    const initialHeight = isMobile ? window.innerHeight * 0.7 : 500;
    return { 
      x: window.innerWidth - (isMobile ? initialWidth + 16 : initialWidth + 24), 
      y: window.innerHeight - (isMobile ? initialHeight + 80 : initialHeight + 24) 
    };
  });

  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') return { width: 350, height: 500 };
    const isMobile = window.innerWidth < 768;
    return {
      width: isMobile ? window.innerWidth - 32 : 350,
      height: isMobile ? window.innerHeight * 0.7 : 500
    };
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const dragStartOffset = useRef({ x: 0, y: 0 });

  // Handle window resize to keep bubble in view but without aggressive snapping
  useEffect(() => {
    const handleWindowResize = () => {
      setPosition(prev => {
        const currentWidth = isMinimized ? 64 : size.width;
        const currentHeight = isMinimized ? 64 : size.height;
        const maxX = window.innerWidth - currentWidth - 10;
        const maxY = window.innerHeight - currentHeight - 10;
        
        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY)
        };
      });
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isMinimized, size.width, size.height]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'model',
        text: t.assistantGreeting
      }]);
    }
  }, [t.assistantGreeting, messages.length]);

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
      console.log("[ASSISTANT] Sending message:", userMessage);
      const result = await chatSession.sendMessage({ message: userMessage });
      
      let responseText = '';
      try {
        responseText = result.text || '';
      } catch (e) {
        console.warn("[ASSISTANT] No text response from model, checking function calls...");
        responseText = '';
      }

      // Handle Text-based commands
      if (responseText.includes('[ACTION:PREPARE_SYNTHESIS]')) {
        onAction?.('prepare_synthesis', {});
        responseText = responseText.replace('[ACTION:PREPARE_SYNTHESIS]', '').trim();
      }

      let hasScannerAction = false;
      if (responseText.includes('[ACTION:OPEN_SCANNER]')) {
        onAction?.('open_scanner', {});
        responseText = responseText.replace('[ACTION:OPEN_SCANNER]', '').trim();
        hasScannerAction = true;
      }

      let hasLocatorAction = false;
      if (responseText.includes('[ACTION:OPEN_LOCATOR]')) {
        onAction?.('open_locator', {});
        responseText = responseText.replace('[ACTION:OPEN_LOCATOR]', '').trim();
        hasLocatorAction = true;
      }

      const scanMatch = responseText.match(/\[SCANNER_DATA:(.*?)\]/);
      if (scanMatch) {
        try {
          const data = JSON.parse(scanMatch[1]);
          onAction?.('open_scanner', data);
          responseText = responseText.replace(scanMatch[0], '').trim();
          hasScannerAction = true;
        } catch (e) {
          console.error("Failed to parse scanner data", e);
        }
      }

      const synthMatch = responseText.match(/\[SYNTHESIS_DATA:(.*?)\]/);
        if (synthMatch) {
        try {
          const data = JSON.parse(synthMatch[1]);
          onAction?.('prepare_synthesis', data);
          responseText = responseText.replace(synthMatch[0], '').trim();
        } catch (e) {
          console.error("Failed to parse synthesis data", e);
        }
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: responseText || t.actionAcknowledge,
        hasScannerAction,
        hasLocatorAction
      }]);
    } catch (err) {
      console.error("[CHAT_ERROR]", err);
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
      layout
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragListener={false}
      dragElastic={0}
      dragConstraints={{ 
        left: 0, 
        right: window.innerWidth - (isMinimized ? 64 : size.width), 
        top: 0, 
        bottom: window.innerHeight - (isMinimized ? 64 : size.height) 
      }}
      initial={false}
      animate={{ 
        width: isMinimized ? 64 : size.width, 
        height: isMinimized ? 64 : size.height, 
        borderRadius: isMinimized ? "32px" : "0px",
        x: position.x,
        y: position.y
      }}
      onDragEnd={(_, info) => {
        setPosition({ 
          x: info.point.x - dragStartOffset.current.x, 
          y: info.point.y - dragStartOffset.current.y 
        });
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 300, layout: { duration: 0.3 } }}
      className={`z-[100] flex flex-col border shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ${isMinimized ? 'cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95' : ''}`}
      style={{ 
        backgroundColor: 'var(--bg-color)', 
        borderColor: 'var(--border-color)',
        left: 0,
        top: 0,
        backdropFilter: 'blur(20px)',
        position: 'fixed'
      }}
      onPointerDown={(e) => {
        if (isMinimized) {
          dragStartOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
          };
          dragControls.start(e);
        }
      }}
    >
      {isMinimized ? (
        <button 
          onClick={() => setIsMinimized(false)}
          className="w-full h-full flex items-center justify-center transition-colors cursor-pointer relative hover:bg-black/5 dark:hover:bg-white/5"
          style={{ backgroundColor: 'var(--bg-color)' }}
        >
          <ChefHat className="w-6 h-6" style={{ color: 'var(--text-color)' }} />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-black flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </button>
      ) : (
        <>
          {/* Header - Drag Handle */}
          <div 
            onPointerDown={(e) => {
              dragStartOffset.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
              };
              dragControls.start(e);
            }}
            className="p-4 border-b flex justify-between items-center cursor-move select-none" 
            style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-3">
              <ChefHat className="w-5 h-5" style={{ color: 'var(--text-color)' }} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-color)' }}>
                OMOI_BOT // CHAT
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMinimized(true)}
                className="p-1.5 hover:bg-white/10 transition-colors rounded-md"
                style={{ color: 'var(--text-color)' }}
                title="MINIMIZE"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 hover:text-red-500 transition-colors rounded-md"
                style={{ color: 'var(--text-color)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-3 text-[12px] border ${
                  msg.role === 'user' ? '' : 'msg-model'
                }`} style={msg.role === 'user' 
                  ? { backgroundColor: 'var(--text-color)', color: 'var(--bg-color)', borderColor: 'var(--text-color)' }
                  : { borderColor: 'var(--border-color)', color: 'var(--text-color)', backgroundColor: 'var(--terminal-bg)' }
                }>
                  <div className="text-[7px] uppercase font-bold mb-1 opacity-50 tracking-widest">
                    {msg.role === 'user' ? t.userLabel : t.chefOmoikaneLabel}
                  </div>
                  <p className="font-mono leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                  {msg.hasScannerAction && (
                    <button 
                      onClick={() => onAction?.('open_scanner', {})}
                      className="mt-3 w-full py-2 border-2 border-dashed flex items-center justify-center gap-2 hover:bg-white/10 transition-colors uppercase text-[9px] font-black"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                        <circle cx="12" cy="12" r="3.2"/>
                      </svg>
                      {t.liveScan}
                    </button>
                  )}
                  {msg.hasLocatorAction && (
                    <button 
                      onClick={() => onAction?.('open_locator', {})}
                      className="mt-3 w-full py-2 border-2 border-dashed flex items-center justify-center gap-2 hover:bg-white/10 transition-colors uppercase text-[9px] font-black"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      {language === 'Italiano' ? 'TROVA LOCALI' : 'FIND VENUES'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="px-3 py-1 border text-[9px] animate-pulse tracking-widest uppercase" style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                  {t.processing}
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 border-t flex gap-2" style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex-1 relative flex items-center border px-3" style={{ borderColor: 'var(--sub-border)', backgroundColor: 'var(--bg-color)' }}>
              <input 
                type="text"
                className="w-full bg-transparent outline-none py-3 text-xs font-mono placeholder:opacity-50"
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
        </>
      )}
    </motion.div>
  );
};

export default FloatingAssistant;
