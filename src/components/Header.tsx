import React from 'react';
import { Cpu, HardDrive, Zap, ShieldCheck, RefreshCw, Layers } from 'lucide-react';
import type { ModelMetadata } from '../engine/types';

interface HeaderProps {
  modelMeta: ModelMetadata | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  activeLayerIndex: number | null;
  isStreaming: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  modelMeta,
  isGenerating,
  onRegenerate,
  activeLayerIndex,
  isStreaming,
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#0e1420]/80 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-transparent border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Cpu className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                BitNet DiskStream Engine
              </h1>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300">
                1.58-bit Ternary
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Zero-RAM-Spike Disk Streaming & Multiplication-Free Neural Inference
            </p>
          </div>
        </div>

        {/* Hardware Target & System Status */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Target Profile */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            <span className="text-slate-400">Target:</span>
            <span className="text-cyan-300 font-semibold">2015 MBA (Dual-Core i5)</span>
          </div>

          {/* Model File Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 font-mono">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Disk .bin:</span>
            <span className="text-emerald-400 font-semibold">
              {modelMeta?.exists ? `${(modelMeta.sizeBytes / 1024).toFixed(0)} KB` : 'Missing'}
            </span>
          </div>

          {/* Active Layer Badge if running */}
          {activeLayerIndex !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-mono animate-pulse">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Layer {activeLayerIndex + 1}/3 Active</span>
            </div>
          )}

          {/* Re-generate Model Button */}
          <button
            onClick={onRegenerate}
            disabled={isGenerating || isStreaming}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50 text-xs font-medium cursor-pointer"
            title="Generate new random ternary weights file on disk"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isGenerating ? 'Writing .bin...' : 'Re-seed Weights'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
