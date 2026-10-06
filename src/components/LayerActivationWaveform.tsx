import React from 'react';
import { Activity, BarChart3 } from 'lucide-react';
import type { LayerStats } from '../engine/types';

interface LayerActivationWaveformProps {
  inputVector: number[];
  layers: LayerStats[];
  outputVector: number[];
  activeLayerIdx: number | null;
}

export const LayerActivationWaveform: React.FC<LayerActivationWaveformProps> = ({
  inputVector,
  layers,
  outputVector,
  activeLayerIdx,
}) => {
  return (
    <div className="w-full bg-[#0a0f18] rounded-xl border border-slate-800 p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            Layer Activation Dynamics (256 → 512 → 512 → 128)
          </h2>
        </div>
        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <span>Non-linear Activation: <span className="text-emerald-400 font-semibold">ReLU [0, +∞)</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* 1. Input Vector (256) */}
        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300 font-mono">Input Vector</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">256 Dim</span>
          </div>

          <div className="h-20 flex items-end gap-[2px] bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
            {inputVector.slice(0, 32).map((val, idx) => {
              const heightPct = Math.min(100, Math.max(8, val * 100));
              return (
                <div
                  key={idx}
                  title={`x[${idx}] = ${val.toFixed(3)}`}
                  style={{ height: `${heightPct}%` }}
                  className="flex-1 bg-cyan-500/80 hover:bg-cyan-400 transition-all rounded-t-xs"
                />
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-2">
            <span>Float32 [0.0 - 1.0]</span>
            <span>32 / 256 shown</span>
          </div>
        </div>

        {/* 2. Layer 1 Activations (512) */}
        {(() => {
          const l1 = layers[0];
          const sample = l1?.activationSample || [];
          const isActive = activeLayerIdx === 0;

          return (
            <div className={`rounded-lg p-3 border transition-colors ${isActive ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-900/60 border-slate-800'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 font-mono">Layer 1 (L1)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">512 Dim</span>
              </div>

              <div className="h-20 flex items-end gap-[2px] bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                {sample.length > 0 ? (
                  sample.slice(0, 32).map((val, idx) => {
                    const max = l1?.activationMax || 1;
                    const heightPct = max > 0 ? Math.min(100, Math.max(6, (val / max) * 100)) : 6;
                    return (
                      <div
                        key={idx}
                        title={`a1[${idx}] = ${val.toFixed(2)}`}
                        style={{ height: `${heightPct}%` }}
                        className={`flex-1 rounded-t-xs transition-all ${val > 0 ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-slate-800'}`}
                      />
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-600 font-mono">
                    Pending
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono mt-2 text-slate-400">
                <span>Mean: {l1?.activationMean ?? '0.00'}</span>
                <span>Max: {l1?.activationMax ?? '0.00'}</span>
              </div>
            </div>
          );
        })()}

        {/* 3. Layer 2 Activations (512) */}
        {(() => {
          const l2 = layers[1];
          const sample = l2?.activationSample || [];
          const isActive = activeLayerIdx === 1;

          return (
            <div className={`rounded-lg p-3 border transition-colors ${isActive ? 'bg-emerald-950/20 border-emerald-500/50' : 'bg-slate-900/60 border-slate-800'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 font-mono">Layer 2 (L2)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">512 Dim</span>
              </div>

              <div className="h-20 flex items-end gap-[2px] bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                {sample.length > 0 ? (
                  sample.slice(0, 32).map((val, idx) => {
                    const max = l2?.activationMax || 1;
                    const heightPct = max > 0 ? Math.min(100, Math.max(6, (val / max) * 100)) : 6;
                    return (
                      <div
                        key={idx}
                        title={`a2[${idx}] = ${val.toFixed(2)}`}
                        style={{ height: `${heightPct}%` }}
                        className={`flex-1 rounded-t-xs transition-all ${val > 0 ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-slate-800'}`}
                      />
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-600 font-mono">
                    Pending
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono mt-2 text-slate-400">
                <span>Mean: {l2?.activationMean ?? '0.00'}</span>
                <span>Max: {l2?.activationMax ?? '0.00'}</span>
              </div>
            </div>
          );
        })()}

        {/* 4. Output Vector (128) */}
        {(() => {
          const l3 = layers[2];
          const sample = outputVector.length > 0 ? outputVector.slice(0, 32) : (l3?.activationSample || []);
          const isActive = activeLayerIdx === 2;

          return (
            <div className={`rounded-lg p-3 border transition-colors ${isActive ? 'bg-amber-950/20 border-amber-500/50' : 'bg-slate-900/60 border-slate-800'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 font-mono">Output (L3)</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-400">128 Dim</span>
              </div>

              <div className="h-20 flex items-end gap-[2px] bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                {sample.length > 0 ? (
                  sample.slice(0, 32).map((val, idx) => {
                    const max = l3?.activationMax || 1;
                    const heightPct = max > 0 ? Math.min(100, Math.max(6, (val / max) * 100)) : 6;
                    return (
                      <div
                        key={idx}
                        title={`out[${idx}] = ${val.toFixed(2)}`}
                        style={{ height: `${heightPct}%` }}
                        className={`flex-1 rounded-t-xs transition-all ${val > 0 ? 'bg-amber-400 hover:bg-amber-300' : 'bg-slate-800'}`}
                      />
                    );
                  })
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-600 font-mono">
                    Pending
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono mt-2 text-slate-400">
                <span>Output Logits</span>
                <span className="text-amber-300 font-bold">{outputVector.length > 0 ? `${outputVector.length} dims ready` : '-'}</span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
