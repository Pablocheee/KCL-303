import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Save,
  Trash2,
  Download,
  Upload,
  X,
  Sparkles,
  Check,
  Disc,
  Flame,
  Music,
} from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { SynthPreset } from '../engine/preset_manager';

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresetManagerModal: React.FC<PresetManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    presets,
    activePresetId,
    loadPreset,
    saveCurrentAsPreset,
    deleteUserPreset,
    exportPresetsJson,
    importPresetsJson,
  } = useEngine();

  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const categories = ['All', 'Acid', 'Gabba', 'Electro', 'Tribcore', 'Tekno', 'User'];

  const filteredPresets = presets.filter(
    (p) => selectedCategory === 'All' || p.category === selectedCategory
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const ok = saveCurrentAsPreset(newPresetName.trim(), newPresetDesc.trim());
    if (ok) {
      setNewPresetName('');
      setNewPresetDesc('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        importPresetsJson(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="bg-slate-900 border-2 border-slate-600 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-950">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black tracking-wide text-white uppercase">
              Preset & Patch Manager (Real Persistent Storage)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* 1. Save Current Settings Form */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                <Save className="w-4 h-4 text-amber-400" />
                <span>Save Current Patch & Pattern</span>
              </span>
              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
                  <Check className="w-3.5 h-3.5" /> Saved to Browser Storage!
                </span>
              )}
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="Patch Name (e.g. My Berlin Acid Bass)"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="sm:col-span-6 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                required
              />
              <input
                type="text"
                placeholder="Description / Author"
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
                className="sm:col-span-4 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="sm:col-span-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-1.5 px-3 rounded-lg transition shadow cursor-pointer flex items-center justify-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </form>
          </div>

          {/* 2. Category Filter & Import/Export Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Category Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 overflow-x-auto max-w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Export & Import JSON Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={exportPresetsJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer shadow"
                title="Download all presets as a .json backup file"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer shadow"
                title="Load presets from a .json file"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Import JSON</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* 3. Preset List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPresets.map((preset) => {
              const isActive = activePresetId === preset.id;
              const isUser = preset.category === 'User';

              return (
                <div
                  key={preset.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between space-y-2 ${
                    isActive
                      ? 'bg-slate-800/90 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-white">{preset.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            preset.category === 'Acid'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : preset.category === 'Gabba'
                              ? 'bg-red-950 text-red-300 border border-red-700 font-black'
                              : preset.category === 'Electro'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-black'
                              : preset.category === 'Tribcore'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : preset.category === 'Tekno'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {preset.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {preset.description || `Created by ${preset.author}`}
                      </p>
                    </div>

                    {isUser && (
                      <button
                        onClick={() => deleteUserPreset(preset.id)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-900 transition cursor-pointer"
                        title="Delete this custom user preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                    <div>
                      Cutoff: {preset.baseCutoffCC} | Res: {preset.baseResonanceCC} | Morph:{' '}
                      {preset.morphAmount}%
                      {preset.pitchLfoEnabled && (
                        <span className="text-emerald-400 font-bold ml-1.5">
                          • LFO {preset.pitchLfoRate?.toFixed(1) || '3.5'}Hz
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        loadPreset(preset);
                        onClose();
                      }}
                      className={`px-3 py-1 rounded font-bold text-xs transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isActive ? 'ACTIVE' : 'LOAD'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
