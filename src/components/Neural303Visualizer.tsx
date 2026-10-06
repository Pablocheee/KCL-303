import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Zap,
  Activity,
  Radio,
  Flame,
  Sparkles,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  Power,
  Cpu,
  AudioWaveform,
  Atom,
  FolderOpen,
  Save,
  Sliders,
  Disc,
} from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { useLanguage } from '../i18n/translations';
import { TB303FilterSection } from './TB303FilterSection';
import { DualModeSequencer } from './DualModeSequencer';
import { PresetManagerModal } from './PresetManagerModal';
import { webMidi } from '../engine/web_midi';
import { Headphones, Trash2, CheckCircle2 } from 'lucide-react';
import { WavExportModal } from './WavExportModal';
import { liveRecorder } from '../engine/wav_recorder';

export const Neural303Visualizer: React.FC = () => {
  const { t, language } = useLanguage();
  const {
    isDspLive,
    toggleDsp,
    playTestBeep,
    dspSampleRate,
    dspCharacterMode,
    setDspCharacterMode,
    electronFlux,
    setElectronFlux,
    electronMode,
    setElectronMode,
    electronSolo,
    setElectronSolo,
    electronsPerSecond,
    presets,
    activePresetId,
    loadPreset,
    specs,
    updateSpecField,
    isPlaying,
    togglePlay,
    audioMuted,
    setAudioMuted,
    generateNewPattern,
    clearPattern,
    effectiveCc,
  } = useEngine();

  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isWavModalOpen, setIsWavModalOpen] = useState(false);
  const [isLiveRecordingActive, setIsLiveRecordingActive] = useState(false);
  const [liveRecordingTime, setLiveRecordingTime] = useState(0);

  // Monitor background live recording status so user can tweak knobs with modal closed
  useEffect(() => {
    const timer = setInterval(() => {
      const status = liveRecorder.getStatus();
      setIsLiveRecordingActive(status.isRecording);
      if (status.isRecording) {
        setLiveRecordingTime(status.elapsedSec);
      }
    }, 250);
    return () => clearInterval(timer);
  }, []);

  // Instant Live Macro Override Handlers
  const handleTempMacroChange = (newTemp: number) => {
    updateSpecField('temperatureKelvin', newTemp);
    const normNoise = Math.max(0, Math.min(1.0, (newTemp - 200) / 250));
    const liveDecayCC = Math.round(15 + normNoise * 112);
    webMidi.sendCC(75, liveDecayCC, 1);
  };

  const handleTiaMacroChange = (newGain: number) => {
    updateSpecField('tiaGainRf', newGain);
    const normGain = Math.max(0, Math.min(1.0, (newGain - 5000) / 45000));
    const liveDriveCC = Math.round(normGain * 127);
    webMidi.sendCC(94, liveDriveCC, 1);
  };

  const handleDriftMacroChange = (newDrift: number) => {
    updateSpecField('conductanceDriftStd', newDrift);
    const normDrift = Math.max(0, Math.min(1.0, newDrift / 0.15));
    const liveResCC = Math.round(20 + normDrift * 107);
    webMidi.sendCC(71, liveResCC, 1);
  };

  return (
    <div className="w-full max-w-full space-y-4 font-mono">
      {/* 1. Main TB-303 Silver Faceplate & Master Deck */}
      <div className="bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 rounded-2xl p-3 sm:p-4 shadow-2xl border-4 border-slate-500 text-slate-900 space-y-3">
        {/* Master Control & DSP Toolbar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-2 border-b-2 border-slate-500/60">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="px-3 py-1 bg-red-600 text-white font-black text-sm tracking-widest rounded shadow">
              TB-303
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-900 flex items-center gap-2 m-0 p-0">
                <span>{t('synthTitle')}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[10px] font-bold border border-slate-700">
                  {t('dspBadge')}
                </span>
              </h1>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-700">
                {t('synthSubtitle')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
            <span className="w-[145px] h-8 px-2.5 rounded bg-slate-900 text-slate-300 font-bold border border-slate-700 flex items-center justify-center gap-2 shadow-sm shrink-0 select-none whitespace-nowrap">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="truncate">{isPlaying ? t('acidEngineActive') : t('engineReady')}</span>
            </span>

            {/* START ACID / STOP Master Button in Silver Faceplate Toolbar */}
            <button
              type="button"
              onClick={togglePlay}
              className={`w-[130px] h-8 flex items-center justify-center gap-1.5 rounded-lg font-black text-xs shadow-md transition cursor-pointer select-none whitespace-nowrap shrink-0 ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.7)] border border-red-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)] border border-emerald-400'
              }`}
              title={isPlaying ? t('stopAcidBtn') : t('startAcidBtn')}
            >
              {isPlaying ? (
                <Square className="w-3.5 h-3.5 fill-white shrink-0" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white shrink-0" />
              )}
              <span>{isPlaying ? t('stopAcidBtn') : t('startAcidBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PHYSICAL ELECTRON & LIVE MACRO SHAPER STRIP (Directly Above Filter Section) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-stretch w-full">
        {/* QUANTUM ELECTRON TRANSPORT & AUDIBLE SOUND MODES SWITCHER (7 cols on xl) */}
        <div className="xl:col-span-7 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-xl p-3 sm:p-4 border-2 border-indigo-500/80 shadow-2xl text-white space-y-3 flex flex-col justify-between">
          {/* Header & Solo Audition Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-indigo-900/60 pb-2">
            <div className="flex items-center gap-2">
              <Atom className="w-4 h-4 text-indigo-400 animate-spin" />
              <div>
                <div className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-2">
                  <span>{t('electronPhysicsTitle')}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {t('electronPhysicsSubtitle')}
                </div>
              </div>
            </div>

            {/* Solo Audition Toggle */}
            <button
              onClick={() => setElectronSolo(!electronSolo)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 border shadow ${
                electronSolo
                  ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/50'
              }`}
              title={t('soloAuditionTitle')}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>{electronSolo ? t('soloElectrons') : t('auditionSolo')}</span>
            </button>
          </div>

          {/* 5 Distinct Electron Modes Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {/* Mode 1: Quantum Shot Noise */}
            <button
              onClick={() => setElectronMode('quantum_shot')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                electronMode === 'quantum_shot'
                  ? 'bg-indigo-950/90 border-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between pb-0.5">
                <span className="font-black text-xs text-indigo-300 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-indigo-400" /> {t('quantumShotName')}
                </span>
                {electronMode === 'quantum_shot' && <CheckCircle2 className="w-3 h-3 text-indigo-400" />}
              </div>
              <div className="text-[9px] text-slate-400 leading-tight">
                {t('quantumShotDesc')}
              </div>
            </button>

            {/* Mode 2: Thermal Boltzmann */}
            <button
              onClick={() => setElectronMode('thermal_boltzmann')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                electronMode === 'thermal_boltzmann'
                  ? 'bg-rose-950/90 border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between pb-0.5">
                <span className="font-black text-xs text-rose-300 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" /> {t('thermalBoltzmannName')}
                </span>
                {electronMode === 'thermal_boltzmann' && <CheckCircle2 className="w-3 h-3 text-rose-400" />}
              </div>
              <div className="text-[9px] text-slate-400 leading-tight">
                {t('thermalBoltzmannDesc')}
              </div>
            </button>

            {/* Mode 3: 1/f Filament Flicker */}
            <button
              onClick={() => setElectronMode('flicker_filament')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                electronMode === 'flicker_filament'
                  ? 'bg-amber-950/90 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between pb-0.5">
                <span className="font-black text-xs text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> {t('flickerFilamentName')}
                </span>
                {electronMode === 'flicker_filament' && <CheckCircle2 className="w-3 h-3 text-amber-400" />}
              </div>
              <div className="text-[9px] text-slate-400 leading-tight">
                {t('flickerFilamentDesc')}
              </div>
            </button>

            {/* Mode 4: Avalanche Breakdown */}
            <button
              onClick={() => setElectronMode('avalanche_breakdown')}
              className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                electronMode === 'avalanche_breakdown'
                  ? 'bg-red-950/90 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between pb-0.5">
                <span className="font-black text-xs text-red-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-red-400 animate-pulse" /> {t('avalancheName')}
                </span>
                {electronMode === 'avalanche_breakdown' && <CheckCircle2 className="w-3 h-3 text-red-400" />}
              </div>
              <div className="text-[9px] text-slate-400 leading-tight">
                {t('avalancheDesc')}
              </div>
            </button>
          </div>

          {/* Mode 5: Pure Silicon Bypass Full Width */}
          <button
            onClick={() => setElectronMode('bypass_clean')}
            className={`w-full p-2 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
              electronMode === 'bypass_clean'
                ? 'bg-slate-800 border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-black text-xs text-slate-200">{t('bypassCleanName')}</span>
              <span className="text-[10px] text-slate-400">{t('bypassCleanDesc')}</span>
            </div>
            {electronMode === 'bypass_clean' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </button>

          {/* Electron Controls Slider */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] text-slate-300">
              <span className="font-bold text-indigo-300">{t('fluxIntensity')}</span>
              <span className="text-indigo-400 font-black">{electronFlux}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={electronFlux}
              onChange={(e) => setElectronFlux(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* LIVE MACRO SOUND SHAPER (5 cols on xl) */}
        <div className="xl:col-span-5 bg-slate-900 rounded-xl p-3 sm:p-4 border-2 border-red-500/80 shadow-xl space-y-2.5 text-white flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-red-400" />
              <span className="text-xs font-black uppercase text-red-400 tracking-wider">
                {t('liveMacroTitle')}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Macro 1: Temperature -> Pitch Drift & Decay */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-rose-300 font-bold">
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>{t('tempMacroLabel')} ({specs.temperatureKelvin} K)</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800">
                  Decay ({effectiveCc.decay})
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="450"
                value={specs.temperatureKelvin}
                onChange={(e) => handleTempMacroChange(parseInt(e.target.value, 10))}
                className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            {/* Macro 2: TIA Gain / Power -> Filter Cutoff Opening */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-cyan-300 font-bold">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span>{t('tiaGainMacroLabel')} ({(specs.tiaGainRf / 1000).toFixed(0)} kΩ)</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-800">
                  Drive ({effectiveCc.drive})
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="50000"
                step="2500"
                value={specs.tiaGainRf}
                onChange={(e) => handleTiaMacroChange(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>

            {/* Macro 3: Memristor Drift -> Screaming Q Resonance */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{t('driftMacroLabel')} ({(specs.conductanceDriftStd * 100).toFixed(0)}%)</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800">
                  Resonance ({effectiveCc.resonance})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.15"
                step="0.01"
                value={specs.conductanceDriftStd}
                onChange={(e) => handleDriftMacroChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. TB-303 ANALOG VCF & BIPOLAR MORPH FILTER SECTION */}
      <TB303FilterSection />

      {/* 4. UNIFIED 32-STEP ACID SEQUENCER & PATTERN WORKSTATION */}
      <DualModeSequencer
        onOpenPresetModal={() => setIsPresetModalOpen(true)}
        onOpenWavModal={() => setIsWavModalOpen(true)}
      />

      {/* Preset Manager Modal */}
      <PresetManagerModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
      />

      {/* WAV Audio Studio & Recorder Modal */}
      <WavExportModal
        isOpen={isWavModalOpen}
        onClose={() => setIsWavModalOpen(false)}
      />

      {/* Floating Live Recording Status Indicator (Allows tweaking knobs while recording) */}
      {isLiveRecordingActive && (
        <div className="fixed bottom-5 right-5 z-40 bg-rose-950/95 border-2 border-rose-500 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md font-mono text-white flex items-center gap-3 animate-pulse">
          <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping inline-block" />
          <div>
            <div className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-2">
              <span>{t('recSession')}</span>
              <span className="font-mono text-white font-bold">
                {Math.floor(liveRecordingTime / 60).toString().padStart(2, '0')}:
                {Math.floor(liveRecordingTime % 60).toString().padStart(2, '0')} / 10:00
              </span>
            </div>
            <div className="text-[10px] text-slate-300">
              {t('recSessionDesc')}
            </div>
          </div>
          <button
            onClick={() => setIsWavModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition cursor-pointer border border-rose-400"
          >
            {t('recWindowBtn')}
          </button>
        </div>
      )}
    </div>
  );
};
