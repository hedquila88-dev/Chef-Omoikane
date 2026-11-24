
import React, { useState, useRef, useEffect } from 'react';
import { Recipe, Translations } from '../types';
import { jsPDF } from 'jspdf';

interface Props {
  recipe: Recipe;
  t: Translations;
}

const RecipeDisplay: React.FC<Props> = ({ recipe, t }) => {
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getFullText = () => {
    return `
# ${recipe.title}
---
${t.cookingTimeLabel.toUpperCase()}: ${recipe.cookingTime}

${recipe.allergenWarning ? `!!! ${recipe.allergenSeverity === 'high' ? t.helpSafetyTitle.toUpperCase() : 'DIETARY NOTICE'} !!!\n${recipe.allergenWarning}\n---\n` : ''}

${t.chefProfile.toUpperCase()}
${recipe.dietaryFit}

${t.gastronomicComponents.toUpperCase()}
${recipe.ingredients.map(ing => `- ${ing.name}: ${ing.amount} (${ing.function})`).join('\n')}

${t.protocol.toUpperCase()}
${recipe.procedure.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

${t.nutritionalSpecs.toUpperCase()} (PER 100G)
- Calories: ${recipe.macros.calories}
- Protein: ${recipe.macros.protein}
- Carbs: ${recipe.macros.carbs}
- Fats: ${recipe.macros.fats}
- Fiber: ${recipe.macros.fiber}

${t.macroDisclaimer}

${t.scienceLog.toUpperCase()}
${recipe.scienceCheck}
    `.trim();
  };

  const handleShare = async () => {
    const text = getFullText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: text,
        });
      } catch (err) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getFullText()).then(() => {
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
      setIsExportOpen(false);
    });
  };

  const downloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([getFullText()], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${recipe.title.replace(/\s+/g, '_')}_Omoikane.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setIsExportOpen(false);
  };

  const generatePdf = () => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const maxLineWidth = pageWidth - margin * 2;
    
    let cursorY = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(recipe.title.toUpperCase(), margin, cursorY);
    cursorY += 10;

    // Cooking Time
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${t.cookingTimeLabel.toUpperCase()}: ${recipe.cookingTime}`, margin, cursorY);
    cursorY += 10;

    // Allergen Warning
    if (recipe.allergenWarning) {
      const isHigh = recipe.allergenSeverity === 'high';
      doc.setFont("helvetica", "bold");
      if (isHigh) {
        doc.setTextColor(200, 0, 0);
        doc.text(t.helpSafetyTitle.toUpperCase(), margin, cursorY);
      } else {
        doc.setTextColor(184, 134, 11); // DarkGoldenRod for yellow-ish warn
        doc.text("DIETARY NOTICE", margin, cursorY);
      }
      cursorY += 6;
      doc.setFont("helvetica", "normal");
      const warningLines = doc.splitTextToSize(recipe.allergenWarning, maxLineWidth);
      doc.text(warningLines, margin, cursorY);
      cursorY += warningLines.length * 5 + 8;
      doc.setTextColor(0, 0, 0); // Reset color
    }

    // Chef's Profile
    doc.setFont("helvetica", "bold");
    doc.text(t.chefProfile.toUpperCase() + ":", margin, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    const dietaryLines = doc.splitTextToSize(recipe.dietaryFit, maxLineWidth);
    doc.text(dietaryLines, margin, cursorY);
    cursorY += dietaryLines.length * 5 + 8;

    // Ingredients
    doc.setFont("helvetica", "bold");
    doc.text(t.gastronomicComponents.toUpperCase() + ":", margin, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    recipe.ingredients.forEach(ing => {
      const line = `- ${ing.name}: ${ing.amount} (${ing.function})`;
      const ingLines = doc.splitTextToSize(line, maxLineWidth);
      doc.text(ingLines, margin, cursorY);
      cursorY += ingLines.length * 5;
    });
    cursorY += 8;

    // Procedure
    if (cursorY > 250) { doc.addPage(); cursorY = margin; }
    doc.setFont("helvetica", "bold");
    doc.text(t.protocol.toUpperCase() + ":", margin, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    recipe.procedure.forEach((step, idx) => {
      const line = `${idx + 1}. ${step}`;
      const stepLines = doc.splitTextToSize(line, maxLineWidth);
      if (cursorY + stepLines.length * 5 > 280) { doc.addPage(); cursorY = margin; }
      doc.text(stepLines, margin, cursorY);
      cursorY += stepLines.length * 5 + 2;
    });
    cursorY += 8;

    // Nutritional Specs
    if (cursorY > 250) { doc.addPage(); cursorY = margin; }
    doc.setFont("helvetica", "bold");
    doc.text(t.nutritionalSpecs.toUpperCase() + " (PER 100G):", margin, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    const macros = [
      `Calories: ${recipe.macros.calories}`,
      `Protein: ${recipe.macros.protein}`,
      `Carbs: ${recipe.macros.carbs}`,
      `Fats: ${recipe.macros.fats}`,
      `Fiber: ${recipe.macros.fiber}`
    ];
    macros.forEach(m => {
      doc.text(m, margin, cursorY);
      cursorY += 5;
    });
    cursorY += 2;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    const disclaimerLines = doc.splitTextToSize(t.macroDisclaimer, maxLineWidth);
    doc.text(disclaimerLines, margin, cursorY);
    cursorY += disclaimerLines.length * 4 + 8;

    // Science Log
    if (cursorY > 250) { doc.addPage(); cursorY = margin; }
    doc.setFont("helvetica", "bold");
    doc.text(t.scienceLog.toUpperCase() + ":", margin, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "italic");
    const scienceLines = doc.splitTextToSize(recipe.scienceCheck, maxLineWidth);
    doc.text(scienceLines, margin, cursorY);

    doc.save(`${recipe.title.replace(/\s+/g, '_')}_Omoikane.pdf`);
    setIsExportOpen(false);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 printable-recipe">
      <div className="glow-border p-6 md:p-10 rounded-none border-t-4 relative overflow-x-hidden" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', borderTopColor: 'var(--text-color)' }}>
        <div className="absolute top-4 right-4 md:right-10 flex flex-col items-end gap-2 no-print">
          {showCopyFeedback && (
            <span className="text-[7px] font-bold tracking-tighter opacity-80" style={{ color: 'var(--text-color)' }}>
              {t.copySuccess}
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-baseline gap-4 mb-2">
           <h2 className="header-font text-lg md:text-2xl font-black tracking-tighter uppercase italic leading-tight pr-24 md:pr-0" style={{ color: 'var(--text-color)' }}>
            {recipe.title}
          </h2>
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest opacity-60 uppercase">
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             {t.cookingTimeLabel}: <span className="text-[var(--text-color)] opacity-100">{recipe.cookingTime}</span>
          </div>
        </div>



        {recipe.allergenWarning && (
          <div 
            className="mb-8 p-5 border-l-4 font-mono text-[11px] leading-relaxed animate-in slide-in-from-left-2 duration-500"
            style={{ 
              backgroundColor: recipe.allergenSeverity === 'high' ? 'rgba(255, 51, 51, 0.05)' : 'rgba(255, 204, 0, 0.05)', 
              borderColor: recipe.allergenSeverity === 'high' ? 'var(--red-safe)' : 'var(--yellow-warn)',
              color: recipe.allergenSeverity === 'high' ? 'var(--red-safe)' : 'var(--yellow-warn)'
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                {recipe.allergenSeverity === 'high' ? (
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                ) : (
                  <path d="M13 16h-2v-2h2v2zm0-4h-2V7h2v4zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                )}
              </svg>
              <span className="font-bold uppercase tracking-widest text-[12px]">{recipe.allergenSeverity === 'high' ? t.helpSafetyTitle : 'DIETARY NOTICE'}</span>
            </div>
            {recipe.allergenWarning}
          </div>
        )}
        
        <div className="mb-10 p-4 md:p-6 border text-sm leading-relaxed font-mono overflow-x-auto whitespace-pre-wrap" style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
          <span className="font-bold block mb-2 uppercase text-[10px] tracking-[0.4em] opacity-80">{t.chefProfile}:</span>
          {recipe.dietaryFit}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 space-y-10">
            <div className="overflow-x-auto">
              <h3 className="header-font text-[11px] font-bold mb-6 border-b pb-2 uppercase tracking-widest" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>{t.gastronomicComponents}</h3>
              <ul className="space-y-4 min-w-[200px]">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="text-[13px] font-bold uppercase truncate" title={ing.name}>{ing.name}</span>
                      <span className="text-[11px] opacity-80 font-mono whitespace-nowrap" style={{ color: 'var(--text-color)' }}>{ing.amount}</span>
                    </div>
                    <div className="text-[9px] opacity-60 italic mt-1" style={{ color: 'var(--text-color)' }}>
                      // {ing.function}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 md:p-6 border overflow-x-auto" style={{ backgroundColor: 'var(--sub-bg)', borderColor: 'var(--border-color)' }}>
              <h3 className="header-font text-[9px] mb-4 uppercase font-bold tracking-widest" style={{ color: 'var(--text-color)' }}>{t.nutritionalSpecs} (100g)</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-[11px] font-mono min-w-[150px]">
                <div className="flex flex-col"><span className="text-[8px] opacity-60 uppercase" style={{ color: 'var(--text-color)' }}>Kcal / 100g</span> <span style={{ color: 'var(--text-color)' }}>{recipe.macros.calories}</span></div>
                <div className="flex flex-col"><span className="text-[8px] opacity-60 uppercase" style={{ color: 'var(--text-color)' }}>Prot / 100g</span> <span style={{ color: 'var(--text-color)' }}>{recipe.macros.protein}</span></div>
                <div className="flex flex-col"><span className="text-[8px] opacity-60 uppercase" style={{ color: 'var(--text-color)' }}>Carb / 100g</span> <span style={{ color: 'var(--text-color)' }}>{recipe.macros.carbs}</span></div>
                <div className="flex flex-col"><span className="text-[8px] opacity-60 uppercase" style={{ color: 'var(--text-color)' }}>Lipid / 100g</span> <span style={{ color: 'var(--text-color)' }}>{recipe.macros.fats}</span></div>
              </div>
              <p className="mt-4 text-[7px] leading-tight italic opacity-60 uppercase tracking-tighter" style={{ color: 'var(--text-color)' }}>
                {t.macroDisclaimer}
              </p>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-10">
            <div className="overflow-x-auto">
              <h3 className="header-font text-[11px] font-bold mb-8 border-b pb-2 uppercase tracking-widest" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>{t.protocol}</h3>
              <ol className="space-y-6 min-w-[250px]">
                {recipe.procedure.map((step, idx) => (
                  <li key={idx} className="flex gap-4 items-start group">
                    <span className="header-font font-black text-xl leading-none" style={{ color: 'var(--text-color)' }}>0{idx + 1}</span>
                    <p className="text-sm leading-relaxed pt-1 pl-4 border-l group-hover:opacity-100 opacity-80 transition-opacity" style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="border relative mt-16 shadow-[0_0_20px_rgba(255,255,255,0.05)]" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
              <div className="absolute -top-3 left-6 px-2 header-font text-[9px] font-bold uppercase tracking-widest border" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>
                {t.scienceLog}
              </div>
              <div className="p-4 md:p-6 overflow-x-auto whitespace-pre-wrap">
                <p className="text-xs leading-relaxed italic font-mono min-w-[200px]" style={{ color: 'var(--text-color)' }}>
                  {recipe.scienceCheck}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Dropdown Bottom Left - Simplified and Compact */}
        <div className="mt-12 flex justify-start no-print" ref={dropdownRef}>
          <div className="relative">
            <button 
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center gap-2 px-3 py-1.5 border text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
              style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t.exportOptions}
              <span className={`text-[8px] transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`}>▲</span>
            </button>
            
            {isExportOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-44 border shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-2 fade-in duration-200" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                <button 
                  onClick={copyToClipboard}
                  className="px-4 py-3 text-left text-[9px] uppercase font-bold tracking-widest transition-colors flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ color: 'var(--text-color)' }}
                >
                  {t.copyText}
                  <span className="opacity-40 text-[11px]">❐</span>
                </button>
                <button 
                  onClick={downloadTxt}
                  className="px-4 py-3 text-left text-[9px] uppercase font-bold tracking-widest border-t transition-colors flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                >
                  {t.downloadTxt}
                  <span className="opacity-40 text-[11px]">📄</span>
                </button>
                <button 
                  onClick={generatePdf}
                  className="px-4 py-3 text-left text-[9px] uppercase font-bold tracking-widest border-t transition-colors flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10"
                  style={{ color: 'var(--text-color)', borderColor: 'var(--border-color)' }}
                >
                  {t.downloadPdf}
                  <span className="opacity-40 text-[11px]">⎙</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .printable-recipe { padding: 0 !important; margin: 0 !important; }
          .glow-border { border: 1px solid #ccc !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default RecipeDisplay;
