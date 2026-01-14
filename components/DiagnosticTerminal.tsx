
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserDiagnostics, AppLanguage, Translations } from '../types';
import { LANGUAGES } from '../App';

interface Props {
  onSumbit: (data: UserDiagnostics) => void;
  onUpdate: (updates: Partial<UserDiagnostics>) => void;
  diagnostics: UserDiagnostics;
  isLoading: boolean;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: Translations;
}

const DiagnosticTerminal: React.FC<Props> = ({ onSumbit, onUpdate, diagnostics, isLoading, language, t }) => {
  const [activeMic, setActiveMic] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserDiagnostics>(diagnostics);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setFormData(diagnostics);
  }, [diagnostics]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, language }));
  }, [language]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSumbit(formData);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const selectedLang = LANGUAGES.find(l => l.code === language);

  const updateLocalAndGlobal = (field: keyof UserDiagnostics, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    if (field === 'healthProfile') {
      onUpdate({ [field]: value });
    }
  };

  const startVoiceInput = useCallback((field: keyof UserDiagnostics) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("ERRORE SENSORI: Il browser non supporta il riconoscimento vocale.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang?.speechCode || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setActiveMic(field as string);
    recognition.onend = () => setActiveMic(null);
    recognition.onerror = () => setActiveMic(null);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const currentValue = formData[field] as string;
      const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
      updateLocalAndGlobal(field, newValue);
    };

    recognition.start();
  }, [selectedLang, formData]);

  const MicButton = ({ field }: { field: keyof UserDiagnostics }) => (
    <button
      type="button"
      onClick={() => startVoiceInput(field)}
      className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all p-3 flex items-center justify-center rounded-full hover:bg-white/10 ${activeMic === field ? 'recording-pulse scale-125' : 'opacity-40 hover:opacity-100'}`}
      title="VOCAL_SENSOR_ACTIVATE"
    >
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    </button>
  );

  return (
    <div className="glow-border p-6 rounded-none relative overflow-visible" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
      <div className="absolute top-0 right-0">
        <div className="px-2 py-1 text-[8px] border-l border-b font-mono opacity-80" style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
          {t.linkActive} // PORT_8080
        </div>
      </div>
      
      <h2 className="header-font text-lg mb-12 flex items-center gap-2 tracking-tighter" style={{ color: 'var(--text-color)' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--text-color)' }}></span>
        {t.synthesisParams}
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-10">
        {/* TARGET DISH */}
        <div className="space-y-3">
          <label className="block text-[10px] uppercase font-bold tracking-[0.2em] font-mono" style={{ color: 'var(--text-color)' }}>
            {t.targetDish}
          </label>
          <div className="relative border border-white/20 bg-black/20 focus-within:border-white/40 transition-colors">
            <input 
              type="text"
              onFocus={handleFocus}
              className="w-full bg-transparent p-6 pr-16 text-sm outline-none font-mono placeholder:opacity-30"
              style={{ color: 'var(--text-color)' }}
              placeholder={t.targetDishPlace}
              value={formData.targetDish}
              onChange={(e) => updateLocalAndGlobal('targetDish', e.target.value)}
            />
            <MicButton field="targetDish" />
          </div>
        </div>

        {/* ANY PREFERENCES */}
        <div className="space-y-3">
          <label className="block text-[10px] uppercase font-bold tracking-[0.2em] font-mono" style={{ color: 'var(--text-color)' }}>
             {t.additionalSpecs}
          </label>
          <div className="relative border border-white/20 bg-black/20 focus-within:border-white/40 transition-colors">
            <textarea 
              onFocus={handleFocus}
              className="w-full bg-transparent p-6 pr-16 text-sm outline-none h-24 font-mono resize-none placeholder:opacity-30 leading-relaxed"
              style={{ color: 'var(--text-color)' }}
              placeholder={t.additionalSpecsPlace}
              value={formData.additionalSpecs}
              onChange={(e) => updateLocalAndGlobal('additionalSpecs', e.target.value)}
            />
            <MicButton field="additionalSpecs" />
          </div>
        </div>

        {/* UNIFIED HEALTH PROFILE & AVAILABLE INGREDIENTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <label className="block text-[10px] uppercase font-bold tracking-[0.2em] font-mono" style={{ color: 'var(--text-color)' }}>{t.healthProfile}</label>
            <div className="relative border border-white/20 bg-black/20 focus-within:border-white/40 transition-colors">
              <textarea 
                onFocus={handleFocus}
                className="w-full bg-transparent p-6 pr-16 text-sm outline-none h-32 font-mono resize-none placeholder:opacity-30 leading-relaxed"
                style={{ color: 'var(--text-color)' }}
                placeholder={t.healthProfilePlace}
                value={formData.healthProfile}
                onChange={(e) => updateLocalAndGlobal('healthProfile', e.target.value)}
              />
              <MicButton field="healthProfile" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-[10px] uppercase font-bold tracking-[0.2em] font-mono" style={{ color: 'var(--text-color)' }}>{t.ingredients}</label>
            <div className="relative border border-white/20 bg-black/20 focus-within:border-white/40 transition-colors">
              <textarea 
                onFocus={handleFocus}
                className="w-full bg-transparent p-6 pr-16 text-sm outline-none h-32 font-mono resize-none placeholder:opacity-30 leading-relaxed"
                style={{ color: 'var(--text-color)' }}
                placeholder={t.ingredientsPlace}
                value={formData.ingredients}
                onChange={(e) => updateLocalAndGlobal('ingredients', e.target.value)}
              />
              <MicButton field="ingredients" />
            </div>
          </div>
        </div>

        {/* TASTE PREFERENCES (Full Width or Grid Row) */}
        <div className="space-y-3">
          <label className="block text-[10px] uppercase font-bold tracking-[0.2em] font-mono" style={{ color: 'var(--text-color)' }}>{t.preferences}</label>
          <div className="relative border border-white/20 bg-black/20 focus-within:border-white/40 transition-colors">
            <input 
              type="text"
              onFocus={handleFocus}
              className="w-full bg-transparent p-6 pr-16 text-sm outline-none font-mono placeholder:opacity-30"
              style={{ color: 'var(--text-color)' }}
              placeholder={t.preferencesPlace}
              value={formData.preferences}
              onChange={(e) => updateLocalAndGlobal('preferences', e.target.value)}
            />
            <MicButton field="preferences" />
          </div>
        </div>

        {/* 3D TACTILE SYNTHESIS BUTTON */}
        <div className="pt-4">
          <button 
            disabled={isLoading}
            className={`
              w-full py-8 header-font font-black text-sm uppercase tracking-[0.6em] 
              transition-all duration-75 border-2 rounded-2xl
              disabled:opacity-30 disabled:pointer-events-none disabled:translate-y-0 disabled:border-b-2
              ${!isLoading ? 'border-b-[8px] active:border-b-2 active:translate-y-[6px]' : 'border-b-2 translate-y-[6px] opacity-80'}
            `}
            style={{ 
              backgroundColor: 'var(--text-color)', 
              color: 'var(--bg-color)', 
              borderColor: 'var(--text-color)',
              boxShadow: isLoading ? 'none' : '0 10px 30px -10px var(--accent-glow)'
            }}
          >
            {isLoading ? t.processing : t.submitBtn}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DiagnosticTerminal;
