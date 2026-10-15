import React from 'react';
import { Palette, Moon, Sun, Sparkles, Check } from 'lucide-react';
import { UIMode, GradientMode } from '../types';
import { UI_MODE_CONFIG, GRADIENT_CONFIG } from '../utils/theme';

interface ThemeModalProps {
  currentUiMode: UIMode;
  currentGradient: GradientMode;
  onSelectUiMode: (mode: UIMode) => void;
  onSelectGradient: (grad: GradientMode) => void;
  onClose: () => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  currentUiMode,
  currentGradient,
  onSelectUiMode,
  onSelectGradient,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl p-6 bg-[#111422] border border-cyan-500/30 text-slate-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Visual Styling & Gradients</h3>
              <p className="text-xs text-slate-400">Personalize themes and chat bubble palettes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* 4 UI Modes */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-slate-300 mb-2.5 uppercase tracking-wider">
            UI Appearance Mode
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {(['dark', 'light', 'ultra-dark', 'neon'] as UIMode[]).map((mode) => {
              const info = UI_MODE_CONFIG[mode];
              const isSelected = currentUiMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onSelectUiMode(mode)}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400 shadow-lg'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center absolute top-2.5 right-2.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    {mode === 'dark' && <Moon className="w-4 h-4 text-slate-400" />}
                    {mode === 'light' && <Sun className="w-4 h-4 text-amber-400" />}
                    {mode === 'ultra-dark' && <div className="w-4 h-4 rounded-full bg-black border border-slate-700" />}
                    {mode === 'neon' && <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />}
                    <span className="text-xs font-bold text-white">{info.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                    {info.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Instagram Gradient Modes */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-slate-300 mb-2.5 uppercase tracking-wider">
            Instagram Bubble Gradient Mode
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {(['sunset', 'ocean', 'moss', 'purple'] as GradientMode[]).map((grad) => {
              const info = GRADIENT_CONFIG[grad];
              const isSelected = currentGradient === grad;
              return (
                <button
                  key={grad}
                  onClick={() => onSelectGradient(grad)}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
                    isSelected
                      ? `border-white/50 ring-2 ${info.accentRing} ${info.glowShadow} bg-slate-900/80`
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-white text-slate-950 flex items-center justify-center absolute top-2.5 right-2.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  <div className={`h-5 w-full rounded-lg bg-gradient-to-r ${info.previewColors} mb-2 shadow-sm`} />
                  <p className="text-xs font-bold text-white">{info.name}</p>
                  <p className="text-[10px] text-slate-400">{info.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          Save & Apply
        </button>
      </div>
    </div>
  );
};
