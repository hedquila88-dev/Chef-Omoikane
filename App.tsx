
// Explicitly import React to resolve namespace 'React' errors in environments that require it for JSX or types like React.FC
import React, { useState, useMemo, useEffect, useRef } from 'react';
import TerminalHeader from './components/TerminalHeader';
import DiagnosticTerminal from './components/DiagnosticTerminal';
import RecipeDisplay from './components/RecipeDisplay';
import RecipeChat from './components/RecipeChat';
import QuestionTerminal from './components/QuestionTerminal';
import MapsTerminal from './components/MapsTerminal';
import HelpModal from './components/HelpModal';
import { UserDiagnostics, Recipe, AppLanguage, AppTheme, AppView } from './types';
import { i18n } from './translations';
import { generateRecipe, createRecipeChat } from './services/geminiService';
import { Chat } from '@google/genai';

export const LANGUAGES: { code: AppLanguage; label: string; flag: string; speechCode: string }[] = [
  { code: 'Chinese', label: '中文', flag: '🇨🇳', speechCode: 'zh-CN' },
  { code: 'English', label: 'ENGLISH', flag: '🇬🇧', speechCode: 'en-US' },
  { code: 'Español', label: 'ESPAÑOL', flag: '🇪🇸', speechCode: 'es-ES' },
  { code: 'Français', label: 'FRANÇAIS', flag: '🇫🇷', speechCode: 'fr-FR' },
  { code: 'Italiano', label: 'ITALIANO', flag: '🇮🇹', speechCode: 'it-IT' },
  { code: 'Japanese', label: '日本語', flag: '🇯🇵', speechCode: 'ja-JP' },
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('synthesis');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [language, setLanguage] = useState<AppLanguage>('English');
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  const [diagnostics, setDiagnostics] = useState<UserDiagnostics>({
    healthProfile: '',
    preferences: '',
    ingredients: '',
    targetDish: '',
    additionalSpecs: '',
    language: 'English'
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const t = useMemo(() => i18n[language], [language]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const handleLanguageChange = (newLang: AppLanguage) => {
    setLanguage(newLang);
    setDiagnostics(prev => ({ ...prev, language: newLang }));
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setError(null);
  };

  const updateDiagnostics = (updates: Partial<UserDiagnostics>) => {
    setDiagnostics(prev => ({ ...prev, ...updates }));
  };

  const handleDiagnosticSubmit = async (data: UserDiagnostics) => {
    setDiagnostics(data);
    setLoading(true);
    setError(null);
    setRecipe(null);
    setChatSession(null);
    
    abortControllerRef.current = new AbortController();
    
    try {
      const result = await generateRecipe(data);
      
      setRecipe(result);
      const session = createRecipeChat(result, data);
      setChatSession(session);

      setTimeout(() => {
        const el = document.getElementById('recipe-output');
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(t.abortMessage);
      } else {
        setError(t.error);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen pb-24 theme-transition font-mono selection:bg-white selection:text-black" style={{ color: 'var(--text-color)' }}>
      <TerminalHeader 
        t={t} 
        theme={theme} 
        onThemeToggle={toggleTheme} 
        language={language} 
        setLanguage={handleLanguageChange}
        currentView={view}
        setView={setView}
        onHelpOpen={() => setIsHelpOpen(true)}
      />

      {isHelpOpen && <HelpModal t={t} onClose={() => setIsHelpOpen(false)} />}
      
      <main className="container mx-auto px-4 mt-12 space-y-16">
        <div className="max-w-5xl mx-auto">
          
          {view === 'synthesis' ? (
            <>
              <section className="mb-16">
                <DiagnosticTerminal 
                  onSumbit={handleDiagnosticSubmit} 
                  onUpdate={updateDiagnostics}
                  diagnostics={diagnostics}
                  isLoading={loading} 
                  language={language}
                  setLanguage={handleLanguageChange}
                  t={t}
                />
              </section>

              {error && (
                <div className="p-4 border text-[10px] uppercase mb-12" style={{ borderColor: 'var(--text-color)', color: 'var(--text-color)' }}>
                  [SYSTEM_ERROR] {error}
                </div>
              )}

              {recipe && (
                <section id="recipe-output" className="pt-20 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <RecipeDisplay recipe={recipe} t={t} />
                  {chatSession && <RecipeChat chatSession={chatSession} t={t} />}
                  <div className="mt-16 flex justify-center">
                    <button 
                      onClick={() => {
                        setRecipe(null);
                        setChatSession(null);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-8 py-2 border text-[9px] uppercase tracking-widest transition-all opacity-40 hover:opacity-100"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
                    >
                      {t.newSynthesis}
                    </button>
                  </div>
                </section>
              )}
            </>
          ) : view === 'questions' ? (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <QuestionTerminal t={t} diagnostics={diagnostics} onUpdate={updateDiagnostics} theme={theme} />
            </section>
          ) : (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MapsTerminal t={t} diagnostics={diagnostics} onUpdate={updateDiagnostics} setLoading={setLoading} setError={setError} />
            </section>
          )}

          {loading && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-2xl animate-in fade-in duration-500" 
                 style={{ backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)' }}>
              
              <button 
                onClick={handleCancel}
                className="absolute top-10 right-10 flex flex-col items-center gap-2 group"
                style={{ color: 'var(--text-color)' }}
                title="CANCEL_SYNTHESIS"
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
                    <div className="h-1 w-full bg-white/10 relative overflow-hidden rounded-full">
                      <div className="absolute inset-0 bg-current animate-[loading-progress_3.5s_ease-in-out_infinite]"></div>
                    </div>
                  </div>
                  <p className="text-[10px] opacity-70 uppercase tracking-[0.25em] font-mono leading-relaxed bg-black/5 p-2 rounded backdrop-blur-sm">
                    {t.syncDiagnosticMatrix}<br/>
                    {t.analysisClinicalParams}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t py-2 px-6 flex justify-between items-center z-40 backdrop-blur-md" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
        <div className="text-[7px] opacity-30 uppercase tracking-widest font-bold" style={{ color: 'var(--text-color)' }}>
          CHEF OMOIKANE // V5.0
        </div>
        <div className="flex gap-4">
          <span className="text-[7px] opacity-60 tracking-widest uppercase" style={{ color: 'var(--text-color)' }}>STABLE</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
