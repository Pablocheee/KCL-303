/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DiskStreamCanvas } from './components/DiskStreamCanvas';
import { TernaryAluMatrix } from './components/TernaryAluMatrix';
import { LayerActivationWaveform } from './components/LayerActivationWaveform';
import { InferenceControls } from './components/InferenceControls';
import { HardwareProfileComparison } from './components/HardwareProfileComparison';
import { TransformerTextGenerator } from './components/TransformerTextGenerator';
import { WeightConverterVisualizer } from './components/WeightConverterVisualizer';
import { AnalogCrossbarVisualizer } from './components/AnalogCrossbarVisualizer';
import { Neural303Visualizer } from './components/Neural303Visualizer';
import { MidiSettingsModal } from './components/MidiSettingsModal';
import { EngineProvider, useEngine } from './context/EngineContext';
import { CodeViewer } from './components/CodeViewer';
import type { LayerStats, InferenceResult, ModelMetadata } from './engine/types';
import { Cpu, Terminal, Laptop, Activity, Layers, Sparkles, BookOpen, Binary, Zap, Music, Undo2, Redo2, Sliders, Keyboard } from 'lucide-react';

function MainApp() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    isMidiModalOpen,
    setIsMidiModalOpen,
    keyboardOctave,
    selectedMidiInputId,
  } = useEngine();
  const [activeTab, setActiveTab] = useState<'tb303' | 'analog'>('tb303');
  const [activeToolSubTab, setActiveToolSubTab] = useState<'llm' | 'converter' | 'visualizer' | 'hardware' | 'code'>('llm');
  const [modelMeta, setModelMeta] = useState<ModelMetadata | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [activeLayerIdx, setActiveLayerIdx] = useState<number | null>(null);
  const [currentLayerStat, setCurrentLayerStat] = useState<LayerStats | null>(null);
  const [layersProcessed, setLayersProcessed] = useState<LayerStats[]>([]);
  const [inferenceResult, setInferenceResult] = useState<InferenceResult | null>(null);
  const [pattern, setPattern] = useState<'sine' | 'gaussian' | 'pulse' | 'sparse'>('sine');

  // Input vector generator helper
  const generateInputVector = useCallback((type: 'sine' | 'gaussian' | 'pulse' | 'sparse', size = 256): number[] => {
    const arr = new Array(size).fill(0);
    for (let i = 0; i < size; i++) {
      if (type === 'sine') {
        arr[i] = Math.sin((i / size) * Math.PI * 4) * 0.5 + 0.5;
      } else if (type === 'gaussian') {
        const u = 1 - Math.random();
        const v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        arr[i] = Math.max(0, Math.min(1, 0.5 + z * 0.2));
      } else if (type === 'pulse') {
        arr[i] = i % 16 < 4 ? 1.0 : 0.05;
      } else {
        arr[i] = Math.random() < 0.1 ? Math.random() * 0.9 + 0.1 : 0.0;
      }
    }
    return arr;
  }, []);

  const [inputVector, setInputVector] = useState<number[]>(() => generateInputVector('sine'));

  const handleSelectPattern = (p: 'sine' | 'gaussian' | 'pulse' | 'sparse') => {
    setPattern(p);
    setInputVector(generateInputVector(p));
  };

  // Fetch model metadata on initial load
  const fetchModelStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/model/status');
      if (res.ok) {
        const data = await res.json();
        setModelMeta(data);
      }
    } catch {
      // Fallback metadata for offline / client preview
      setModelMeta({
        path: 'data/bitnet_model.bin',
        exists: true,
        sizeBytes: 458752,
        layers: [
          { name: 'Linear-1 (Input Projection)', offset: 0, in: 256, out: 512 },
          { name: 'Linear-2 (Hidden Transformation)', offset: 131072, in: 512, out: 512 },
          { name: 'Linear-3 (Output Bottleneck)', offset: 393216, in: 512, out: 128 },
        ],
        totalWeights: 458752,
      });
    }
  }, []);

  useEffect(() => {
    fetchModelStatus();
  }, [fetchModelStatus]);

  // Re-generate Model Weights
  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/model/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sparsity: 0.33 }),
      });
      if (res.ok) {
        await fetchModelStatus();
      }
    } catch (e) {
      console.error('Failed to regenerate model weights', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Run Real-Time Stream Inference (Server-Sent Events)
  const handleRunStream = () => {
    if (isStreaming || isComputing) return;

    setIsStreaming(true);
    setLayersProcessed([]);
    setActiveLayerIdx(0);
    setCurrentLayerStat(null);

    const eventSource = new EventSource('/api/inference/stream?delay=350');

    eventSource.addEventListener('start', (e) => {
      const data = JSON.parse(e.data);
      console.log('Inference started:', data);
    });

    eventSource.addEventListener('layer_complete', (e) => {
      const data = JSON.parse(e.data);
      const stat: LayerStats = data.layerStat;
      setCurrentLayerStat(stat);
      setActiveLayerIdx(data.currentLayerIndex);
      setLayersProcessed((prev) => [...prev, stat]);
    });

    eventSource.addEventListener('done', () => {
      eventSource.close();
      setIsStreaming(false);
      setActiveLayerIdx(null);

      // Trigger one quick full result sync
      handleRunOneShot(false);
    });

    eventSource.onerror = () => {
      eventSource.close();
      setIsStreaming(false);
      setActiveLayerIdx(null);
    };
  };

  // Run One-shot Fast Inference
  const handleRunOneShot = async (setLoading = true) => {
    if (setLoading) setIsComputing(true);
    try {
      const res = await fetch('/api/inference/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputVector }),
      });
      if (res.ok) {
        const data: InferenceResult = await res.json();
        setInferenceResult(data);
        setLayersProcessed(data.layers);
        if (data.layers.length > 0) {
          setCurrentLayerStat(data.layers[data.layers.length - 1]);
        }
      }
    } catch (e) {
      console.error('Inference error', e);
    } finally {
      if (setLoading) setIsComputing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Main Navigation Bar: 2 Sound Tabs + 1 Unified Tools Tab */}
      <div className="border-b border-slate-800/80 bg-[#0a0f18]/90 backdrop-blur sticky top-0 z-30 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto py-1.5">
          <div className="flex items-center gap-2">
            {/* 1. Main Sound Tab: Neural Roland TB-303 */}
            <button
              onClick={() => setActiveTab('tb303')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold rounded-lg border transition cursor-pointer whitespace-nowrap ${
                activeTab === 'tb303'
                  ? 'bg-red-950/50 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)] ring-1 ring-red-500/50'
                  : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Music className={`w-4 h-4 ${activeTab === 'tb303' ? 'text-red-500' : 'text-slate-400'}`} />
              <span>Neural Roland TB-303</span>
            </button>

            {/* 2. Sound-Affecting Hardware Tab: Neuromorphic Analog Crossbar */}
            <button
              onClick={() => setActiveTab('analog')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold rounded-lg border transition cursor-pointer whitespace-nowrap ${
                activeTab === 'analog'
                  ? 'bg-amber-950/50 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)] ring-1 ring-amber-400/50'
                  : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Zap className={`w-4 h-4 ${activeTab === 'analog' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>Neuromorphic Analog Crossbar</span>
            </button>
          </div>

          {/* 3. Compact Undo/Redo & MIDI Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 2 Small Compact Arrow Buttons: Undo & Redo (up to 5 actions) */}
            <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-xs font-mono shadow-sm">
              {/* Compact Откат назад (Undo) */}
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className={`w-7 h-7 rounded flex items-center justify-center transition cursor-pointer select-none active:scale-95 relative ${
                  canUndo
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                    : 'text-slate-600 bg-slate-950/40 border border-slate-900 cursor-not-allowed opacity-40'
                }`}
                title={canUndo ? `Откат назад (Ctrl+Z) — Доступно: ${undoCount}/5` : 'Нет действий для отката назад (Ctrl+Z)'}
              >
                <Undo2 className="w-3.5 h-3.5" />
                {undoCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                    {undoCount}
                  </span>
                )}
              </button>

              {/* Compact Откат вперед (Redo) */}
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className={`w-7 h-7 rounded flex items-center justify-center transition cursor-pointer select-none active:scale-95 relative ${
                  canRedo
                    ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                    : 'text-slate-600 bg-slate-950/40 border border-slate-900 cursor-not-allowed opacity-40'
                }`}
                title={canRedo ? `Откат вперед (Ctrl+Y / Ctrl+Shift+Z) — Доступно: ${redoCount}/5` : 'Нет действий для отката вперед (Ctrl+Y)'}
              >
                <Redo2 className="w-3.5 h-3.5" />
                {redoCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-black flex items-center justify-center shadow">
                    {redoCount}
                  </span>
                )}
              </button>
            </div>

            {/* Computer Keyboard Piano Modal Button (Compact Icon) */}
            <button
              type="button"
              onClick={() => setIsMidiModalOpen(true)}
              className="w-7 h-7 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-300 transition cursor-pointer flex items-center justify-center shadow-sm active:scale-95"
              title="Компьютерная клавиатура: играйте на буквах A-K, октавы Z и X. Нажмите для настроек."
            >
              <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {/* Compact MIDI Settings & Learn Button */}
            <button
              type="button"
              onClick={() => setIsMidiModalOpen(true)}
              className={`h-7 px-2 rounded-lg border text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 shadow active:scale-95 ${
                selectedMidiInputId
                  ? 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-500/80 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
              title="Настройки MIDI и MIDI Learn (подключение MIDI-клавиатуры и привязка фейдеров)"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">MIDI</span>
              <span className={`w-1.5 h-1.5 rounded-full ${selectedMidiInputId ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full p-2 sm:p-4 lg:p-5 space-y-4">
        {/* TAB 1: Real-Time Acid Synthesizer & Sequencer */}
        {activeTab === 'tb303' && <Neural303Visualizer />}

        {/* TAB 2: Neuromorphic Crossbar Audio Matrix */}
        {activeTab === 'analog' && <AnalogCrossbarVisualizer />}
      </main>

      {/* MIDI Settings & MIDI Learn Modal */}
      <MidiSettingsModal
        isOpen={isMidiModalOpen}
        onClose={() => setIsMidiModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] text-xs font-mono text-slate-500 py-4 px-4 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>BitNet 1.58b Ultra-Low-Resource Inference Architecture</span>
          </div>
          <div>
            Target: Intel Core i5-5250U (Broadwell 2015) · Memory: O(1) Bounded Chunking
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <EngineProvider>
      <MainApp />
    </EngineProvider>
  );
}
