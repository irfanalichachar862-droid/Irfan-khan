import React, { useState } from 'react';
import { Check, Palette, RotateCcw, Sparkles, X } from 'lucide-react';
import { AppTheme, THEME_PRESETS } from '../utils/themePresets';

interface ThemeCustomizerModalProps {
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({
  currentTheme,
  onSelectTheme,
  onClose,
}) => {
  const [customPrimary, setCustomPrimary] = useState<string>(currentTheme.primary);
  const [customSecondary, setCustomSecondary] = useState<string>(currentTheme.secondary);
  const [customBg, setCustomBg] = useState<string>(currentTheme.bg);
  const [customSurface, setCustomSurface] = useState<string>(currentTheme.surface);

  const handleApplyCustom = () => {
    const customTheme: AppTheme = {
      id: 'custom_user',
      name: 'Custom User Theme',
      tagline: 'Personalized ScanWake color palette',
      primary: customPrimary,
      secondary: customSecondary,
      accent: customPrimary,
      bg: customBg,
      surface: customSurface,
      surfaceHover: customSurface,
    };
    onSelectTheme(customTheme);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-customizer-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        style={{ backgroundColor: 'var(--sw-surface)', borderColor: 'var(--sw-primary)' }}
        className="border rounded-2xl max-w-2xl w-full p-5 sm:p-6 text-white shadow-2xl relative my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sw-primary) 15%, transparent)',
                color: 'var(--sw-primary)',
                borderColor: 'color-mix(in srgb, var(--sw-primary) 40%, transparent)',
              }}
              className="p-2 rounded-xl border"
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 id="theme-customizer-title" className="text-lg font-bold text-white">
                Theme & Color Customization
              </h2>
              <p className="text-xs text-gray-400">
                Select a curated dark-tech palette or design your own colors
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Theme Customizer"
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Themes Grid */}
        <div className="py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--sw-primary)' }} />
            <span>Curated Theme Presets ({THEME_PRESETS.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto no-scrollbar pr-0.5">
            {THEME_PRESETS.map((preset) => {
              const isSelected = currentTheme.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelectTheme(preset);
                    setCustomPrimary(preset.primary);
                    setCustomSecondary(preset.secondary);
                    setCustomBg(preset.bg);
                    setCustomSurface(preset.surface);
                  }}
                  style={{
                    backgroundColor: preset.bg,
                    borderColor: isSelected ? preset.primary : '#26303B',
                  }}
                  className="p-3 rounded-xl border-2 text-left transition flex items-center justify-between hover:opacity-95"
                >
                  <div className="pr-2 truncate">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs sm:text-sm text-white truncate">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 shrink-0" style={{ color: preset.primary }} />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{preset.tagline}</p>
                  </div>

                  {/* Color Swatch Pills */}
                  <div className="flex items-center -space-x-1.5 shrink-0">
                    <span
                      style={{ backgroundColor: preset.primary }}
                      className="w-5 h-5 rounded-full border border-black/60 shadow"
                    />
                    <span
                      style={{ backgroundColor: preset.secondary }}
                      className="w-5 h-5 rounded-full border border-black/60 shadow"
                    />
                    <span
                      style={{ backgroundColor: preset.surface }}
                      className="w-5 h-5 rounded-full border border-gray-600 shadow"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Color Studio */}
        <div
          style={{ backgroundColor: 'var(--sw-bg)' }}
          className="p-4 rounded-xl border border-gray-800 mt-2"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Custom Palette Mixer
            </span>
            <button
              type="button"
              onClick={() => {
                const def = THEME_PRESETS[0];
                onSelectTheme(def);
                setCustomPrimary(def.primary);
                setCustomSecondary(def.secondary);
                setCustomBg(def.bg);
                setCustomSurface(def.surface);
              }}
              className="text-[11px] text-gray-400 hover:text-white flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Default</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Primary Accent</label>
              <div className="flex items-center space-x-2 bg-[#1C232B] p-1.5 rounded-lg border border-gray-700">
                <input
                  type="color"
                  value={customPrimary}
                  onChange={(e) => setCustomPrimary(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-mono text-gray-200 uppercase">{customPrimary}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Action / Secondary</label>
              <div className="flex items-center space-x-2 bg-[#1C232B] p-1.5 rounded-lg border border-gray-700">
                <input
                  type="color"
                  value={customSecondary}
                  onChange={(e) => setCustomSecondary(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-mono text-gray-200 uppercase">{customSecondary}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Background</label>
              <div className="flex items-center space-x-2 bg-[#1C232B] p-1.5 rounded-lg border border-gray-700">
                <input
                  type="color"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-mono text-gray-200 uppercase">{customBg}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-gray-400 mb-1">Card Surface</label>
              <div className="flex items-center space-x-2 bg-[#1C232B] p-1.5 rounded-lg border border-gray-700">
                <input
                  type="color"
                  value={customSurface}
                  onChange={(e) => setCustomSurface(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs font-mono text-gray-200 uppercase">{customSurface}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyCustom}
            style={{ backgroundColor: customPrimary, color: customBg }}
            className="w-full mt-3 py-2 rounded-xl text-xs font-bold transition hover:opacity-90"
          >
            Apply Custom Colors
          </button>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            style={{ backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }}
            className="py-2 px-6 rounded-xl text-xs font-bold transition hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
