
import React, { useRef, useState, useEffect } from 'react';
import { extractIngredientsFromImage } from '../services/geminiService';
import { Translations } from '../types';

interface Props {
  onIngredientsDetected: (ingredients: string[]) => void;
  onClose: () => void;
  language: string;
  t: Translations;
}

const IngredientScanner: React.FC<Props> = ({ onIngredientsDetected, onClose, language, t }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lastAddedCount, setLastAddedCount] = useState<number>(0);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError(t.cameraAccessDenied);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev < 98) {
            const increment = Math.random() * 15;
            return Math.min(prev + increment, 98.5);
          }
          // Tiny movement to show it's still alive
          return Math.min(prev + (Math.random() * 0.1), 99.4);
        });
      }, 300);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const resizeImage = (base64Str: string, maxWidth = 320, maxHeight = 320): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.3));
      };
      img.onerror = () => reject(new Error("FAILED_TO_LOAD_IMAGE"));
    });
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setError(null);
    setLastAddedCount(0);
    stopCamera();
    try {
      const resizedImage = await resizeImage(imageBase64);
      const ingredients = await extractIngredientsFromImage(resizedImage, language);
      if (ingredients && ingredients.length > 0) {
        onIngredientsDetected(ingredients);
        setLastAddedCount(ingredients.length);
        // Restart camera for next shot
        await startCamera();
      } else {
        setError("SENSOR_BLIND: No readable material detected.");
        await startCamera();
      }
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err?.message || t.error);
      await startCamera();
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result as string;
              analyzeImage(result);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [language]);

  useEffect(() => {
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Fotocamera non pronta. Attendi un istante.");
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (context) {
      const maxWidth = 320;
      const maxHeight = 320;
      const scale = Math.min(maxWidth / video.videoWidth, maxHeight / video.videoHeight, 1);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.3);
      
      setIsAnalyzing(true);
      setError(null);
      setLastAddedCount(0);
      stopCamera();
      try {
        const ingredients = await extractIngredientsFromImage(imageBase64, language);
        if (ingredients && ingredients.length > 0) {
          onIngredientsDetected(ingredients);
          setLastAddedCount(ingredients.length);
          // Auto restart camera
          await startCamera();
        } else {
          setError("Lettura dati fallita. Prova in un ambiente più illuminato.");
          await startCamera();
        }
      } catch (err: any) {
        console.error("Analysis error:", err);
        setError(err?.message || "Errore durante l'invio dei dati.");
        await startCamera();
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        const resized = await resizeImage(result);
        analyzeImage(resized);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/80 font-mono">
      <div className="w-full max-w-2xl border-2 border-white/20 bg-black relative overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
        {/* SCANNER OVERLAY */}
        <div className="absolute inset-0 pointer-events-none z-10">
           <div className="absolute top-0 w-full h-0.5 bg-white/20 animate-[loading-scan_2s_linear_infinite]"></div>
           <div className="absolute inset-0 border-[40px] border-black/40"></div>
           <div className="absolute top-4 left-4 text-[10px] uppercase opacity-60 text-white">BIO SCAN READY</div>
        </div>

        <div 
          className="aspect-video bg-zinc-900 relative cursor-pointer" 
          onClick={() => fileInputRef.current?.click()}
          title="CLICK_TO_UPLOAD"
        >
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover grayscale opacity-80" 
          />
          <canvas ref={canvasRef} className="hidden" />
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload} 
          />
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 z-10">
            <div className="text-[10px] uppercase font-bold tracking-widest text-white border border-white/40 px-4 py-2 bg-black/60">
              CLICK TO UPLOAD FILE / PASTE IMAGE
            </div>
          </div>
          
          {isAnalyzing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-6 w-64">
                <div className="relative w-full h-1 bg-white/10 overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-white transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between w-full">
                  <div className="text-[10px] uppercase tracking-widest text-white/60">{t.processing}</div>
                  <div className="text-[10px] uppercase font-bold text-white tabular-nums">{Math.floor(progress)}%</div>
                </div>
                <div className="w-12 h-12 border-2 border-t-white border-white/10 rounded-full animate-spin"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 flex flex-col gap-4 border-t border-white/10">
          {lastAddedCount > 0 && !error && (
            <div className="text-[10px] uppercase text-green-400 bg-green-400/10 p-2 border border-green-400/20 animate-in fade-in slide-in-from-top-1">
              [BIO_UPDATE]: {lastAddedCount} NEW SENSORS DETECTED. READY FOR NEXT CAPTURE.
            </div>
          )}

          {error && (
            <div className="text-[10px] uppercase text-red-500 bg-red-500/10 p-2 border border-red-500/20">
              [SENSOR FAILURE]: {error}
            </div>
          )}

          <div className="flex gap-4">
            <button 
              onClick={captureAndAnalyze}
              disabled={isAnalyzing}
              className="flex-[2] py-4 border-2 border-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-30"
              style={{ borderColor: 'var(--text-color)', color: 'var(--text-color)' }}
            >
              {t.captureData}
            </button>
            <button 
              onClick={onClose}
              className="flex-1 py-4 border border-white/20 text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all bg-white/5"
              style={{ color: 'var(--text-color)' }}
            >
              {lastAddedCount > 0 ? "FINISH" : t.cancelBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngredientScanner;
