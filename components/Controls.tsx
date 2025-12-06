import React from 'react';
import { Lightbulb, RotateCw, Pause, BoxSelect, Box } from 'lucide-react';

interface ControlsProps {
  isLightsOn: boolean;
  toggleLights: () => void;
  autoRotate: boolean;
  toggleAutoRotate: () => void;
  isFormed: boolean;
  toggleForm: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ 
  isLightsOn, 
  toggleLights, 
  autoRotate, 
  toggleAutoRotate,
  isFormed,
  toggleForm,
}) => {

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 p-4 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/40 shadow-lg shadow-black/5">
       
       <button
        onClick={toggleForm}
        className={`
          flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-700 font-serif tracking-wider border
          ${isFormed 
            ? 'bg-emerald-900/80 text-emerald-50 border-emerald-800 hover:bg-emerald-800' 
            : 'bg-gold-500 text-black border-gold-400 hover:bg-gold-400 shadow-[0_0_20px_rgba(255,215,0,0.5)]'}
        `}
      >
        {isFormed ? <BoxSelect size={18} /> : <Box size={18} />}
        <span>{isFormed ? 'Deconstruct' : 'Assemble'}</span>
      </button>

      <div className="w-[1px] h-8 bg-emerald-900/20 mx-1 hidden sm:block"></div>

      <button
        onClick={toggleLights}
        className={`
          flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-500 font-serif tracking-wider border
          ${isLightsOn 
            ? 'bg-amber-500/20 text-amber-700 border-amber-500/30' 
            : 'bg-black/5 text-emerald-900 border-transparent hover:bg-black/10'}
        `}
      >
        <Lightbulb size={18} className={isLightsOn ? 'fill-amber-500 text-amber-500' : 'text-slate-400'} />
        <span className="hidden sm:inline">{isLightsOn ? 'Lights On' : 'Lights Off'}</span>
      </button>

      <button
        onClick={toggleAutoRotate}
        className={`
          flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 font-serif tracking-wider border
          ${autoRotate 
            ? 'bg-white/40 text-emerald-950 border-white/30' 
            : 'bg-black/5 text-emerald-900 border-transparent hover:bg-black/10'}
        `}
      >
        {autoRotate ? <Pause size={18} /> : <RotateCw size={18} />}
      </button>
    </div>
  );
};