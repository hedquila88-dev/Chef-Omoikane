
import React, { useRef, useState, useEffect } from 'react';
import { extractIngredientsFromImage } from '../services/geminiService';
import { Translations } from '../types';
import { CAMERA_VIDEO_CONSTRAINTS, JPEG_QUALITY, MAX_DIM_LIVE_SHOT, MAX_DIM_UPLOAD } from '../utils/imageCapture';

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
        video: { facingMode: 'environment', ...CAMERA_VIDEO_CONSTRAINTS } 
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

  const resizeImage = (base64Str: string, maxWidth = MAX_DIM_UPLOAD, maxHeight = MAX_DIM_UPLOAD): Promise<string> => {
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
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
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
      const maxWidth = MAX_DIM_LIVE_SHOT;
      const maxHeight = MAX_DIM_LIVE_SHOT;
      const scale = Math.min(maxWidth / video.videoWidth, maxHeight / video.videoHeight, 1);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageBase64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 backdrop-blur-md bg-black/60 font-mono">
      <div className="w-full h-full md:h-auto md:max-w-4xl border-2 relative overflow-hidden flex flex-col shadow-2xl" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
        {/* SCANNER OVERLAY */}
        <div className="absolute inset-0 pointer-events-none z-10">
           <div className="absolute top-0 w-full h-0.5 animate-[loading-scan_2s_linear_infinite]" style={{ backgroundColor: 'var(--text-color)', opacity: 0.4 }}></div>
           <div className="absolute top-4 left-4 text-[10px] uppercase font-bold px-2 py-1" style={{ backgroundColor: 'var(--sub-bg)', color: 'var(--text-color)' }}>BIO SCAN ACTIVE</div>
        </div>

        <div 
          className="flex-1 min-h-0 relative cursor-pointer overflow-hidden" 
          style={{ backgroundColor: 'var(--sub-bg)' }}
          onClick={() => fileInputRef.current?.click()}
          title="CLICK_TO_UPLOAD"
        >
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover shadow-2xl" 
          />
          <canvas ref={canvasRef} className="hidden" />
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileUpload} 
          />
          
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-10">
            <div className="text-[10px] uppercase font-bold tracking-widest border px-4 py-2" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)', opacity: 0.85 }}>
              CLICK TO UPLOAD FILE / PASTE IMAGE
            </div>
          </div>
          
          {isAnalyzing && (
            <div className="absolute inset-0 flex items-center justify-center z-20 backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-color)', opacity: 0.8 }}>
              <div className="flex flex-col items-center gap-6 w-64">
                <div className="relative w-full h-1 overflow-hidden" style={{ backgroundColor: 'var(--sub-border)' }}>
                  <div 
                    className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%`, backgroundColor: 'var(--text-color)' }}
                  />
                </div>
                <div className="flex justify-between w-full">
                  <div className="text-[10px] uppercase tracking-widest opacity-60" style={{ color: 'var(--text-color)' }}>{t.processing}</div>
                  <div className="text-[10px] uppercase font-bold tabular-nums" style={{ color: 'var(--text-color)' }}>{Math.floor(progress)}%</div>
                </div>
                <div className="w-12 h-12 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--text-color)' }}></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 flex flex-col gap-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
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
              className="flex-[2] py-4 border-2 text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 disabled:opacity-30 hover:opacity-80"
              style={{ backgroundColor: 'var(--text-color)', color: 'var(--bg-color)', borderColor: 'var(--text-color)' }}
            >
              {t.captureData}
            </button>
            <button 
              onClick={onClose}
              className="flex-1 py-4 border text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-all"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)', backgroundColor: 'var(--sub-bg)' }}
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
