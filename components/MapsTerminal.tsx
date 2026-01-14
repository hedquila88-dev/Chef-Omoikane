
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Translations, UserDiagnostics } from '../types';
import { analyzeNearbyPlaces } from '../services/geminiService';
import { LANGUAGES } from '../App';

interface Props {
  t: Translations;
  diagnostics: UserDiagnostics;
  onUpdate: (updates: Partial<UserDiagnostics>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface RestaurantResult {
  name: string;
  type: string;
  color: 'GREEN' | 'YELLOW' | 'RED';
  time: string;
  reason: string;
  navUrl?: string;
}

const MapsTerminal: React.FC<Props> = ({ t, diagnostics, onUpdate, setLoading, setError }) => {
  const [rawResult, setRawResult] = useState<string>('');
  const [activeMicField, setActiveMicField] = useState<string | null>(null);
  const [lastSyncProfile, setLastSyncProfile] = useState(diagnostics.healthProfile);
  const [localHealth, setLocalHealth] = useState(diagnostics.healthProfile);

  useEffect(() => {
    setLocalHealth(diagnostics.healthProfile);
  }, [diagnostics.healthProfile]);

  const selectedLang = LANGUAGES.find(l => l.code === diagnostics.language);

  const handleUpdateHealth = (val: string) => {
    setLocalHealth(val);
    onUpdate({ healthProfile: val });
  };

  const parsedResults = useMemo(() => {
    if (!rawResult) return [];
    
    const blocks = rawResult.split(/\[PLACE:/g).slice(1);
    return blocks.map(block => {
      const name = block.split(']')[0].trim();
      const typeMatch = block.match(/\[TYPE:\s*([^\]]+)\]/i);
      const colorMatch = block.match(/\[COLOR:\s*(GREEN|YELLOW|RED)\]/i);
      const timeMatch = block.match(/\[TIME:\s*([^\]]+)\]/i);
      const reasonMatch = block.match(/\[REASON:\s*([^\]]+)\]/i);
      const navMatch = block.match(/\[NAV:\s*([^\]]+)\]/i);

      return {
        name,
        type: typeMatch?.[1] || 'Unknown',
        color: (colorMatch?.[1]?.toUpperCase() || 'YELLOW') as any,
        time: timeMatch?.[1] || '-- min',
        reason: reasonMatch?.[1] || '',
        navUrl: navMatch?.[1]
      } as RestaurantResult;
    });
  }, [rawResult]);

  const handleActivateScan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRawResult('');

    if (!navigator.geolocation) {
      setError(t.gpsError);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await analyzeNearbyPlaces(
            "restaurants, cafes, and bakeries",
            { ...diagnostics, healthProfile: localHealth },
            latitude,
            longitude
          );
          setRawResult(data.text);
          setLastSyncProfile(localHealth);
        } catch (err: any) {
          setError(err.message || t.error);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(`${t.gpsError} (${err.message})`);
        setLoading(false);
      }
    );
  }, [diagnostics, localHealth, t, setLoading, setError]);

  const startVoiceInput = useCallback((field: 'health') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang?.speechCode || 'it-IT';
    recognition.onstart = () => setActiveMicField(field);
    recognition.onend = () => setActiveMicField(null);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleUpdateHealth(localHealth ? `${localHealth} ${transcript}` : transcript);
    };
    recognition.start();
  }, [selectedLang, localHealth]);

  const profileChanged = localHealth !== lastSyncProfile && rawResult !== '';

  const getThemeColor = (color: string) => {
    switch(color) {
      case 'GREEN': return '#22c55e';
      case 'YELLOW': return '#eab308';
      case 'RED': return '#ef4444';
      default: return 'var(--text-color)';
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-6">
        {/* HEALTH INPUT BOX */}
        <div className={`glow-border p-6 bg-black/30 border-2 transition-all duration-500 ${profileChanged ? 'border-yellow-500 animate-[glow-pulse_2s_infinite]' : ''}`} style={{ borderColor: profileChanged ? undefined : 'var(--border-color)' }}>
          <div className="flex justify-between items-center mb-6">
            <div className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${profileChanged ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 opacity-50'}`}></span>
              {t.activeClinicalProfile}
            </div>
            {profileChanged && (
              <button 
                onClick={handleActivateScan}
                className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-yellow-500 text-black hover:bg-yellow-400 transition-all flex items-center gap-3 active:scale-95 shadow-[0_0_20px_rgba(234,179,8,0.3)]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t.reanalyzeBtn}
              </button>
            )}
          </div>
          <div className="relative">
            <textarea 
              className="w-full bg-transparent border-b border-white/10 text-[14px] py-4 pr-16 outline-none focus:border-white/40 transition-all font-mono min-h-[80px] resize-none leading-relaxed" 
              style={{ color: 'var(--text-color)' }} 
              value={localHealth} 
              onChange={(e) => handleUpdateHealth(e.target.value)} 
              placeholder={t.healthProfilePlace}
            />
            <button
              onClick={() => startVoiceInput('health')}
              className={`absolute right-0 top-4 p-3 rounded-full transition-all ${activeMicField === 'health' ? 'recording-pulse' : 'opacity-30 hover:opacity-100'}`}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            </button>
          </div>
        </div>

        {/* BIO-LOCATOR PROTOCOL INFO */}
        <div className="glow-border p-6 bg-white/5 border-2 border-dashed opacity-80" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t.systemInfo}
          </div>
          <div className="space-y-4">
             <p className="text-[11px] font-mono leading-relaxed opacity-60">
               {t.mapsExplainer}
             </p>
             <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter opacity-40">
                   <span className="w-1.5 h-1.5 bg-green-500"></span> {t.safeZone}
                </div>
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter opacity-40">
                   <span className="w-1.5 h-1.5 bg-yellow-500"></span> {t.bioCaution}
                </div>
                <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter opacity-40">
                   <span className="w-1.5 h-1.5 bg-red-500"></span> {t.criticalRestriction}
                </div>
             </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleActivateScan}
        className="w-full py-10 header-font font-black text-sm uppercase tracking-[0.5em] border-4 transition-all active:scale-95 hover:bg-white hover:text-black hover:shadow-[0_0_50px_rgba(255,255,255,0.2)]"
        style={{ borderColor: 'var(--text-color)', color: 'var(--text-color)' }}
      >
        {t.gpsBtn}
      </button>

      {/* RESULTS LIST - ENHANCED CARDS */}
      <div className="space-y-6">
        {parsedResults.map((res, i) => (
          <div key={i} className="border-2 overflow-hidden bg-black/50 group animate-in slide-in-from-right-4 duration-500" style={{ borderColor: 'var(--border-color)', animationDelay: `${i * 100}ms` }}>
            {/* Header: Color-coded Box */}
            <div 
              className="px-6 py-4 flex justify-between items-start" 
              style={{ backgroundColor: getThemeColor(res.color) }}
            >
              <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                <h3 className="text-black font-black text-lg uppercase tracking-tight truncate leading-none">
                  {res.name}
                </h3>
                <span className="text-black/60 text-[10px] font-black uppercase tracking-[0.2em] font-mono mt-1">
                   {res.type}
                </span>
              </div>
              <div className="bg-black text-white px-3 py-1.5 text-[11px] font-mono font-bold tracking-tighter whitespace-nowrap border border-white/20 shadow-lg shrink-0">
                {res.time}
              </div>
            </div>

            {/* Content: Reason and Navigation */}
            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <p className="text-[13px] font-mono leading-relaxed opacity-90 flex-1 border-l-2 pl-4" style={{ borderColor: getThemeColor(res.color) }}>
                {res.reason}
              </p>
              
              <a 
                href={res.navUrl || `https://www.google.com/maps/search/${encodeURIComponent(res.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-3 border-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-white hover:text-black active:scale-90 whitespace-nowrap"
                style={{ borderColor: 'var(--text-color)', color: 'var(--text-color)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t.navigate}
              </a>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes glow-pulse {
          0%, 100% { border-color: rgba(234, 179, 8, 0.4); box-shadow: 0 0 10px rgba(234, 179, 8, 0.1); }
          50% { border-color: rgba(234, 179, 8, 1); box-shadow: 0 0 20px rgba(234, 179, 8, 0.4); }
        }
      `}</style>
    </div>
  );
};

export default MapsTerminal;
