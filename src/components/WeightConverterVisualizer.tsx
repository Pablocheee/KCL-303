import React, { useState, useEffect } from 'react';
import {
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw,
  HardDrive,
  Cpu,
  BarChart2,
  FileCheck,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import type { QuantizationMetrics } from '../engine/quantizer';

export const WeightConverterVisualizer: React.FC = () => {
  const [sampleWeights, setSampleWeights] = useState<number[]>([]);
  const [ternaryWeights, setTernaryWeights] = useState<number[]>([]);
  const [metrics, setMetrics] = useState<QuantizationMetrics | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const fetchQuantizationDemo = () => {
    setIsConverting(true);
    fetch('/api/converter/quantize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleCount: 48 }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSampleWeights(data.originalFloats || []);
        setTernaryWeights(data.ternaryWeights || []);
        setMetrics(data.metrics || null);
      })
      .finally(() => setIsConverting(false));
  };

  useEffect(() => {
    fetchQuantizationDemo();
  }, []);

  const architectureLayers = [
    { name: '1. Token Embeddings', shape: '[512 x 128]', format: 'Float32 (Unquantized)', size: '262.1 KB', offset: '0 B' },
    { name: '2. Positional Embeddings', shape: '[64 x 128]', format: 'Float32 (Sinusoidal)', size: '32.8 KB', offset: '262,144 B' },
    { name: '3. Attention W_q', shape: '[128 x 128]', format: 'Ternary Int8 (BitNet)', size: '16.4 KB', offset: '294,912 B' },
    { name: '4. Attention W_k', shape: '[128 x 128]', format: 'Ternary Int8 (BitNet)', size: '16.4 KB', offset: '311,296 B' },
    { name: '5. Attention W_v', shape: '[128 x 128]', format: 'Ternary Int8 (BitNet)', size: '16.4 KB', offset: '327,680 B' },
    { name: '6. Attention W_o', shape: '[128 x 128]', format: 'Ternary Int8 (BitNet)', size: '16.4 KB', offset: '344,064 B' },
    { name: '7. MLP Up-Projection', shape: '[128 x 512]', format: 'Ternary Int8 (BitNet)', size: '65.5 KB', offset: '360,448 B' },
    { name: '8. MLP Down-Projection', shape: '[512 x 128]', format: 'Ternary Int8 (BitNet)', size: '65.5 KB', offset: '425,984 B' },
    { name: '9. LM Head Unembedding', shape: '[128 x 512]', format: 'Ternary Int8 (BitNet)', size: '65.5 KB', offset: '491,520 B' },
  ];

  return (
    <div className="w-full space-y-6">
      {/* 1. Header & Quantization Formula Card */}
      <div className="bg-[#0a0f18] rounded-xl border border-slate-800 p-4 lg:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                PyTorch / Safetensors to BitNet b1.58 Quantizer
              </h2>
              <p className="text-xs text-slate-400">
                Continuous Float32 Weight Transformation into 1.58-bit Ternary Matrix Format
              </p>
            </div>
          </div>

          <button
            onClick={fetchQuantizationDemo}
            disabled={isConverting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isConverting ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Resample & Quantize</span>
          </button>
        </div>

        {/* Quantization Math Formula Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/90 font-mono text-xs">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">1. Scale Factor (γ)</div>
            <div className="text-emerald-400 font-bold">γ = Mean(|W|) = (1/N) ∑ |W_i|</div>
            <div className="text-[10px] text-slate-400 mt-1">Current Scale: {metrics?.gamma ?? '0.0632'}</div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/90 font-mono text-xs">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">2. Scaled Rounding</div>
            <div className="text-cyan-300 font-bold">W_scaled = Round( W / (γ + ε) )</div>
            <div className="text-[10px] text-slate-400 mt-1">Quantizes around zero center</div>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/90 font-mono text-xs">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">3. Strict Clamping</div>
            <div className="text-yellow-300 font-bold">W_ternary = Clip( W_scaled, -1, 1 )</div>
            <div className="text-[10px] text-slate-400 mt-1">Strict ternary range: &#123;-1, 0, +1&#125;</div>
          </div>
        </div>

        {/* Live Weight Inspection Comparison Grid */}
        <div className="bg-slate-950/60 rounded-lg p-3.5 border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Live Tensor Slice (Float32 continuous → Int8 ternary clamped)</span>
            <span className="text-slate-500">Hover cell to inspect math step</span>
          </div>

          {/* Grid of weights */}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
            {sampleWeights.map((wFloat, idx) => {
              const wTernary = ternaryWeights[idx] ?? 0;
              const isHovered = hoveredIdx === idx;

              let colorStyle = 'bg-slate-900 border-slate-800 text-slate-400';
              let badge = '0';
              if (wTernary === 1) {
                colorStyle = 'bg-emerald-950/80 border-emerald-700 text-emerald-300 font-bold shadow-[0_0_6px_rgba(16,185,129,0.2)]';
                badge = '+1';
              } else if (wTernary === -1) {
                colorStyle = 'bg-rose-950/80 border-rose-700 text-rose-300 font-bold shadow-[0_0_6px_rgba(244,63,94,0.2)]';
                badge = '-1';
              }

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`p-1.5 rounded border text-center transition cursor-pointer font-mono text-xs ${colorStyle} ${
                    isHovered ? 'ring-2 ring-cyan-400 scale-105 z-10' : ''
                  }`}
                >
                  <div className="text-[10px] opacity-75">{wFloat.toFixed(3)}</div>
                  <div className="text-xs mt-0.5">{badge}</div>
                </div>
              );
            })}
          </div>

          {/* Interactive Inspection Callout */}
          <div className="bg-slate-900/90 rounded-md p-2.5 border border-slate-800 text-xs font-mono">
            {hoveredIdx !== null ? (
              (() => {
                const fVal = sampleWeights[hoveredIdx];
                const tVal = ternaryWeights[hoveredIdx];
                const g = metrics?.gamma || 0.063;
                const scaled = fVal / g;

                return (
                  <div className="flex flex-wrap items-center gap-2 text-slate-200">
                    <span className="text-cyan-400">Weight #{hoveredIdx}:</span>
                    <span>Float32 = <strong className="text-white">{fVal.toFixed(4)}</strong></span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span>Scaled by γ ({g.toFixed(4)}) = <strong className="text-yellow-300">{scaled.toFixed(2)}</strong></span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span>Rounded & Clamped = <strong className={tVal === 1 ? 'text-emerald-400' : tVal === -1 ? 'text-rose-400' : 'text-slate-400'}>{tVal > 0 ? `+${tVal}` : tVal}</strong></span>
                  </div>
                );
              })()
            ) : (
              <div className="text-slate-500">
                Hover over any of the weight cells above to trace the mathematical transformation.
              </div>
            )}
          </div>
        </div>

        {/* Quantization Statistics Cards */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs font-mono">
            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500">SPARSITY RATIO</div>
              <div className="text-sm font-bold text-cyan-300 mt-0.5">{metrics.sparsityPercent}% (0s)</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Skipped in ALU</div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500">POSITIVE / NEGATIVE</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">
                +{metrics.positiveCount} / -{metrics.negativeCount}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">Balanced Ternary</div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500">COMPRESSION RATIO</div>
              <div className="text-sm font-bold text-yellow-300 mt-0.5">{metrics.compressionRatio}</div>
              <div className="text-[9px] text-emerald-400 mt-0.5">4x Per Quantized Layer</div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500">ARITHMETIC IMPACT</div>
              <div className="text-sm font-bold text-purple-300 mt-0.5">0 FLOP Multipliers</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Pure Integer Add/Sub</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Architecture Layout & Disk Offsets Map */}
      <div className="bg-[#0a0f18] rounded-xl border border-slate-800 p-4 lg:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100 font-mono">
            BitNet Model Disk Structure (Sequential Byte Offset Map)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                <th className="py-2.5 px-3">Layer Name</th>
                <th className="py-2.5 px-3">Tensor Dimensions</th>
                <th className="py-2.5 px-3">Storage Format</th>
                <th className="py-2.5 px-3">Byte Offset on Disk</th>
                <th className="py-2.5 px-3">Size on Disk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {architectureLayers.map((layer, idx) => (
                <tr key={idx} className="hover:bg-slate-900/30 transition">
                  <td className="py-2 px-3 font-semibold text-slate-200">{layer.name}</td>
                  <td className="py-2 px-3 text-cyan-300">{layer.shape}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        layer.format.includes('Float32')
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                          : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-bold'
                      }`}
                    >
                      {layer.format}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-400">{layer.offset}</td>
                  <td className="py-2 px-3 text-yellow-300 font-medium">{layer.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
