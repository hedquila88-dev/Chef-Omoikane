
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Translations, UserDiagnostics, ChatMessage, DetectedItem, AppTheme, MacroNutrients } from '../types';
import { analyzeHealthOrMenu } from '../services/geminiService';
import { LANGUAGES } from '../App';

interface Props {
  t: Translations;
  diagnostics: UserDiagnostics;
  onUpdate: (updates: Partial<UserDiagnostics>) => void;
  theme: AppTheme;
  forceScanner?: boolean;
  onScannerClose?: () => void;
}

const CameraScanner: React.FC<{ onCapture: (base64: string) => void, onClose: () => void, t: Translations }> = ({ onCapture, onClose, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' },
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError(t.cameraAccessDenied);
      }
    }
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [t]);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(base64);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-2xl h-[70vh] md:h-[60vh] border-2 border-white/20 overflow-hidden bg-black/50">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-6 text-[10px] uppercase tracking-widest text-red-500 font-bold">
            {error}
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-white/40"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-white/40"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-white/40"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-white/40"></div>
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="w-48 h-48 border border-dashed border-white rounded-full animate-pulse"></div>
              </div>
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500/30 animate-[scan_3s_linear_infinite]"></div>
              
              <div className="absolute top-6 left-0 w-full text-center px-4">
                 <div className="inline-block bg-black/60 backdrop-blur-md px-4 py-2 border border-white/10">
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white animate-pulse">
                      {t.scanningTarget}
                    </span>
                 </div>
              </div>

              <div className="absolute bottom-6 left-0 w-full px-6 pointer-events-none">
                 <div className="bg-black/60 backdrop-blur-md p-4 border border-white/20 text-[9px] font-mono leading-relaxed text-white/80 max-w-sm mx-auto">
                    <div className="font-black mb-2 tracking-[0.2em] text-white underline uppercase">{t.examples}</div>
                    <div className="space-y-1">
                      <div>{t.exampleProduct}</div>
                      <div>{t.exampleDish}</div>
                      <div>{t.exampleMenu}</div>
                    </div>
                 </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="flex gap-6">
          <button 
            onClick={onClose}
            className="px-6 py-2 border border-white/20 text-[10px] uppercase font-bold tracking-widest hover:bg-white/10"
            style={{ color: 'var(--text-color)' }}
          >
            {t.cancelBtn}
          </button>
          {!error && (
            <button 
              onClick={capture}
              className="px-8 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)]"
            >
              {t.captureData}
            </button>
          )}
        </div>
        {!error && (
          <div className="text-[9px] uppercase tracking-[0.2em] opacity-50 font-mono animate-pulse">
            {t.pressToScan}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(70vh); }
        }
      `}</style>
    </div>
  );
};

const MenuOverlay: React.FC<{ image: string, detections: DetectedItem[], t: Translations }> = ({ image, detections, t }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'SAFE': return '#22c55e';
      case 'WARNING': return '#f59e0b';
      case 'FORBIDDEN': return '#ef4444';
      default: return '#ffffff';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'SAFE': return t.safe;
      case 'WARNING': return t.warning;
      case 'FORBIDDEN': return t.forbidden;
      default: return '';
    }
  };

  return (
    <div className="relative w-full border mb-6" style={{ borderColor: 'var(--sub-border)', backgroundColor: 'var(--bg-color)' }}>
      <div className="relative inline-block w-full">
        <img src={image} alt="Menu" className="w-full h-auto block" />
        <svg 
          viewBox="0 0 1000 1000" 
          className="absolute inset-0 w-full h-full pointer-events-auto"
          preserveAspectRatio="none"
        >
          {detections.map((item, idx) => {
            const [ymin, xmin, ymax, xmax] = item.box_2d;
            const color = getStatusColor(item.status);
            return (
              <g 
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-help"
              >
                <rect
                  x={xmin}
                  y={ymin}
                  width={xmax - xmin}
                  height={ymax - ymin}
                  fill={color}
                  fillOpacity={hoveredIdx === idx ? 0.3 : 0.15}
                  stroke={color}
                  strokeWidth="6"
                  className="transition-all duration-200"
                />
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Visual Report Grid */}
      <div className="p-4 font-mono" style={{ backgroundColor: 'var(--sub-bg)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detections.map((item, idx) => (
            <div 
              key={idx} 
              className={`p-4 border-l-4 transition-all duration-300 relative ${hoveredIdx === idx ? 'scale-[1.02] z-10' : ''}`}
              style={{ 
                borderColor: getStatusColor(item.status),
                backgroundColor: 'var(--terminal-bg)'
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-black text-xs uppercase tracking-tight">{item.name}</span>
                <span 
                   className="text-[9px] font-black px-2 py-0.5 text-black uppercase tracking-widest"
                   style={{ backgroundColor: getStatusColor(item.status) }}
                >
                  {getStatusLabel(item.status)}
                </span>
              </div>
              <div className="text-[11px] leading-snug opacity-90 font-mono italic">
                {item.reason}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Typing Indicator Component
const TypingIndicator: React.FC = () => {
  return (
    <div className="flex space-x-1 p-2">
      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
    </div>
  );
};

const QuestionTerminal: React.FC<Props> = ({ t, diagnostics, onUpdate, theme, forceScanner, onScannerClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  
  // Split state for different loading types
  const [isImageAnalyzing, setIsImageAnalyzing] = useState(false);
  const [isChatTyping, setIsChatTyping] = useState(false);
  
  const [activeMicField, setActiveMicField] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeMacros, setActiveMacros] = useState<MacroNutrients | undefined>(undefined);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  
  useEffect(() => {
    if (forceScanner) {
      setIsCameraOpen(true);
    }
  }, [forceScanner]);

  const closeCamera = () => {
    setIsCameraOpen(false);
    onScannerClose?.();
  };

  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Threshold for collapsing the header
      const threshold = 15;
      
      // Only collapse if there are results/messages or an image logic
      if (messages.length > 0 || isImageAnalyzing) {
        if (currentScrollY > threshold) {
          setIsHeaderCollapsed(true);
        } else {
          setIsHeaderCollapsed(false);
        }
      } else {
        setIsHeaderCollapsed(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [messages.length, isImageAnalyzing]);
  
  const [lastInteraction, setLastInteraction] = useState<{ query: string, image?: string, profileAtTime: string } | null>(null);

  const [localCtx, setLocalCtx] = useState({
    healthProfile: diagnostics.healthProfile || '',
  });

  const isProcessing = isImageAnalyzing || isChatTyping;

  useEffect(() => {
    setLocalCtx(prev => {
      if (prev.healthProfile === diagnostics.healthProfile) return prev;
      return { healthProfile: diagnostics.healthProfile };
    });
  }, [diagnostics.healthProfile]);

  useEffect(() => {
    // Auto-scroll when typing indicator appears
    if (isChatTyping) {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isChatTyping]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedLang = LANGUAGES.find(l => l.code === diagnostics.language);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const updateField = (value: string) => {
    setLocalCtx({ healthProfile: value });
    onUpdate({ healthProfile: value });
  };

  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang?.speechCode || 'en-US';
    recognition.onstart = () => setActiveMicField(true);
    recognition.onend = () => setActiveMicField(false);
    recognition.onerror = () => setActiveMicField(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const currentValue = localCtx.healthProfile || '';
      const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
      updateField(newValue);
    };
    recognition.start();
  }, [selectedLang, localCtx]);

  const handleCancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsImageAnalyzing(false);
    setIsChatTyping(false);
  };

  const handleSend = async (image?: string, isReSync = false) => {
    const query = isReSync && lastInteraction 
      ? lastInteraction.query 
      : (input.trim() || (image ? t.menuAnalysisRequest : ''));
    
    const effectiveImage = isReSync && lastInteraction ? lastInteraction.image : image;

    if (!query && !effectiveImage) return;

    if (!isReSync) {
      const userMsg: ChatMessage = { 
        role: 'user', 
        text: query, 
        image: effectiveImage,
        isAutoPrompt: !!(effectiveImage && !input.trim())
      };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
    }

    // Determine which loading state to use
    // Use Full Screen Overlay for: New Image Uploads, Camera Captures, or Re-Sync (Heavy Processing)
    // Use Typing Indicator for: Text-only chat (Light Processing)
    if (image || isReSync) {
        setIsImageAnalyzing(true);
    } else {
        setIsChatTyping(true);
    }

    setIsCameraOpen(false);
    
    abortControllerRef.current = new AbortController();

    const effectiveDiagnostics: UserDiagnostics = {
      ...diagnostics,
      healthProfile: localCtx.healthProfile
    };

    try {
      // Find previous macros for consistency
      let existingMacros = activeMacros || [...messages].reverse().find(m => m.macros)?.macros;
      
      // If a NEW image is provided, we reset the context for the new analysis
      if (effectiveImage) {
        existingMacros = undefined;
      }

      const result = await analyzeHealthOrMenu(query, effectiveDiagnostics, effectiveImage, existingMacros);
      
      const modelMsg: ChatMessage = { 
        role: 'model', 
        text: result.text, 
        detections: effectiveImage ? result.detections : undefined, 
        image: effectiveImage,
        status: effectiveImage ? result.status : undefined,
        sources: result.sources,
        macros: result.macros
      };

      // Update persistent macros if new ones are calculated (usually during initial analysis)
      if (result.macros) {
        setActiveMacros(result.macros);
      }

      // Only show the RECOMMENDED/WARNING/FORBIDDEN banner if an image is involved (analysis context)
      if (!effectiveImage) {
        modelMsg.status = undefined;
      }

      if (isReSync) {
        setMessages(prev => {
          const newMessages = [...prev];
          for (let i = newMessages.length - 1; i >= 0; i--) {
            if (newMessages[i].role === 'model') {
              newMessages[i] = modelMsg;
              break;
            }
          }
          return newMessages;
        });
      } else {
        setMessages(prev => [...prev, modelMsg]);
      }

      setLastInteraction({ query, image: effectiveImage, profileAtTime: localCtx.healthProfile });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(t.abortMessage);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: t.criticalErrorChat }]);
      }
    } finally {
      setIsImageAnalyzing(false);
      setIsChatTyping(false);
      abortControllerRef.current = null;
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      handleSend(base64);
    };
    reader.readAsDataURL(file);
  };

  const getStatusBannerColor = (status?: string) => {
    switch(status) {
      case 'SAFE': return '#22c55e';
      case 'WARNING': return '#f59e0b';
      case 'FORBIDDEN': return '#ef4444';
      default: return 'transparent';
    }
  };

  const getStatusBannerText = (status?: string) => {
    switch(status) {
      case 'SAFE': return t.safe;
      case 'WARNING': return t.warning;
      case 'FORBIDDEN': return t.forbidden;
      default: return '';
    }
  };

  const profileChanged = lastInteraction !== null && localCtx.healthProfile !== lastInteraction.profileAtTime;
  const hasVisibleMessages = messages.some(m => !m.isAutoPrompt || m.role === 'model');

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isCameraOpen && <CameraScanner t={t} onClose={closeCamera} onCapture={(b64) => handleSend(b64)} />}
      
      {/* FULL SCREEN OVERLAY - Only for Image Analyzing */}
      {isImageAnalyzing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-2xl animate-in fade-in duration-500" 
             style={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }}>
          
          <button 
            onClick={handleCancelProcessing}
            className="absolute top-10 right-10 flex flex-col items-center gap-2 group"
            style={{ color: 'var(--text-color)' }}
          >
            <div className="w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-90 bg-black/10 backdrop-blur-md" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-2xl font-light group-hover:rotate-90 transition-transform duration-300">✕</span>
            </div>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-70 group-hover:opacity-100 transition-opacity">
              {t.cancelBtn}
            </span>
          </button>

          <div className="flex flex-col items-center space-y-12">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-dashed rounded-full animate-[spin_10s_linear_infinite] opacity-20" style={{ borderColor: 'var(--text-color)' }}></div>
              <div className="absolute inset-3 border-t-2 border-b-2 rounded-full animate-[spin_4s_linear_infinite]" style={{ borderColor: 'var(--border-color)' }}></div>
              <div className="absolute inset-6 border-l-2 border-r-2 rounded-full animate-[spin_2s_linear_infinite] opacity-60" style={{ borderColor: 'var(--text-color)' }}></div>
              <div className="w-8 h-8 rounded-full animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.4)]" style={{ backgroundColor: 'var(--text-color)' }}></div>
              <div className="absolute w-full h-0.5 animate-[loading-scan_2.5s_ease-in-out_infinite] opacity-20" style={{ backgroundColor: 'var(--text-color)' }}></div>
            </div>
            
            <div className="text-center space-y-6 max-w-sm">
              <div className="space-y-2">
                <p className="text-[14px] font-black tracking-[1em] uppercase animate-pulse pr-[-1em]" style={{ color: 'var(--text-color)' }}>
                  {t.loading}
                </p>
                <div className="h-1 w-full relative overflow-hidden rounded-full" style={{ backgroundColor: 'var(--sub-border)' }}>
                  <div className="absolute inset-0 bg-current animate-[loading-progress_3.5s_ease-in-out_infinite]"></div>
                </div>
              </div>
              <p className="text-[10px] opacity-70 uppercase tracking-[0.25em] font-mono leading-relaxed p-2 rounded backdrop-blur-sm" style={{ backgroundColor: 'var(--sub-bg)' }}>
                {t.syncDiagnosticMatrix}<br/>
                {t.analysisClinicalParams}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Input area */}
      <AnimatePresence>
        {!isHeaderCollapsed && (
          <motion.div 
            initial={{ height: 'auto', opacity: 1 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20, marginBottom: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="grid grid-cols-1 overflow-hidden z-20 relative mb-4"
          >
            <div className={`glow-border p-1.5 border transition-all duration-500 ${profileChanged ? 'border-yellow-500 animate-[glow-pulse_2s_infinite]' : ''}`} style={{ borderColor: profileChanged ? undefined : 'var(--border-color)', backgroundColor: 'var(--sub-bg)' }}>
              <div className="flex justify-between items-center mb-0.5">
                <div className="text-[8px] font-black uppercase tracking-[0.1em] flex items-center gap-1.5 opacity-50">
                  <span className={`w-1 h-1 rounded-full ${profileChanged ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 opacity-30'}`}></span>
                  {t.activeClinicalProfile}
                </div>
                {profileChanged && (
                  <button 
                    onClick={() => handleSend(undefined, true)}
                    className="text-[8px] font-black uppercase tracking-tighter px-2 py-1 bg-yellow-500 text-black hover:bg-yellow-400 transition-all flex items-center gap-1 active:scale-95"
                  >
                    {t.reanalyzeBtn}
                  </button>
                )}
              </div>
              <div className="relative">
                <textarea 
                  placeholder={t.healthProfilePlace} 
                  onFocus={handleInputFocus} 
                  className="w-full bg-transparent text-[11px] py-1 pr-8 outline-none font-mono min-h-[20px] h-auto resize-none leading-tight" 
                  style={{ color: 'var(--text-color)' }} 
                  value={localCtx.healthProfile} 
                  onChange={(e) => updateField(e.target.value)} 
                />
                <button
                  onClick={startVoiceInput}
                  className={`absolute right-0 top-0 p-1 rounded-full transition-all ${activeMicField ? 'recording-pulse' : 'opacity-30 hover:opacity-100'}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glow-border flex flex-col min-h-[500px] mb-20 rounded-none z-30" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
        <div 
          className="border-b p-4 flex justify-between items-center sticky z-[60] backdrop-blur-xl transition-all duration-300" 
          style={{ 
            top: 'var(--header-height, 64px)', 
            backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)', 
            borderColor: 'var(--border-color)' 
          }}
        >
          <h2 className="header-font text-xs font-bold tracking-[0.2em] uppercase">{t.healthCenter}</h2>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsCameraOpen(true)} 
              className="px-4 py-2 text-[10px] font-black uppercase flex items-center gap-1 hover:scale-105 active:scale-95 transition-all"
              style={{ backgroundColor: 'var(--text-color)', color: 'var(--bg-color)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span className="hidden sm:inline">{t.liveScan}</span>
              <span className="sm:hidden">SCAN</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="px-4 py-2 border-2 text-[10px] font-black uppercase flex items-center gap-1 transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              <span className="hidden sm:inline">{t.uploadMenu}</span>
              <span className="sm:hidden">UPLOAD</span>
            </button>
          </div>
          <input type="file" ref={fileInputRef} hidden accept="image/*,application/pdf" onChange={handleFileUpload} />
        </div>

        {/* Informative Section - Disappears after first visible message */}
        <AnimatePresence>
          {!hasVisibleMessages && (
            <motion.div 
              initial={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="p-3 border-b bg-white/5 space-y-3 overflow-hidden" 
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40">{t.howItWorks}</h3>
                <span className="text-[8px] font-mono opacity-20 tracking-widest">SYSTEM_GUIDE_V1.1</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px] font-mono leading-tight">
                <div className="space-y-0.5">
                  <div className="font-bold uppercase text-[9px]" style={{ color: 'var(--text-color)' }}>SCAN</div>
                  <div className="opacity-60 text-[9px]">{t.howItWorksScan.split(' — ')[1] || t.howItWorksScan}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold uppercase text-[9px]" style={{ color: 'var(--text-color)' }}>UPLOAD</div>
                  <div className="opacity-60 text-[9px]">{t.howItWorksUpload.split(' — ')[1] || t.howItWorksUpload}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="font-bold uppercase text-[9px]" style={{ color: 'var(--text-color)' }}>QUERY</div>
                  <div className="opacity-60 text-[9px]">{t.howItWorksQuery.split(' — ')[1] || t.howItWorksQuery}</div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-white/5">
                <div className="flex flex-wrap gap-2 text-[8px] font-mono opacity-40 uppercase tracking-tighter">
                   <span className="font-bold text-white/30">{t.examples}</span>
                   <span>{t.exampleProduct}</span>
                   <span>|</span>
                   <span>{t.exampleDish}</span>
                   <span>|</span>
                   <span>{t.exampleMenu}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 p-6 space-y-6 font-mono">
          {messages.map((msg, idx) => (
            <React.Fragment key={idx}>
              {(!msg.isAutoPrompt || msg.role === 'model') && (
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[95%] border transition-all duration-500 overflow-hidden ${msg.role === 'user' ? 'p-4' : ''}`} style={{ 
                    borderColor: 'var(--border-color)', 
                    backgroundColor: msg.role === 'model' ? 'var(--terminal-bg)' : 'var(--text-color)',
                    color: msg.role === 'model' ? 'var(--text-color)' : 'var(--bg-color)'
                  }}>
                    {msg.role === 'model' && msg.status && (msg.detections && msg.detections.length > 0) && (
                       <div 
                        className="w-full py-3 px-4 flex items-center justify-center gap-3 border-b-2 shadow-inner"
                        style={{ backgroundColor: getStatusBannerColor(msg.status), borderColor: 'rgba(0,0,0,0.1)' }}
                       >
                          <span className="text-[12px] font-black tracking-[0.3em] uppercase text-black drop-shadow-sm">
                            {getStatusBannerText(msg.status)}
                          </span>
                       </div>
                    )}
                    
                    <div className={msg.role === 'model' ? 'p-4' : ''}>
                      <div className="text-[7px] uppercase font-bold mb-2 opacity-50 border-b pb-1">
                        {msg.role === 'user' ? t.userLabel : t.chefOmoikaneLabel}
                      </div>
                      {msg.image && msg.role === 'model' && msg.detections ? (
                         <MenuOverlay image={msg.image} detections={msg.detections} t={t} />
                      ) : msg.image && msg.role === 'model' ? (
                         <img src={msg.image} alt="Result" className="mb-4 max-w-full border p-1" style={{ borderColor: 'var(--border-color)' }} />
                      ) : null}
                      
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                      {msg.role === 'model' && msg.macros && (
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                          <div className="grid grid-cols-5 gap-2">
                            <div className="text-center">
                              <div className="text-[8px] opacity-40 uppercase mb-0.5">KCAL</div>
                              <div className="text-[10px] font-bold">{msg.macros.calories}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] opacity-40 uppercase mb-0.5">PROT</div>
                              <div className="text-[10px] font-bold">{msg.macros.protein}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] opacity-40 uppercase mb-0.5">CARB</div>
                              <div className="text-[10px] font-bold">{msg.macros.carbs}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] opacity-40 uppercase mb-0.5">FAT</div>
                              <div className="text-[10px] font-bold">{msg.macros.fats}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] opacity-40 uppercase mb-0.5">FIBER</div>
                              <div className="text-[10px] font-bold">{msg.macros.fiber}</div>
                            </div>
                          </div>
                          <p className="text-[8px] opacity-30 uppercase tracking-widest leading-tight text-center">
                            {t.macroDisclaimer}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
          
          {/* Chat Typing Bubble */}
          {isChatTyping && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border p-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--terminal-bg)' }}>
                <div className="text-[7px] uppercase font-bold mb-2 opacity-50 border-b pb-1">
                    {t.chefOmoikaneLabel}
                </div>
                <div style={{ color: 'var(--text-color)' }}>
                   <TypingIndicator />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        <div className="p-1 px-2 border-t" style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--border-color)' }}>
          {!input && (
            <div className="text-[7px] font-mono opacity-25 uppercase tracking-[0.3em] py-1 px-2 text-center animate-pulse">
              {t.queryTip}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-end pb-1">
            <textarea 
              rows={1}
              className="flex-1 bg-transparent outline-none text-[12px] font-mono resize-none py-1 px-2 transition-all duration-300 min-h-[22px] max-h-[180px] border-b" 
              style={{ color: 'var(--text-color)', borderColor: 'var(--sub-border)' }} 
              placeholder={t.chatPlaceholder} 
              value={input} 
              onFocus={(e) => e.target.parentElement?.classList.add('border-accent-glow')}
              onBlur={(e) => e.target.parentElement?.classList.remove('border-accent-glow')}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                  e.currentTarget.style.height = 'auto';
                }
              }}
              disabled={isProcessing} 
            />
            <button 
              type="submit" 
              disabled={isProcessing || !input.trim()} 
              className="px-3 py-1 text-[9px] font-black uppercase disabled:opacity-20 transition-all active:scale-95 h-[26px]"
              style={{ backgroundColor: 'var(--text-color)', color: 'var(--bg-color)' }}
            >
              {t.send}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuestionTerminal;
