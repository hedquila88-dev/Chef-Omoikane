
import React, { useState } from 'react';
import { ChefHat, Menu, X, HelpCircle, SunMoon, Globe, UtensilsCrossed, Camera, MapPin } from 'lucide-react';
import { Translations, AppTheme, AppLanguage, AppView } from '../types';
import { LANGUAGES } from '../App';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  t: Translations;
  theme: AppTheme;
  onThemeToggle: () => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  currentView: AppView;
  setView: (view: AppView) => void;
  onHelpOpen: () => void;
  onAssistantToggle: () => void;
}

const TerminalHeader: React.FC<Props> = ({ 
  t, 
  theme, 
  onThemeToggle, 
  language, 
  setLanguage, 
  currentView, 
  setView, 
  onHelpOpen,
  onAssistantToggle
}) => {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const selectedLang = LANGUAGES.find(l => l.code === language);

  const NavButtons = ({ vertical = false }: { vertical?: boolean }) => (
    <div className={`flex ${vertical ? 'flex-col gap-4' : 'gap-2'}`}>
      <button 
        onClick={() => { setView('synthesis'); if (vertical) setIsMenuOpen(false); }}
        className={`flex items-center gap-3 transition-all hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 group border ${vertical ? 'p-4 w-full' : 'w-12 h-12 justify-center'} ${currentView === 'synthesis' ? 'bg-black/5 dark:bg-white/10' : ''}`}
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
        title={t.synthesisParams}
      >
        <UtensilsCrossed 
          className={`${vertical ? 'w-6 h-6' : 'w-6 h-6 md:w-7 md:h-7'} ${currentView === 'synthesis' ? 'opacity-100' : 'opacity-60'} group-hover:opacity-100 transition-all`} 
        />
        {vertical && <span className="text-[10px] font-bold tracking-[0.2em]">{t.synthesisParams.toUpperCase()}</span>}
      </button>
      
      <button 
        onClick={() => { setView('questions'); if (vertical) setIsMenuOpen(false); }}
        className={`flex items-center gap-3 transition-all hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 group border ${vertical ? 'p-4 w-full' : 'w-12 h-12 justify-center'} ${currentView === 'questions' ? 'bg-black/5 dark:bg-white/10' : ''}`}
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
        title={t.healthCenter}
      >
        <Camera className={`w-6 h-6 ${currentView === 'questions' ? 'opacity-100' : 'opacity-60'} group-hover:opacity-100 transition-all`} />
        {vertical && <span className="text-[10px] font-bold tracking-[0.2em]">{t.healthCenter.toUpperCase()}</span>}
      </button>

      <button 
        onClick={() => { setView('maps'); if (vertical) setIsMenuOpen(false); }}
        className={`flex items-center gap-3 transition-all hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 group border ${vertical ? 'p-4 w-full' : 'w-12 h-12 justify-center'} ${currentView === 'maps' ? 'bg-black/5 dark:bg-white/10' : ''}`}
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
        title={t.mapsTitle}
      >
        <MapPin className={`w-6 h-6 ${currentView === 'maps' ? 'opacity-100' : 'opacity-60'} group-hover:opacity-100 transition-all`} />
        {vertical && <span className="text-[10px] font-bold tracking-[0.2em]">{t.mapsTitle.toUpperCase()}</span>}
      </button>

      <button 
        onClick={() => { onAssistantToggle(); if (vertical) setIsMenuOpen(false); }}
        className={`flex items-center gap-3 transition-all hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 group border ${vertical ? 'p-4 w-full rounded-none' : 'w-12 h-12 justify-center rounded-full'} `}
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
        title="CHEF_OMOIKANE_ASSISTANT"
      >
        <ChefHat className={`w-6 h-6 opacity-60 group-hover:opacity-100`} />
        {vertical && <span className="text-[10px] font-bold tracking-[0.2em]">ASSISTANT</span>}
      </button>

      <button 
        onClick={() => { onHelpOpen(); if (vertical) setIsMenuOpen(false); }}
        className={`flex items-center gap-3 transition-all hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 group border ${vertical ? 'p-4 w-full rounded-none' : 'w-12 h-12 justify-center rounded-full'} `}
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
        title="HELP_SYSTEM"
      >
        <HelpCircle className="w-6 h-6 opacity-60 group-hover:opacity-100" />
        {vertical && <span className="text-[10px] font-bold tracking-[0.2em]">HELP</span>}
      </button>
    </div>
  );

  return (
    <header className="py-4 md:py-6 border-b theme-transition sticky top-0 z-[100] backdrop-blur-md" style={{ backgroundColor: 'var(--header-bg)', borderColor: 'var(--border-color)' }}>
      <script dangerouslySetInnerHTML={{ __html: `
        const updateHeaderHeight = () => {
          document.documentElement.style.setProperty('--header-height', document.querySelector('header')?.offsetHeight + 'px');
        };
        window.addEventListener('resize', updateHeaderHeight);
        setTimeout(updateHeaderHeight, 100);
      `}} />
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center md:items-start">
          <div className="flex flex-col gap-2 md:gap-4">
            <div>
              <h1 className="header-font text-lg md:text-2xl font-bold tracking-tighter" style={{ color: 'var(--text-color)' }}>
                CHEF OMOIKANE <span className="text-[8px] md:text-[10px] opacity-40">V.5.0</span>
              </h1>
              <p className="text-[7px] md:text-[9px] uppercase tracking-[0.3em] opacity-60" style={{ color: 'var(--text-color)' }}>{t.headerSub}</p>
            </div>
            
            <div className="hidden md:flex">
              <NavButtons />
            </div>
          </div>
          
          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-4">
            <button 
              onClick={onThemeToggle}
              className="p-2 border border-white/10 rounded-full"
              style={{ color: 'var(--text-color)' }}
            >
              <SunMoon className="w-5 h-5 opacity-60" />
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 border border-white/10 rounded-md"
              style={{ color: 'var(--text-color)' }}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          <div className="hidden md:flex flex-col items-end gap-3">
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
                          language === lang.code ? '' : 'hover:bg-black/5 dark:hover:bg-white/10'
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

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t mt-4 pt-4"
              style={{ borderColor: 'var(--sub-border)' }}
            >
              <div className="flex flex-col gap-6">
                <NavButtons vertical />
                
                <div className="border-t pt-4 pb-4" style={{ borderColor: 'var(--sub-border)' }}>
                  <div className="relative">
                    <button 
                      onClick={() => setIsLangOpen(!isLangOpen)}
                      className="w-full flex items-center justify-between p-4 border active:scale-95 transition-all"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)', backgroundColor: 'var(--sub-bg)' }}
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 opacity-60" />
                        <span className="text-[10px] font-bold tracking-[0.2em]">{t.languageLabel.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px]">{selectedLang?.flag}</span>
                        <span className="text-[10px] opacity-40">{isLangOpen ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {isLangOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-0 right-0 mb-2 border shadow-2xl overflow-hidden z-[70]"
                          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}
                        >
                          {LANGUAGES.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setLanguage(lang.code);
                                setIsLangOpen(false);
                                setIsMenuOpen(false);
                              }}
                              className={`w-full text-left px-5 py-4 text-[11px] font-bold transition-colors flex items-center justify-between border-b border-white/5 last:border-0 ${
                                language === lang.code ? 'bg-white text-black' : 'hover:bg-white/10'
                              }`}
                              style={language === lang.code ? { backgroundColor: 'var(--text-color)', color: 'var(--bg-color)' } : { color: 'var(--text-color)' }}
                            >
                              <span className="flex items-center gap-3">
                                <span className="text-[16px]">{lang.flag}</span>
                                <span className="tracking-widest">{lang.label.toUpperCase()}</span>
                              </span>
                              {language === lang.code && <span className="w-1.5 h-1.5 rounded-full bg-current"></span>}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default TerminalHeader;
