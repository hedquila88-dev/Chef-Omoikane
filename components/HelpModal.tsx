
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, X, Info, AlertTriangle, ShieldCheck, UtensilsCrossed, Camera, MapPin } from 'lucide-react';
import { Translations } from '../types';

interface Props {
  t: Translations;
  onClose: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const HelpModal: React.FC<Props> = ({ t, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-500"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl border-2 p-6 md:p-10 relative overflow-y-auto max-h-[90vh] custom-scrollbar shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 transition-all hover:bg-white/10 group"
          style={{ color: 'var(--text-color)' }}
        >
          <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
        </button>

        {/* SYSTEM STATUS HEADER */}
        <div className="flex flex-col gap-1 md:mb-10 mb-2 border-b md:pb-6 pb-2" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <h2 className="header-font md:text-2xl text-lg font-black tracking-tight uppercase" style={{ color: 'var(--text-color)' }}>
                SYSTEM_GUIDE
              </h2>
            </div>
          </div>
          <div className="text-[9px] font-mono opacity-50 uppercase tracking-[0.1em] md:block hidden">
            Operational Protocol and Feature Matrix
          </div>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="md:space-y-12 space-y-2 font-mono"
        >
          {/* USER WORKFLOW */}
          <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-2 md:divide-x divide-white/10 border-y md:py-8 py-3" style={{ borderColor: 'var(--border-color)' }}>
            {[
              { id: '01', title: t.step1, desc: "DIETARY CONFIG" },
              { id: '02', title: t.step2, desc: "RECIPE SYNTHESIS" },
              { id: '03', title: t.step3, desc: "LIVE ANALYSIS" }
            ].map((step) => (
              <div key={step.id} className="md:px-6 px-1 flex md:flex-col items-center md:items-start gap-4 md:gap-4 md:space-y-4">
                <div className="text-[10px] md:opacity-40 font-black shrink-0 border md:border-0 p-1 md:p-0 min-w-[24px] text-center" style={{ borderColor: 'var(--border-color)' }}>{step.id}</div>
                <div className="flex flex-col">
                  <div className="text-[10px] md:text-xs font-bold leading-tight uppercase md:tracking-widest">{step.title}</div>
                  <div className="text-[8px] md:text-[9px] opacity-40 md:opacity-50 md:tracking-[0.3em]">{step.desc}</div>
                </div>
              </div>
            ))}
          </motion.section>

          {/* FUNCTIONAL SPECS */}
          <motion.section variants={itemVariants} className="md:space-y-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-10 gap-6">
              <div className="space-y-2 md:space-y-4">
                <h3 className="text-[10px] font-black tracking-widest uppercase opacity-70 flex items-center gap-2">
                  <UtensilsCrossed className="w-3 h-3 text-orange-500" />
                  LET'S COOK SOMETHING
                </h3>
                <p className="text-[12px] leading-relaxed opacity-90 font-medium" style={{ color: 'var(--text-color)' }}>
                  Our synthesis engine creates Michelin-grade recipes tailored to your exact dietary profile. Use the form to specify target dishes or available objects.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black tracking-widest uppercase opacity-70 flex items-center gap-2">
                  <Camera className="w-3 h-3 text-blue-500" />
                  LET'S CHECK WHAT WE GOT
                </h3>
                <p className="text-[12px] leading-relaxed opacity-90 font-medium" style={{ color: 'var(--text-color)' }}>
                  Real-time visual analysis. Point your camera at a dish or menu to identify allergens and nutritional density based on your current health status.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black tracking-widest uppercase opacity-70 flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-green-500" />
                  GASTRONOMIC LOCATOR
                </h3>
                <p className="text-[12px] leading-relaxed opacity-90 font-medium" style={{ color: 'var(--text-color)' }}>
                  Activate geo-analysis to find secure venues nearby. We cross-reference their known menus against your restrictions for a safe dining experience.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black tracking-widest uppercase opacity-70 flex items-center gap-2">
                  <ChefHat className="w-3 h-3" style={{ color: 'var(--text-color)' }} />
                  AI ASSISTANT (OMOI_BOT)
                </h3>
                <p className="text-[12px] leading-relaxed opacity-90 font-medium" style={{ color: 'var(--text-color)' }}>
                  Click the Chef Hat icon for conversational support. OMOI_BOT can navigate sectors, pre-fill synthesis data, and provide technical culinary advice.
                </p>
              </div>
            </div>
          </motion.section>

          {/* PROTOCOL OVERLAYS */}
          <motion.section variants={itemVariants} className="pt-10 border-t space-y-6" style={{ borderColor: 'var(--border-color)' }}>
            <div className="p-6 border-2 border-dashed flex items-start gap-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--sub-bg)' }}>
              <ShieldCheck className="w-6 h-6 mt-1 flex-shrink-0 opacity-60" />
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest">Privacy & Integrity Protocol</div>
                <p className="text-[11px] leading-relaxed opacity-70">
                  All image analysis is ephemeral. We process textures and components in real-time to ensure absolute nutritional integrity without storing personal identifiers.
                </p>
              </div>
            </div>

            <div className="p-6 border-2 border-red-500/30 bg-red-500/5 flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 mt-1 flex-shrink-0 text-red-500/60" />
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-red-500/80">Bio-Safety Notification</div>
                <p className="text-[11px] italic leading-relaxed text-red-500 font-medium">
                  {t.medicalDisclaimer}
                </p>
              </div>
            </div>
          </motion.section>
        </motion.div>

        <div className="md:mt-16 mt-8 flex justify-center">
          <button 
            onClick={onClose}
            className="md:px-12 px-10 md:py-4 py-3 text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] active:scale-95 transition-all shadow-xl"
            style={{ backgroundColor: 'var(--text-color)', color: 'var(--bg-color)' }}
          >
            CLOSE
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default HelpModal;
