
import React from 'react';
import { ChefHat } from 'lucide-react';
import { Translations } from '../types';

interface Props {
  t: Translations;
  onClose: () => void;
}

const HelpModal: React.FC<Props> = ({ t, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div 
        className="w-full max-w-2xl glow-border p-6 md:p-10 relative animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] custom-scrollbar"
        onClick={e => e.stopPropagation()}
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-10 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
          <h2 className="header-font text-xl font-bold tracking-tighter uppercase" style={{ color: 'var(--text-color)' }}>
            {t.helpTitle}
          </h2>
        </div>

        <div className="space-y-12 font-mono">
          {/* Quick Guide Visual Section */}
          <section className="p-6 border-l-4" style={{ borderColor: 'var(--text-color)', backgroundColor: 'var(--sub-bg)' }}>
            <h3 className="text-[10px] font-black tracking-widest uppercase mb-6 opacity-80" style={{ color: 'var(--text-color)' }}>
              {t.quickStartProtocol}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-3">
                <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center mx-auto text-xs font-bold">1</div>
                <div className="text-[9px] uppercase font-bold tracking-widest leading-tight">{t.step1}</div>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center mx-auto text-xs font-bold">2</div>
                <div className="text-[9px] uppercase font-bold tracking-widest leading-tight">{t.step2}</div>
              </div>
              <div className="space-y-3">
                <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center mx-auto text-xs font-bold">3</div>
                <div className="text-[9px] uppercase font-bold tracking-widest leading-tight">{t.step3}</div>
              </div>
            </div>
          </section>

          {/* Q&A Section */}
          <section className="space-y-8">
            <div>
              <h3 className="text-[10px] font-black tracking-widest uppercase mb-3 opacity-50" style={{ color: 'var(--text-color)' }}>
                01 // {t.helpQ1}
              </h3>
              <p className="text-sm leading-relaxed opacity-90" style={{ color: 'var(--text-color)' }}>
                {t.helpA1}
              </p>
            </div>

            <div>
              <h3 className="text-[10px] font-black tracking-widest uppercase mb-3 opacity-50" style={{ color: 'var(--text-color)' }}>
                02 // {t.helpQ2}
              </h3>
              <p className="text-sm leading-relaxed opacity-90" style={{ color: 'var(--text-color)' }}>
                {t.helpA2}
              </p>
            </div>

            <div>
              <h3 className="text-[10px] font-black tracking-widest uppercase mb-3 opacity-50" style={{ color: 'var(--text-color)' }}>
                03 // {t.helpQ3}
              </h3>
              <p className="text-sm leading-relaxed opacity-90" style={{ color: 'var(--text-color)' }}>
                {t.helpA3}
              </p>
            </div>

            <div>
              <h3 className="text-[10px] font-black tracking-widest uppercase mb-3 opacity-50" style={{ color: 'var(--text-color)' }}>
                04 // {t.helpQ4}
              </h3>
              <p className="text-sm leading-relaxed opacity-90" style={{ color: 'var(--text-color)' }}>
                {t.helpA4}
              </p>
            </div>
          </section>

          {/* Critical Warning */}
          <section className="pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            {/* AI Assistant Note */}
            <div className="p-4 border flex items-center gap-4" style={{ borderColor: 'var(--sub-border)', backgroundColor: 'var(--sub-bg)' }}>
              <div className="w-10 h-10 flex items-center justify-center border rounded-full" style={{ borderColor: 'var(--sub-border)' }}>
                <ChefHat className="w-5 h-5" style={{ color: 'var(--text-color)' }} />
              </div>
              <p className="text-[11px] leading-snug" style={{ color: 'var(--text-color)' }}>
                {t.helpAssistantNote}
              </p>
            </div>

            <div className="p-5 border" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">
                  {t.helpSafetyTitle}
                </span>
              </div>
              <p className="text-[10px] italic leading-tight opacity-70" style={{ color: 'var(--text-color)' }}>
                {t.medicalDisclaimer}
              </p>
            </div>
          </section>
        </div>

        <div className="mt-12 flex justify-center">
          <button 
            onClick={onClose}
            className="px-10 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_5px_15px_rgba(255,255,255,0.2)]"
          >
            {t.status}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
