
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { UserDiagnostics, AppLanguage, Translations } from '../types';
import { LANGUAGES } from '../App';
import IngredientScanner from './IngredientScanner';

interface Props {
  onSumbit: (data: UserDiagnostics) => void;
  onUpdate: (updates: Partial<UserDiagnostics>) => void;
  diagnostics: UserDiagnostics;
  isLoading: boolean;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: Translations;
  forceScanner?: boolean;
  onScannerClose?: () => void;
}

const DiagnosticTerminal: React.FC<Props> = ({ onSumbit, onUpdate, diagnostics, isLoading, language, t, forceScanner, onScannerClose }) => {
  const [activeMic, setActiveMic] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserDiagnostics>(diagnostics);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    if (forceScanner) {
      setIsScannerOpen(true);
    }
  }, [forceScanner]);

  const closeScanner = () => {
    setIsScannerOpen(false);
    onScannerClose?.();
  };

  const formRef = useRef<HTMLFormElement>(null);

  const resetFields = () => {
    const cleared = {
      targetDish: '',
      preferences: '',
      healthProfile: '',
      ingredients: '',
      tastePreferences: ''
    };
    setFormData(cleared);
    onUpdate(cleared);
  };


  useEffect(() => {
    // Only update if external diagnostics have changed and are different from local state
    // to avoid redundant state resets during rapid typing
    setFormData(prev => {
      const hasChanged = 
        prev.healthProfile !== diagnostics.healthProfile ||
        prev.preferences !== diagnostics.preferences ||
        prev.ingredients !== diagnostics.ingredients ||
        prev.targetDish !== diagnostics.targetDish ||
        prev.additionalSpecs !== diagnostics.additionalSpecs;
      
      return hasChanged ? { ...diagnostics } : prev;
    });
  }, [diagnostics]);

  useEffect(() => {
    setFormData(prev => {
      if (prev.language === language) return prev;
      return { ...prev, language };
    });
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

  // Debounced sync to global state to prevent App.tsx from re-rendering on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      onUpdate(formData);
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData, onUpdate]);

  const updateLocalAndGlobal = (field: keyof UserDiagnostics, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleIngredientsDetected = (ingredients: string[]) => {
    const currentIngredients = formData.ingredients.split(',').map(i => i.trim()).filter(i => i !== '');
    const newIngredients = ingredients.map(i => i.trim());
    
    // Deduplicate ingredients (case-insensitive)
    const combined = [...currentIngredients];
    newIngredients.forEach(ing => {
      if (!combined.some(c => c.toLowerCase() === ing.toLowerCase())) {
        combined.push(ing);
      }
    });
    
    updateLocalAndGlobal('ingredients', combined.join(', '));
  };

  const MicButton = ({ field }: { field: keyof UserDiagnostics }) => (
    <button
      type="button"
      onClick={() => startVoiceInput(field)}
      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all p-2 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${activeMic === field ? 'recording-pulse scale-110' : 'opacity-30 hover:opacity-100'}`}
      title="VOCAL SENSOR ACTIVATE"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    </button>
  );

  const showSafetyBanner = React.useMemo(() => {
    const keywords = [
      'diabetes', 'celiac', 'allergy', 'allergic', 'renal', 'heart', 
      'diabete', 'celiaquia', 'allergia', 'allergico', 'cuore', 'renale',
      'diabète', 'cœliaque', 'allergie', 'allergique', 'rénal', 'cœur'
    ];
    const profile = formData.healthProfile.toLowerCase();
    return keywords.some(k => profile.includes(k));
  }, [formData.healthProfile]);

  const allergyConflicts = React.useMemo(() => {
    const profile = formData.healthProfile.toLowerCase();
    
    const ingredients = formData.ingredients.toLowerCase().split(',').map(i => i.trim()).filter(i => i !== '');
    const highConflicts: string[] = [];
    const lowConflicts: string[] = [];

    // Optimized common allergens check
    const highSeverity: Record<string, string[]> = {
      'nut': ['nut', 'almond', 'walnut', 'peanut', 'cashew', 'hazelnut', 'pistachio', 'nocci', 'mandorl', 'arahide'],
      'gluten': ['flour', 'wheat', 'bread', 'pasta', 'farina', 'grano', 'pane', 'orzo', 'segale'],
      'celiac': ['flour', 'wheat', 'bread', 'pasta', 'farina', 'grano', 'pane', 'gluten', 'glutine'],
      'egg': ['egg', 'uovo', 'uova', 'mayo'],
      'fish': ['fish', 'shrimp', 'salmon', 'tuna', 'pesce', 'gambero', 'salmone', 'tonno', 'merluzzo'],
      'shellfish': ['shrimp', 'crab', 'lobster', 'gamber', 'granchio', 'aragosta', 'cozze', 'vongole']
    };

    const lowSeverity: Record<string, string[]> = {
      'dairy': ['milk', 'cheese', 'butter', 'cream', 'parmesan', 'parmigiano', 'reggiano', 'grana', 'mozzarella', 'ricotta', 'pecorino', 'mascarpone', 'provola', 'asiago', 'gorgonzola', 'burrata', 'feta', 'latte', 'formaggio', 'burro', 'panna', 'yogurt', 'lattosio', 'whey'],
      'spicy': ['chilly', 'chili', 'jalapeno', 'tabasco', 'piccante', 'peperoncino', 'habanero'],
      'lactose': ['milk', 'cheese', 'butter', 'cream', 'parmesan', 'parmigiano', 'reggiano', 'grana', 'mozzarella', 'ricotta', 'pecorino', 'mascarpone', 'provola', 'asiago', 'gorgonzola', 'burrata', 'feta', 'latte', 'formaggio', 'burro', 'panna', 'yogurt', 'lattosio', 'whey']
    };

    Object.entries(highSeverity).forEach(([key, terms]) => {
      if (profile.includes(key) || (key === 'celiac' && (profile.includes('celiaq') || profile.includes('celiac')))) {
        terms.forEach(term => {
          ingredients.forEach(ing => {
            if (ing.includes(term) && !highConflicts.includes(ing)) {
              highConflicts.push(ing);
            }
          });
        });
      }
    });

    Object.entries(lowSeverity).forEach(([key, terms]) => {
      if (profile.includes(key)) {
        terms.forEach(term => {
          ingredients.forEach(ing => {
            if (ing.includes(term) && !highConflicts.includes(ing) && !lowConflicts.includes(ing)) {
              lowConflicts.push(ing);
            }
          });
        });
      }
    });

    return { high: highConflicts, low: lowConflicts };
  }, [formData.healthProfile, formData.ingredients]);

  return (
    <div className="glow-border md:p-6 p-4 pt-2 md:pt-6 rounded-none relative overflow-visible" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
      {isScannerOpen && (
        <IngredientScanner 
          onClose={closeScanner}
          onIngredientsDetected={handleIngredientsDetected}
          language={language}
          t={t}
        />
      )}
      <h2 className="header-font text-lg md:mb-12 mb-3 flex items-center justify-between tracking-tighter" style={{ color: 'var(--text-color)' }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--text-color)' }}></span>
          {t.synthesisParams}
        </div>
        <button 
          type="button"
          onClick={resetFields}
          className="p-2 hover:bg-white/5 rounded-full transition-all group"
          title="Reset Fields"
        >
          <RotateCcw className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} className="md:space-y-6 space-y-4">
        {/* TARGET DISH */}
        <div className="space-y-1">
          <label className="block text-[8px] md:text-[9px] uppercase font-black tracking-[0.1em] font-mono opacity-50" style={{ color: 'var(--text-color)' }}>
            {t.targetDish}
          </label>
          <div className="relative border transition-colors" style={{ borderColor: 'var(--sub-border)', backgroundColor: 'var(--sub-bg)' }}>
            <input 
              type="text"
              onFocus={handleFocus}
              className="w-full bg-transparent md:p-3 p-2 pr-10 md:pr-12 text-[12px] md:text-[13px] outline-none font-mono placeholder:opacity-20"
              style={{ color: 'var(--text-color)' }}
              placeholder={t.targetDishPlace}
              value={formData.targetDish}
              onChange={(e) => updateLocalAndGlobal('targetDish', e.target.value)}
            />
            <MicButton field="targetDish" />
          </div>
        </div>

        {/* ANY PREFERENCES */}
        <div className="space-y-1">
          <label className="block text-[8px] md:text-[9px] uppercase font-black tracking-[0.1em] font-mono opacity-50" style={{ color: 'var(--text-color)' }}>
             {t.additionalSpecs}
          </label>
          <div className="relative border transition-colors" style={{ borderColor: 'var(--sub-border)', backgroundColor: 'var(--sub-bg)' }}>
            <textarea 
              onFocus={handleFocus}
              className="w-full bg-transparent md:p-3 p-2 pr-10 md:pr-12 text-[12px] md:text-[13px] outline-none md:h-16 h-12 font-mono resize-none placeholder:opacity-20 leading-tight"
              style={{ color: 'var(--text-color)' }}
              placeholder={t.additionalSpecsPlace}
              value={formData.additionalSpecs}
              onChange={(e) => updateLocalAndGlobal('additionalSpecs', e.target.value)}
            />
            <MicButton field="additionalSpecs" />
          </div>
        </div>

        {/* UNIFIED HEALTH PROFILE & AVAILABLE INGREDIENTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4 gap-3">
          <div className="space-y-1">
            <label className="block text-[8px] md:text-[9px] uppercase font-black tracking-[0.1em] font-mono opacity-40" style={{ color: 'var(--text-color)' }}>{t.healthProfile}</label>
            <div className="relative border transition-colors" style={{ borderColor: 'var(--sub-border)', backgroundColor: 'var(--sub-bg)' }}>
              <textarea 
                onFocus={handleFocus}
                className="w-full bg-transparent p-2 pr-10 text-[10px] outline-none md:h-12 h-10 font-mono resize-none placeholder:opacity-20 leading-tight"
                style={{ color: 'var(--text-color)' }}
                placeholder={t.healthProfilePlace}
                value={formData.healthProfile}
                onChange={(e) => updateLocalAndGlobal('healthProfile', e.target.value)}
              />
              <MicButton field="healthProfile" />
            </div>
            {showSafetyBanner && (
              <div 
                className="mt-1 p-2 border-l text-[8px] font-mono leading-tight bg-red-500/5 transition-all animate-in slide-in-from-top-1 duration-300"
                style={{ borderColor: 'var(--red-safe)', color: 'var(--red-safe)' }}
              >
                <span className="font-bold block mb-0.5 uppercase tracking-tighter">{t.helpSafetyTitle}</span>
                {t.medicalDisclaimer}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="block text-[8px] md:text-[9px] uppercase font-black tracking-[0.1em] font-mono opacity-40" style={{ color: 'var(--text-color)' }}>{t.ingredients}</label>
            <div className="relative border transition-colors" style={{ borderColor: 'var(--sub-border)', backgroundColor: 'var(--sub-bg)' }}>
              <textarea 
                onFocus={handleFocus}
                className="w-full bg-transparent p-2 pr-16 md:pr-20 text-[10px] outline-none md:h-12 h-10 font-mono resize-none placeholder:opacity-20 leading-tight"
                style={{ color: 'var(--text-color)' }}
                placeholder={t.ingredientsPlace}
                value={formData.ingredients}
                onChange={(e) => updateLocalAndGlobal('ingredients', e.target.value)}
              />
              <div className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="p-1 px-1.5 rounded-full opacity-50 hover:opacity-100 transition-all border"
                  style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--sub-border)' }}
                  title="BIO SCANNER ACTIVATE"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                    <circle cx="12" cy="12" r="3.2"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => startVoiceInput('ingredients')}
                  className={`p-1 px-1.5 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all ${activeMic === 'ingredients' ? 'recording-pulse scale-110' : 'opacity-30 hover:opacity-100'}`}
                  title="VOCAL SENSOR ACTIVATE"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </button>
              </div>
            </div>
            {allergyConflicts.high.length > 0 && (
              <div 
                className="mt-2 p-3 border-l-2 text-[9px] font-mono leading-tight bg-red-500/5 transition-all animate-in slide-in-from-top-1 duration-300"
                style={{ borderColor: 'var(--red-safe)', color: 'var(--red-safe)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <span className="font-bold uppercase tracking-widest">{t.helpSafetyTitle}</span>
                </div>
                {t.allergenConflictDetected} <span className="font-bold underline">{allergyConflicts.high.join(', ')}</span>. {t.medicalDisclaimer}
              </div>
            )}
            {allergyConflicts.low.length > 0 && (
              <div 
                className="mt-2 p-3 border-l-2 text-[9px] font-mono leading-tight bg-yellow-500/5 transition-all animate-in slide-in-from-top-1 duration-300"
                style={{ borderColor: 'var(--yellow-warn)', color: 'var(--yellow-warn)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 16h-2v-2h2v2zm0-4h-2V7h2v4zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                  </svg>
                  <span className="font-bold uppercase tracking-widest">DIETARY NOTICE</span>
                </div>
                {t.allergenConflictDetected} <span className="font-bold underline">{allergyConflicts.low.join(', ')}</span>.
              </div>
            )}
          </div>
        </div>

        {/* TASTE PREFERENCES (Full Width or Grid Row) */}
        <div className="space-y-1">
          <label className="block text-[8px] md:text-[9px] uppercase font-black tracking-[0.1em] font-mono opacity-50" style={{ color: 'var(--text-color)' }}>{t.preferences}</label>
          <div className="relative border transition-colors" style={{ borderColor: 'var(--sub-border)', backgroundColor: 'var(--sub-bg)' }}>
            <input 
              type="text"
              onFocus={handleFocus}
              className="w-full bg-transparent md:p-3 p-2 pr-10 md:pr-12 text-[12px] md:text-[13px] outline-none font-mono placeholder:opacity-20"
              style={{ color: 'var(--text-color)' }}
              placeholder={t.preferencesPlace}
              value={formData.preferences}
              onChange={(e) => updateLocalAndGlobal('preferences', e.target.value)}
            />
            <MicButton field="preferences" />
          </div>
        </div>

        {/* 3D TACTILE SYNTHESIS BUTTON */}
        <div className="md:pt-4 pt-1">
          <button 
            disabled={isLoading}
            className={`
              w-full md:py-8 py-3.5 header-font font-black md:text-sm text-[10px] uppercase tracking-[0.4em] 
              transition-all duration-75 border-2 rounded-2xl
              disabled:opacity-30 disabled:pointer-events-none disabled:translate-y-0 disabled:border-b-2
              ${!isLoading ? 'border-b-[8px] md:border-b-[8px] border-b-[4px] active:border-b-2 active:translate-y-[6px]' : 'border-b-2 translate-y-[6px] opacity-80'}
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
