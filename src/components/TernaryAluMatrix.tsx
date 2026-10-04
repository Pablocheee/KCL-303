import React, { useState } from 'react';
import { Zap, HelpCircle, CheckCircle2, MinusCircle, CircleSlash } from 'lucide-react';
import type { LayerStats } from '../engine/types';

interface TernaryAluMatrixProps {
  currentLayer: LayerStats | null;
  inputSample: number[];
}

export const TernaryAluMatrix: React.FC<TernaryAluMatrixProps> = ({ currentLayer, inputSample }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Generate a representative 8x16 or 16x16 grid slice from the current layer weights
  const weightSlice = currentLayer?.weightsSample || Array.from({ length: 64 }, () => 0);
  const rows = 8;
  const cols = 8;

  const totalOps = currentLayer ? currentLayer.additions + currentLayer.subtractions : 0;
  const totalElements = currentLayer ? currentLayer.byteLength : 0;

  return (
    <div className="w-full bg-[#0a0f18] rounded-xl border border-slate-800 p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">
            BitNet Ternary ALU Matrix (+1 / -1 / 0)
          </h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300">
            Zero Multiplications (100% Add/Sub)
          </span>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Layer: <span className="text-slate-200 font-semibold">{currentLayer?.name || 'Awaiting Run'}</span>
        </div>
      </div>

      {/* Grid Layout & Math Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Matrix Grid Visualization */}
        <div className="lg:col-span-7 bg-slate-950/60 rounded-lg p-3 border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-mono">Weight Matrix Slice (64/ {totalElements.toLocaleString()} weights)</span>
            <span className="text-[11px] text-slate-500 font-mono">Hover cell to inspect ALU op</span>
          </div>

          <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-900/60 rounded-md border border-slate-800">
            {weightSlice.slice(0, rows * cols).map((val, idx) => {
              const inIdx = idx % cols;
              const outIdx = Math.floor(idx / cols);
              const isHovered = hoveredIdx === idx;
              const inputVal = inputSample[inIdx] ?? 0.5;

              let bgClass = 'bg-slate-800/40 text-slate-500 border-slate-800';
              let symbol = '0';
              if (val === 1) {
                bgClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 shadow-[0_0_8px_rgba(16,185,129,0.2)] font-bold';
                symbol = '+1';
              } else if (val === -1) {
                bgClass = 'bg-rose-950/70 text-rose-300 border-rose-700/60 shadow-[0_0_8px_rgba(244,63,94,0.2)] font-bold';
                symbol = '-1';
              }

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`h-9 rounded flex flex-col items-center justify-center text-[11px] font-mono border transition-all cursor-pointer select-none ${bgClass} ${
                    isHovered ? 'scale-105 ring-2 ring-cyan-400 z-10' : 'hover:border-slate-600'
                  }`}
                >
                  <span>{symbol}</span>
                </div>
              );
            })}
          </div>

          {/* Interactive Inspection Tooltip / Legend */}
          <div className="mt-3 p-2.5 rounded bg-slate-900/90 border border-slate-800 text-xs font-mono">
            {hoveredIdx !== null ? (
              (() => {
                const val = weightSlice[hoveredIdx];
                const inIdx = hoveredIdx % cols;
                const outIdx = Math.floor(hoveredIdx / cols);
                const inVal = (inputSample[inIdx] ?? 0.5).toFixed(3);

                if (val === 1) {
                  return (
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>Weight = +1</strong>: ALU performs integer accumulator ADD:{' '}
                        <code className="text-white bg-slate-950 px-1 py-0.5 rounded">acc[{outIdx}] += x[{inIdx}] ({inVal})</code>
                      </span>
                    </div>
                  );
                } else if (val === -1) {
                  return (
                    <div className="flex items-center gap-2 text-rose-300">
                      <MinusCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        <strong>Weight = -1</strong>: ALU performs integer accumulator SUB:{' '}
                        <code className="text-white bg-slate-950 px-1 py-0.5 rounded">acc[{outIdx}] -= x[{inIdx}] ({inVal})</code>
                      </span>
                    </div>
                  );
                } else {
                  return (
                    <div className="flex items-center gap-2 text-slate-400">
                      <CircleSlash className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>
                        <strong>Weight = 0</strong>: Sparsity skip. No ALU clock cycles or memory access consumed.
                      </span>
                    </div>
                  );
                }
              })()
            ) : (
              <div className="text-slate-500 flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Move your cursor over any weight cell above to inspect the exact ternary ALU operation.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Operational Statistics & Kernel Formula */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Formula Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3 text-xs">
            <h3 className="text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>BitNet 1.58b Kernel Math</span>
              <span className="text-[10px] font-mono text-emerald-400">FLOPs = 0</span>
            </h3>
            <div className="bg-slate-950 p-2.5 rounded font-mono text-[11px] text-slate-300 border border-slate-800/80 mb-2 overflow-x-auto">
              <div className="text-cyan-400 font-bold">for (let i = 0; i &lt; N; i++) &#123;</div>
              <div className="pl-4 text-emerald-300">if (w[i] === +1) sum += x[i];</div>
              <div className="pl-4 text-rose-300">else if (w[i] === -1) sum -= x[i];</div>
              <div className="pl-4 text-slate-500">// w[i] === 0: skipped</div>
              <div className="text-cyan-400 font-bold">&#125;</div>
              <div className="text-yellow-300">y = Math.max(0, sum); // ReLU</div>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Standard LLMs require 32-bit floating-point multipliers (FPU) executing matrix multiplication (y = W · x). BitNet removes multiplication entirely, reducing execution to low-power additions.
            </p>
          </div>

          {/* Real-Time Layer Statistics */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-slate-300 mb-2">Layer Arithmetic Telemetry</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">ADDITIONS (+)</div>
                <div className="text-emerald-400 font-bold text-sm">
                  {currentLayer ? currentLayer.additions.toLocaleString() : '—'}
                </div>
              </div>

              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">SUBTRACTIONS (-)</div>
                <div className="text-rose-400 font-bold text-sm">
                  {currentLayer ? currentLayer.subtractions.toLocaleString() : '—'}
                </div>
              </div>

              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">SKIPPED ZEROS (0)</div>
                <div className="text-slate-400 font-bold text-sm">
                  {currentLayer ? currentLayer.skips.toLocaleString() : '—'}
                </div>
              </div>

              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">COMPUTE TIME</div>
                <div className="text-cyan-300 font-bold text-sm">
                  {currentLayer ? `${currentLayer.computeTimeMs} ms` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
