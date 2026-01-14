
import React, { useState } from 'react';
import { Translations, AppTheme, AppLanguage, AppView } from '../types';
import { LANGUAGES } from '../App';

interface Props {
  t: Translations;
  theme: AppTheme;
  onThemeToggle: () => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  currentView: AppView;
  setView: (view: AppView) => void;
  onHelpOpen: () => void;
}

const TerminalHeader: React.FC<Props> = ({ 
  t, 
  theme, 
  onThemeToggle, 
  language, 
  setLanguage, 
  currentView, 
  setView, 
  onHelpOpen
}) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const selectedLang = LANGUAGES.find(l => l.code === language);

  return (
    <header className="py-6 border-b border-white/20 theme-transition sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: 'var(--header-bg)' }}>
      <div className="container mx-auto px-4 flex justify-between items-start">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="header-font text-2xl font-bold tracking-tighter" style={{ color: 'var(--text-color)' }}>
              CHEF OMOIKANE <span className="text-[10px] opacity-40">V.5.0</span>
            </h1>
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-60" style={{ color: 'var(--text-color)' }}>{t.headerSub}</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setView('synthesis')}
              className={`w-12 h-12 border flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 group ${currentView === 'synthesis' ? 'bg-white/10' : ''}`}
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
              title={t.synthesisParams}
            >
              <svg 
                className={`w-9 h-9 ${currentView === 'synthesis' ? 'opacity-100' : 'opacity-60'} group-hover:opacity-100 transition-all`} 
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17L13 11" />
                <path d="M14.5 9.5C13.5 8.5 14 5.5 16 3.5C18 1.5 20.5 1.5 21.5 2.5C22.5 3.5 22.5 6 20.5 8C18.5 10 15.5 10.5 14.5 9.5Z" />
                <path d="M17 17L11 11" />
                <path d="M3 6C3 8.5 4.5 11 7.5 11C10.5 11 12 8.5 12 6" />
                <path d="M3 6V2.5" />
                <path d="M6 6V2" />
                <path d="M9 6V2" />
                <path d="M12 6V2.5" />
                <path d="M7.5 11V12" opacity="0.3" />
              </svg>
            </button>
            
            <button 
              onClick={() => setView('questions')}
              className={`w-12 h-12 border flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 group ${currentView === 'questions' ? 'bg-white/10' : ''}`}
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
              title={t.healthCenter}
            >
              <svg className={`w-6 h-6 ${currentView === 'questions' ? 'opacity-100' : 'opacity-60'} group-hover:opacity-100`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* NEW MAP BUTTON */}
            <button 
              onClick={() => setView('maps')}
              className={`w-12 h-12 border flex items-center justify-center transition-all hover:bg-white/10 active:scale-95 group ${currentView === 'maps' ? 'bg-white/10' : ''}`}
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
              title={t.mapsTitle}
            >
              <svg className={`w-6 h-6 ${currentView === 'maps' ? 'opacity-100' : 'opacity-60'} group-hover:opacity-100`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button 
              onClick={onHelpOpen}
              className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center transition-all hover:bg-white/10 hover:border-white/50 active:scale-90 group"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
              title="HELP_SYSTEM"
            >
              <span className="header-font text-xl font-bold opacity-60 group-hover:opacity-100">?</span>
            </button>
          </div>

          <div className="hidden lg:block text-[8px] font-mono opacity-20 uppercase tracking-[0.2em]" style={{ color: 'var(--text-color)' }}>
            {t.unitStatus}: {t.status} | SENSOR_LINK: STABLE
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <button 
            onClick={onThemeToggle}
            className="group flex flex-col items-end gap-1"
          >
            <span className="text-[7px] font-black tracking-widest transition-opacity uppercase" style={{ color: 'var(--text-color)' }}>
              {t.themeToggle}
            </span>
            <div className="flex border border-white/20 p-0.5" style={{ borderColor: 'var(--border-color)' }}>
              <div className={`w-3 h-3 ${theme === 'light' ? '' : 'opacity-0'}`} style={{ backgroundColor: 'var(--text-color)' }}></div>
              <div className={`w-3 h-3 ${theme === 'dark' ? '' : 'opacity-0'}`} style={{ backgroundColor: 'var(--text-color)' }}></div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex flex-col items-end gap-1 group"
              >
                <span className="text-[7px] font-black tracking-widest transition-opacity uppercase" style={{ color: 'var(--text-color)' }}>
                  {t.languageLabel}
                </span>
                <div className="flex items-center gap-2 border border-white/20 p-1 px-2 min-w-[100px] justify-between" style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px]">{selectedLang?.flag}</span>
                    <span className="text-[8px] font-bold tracking-tighter">{selectedLang?.code.toUpperCase()}</span>
                  </div>
                  <span className="text-[7px] opacity-40">{isLangOpen ? '▲' : '▼'}</span>
                </div>
              </button>
              
              {isLangOpen && (
                <div className="absolute top-full right-0 mt-1 w-36 border shadow-2xl overflow-hidden z-[60]" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-[9px] transition-colors flex items-center justify-between ${
                        language === lang.code ? 'bg-white text-black' : 'hover:bg-white/10'
                      }`}
                      style={language === lang.code ? { backgroundColor: 'var(--text-color)', color: 'var(--bg-color)' } : { color: 'var(--text-color)' }}
                    >
                      <span>{lang.flag} {lang.label}</span>
                      {language === lang.code && <span className="text-[7px]">●</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TerminalHeader;
