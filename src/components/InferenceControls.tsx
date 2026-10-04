import React, { useState } from 'react';
import { Play, RotateCcw, FastForward, Disc, BarChart, Sliders, CheckCircle2 } from 'lucide-react';
import type { InferenceResult, ModelMetadata } from '../engine/types';

interface InferenceControlsProps {
  onRunStream: () => void;
  onRunOneShot: () => void;
  isStreaming: boolean;
  isComputing: boolean;
  inferenceResult: InferenceResult | null;
  selectedPattern: 'sine' | 'gaussian' | 'pulse' | 'sparse';
  onSelectPattern: (p: 'sine' | 'gaussian' | 'pulse' | 'sparse') => void;
  modelMeta: ModelMetadata | null;
}

export const InferenceControls: React.FC<InferenceControlsProps> = ({
  onRunStream,
  onRunOneShot,
  isStreaming,
  isComputing,
  inferenceResult,
  selectedPattern,
  onSelectPattern,
  modelMeta,
}) => {
  return (
    <div className="w-full bg-[#0a0f18] rounded-xl border border-slate-800 p-4 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-200">Execution & Telemetry Controls</h2>
        </div>

        {/* Input Vector Preset Selector */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-400 mr-1">Input Preset:</span>
          {(['sine', 'gaussian', 'pulse', 'sparse'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => onSelectPattern(preset)}
              className={`px-2.5 py-1 rounded transition text-[11px] capitalize cursor-pointer ${
                selectedPattern === preset
                  ? 'bg-cyan-950 border border-cyan-700 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Stream Live Inference Button */}
        <button
          onClick={onRunStream}
          disabled={isStreaming || isComputing}
          className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs font-mono shadow-lg shadow-emerald-950/50 transition disabled:opacity-50 cursor-pointer"
        >
          <Play className={`w-4 h-4 ${isStreaming ? 'animate-spin' : ''}`} />
          <span>{isStreaming ? 'Streaming from SSD...' : 'Stream Disk Inference (Live Canvas)'}</span>
        </button>

        {/* Instant One-shot Button */}
        <button
          onClick={onRunOneShot}
          disabled={isStreaming || isComputing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 transition disabled:opacity-50 cursor-pointer"
        >
          <FastForward className="w-4 h-4 text-cyan-400" />
          <span>Instant Full Run (Fast)</span>
        </button>
      </div>

      {/* Global Performance Telemetry Cards */}
      {inferenceResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Latency</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {inferenceResult.totalTimeMs} ms
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              Read: {inferenceResult.totalDiskReadTimeMs}ms | Math: {inferenceResult.totalComputeTimeMs}ms
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Zero-Mul Add/Sub</div>
            <div className="text-sm font-bold text-cyan-300 mt-0.5">
              {inferenceResult.totalOperations.toLocaleString()} Ops
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              +{inferenceResult.totalAdditions.toLocaleString()} / -{inferenceResult.totalSubtractions.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">FLOPs Eliminated</div>
            <div className="text-sm font-bold text-yellow-300 mt-0.5">
              {inferenceResult.fp32EquivalentFlops.toLocaleString()} FLOPs
            </div>
            <div className="text-[9px] text-emerald-400 mt-1">
              100% Zero-Multiplication
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800 font-mono">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Peak Heap Used</div>
            <div className="text-sm font-bold text-purple-300 mt-0.5">
              {(inferenceResult.memoryPeakBytes / 1024 / 1024).toFixed(2)} MB
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              Constant O(1) Layer Footprint
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
