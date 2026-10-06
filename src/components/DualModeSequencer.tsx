/**
 * Dual Mode 32-Step Acid Sequencer (src/components/DualModeSequencer.tsx)
 * 
 * Mode 1 (Primary / Default): T-8 Tactile Step & Piano Note Layout
 * Mode 2: Authentic Vintage TB-303 Pitch Mode + Time Mode Programmer
 * 
 * 100% State-Synchronized across both modes with 32-Step acid support.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Radio,
  Sliders,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Music,
  Trash2,
  Volume2,
  VolumeX,
  Power,
  AudioWaveform,
  Lock,
  ArrowRight,
  Disc,
  Clock,
  Play,
  Square,
  Save,
  Download,
  Upload,
  Check,
  ListMusic,
  Gauge,
  FolderOpen,
  Waves,
  Activity,
  Zap,
  ChevronDown,
  Droplets,
} from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { useLanguage } from '../i18n/translations';
import { SCALES, ScaleName, midiToNoteName, TB303StepData } from '../engine/neural_303_types';
import { dspAudio } from '../engine/dsp_audio_engine';
import { SavedPattern, PatternManager } from '../engine/pattern_manager';

export interface DualModeSequencerProps {
  onOpenPresetModal?: () => void;
  onOpenWavModal?: () => void;
}

const PIANO_KEYS = [
  { noteOffset: 0, name: 'C', isBlack: false },
  { noteOffset: 1, name: 'C#', isBlack: true },
  { noteOffset: 2, name: 'D', isBlack: false },
  { noteOffset: 3, name: 'D#', isBlack: true },
  { noteOffset: 4, name: 'E', isBlack: false },
  { noteOffset: 5, name: 'F', isBlack: false },
  { noteOffset: 6, name: 'F#', isBlack: true },
  { noteOffset: 7, name: 'G', isBlack: false },
  { noteOffset: 8, name: 'G#', isBlack: true },
  { noteOffset: 9, name: 'A', isBlack: false },
  { noteOffset: 10, name: 'A#', isBlack: true },
  { noteOffset: 11, name: 'B', isBlack: false },
  { noteOffset: 12, name: 'C+', isBlack: false },
];

export type LfoSyncDivision = '2bar' | '1bar' | '1/2' | '1/4' | '1/8' | '1/16' | '1/8t' | 'custom';

const LFO_SYNC_DIVISIONS: { id: LfoSyncDivision; label: string; multiplier: number; desc: string }[] = [
  { id: '2bar', label: '2 Bar (32ш)', multiplier: 0.125, desc: 'Полный цикл на все 32 шага (2 такта)' },
  { id: '1bar', label: '1 Bar (16ш)', multiplier: 0.25, desc: 'Один цикл на такт (16 шагов)' },
  { id: '1/2', label: '1/2 (8ш)', multiplier: 0.5, desc: 'Два цикла на такт (каждые 8 шагов)' },
  { id: '1/4', label: '1/4 (4ш)', multiplier: 1.0, desc: 'На каждую четвертную долю (4 шага)' },
  { id: '1/8', label: '1/8 (2ш)', multiplier: 2.0, desc: 'На каждую восьмую ноту (2 шага)' },
  { id: '1/16', label: '1/16 (1ш)', multiplier: 4.0, desc: 'Быстрый флаттер на каждый 16-й шаг' },
  { id: '1/8t', label: '1/8 T', multiplier: 3.0, desc: 'Триольный acid свинг' },
];

export const DualModeSequencer: React.FC<DualModeSequencerProps> = React.memo(({ onOpenPresetModal, onOpenWavModal }) => {
  const {
    pattern,
    currentStep,
    isPlaying,
    togglePlay,
    bpm,
    setBpm,
    scale,
    setScale,
    viewMode,
    setViewMode,
    stepLength,
    setStepLength,
    toggleGate,
    toggleAccent,
    toggleSlide,
    toggleOctave,
    setStepNote,
    updateStep,
    clearPattern,
    shiftPatternOctave,
    generateNewPattern,
    patternList,
    activePatternId,
    saveUserPattern,
    loadSavedPattern,
    deleteSavedPattern,
    isDspLive,
    toggleDsp,
    dspSampleRate,
    playTestBeep,
    audioMuted,
    setAudioMuted,
    dspCharacterMode,
    setDspCharacterMode,
    presets,
    activePresetId,
    loadPreset,
    isPitchLfoEnabled,
    setIsPitchLfoEnabled,
    togglePitchLfoEnabled,
    pitchLfoRate,
    setPitchLfoRate,
    pitchLfoDepth,
    setPitchLfoDepth,
    spatialRainMode,
    setSpatialRainMode,
    toggleSpatialRainMode,
  } = useEngine();

  const { t, language } = useLanguage();

  // Compact Tempo-Synced Pitch LFO State & Dropdown Tabs
  const [selectedLfoDivision, setSelectedLfoDivision] = useState<LfoSyncDivision | null>('1/4');
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false);
  const [isDepthMenuOpen, setIsDepthMenuOpen] = useState(false);
  const lfoContainerRef = useRef<HTMLDivElement>(null);

  // Spatial Rain Dropdown Menu State
  const [isRainMenuOpen, setIsRainMenuOpen] = useState(false);
  const rainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (lfoContainerRef.current && !lfoContainerRef.current.contains(e.target as Node)) {
        setIsSyncMenuOpen(false);
        setIsDepthMenuOpen(false);
      }
      if (rainContainerRef.current && !rainContainerRef.current.contains(e.target as Node)) {
        setIsRainMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep LFO locked to BPM when BPM changes
  useEffect(() => {
    if (selectedLfoDivision && selectedLfoDivision !== 'custom') {
      const div = LFO_SYNC_DIVISIONS.find((d) => d.id === selectedLfoDivision);
      if (div) {
        const calculatedRate = (bpm / 60) * div.multiplier;
        setPitchLfoRate(calculatedRate, false);
      }
    }
  }, [bpm, selectedLfoDivision, setPitchLfoRate]);

  const handleSelectLfoDivision = (div: typeof LFO_SYNC_DIVISIONS[0]) => {
    setSelectedLfoDivision(div.id);
    const calculatedRate = (bpm / 60) * div.multiplier;
    setPitchLfoRate(calculatedRate);

    // Make sure LFO is active and depth is immediately noticeable across the pattern!
    dspAudio.init();
    if (!isPitchLfoEnabled) {
      setIsPitchLfoEnabled(true);
    }
    if (pitchLfoDepth < 250) {
      setPitchLfoDepth(350);
    }
  };

  // Selected Step for Note Assignment & TB-303 Step programming
  const [selectedStepIdx, setSelectedStepIdx] = useState<number>(0);
  const [baseOctave, setBaseOctave] = useState<number>(36); // 36 = C1, 48 = C2, 60 = C3
  const [tb303ProgramSubMode, setTb303ProgramSubMode] = useState<'pitch' | 'time'>('pitch');

  // Integrated Pattern Storage & Manager State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newPatternName, setNewPatternName] = useState('');
  const [newPatternCategory, setNewPatternCategory] = useState('User Acid');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isTapFlashing, setIsTapFlashing] = useState(false);
  const [bpmInputStr, setBpmInputStr] = useState<string>(() => String(bpm));

  useEffect(() => {
    setBpmInputStr(String(bpm));
  }, [bpm]);

  const tapTimesRef = useRef<number[]>([]);

  const handleTapBpm = () => {
    const now = performance.now();
    const times = tapTimesRef.current;

    if (times.length > 0 && now - times[times.length - 1] > 2500) {
      times.length = 0;
    }

    times.push(now);
    if (times.length > 5) {
      times.shift();
    }

    setIsTapFlashing(true);
    setTimeout(() => setIsTapFlashing(false), 120);

    if (times.length >= 2) {
      let totalDiff = 0;
      for (let i = 1; i < times.length; i++) {
        totalDiff += times[i] - times[i - 1];
      }
      const avgDiffMs = totalDiff / (times.length - 1);
      if (avgDiffMs > 0) {
        const calculated = Math.round(60000 / avgDiffMs);
        const clamped = Math.max(40, Math.min(260, calculated));
        setBpm(clamped);
      }
    }
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatternName.trim()) return;
    saveUserPattern(newPatternName.trim(), newPatternCategory.trim());
    setIsSaveModalOpen(false);
    setNewPatternName('');
    showToast(`Паттерн "${newPatternName}" сохранен в память!`);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Удалить сохраненный паттерн "${name}"?`)) {
      deleteSavedPattern(id);
      showToast(`Паттерн "${name}" удален.`);
    }
  };

  const handleExportJson = () => {
    const data = PatternManager.exportPatternsJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neural_303_patterns_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Паттерны экспортированы в JSON');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const count = PatternManager.importPatternsJson(content);
      if (count > 0) {
        showToast(`Успешно импортировано ${count} паттернов!`);
      } else {
        showToast('Ошибка при импорте JSON');
      }
    };
    reader.readAsText(file);
  };

  const currentPatternObj = patternList.find((p) => p.id === activePatternId);

  const totalSteps = stepLength || 32;
  const currentStepData = pattern[selectedStepIdx] || pattern[0];

  // Helper to audition step sound
  const auditionStep = (noteMidi: number, isAccent = false, isSlide = false, targetIdx?: number) => {
    dspAudio.init();
    const idx = targetIdx !== undefined ? targetIdx : selectedStepIdx;
    const mockStep: TB303StepData = {
      stepIndex: idx,
      gate: true,
      tie: false,
      note: noteMidi,
      noteName: midiToNoteName(noteMidi),
      velocity: isAccent ? 127 : 80,
      accent: isAccent,
      slide: isSlide,
      octaveUp: false,
      rawActivation: 0.9,
    };
    dspAudio.triggerStep(mockStep, 0.35, false);
  };

  // Keyboard Navigation & Shortcuts State:
  // - Space: Play / Stop
  // - ArrowLeft / ArrowRight: Step navigation (works universally without clicking a step first)
  // - ArrowUp / ArrowDown: Track / Row navigation (Bar 1 <-> Bar 2)
  // - Enter: Toggle step ON / OFF (remove/delete step or activate with preview)
  // - Delete / Backspace: Clear / remove step
  // - Shift + ArrowUp / ArrowDown: Step note pitch selection (+1 / -1 semitone with live audio preview)
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);

  const selectedStepIdxRef = useRef(selectedStepIdx);
  selectedStepIdxRef.current = selectedStepIdx;

  const totalStepsRef = useRef(totalSteps);
  totalStepsRef.current = totalSteps;

  const patternRef = useRef(pattern);
  patternRef.current = pattern;

  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;

  const auditionStepRef = useRef(auditionStep);
  auditionStepRef.current = auditionStep;

  const toggleGateRef = useRef(toggleGate);
  toggleGateRef.current = toggleGate;

  const updateStepRef = useRef(updateStep);
  updateStepRef.current = updateStep;

  const ensureStepVisible = (idx: number) => {
    setTimeout(() => {
      const el = document.getElementById(`t8-step-pad-${idx}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      }
    }, 10);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is actively typing in a text field (e.g. pattern name), don't hijack keys
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        (target.tagName === 'TEXTAREA' ||
          (target.tagName === 'INPUT' &&
            (target as HTMLInputElement).type !== 'range' &&
            (target as HTMLInputElement).type !== 'checkbox'));

      if (isTextInput) return;

      // Play sound of the selected step immediately upon pressing Shift
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
        if (!e.repeat) {
          const currentIdx = selectedStepIdxRef.current;
          const currentPat = patternRef.current;
          const stepData = currentPat[currentIdx] || currentPat[0];
          if (stepData) {
            auditionStepRef.current(stepData.note, stepData.accent, stepData.slide, currentIdx);
          }
        }
      }

      // Crucial: if user clicked any button, select, or dropdown previously,
      // blur it so the browser does not trap arrow keys or Space/Enter inside that button!
      const isControlKey =
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'Enter' ||
        e.code === 'Space' ||
        e.key === ' ' ||
        e.key === 'Delete' ||
        e.key === 'Backspace' ||
        e.key === 'Shift';

      if (isControlKey && target && (target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.tagName === 'A')) {
        target.blur();
      }

      // 1. SPACE: Toggle Play / Stop
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlayRef.current();
        return;
      }

      // 2. ENTER: Toggle / Remove / Add step
      if (e.key === 'Enter') {
        e.preventDefault();
        const currentIdx = selectedStepIdxRef.current;
        const currentPat = patternRef.current;
        const stepData = currentPat[currentIdx] || currentPat[0];
        if (!stepData) return;

        // Toggle step trigger
        toggleGateRef.current(currentIdx);
        // If it was inactive (gate false), it will now become active, so audition the sound
        if (!stepData.gate) {
          auditionStepRef.current(stepData.note, stepData.accent, stepData.slide, currentIdx);
        }
        return;
      }

      // 3. DELETE / BACKSPACE: Clear / remove step
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const currentIdx = selectedStepIdxRef.current;
        updateStepRef.current(currentIdx, { gate: false, tie: false });
        return;
      }

      // 4. SHIFT + ARROW UP / DOWN: Note pitch selection
      if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const currentIdx = selectedStepIdxRef.current;
        const currentPat = patternRef.current;
        const stepData = currentPat[currentIdx] || currentPat[0];
        if (!stepData) return;

        const delta = e.key === 'ArrowUp' ? 1 : -1;
        const newNote = Math.min(72, Math.max(24, stepData.note + delta));
        setStepNote(currentIdx, newNote);
        auditionStepRef.current(newNote, stepData.accent, stepData.slide, currentIdx);
        return;
      }

      // 5. ARROW LEFT / RIGHT: Step navigation (works without clicking a step first)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const steps = totalStepsRef.current;
        setSelectedStepIdx((prev) => {
          const next = (prev - 1 + steps) % steps;
          ensureStepVisible(next);
          return next;
        });
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const steps = totalStepsRef.current;
        setSelectedStepIdx((prev) => {
          const next = (prev + 1) % steps;
          ensureStepVisible(next);
          return next;
        });
        return;
      }

      // 6. ARROW DOWN / UP: Track / Row navigation (switch between Bar 1 and Bar 2)
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const steps = totalStepsRef.current;
        const rowSize = steps === 32 ? 16 : 8;
        setSelectedStepIdx((prev) => {
          const next = prev + rowSize < steps ? prev + rowSize : prev % rowSize;
          ensureStepVisible(next);
          return next;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const steps = totalStepsRef.current;
        const rowSize = steps === 32 ? 16 : 8;
        setSelectedStepIdx((prev) => {
          const next = prev - rowSize >= 0 ? prev - rowSize : Math.min(steps - 1, prev + rowSize);
          ensureStepVisible(next);
          return next;
        });
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [setStepNote]);

  // Set note from Piano keyboard
  const handleAssignNote = (noteOffset: number) => {
    const targetMidi = baseOctave + noteOffset;
    setStepNote(selectedStepIdx, targetMidi);
    updateStep(selectedStepIdx, { gate: true });
    auditionStep(targetMidi, currentStepData?.accent, currentStepData?.slide);

    // In TB-303 Classic Pitch mode, automatically advance to next step on note press!
    if (viewMode === 'tb303_classic' && tb303ProgramSubMode === 'pitch') {
      setSelectedStepIdx((prev) => (prev + 1) % totalSteps);
    }
  };

  // TB-303 Time Mode inputs (Note / Tie / Rest)
  const handleTimeInput = (type: 'note' | 'tie' | 'rest') => {
    if (type === 'note') {
      updateStep(selectedStepIdx, { gate: true, tie: false });
      auditionStep(currentStepData.note, currentStepData.accent, currentStepData.slide);
    } else if (type === 'tie') {
      updateStep(selectedStepIdx, { gate: true, tie: true, slide: true });
    } else {
      updateStep(selectedStepIdx, { gate: false, tie: false });
    }
    // Step forward
    setSelectedStepIdx((prev) => (prev + 1) % totalSteps);
  };

  // Helper to render individual tactile step pad (Fixed geometry, zero layout shift)
  const renderStepPad = (step: TB303StepData, globalIdx: number) => {
    const isActive = isPlaying && currentStep === globalIdx;
    const isSelected = selectedStepIdx === globalIdx;
    const isTrig = step.gate;

    let padStyle = 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500';
    if (isActive) {
      padStyle = 'bg-amber-400 border-amber-200 text-slate-950 shadow-[0_0_14px_rgba(251,191,36,1)] ring-2 ring-amber-200 font-black z-10';
    } else if (isTrig) {
      padStyle = step.accent
        ? 'bg-red-600 border-red-400 text-white shadow-[0_0_8px_rgba(239,68,68,0.7)] font-bold'
        : 'bg-amber-500/90 border-amber-400 text-slate-950 shadow-[0_0_6px_rgba(245,158,11,0.5)] font-bold';
    }

    return (
      <button
        key={globalIdx}
        id={`t8-step-pad-${globalIdx}`}
        onClick={() => {
          setSelectedStepIdx(globalIdx);
          toggleGate(globalIdx);
        }}
        className={`h-14 sm:h-16 w-full rounded-lg border-2 flex flex-col items-center justify-between p-1 transition-all duration-75 cursor-pointer relative box-border ${padStyle} ${
          isSelected
            ? isShiftPressed
              ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_14px_rgba(251,191,36,0.9)] scale-[1.04] z-20'
              : isActive
              ? 'ring-4 ring-cyan-400 ring-offset-1 ring-offset-slate-950 z-20'
              : 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950 z-10'
            : ''
        }`}
        title={`Шаг ${globalIdx + 1}: ${step.noteName} ${step.gate ? 'ON' : 'OFF'}`}
      >
        {/* Step LED Dot */}
        <span
          className={`w-2.5 h-2.5 rounded-full border flex-shrink-0 ${
            isTrig
              ? isActive
                ? 'bg-slate-950 border-slate-900'
                : step.accent
                ? 'bg-white border-red-300 animate-pulse'
                : 'bg-white border-amber-200'
              : 'bg-slate-800 border-slate-700'
          }`}
        />

        {/* Step Number */}
        <span className="text-[11px] font-black leading-none">{globalIdx + 1}</span>

        {/* Note Name or Rest */}
        <span className="text-[9px] font-bold truncate max-w-full leading-none">
          {step.gate ? step.noteName : '—'}
        </span>

        {/* Badges for Accent / Slide */}
        <div className="flex gap-0.5 text-[7px] font-bold h-2.5 items-center">
          {step.accent && <span className="text-red-300">A</span>}
          {step.slide && <span className="text-cyan-300">S</span>}
        </div>
      </button>
    );
  };

  /**
   * Compact Tempo-Synced Bass Pitch & Filter LFO Controls (Fitted on the Right side)
   * With rock-solid fixed dimensions (ZERO layout shift or jumping)
   * and deeply audible depth presets (±150c, ±350c, ±600c, ±1200c)
   */
  const renderCompactPitchLfoStrip = () => {
    const activeSyncDiv = LFO_SYNC_DIVISIONS.find((d) => d.id === selectedLfoDivision);
    const activeSyncLabel = activeSyncDiv ? activeSyncDiv.label : `${pitchLfoRate.toFixed(1)}Hz`;

    return (
      <div
        ref={lfoContainerRef}
        className={`px-1.5 py-0.5 rounded-lg border transition-all flex items-center gap-1 text-xs select-none relative z-40 shrink-0 h-8 box-border ${
          isPitchLfoEnabled
            ? 'bg-slate-900 border-emerald-500/90 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
            : 'bg-slate-900/80 border-slate-700/80 text-slate-400'
        }`}
      >
        {/* 1. LFO Power Toggle Button - Fixed 68px width, ZERO layout shift */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePitchLfoEnabled();
            dspAudio.init();
            if (!isPitchLfoEnabled && pitchLfoDepth < 250) {
              setPitchLfoDepth(350);
            }
          }}
          className={`w-[68px] h-6 px-1 rounded text-[11px] font-black transition cursor-pointer flex items-center justify-center gap-1 shadow active:scale-95 border shrink-0 ${
            isPitchLfoEnabled
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
          }`}
          title={isPitchLfoEnabled ? 'Выключить Pitch & Filter LFO' : 'Включить мощный воббл/LFO питча и фильтра'}
        >
          <Power className={`w-3 h-3 ${isPitchLfoEnabled ? 'text-slate-950 stroke-[3]' : 'text-slate-400'}`} />
          <span>{isPitchLfoEnabled ? 'LFO ON' : 'LFO OFF'}</span>
        </button>

        {/* 2. Открывающаяся вкладка "Синхро к паттерну" - Fixed 98px width, ZERO layout shift */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSyncMenuOpen((prev) => !prev);
              setIsDepthMenuOpen(false);
            }}
            className={`w-[98px] h-6 px-1.5 rounded text-[11px] font-bold transition cursor-pointer flex items-center justify-between border shrink-0 ${
              isPitchLfoEnabled
                ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700 shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Синхронизация к паттерну: нажмите для выбора длительности (1/4, 1/8, 1/2...)"
          >
            <div className="flex items-center gap-1 min-w-0 truncate">
              <Clock className={`w-3 h-3 shrink-0 ${isPitchLfoEnabled ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="font-mono truncate">{activeSyncLabel}</span>
            </div>
            <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isSyncMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Sync Dropdown Popup */}
          {isSyncMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1.5 z-50 bg-slate-950 border-2 border-emerald-500 rounded-xl p-2 shadow-2xl w-64 max-w-[calc(100vw-36px)] space-y-1 font-mono text-white text-xs pointer-events-auto"
            >
              <div className="text-[10px] text-slate-400 font-bold px-1.5 py-1 border-b border-slate-800 uppercase flex items-center justify-between">
                <span>{t('syncGridTitle')}</span>
                <span className="text-emerald-400 font-bold">{bpm} BPM</span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
                {LFO_SYNC_DIVISIONS.map((div) => {
                  const isSelected = selectedLfoDivision === div.id && isPitchLfoEnabled;
                  const rateHz = ((bpm / 60) * div.multiplier).toFixed(2);
                  return (
                    <button
                      key={div.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleSelectLfoDivision(div);
                        setIsSyncMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer text-xs ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-black shadow'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="font-bold">{div.label}</span>
                        <div className="text-[9px] text-slate-400">{div.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-300 font-bold ml-2 shrink-0">
                        {rateHz} Hz
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Открывающаяся вкладка "Глубина" - Fixed 82px width, ZERO layout shift */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDepthMenuOpen((prev) => !prev);
              setIsSyncMenuOpen(false);
            }}
            className={`w-[82px] h-6 px-1.5 rounded text-[11px] font-bold transition cursor-pointer flex items-center justify-between border shrink-0 ${
              isPitchLfoEnabled
                ? 'bg-teal-950/80 hover:bg-teal-900 text-teal-300 border-teal-700 shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Глубина LFO: нажмите для выбора глубины переливания (±150c, ±350c, ±600c, ±1200c...)"
          >
            <div className="flex items-center gap-1 min-w-0 truncate">
              <Sliders className="w-3 h-3 text-teal-400 shrink-0" />
              <span className="font-mono truncate">±{pitchLfoDepth}c</span>
            </div>
            <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isDepthMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Depth Dropdown Popup */}
          {isDepthMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1.5 z-50 bg-slate-950 border-2 border-teal-500 rounded-xl p-2.5 shadow-2xl w-60 max-w-[calc(100vw-36px)] space-y-2 font-mono text-white text-xs pointer-events-auto"
            >
              <div className="text-[10px] text-slate-400 font-bold px-1 py-0.5 border-b border-slate-800 uppercase flex items-center justify-between">
                <span>{t('lfoDepthTitle')}</span>
                <span className="text-teal-400 font-bold">±{pitchLfoDepth}c</span>
              </div>

              {/* Quick deeply audible depth presets */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setPitchLfoDepth(150);
                    dspAudio.init();
                    if (!isPitchLfoEnabled) setIsPitchLfoEnabled(true);
                    setIsDepthMenuOpen(false);
                  }}
                  className={`p-1.5 rounded text-center border transition cursor-pointer ${
                    pitchLfoDepth === 150 ? 'bg-teal-600 text-white font-bold border-teal-400 shadow' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  ±150c {language === 'ru' ? 'Мягко' : 'Soft'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setPitchLfoDepth(350);
                    dspAudio.init();
                    if (!isPitchLfoEnabled) setIsPitchLfoEnabled(true);
                    setIsDepthMenuOpen(false);
                  }}
                  className={`p-1.5 rounded text-center border transition cursor-pointer ${
                    pitchLfoDepth === 350 ? 'bg-emerald-600 text-white font-black border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-900 text-emerald-300 border-slate-800 hover:bg-slate-800 font-bold'
                  }`}
                >
                  ±350c {language === 'ru' ? 'Сочно!' : 'Juicy!'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setPitchLfoDepth(600);
                    dspAudio.init();
                    if (!isPitchLfoEnabled) setIsPitchLfoEnabled(true);
                    setIsDepthMenuOpen(false);
                  }}
                  className={`p-1.5 rounded text-center border transition cursor-pointer ${
                    pitchLfoDepth === 600 ? 'bg-amber-600 text-slate-950 font-black border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-900 text-amber-300 border-slate-800 hover:bg-slate-800 font-bold'
                  }`}
                >
                  ±600c {language === 'ru' ? 'Глубоко' : 'Deep'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setPitchLfoDepth(1200);
                    dspAudio.init();
                    if (!isPitchLfoEnabled) setIsPitchLfoEnabled(true);
                    setIsDepthMenuOpen(false);
                  }}
                  className={`p-1.5 rounded text-center border transition cursor-pointer ${
                    pitchLfoDepth === 1200 ? 'bg-red-600 text-white font-black border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-slate-900 text-rose-300 border-slate-800 hover:bg-slate-800 font-bold'
                  }`}
                >
                  ±1200c {language === 'ru' ? '1 Октава!' : '1 Octave!'}
                </button>
              </div>

              {/* Continuous range slider up to 1200 cents (1 full octave) */}
              <div className="pt-1.5 border-t border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{t('lfoSliderLabel')}</span>
                  <span className="text-teal-300 font-bold font-mono">±{pitchLfoDepth} cents (±{(pitchLfoDepth / 100).toFixed(1)} st)</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1200"
                  step="10"
                  value={pitchLfoDepth}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setPitchLfoDepth(val);
                    dspAudio.init();
                    if (!isPitchLfoEnabled) setIsPitchLfoEnabled(true);
                  }}
                  className="w-full accent-teal-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Ultra-Compact Spatial Pan Button with Hidden Dropdown Popover Tab (3 Variations Choice)
   */
  const renderSpatialPanStrip = () => {
    const isPanActive = spatialRainMode !== 'off';

    const getPanShortLabel = () => {
      if (spatialRainMode === 'pingpong') return 'P-PONG';
      if (spatialRainMode === 'drops') return language === 'ru' ? 'КАПЛИ' : 'DROPS';
      if (spatialRainMode === 'spiral') return language === 'ru' ? 'ВИХРЬ' : 'SPIRAL';
      return language === 'ru' ? 'ПАН ВЫКЛ' : 'PAN OFF';
    };

    return (
      <div ref={rainContainerRef} className="relative shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsRainMenuOpen((prev) => !prev);
            setIsSyncMenuOpen(false);
            setIsDepthMenuOpen(false);
          }}
          className={`h-6 px-2 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border shadow active:scale-95 select-none ${
            isPanActive
              ? 'bg-cyan-950/90 hover:bg-cyan-900 text-cyan-300 border-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
          }`}
          title={t('panTooltip')}
        >
          <Sliders className={`w-3 h-3 shrink-0 ${isPanActive ? 'text-cyan-400 rotate-90 animate-pulse' : 'text-slate-400 rotate-90'}`} />
          <span className="font-mono text-[11px] tracking-tight whitespace-nowrap">{getPanShortLabel()}</span>
          <ChevronDown className={`w-3 h-3 shrink-0 transition-transform text-slate-400 ${isRainMenuOpen ? 'rotate-180 text-cyan-300' : ''}`} />
        </button>

        {/* Hidden Dropdown Popover Tab with 3 Variations */}
        {isRainMenuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-64 max-w-[calc(100vw-24px)] bg-slate-950/98 backdrop-blur border border-cyan-500/80 rounded-xl p-2 shadow-[0_12px_30px_rgba(0,0,0,0.85)] z-50 space-y-1">
            <div className="px-2 py-1 text-[10px] font-black uppercase text-cyan-400 tracking-wider flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span>{t('panTitle')}</span>
              <span className="text-slate-400 font-normal">3 Вариации</span>
            </div>

            {/* Option 0: OFF */}
            <button
              type="button"
              onClick={() => {
                setSpatialRainMode('off');
                setIsRainMenuOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-between ${
                spatialRainMode === 'off'
                  ? 'bg-slate-800 text-white font-bold border border-slate-600'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span>{t('panModeOffLabel')}</span>
              </div>
              {spatialRainMode === 'off' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            {/* Option 1: Ping-Pong Mirror */}
            <button
              type="button"
              onClick={() => {
                setSpatialRainMode('pingpong');
                setIsRainMenuOpen(false);
                dspAudio.init();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-between ${
                spatialRainMode === 'pingpong'
                  ? 'bg-cyan-950/90 text-cyan-300 font-black border border-cyan-500/80 shadow'
                  : 'text-slate-300 hover:text-cyan-300 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>{t('panModePingPongLabel')}</span>
                </div>
                <div className="text-[10px] text-slate-400 pl-3.5 mt-0.5">
                  {language === 'ru' ? 'Чередование лево/право с зеркальными отскоками' : 'Alternating L/R mirror ping-pong bouncing'}
                </div>
              </div>
              {spatialRainMode === 'pingpong' && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            </button>

            {/* Option 2: Rain Drops Scatter */}
            <button
              type="button"
              onClick={() => {
                setSpatialRainMode('drops');
                setIsRainMenuOpen(false);
                dspAudio.init();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-between ${
                spatialRainMode === 'drops'
                  ? 'bg-sky-950/90 text-sky-300 font-black border border-sky-500/80 shadow'
                  : 'text-slate-300 hover:text-sky-300 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>{t('panModeDropsLabel')}</span>
                </div>
                <div className="text-[10px] text-slate-400 pl-3.5 mt-0.5">
                  {language === 'ru' ? 'Разброс нот по 16 стерео точкам как капли дождя' : 'Notes flying across 16 spatial stereo rain points'}
                </div>
              </div>
              {spatialRainMode === 'drops' && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
            </button>

            {/* Option 3: 3D Vortex Spiral */}
            <button
              type="button"
              onClick={() => {
                setSpatialRainMode('spiral');
                setIsRainMenuOpen(false);
                dspAudio.init();
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center justify-between ${
                spatialRainMode === 'spiral'
                  ? 'bg-indigo-950/90 text-indigo-300 font-black border border-indigo-500/80 shadow'
                  : 'text-slate-300 hover:text-indigo-300 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>{t('panModeSpiralLabel')}</span>
                </div>
                <div className="text-[10px] text-slate-400 pl-3.5 mt-0.5">
                  {language === 'ru' ? 'Плавная 360° круговая орбита панорамы' : 'Continuous 360° stereo vortex orbit'}
                </div>
              </div>
              {spatialRainMode === 'spiral' && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-3 sm:p-4 border-2 border-slate-700 space-y-3 font-mono text-white shadow-2xl max-w-full overflow-hidden box-border">
      {/* 1. Master Audio Transport & DSP Engine Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        {/* Left: Master Playback, DSP Power, Test Beep, Mute, and Character Modes */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* MASTER PLAY / STOP BUTTON */}
          <button
            type="button"
            onClick={togglePlay}
            className={`w-[130px] h-8 flex items-center justify-center gap-1.5 rounded-lg font-black text-xs shadow-lg transition cursor-pointer select-none whitespace-nowrap shrink-0 ${
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

          {/* MASTER DSP POWER TOGGLE BUTTON */}
          <button
            onClick={toggleDsp}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs shadow-md transition cursor-pointer border ${
              isDspLive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600'
            }`}
            title={isDspLive ? 'Click to disable internal DSP engine' : 'Click to enable internal Web Audio DSP engine'}
          >
            <Power className={`w-3.5 h-3.5 ${isDspLive ? 'text-white animate-pulse' : 'text-slate-400'}`} />
            <span>{isDspLive ? `DSP LIVE (${(dspSampleRate / 1000).toFixed(0)}kHz)` : 'ENABLE DSP'}</span>
          </button>

          {/* DIRECT AUDIO BEEP TEST BUTTON */}
          <button
            onClick={playTestBeep}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition cursor-pointer"
            title="Click to test browser speaker sound with a direct 440Hz test tone"
          >
            <AudioWaveform className="w-3.5 h-3.5 text-slate-950" />
            <span>TEST SOUND</span>
          </button>

          {/* MUTE / UNMUTE BUTTON */}
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            title={audioMuted ? 'Unmute Browser Web Audio' : 'Mute Browser Web Audio (MIDI Only)'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 shadow transition cursor-pointer"
          >
            {audioMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* DSP Character Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setDspCharacterMode('classic_303')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer text-[11px] ${
                dspCharacterMode === 'classic_303'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Classic
            </button>
            <button
              onClick={() => setDspCharacterMode('neural_chaos')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer text-[11px] ${
                dspCharacterMode === 'neural_chaos'
                  ? 'bg-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Acid Scream
            </button>
            <button
              onClick={() => setDspCharacterMode('industrial_drive')}
              className={`px-2 py-1 rounded font-bold transition cursor-pointer text-[11px] ${
                dspCharacterMode === 'industrial_drive'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hard Clip
            </button>
          </div>
        </div>

        {/* Right: Mode Switcher (T-8 vs TB-303 Classic) and Step Length (16/32) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher Buttons */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('t8_trrec')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded font-black transition cursor-pointer flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs ${
                viewMode === 't8_trrec'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>T-8 (TR-REC)</span>
            </button>

            <button
              onClick={() => setViewMode('tb303_classic')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded font-black transition cursor-pointer flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs ${
                viewMode === 'tb303_classic'
                  ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{t('viewClassic')}</span>
              <span className="sm:hidden">TB-303</span>
            </button>
          </div>

          {/* Step Length Selector (16 / 32) */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setStepLength(16)}
              className={`px-2 sm:px-2.5 py-1 rounded font-black transition cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                totalSteps === 16
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="16 Steps"
            >
              {t('stepLength16')}
            </button>
            <button
              onClick={() => setStepLength(32)}
              className={`px-2 sm:px-2.5 py-1 rounded font-black transition cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                totalSteps === 32
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="32 Steps"
            >
              {t('stepLength32')}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Integrated Pattern & Preset Storage, Bank and WAV Studio Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800 text-xs">
        {/* Left: Quick Preset & Acid/Tribe/Tekno Pattern Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Preset / Patch Dropdown */}
          <div className="flex items-center gap-1.5 max-w-full">
            <span className="text-amber-400 font-black uppercase text-xs flex items-center gap-1">
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('presetLabel')}</span>
            </span>
            <select
              value={activePresetId || ''}
              onChange={(e) => {
                const found = presets.find((p) => p.id === e.target.value);
                if (found) loadPreset(found);
              }}
              className="bg-slate-950 border border-slate-700 text-white font-bold px-2 py-1 rounded focus:outline-none cursor-pointer max-w-[200px] sm:max-w-xs truncate text-xs"
            >
              {presets.some((p) => p.category === 'Tekno') && (
                <optgroup label="🔊 Tekno / Acidcore (162-168 BPM)" className="bg-slate-950 text-purple-400">
                  {presets
                    .filter((p) => p.category === 'Tekno')
                    .map((preset) => (
                      <option key={preset.id} value={preset.id} className="bg-slate-900 text-white">
                        [{preset.bpm} BPM] {preset.name}
                      </option>
                    ))}
                </optgroup>
              )}

              {presets.some((p) => p.category === 'Acid') && (
                <optgroup label="⚡ Acid Patterns (138-144 BPM)" className="bg-slate-950 text-amber-400">
                  {presets
                    .filter((p) => p.category === 'Acid')
                    .map((preset) => (
                      <option key={preset.id} value={preset.id} className="bg-slate-900 text-white">
                        [{preset.bpm} BPM] {preset.name}
                      </option>
                    ))}
                </optgroup>
              )}

              {presets.some((p) => p.category === 'Tribcore') && (
                <optgroup label="🔥 Tribcore (180-190 BPM)" className="bg-slate-950 text-rose-400">
                  {presets
                    .filter((p) => p.category === 'Tribcore')
                    .map((preset) => (
                      <option key={preset.id} value={preset.id} className="bg-slate-900 text-white">
                        [{preset.bpm} BPM] {preset.name}
                      </option>
                    ))}
                </optgroup>
              )}

              {presets.some((p) => p.category === 'User') && (
                <optgroup label="💾 User Patches" className="bg-slate-950 text-emerald-400">
                  {presets
                    .filter((p) => p.category === 'User')
                    .map((preset) => (
                      <option key={preset.id} value={preset.id} className="bg-slate-900 text-emerald-200">
                        [{preset.bpm} BPM] {preset.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Right: Presets modal, Save, Delete, Export/Import, and WAV Studio button */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Presets Modal Button */}
          {onOpenPresetModal && (
            <button
              onClick={onOpenPresetModal}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-slate-700 transition cursor-pointer shadow flex items-center gap-1 text-xs"
              title="Открыть библиотеку пресетов"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Presets</span>
            </button>
          )}

          {/* Save Pattern Button */}
          <button
            onClick={() => {
              setNewPatternName(`My Acid Pattern ${patternList.filter((p) => !p.isFactory).length + 1}`);
              setIsSaveModalOpen(true);
            }}
            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition cursor-pointer flex items-center gap-1 shadow text-xs"
            title="Save pattern (localStorage)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('saveBtn')}</span>
          </button>

          {/* Delete User Pattern */}
          {currentPatternObj && !currentPatternObj.isFactory && (
            <button
              onClick={() => handleDelete(currentPatternObj.id, currentPatternObj.name)}
              className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 font-bold transition cursor-pointer flex items-center gap-1 text-xs"
              title="Delete user pattern"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('deleteBtn')}</span>
            </button>
          )}

          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Export patterns to .json"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">{t('exportBtn')}</span>
          </button>

          {/* Import JSON */}
          <label
            className="px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Import patterns from .json"
          >
            <Upload className="w-3 h-3" />
            <span className="hidden sm:inline">{t('importBtn')}</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          {/* WAV Export / Recording Button */}
          {onOpenWavModal && (
            <button
              onClick={onOpenWavModal}
              className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs border border-rose-400 transition cursor-pointer shadow-[0_0_12px_rgba(225,29,72,0.5)] w-full sm:w-auto mt-1 sm:mt-0"
              title="WAV Export"
            >
              <Disc className="w-3.5 h-3.5 animate-spin shrink-0" style={{ animationDuration: '4s' }} />
              <span>{t('wavExportBtn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Musical Performance Deck (Scale, BPM + TAP, AI Gen, Clear, Octave) */}
      <div className="bg-slate-950/90 p-2 sm:p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs relative overflow-visible">
        {/* Scale & BPM Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Scale Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-bold">Scale:</span>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value as ScaleName)}
              className="bg-slate-900 border border-slate-700 text-slate-200 font-bold px-2 py-1 rounded focus:outline-none cursor-pointer text-xs"
            >
              {Object.entries(SCALES).map(([key, sc]) => (
                <option key={key} value={key} className="bg-slate-900 text-white">
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* BPM Controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-bold">BPM:</span>

            {/* Quick -1 / -5 BPM Button */}
            <button
              type="button"
              onClick={(e) => {
                const delta = e.shiftKey ? 5 : 1;
                const nextBpm = Math.max(40, bpm - delta);
                setBpm(nextBpm);
              }}
              className="w-5 h-6 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-black border border-slate-700 flex items-center justify-center text-xs cursor-pointer active:scale-95 transition"
              title="-1 BPM (с зажатым Shift: -5 BPM)"
            >
              -
            </button>

            <input
              type="number"
              min="40"
              max="260"
              value={bpmInputStr}
              onChange={(e) => {
                const raw = e.target.value;
                setBpmInputStr(raw);
                const parsed = parseInt(raw, 10);
                if (!isNaN(parsed) && parsed >= 40 && parsed <= 260) {
                  setBpm(parsed);
                }
              }}
              onBlur={() => {
                const parsed = parseInt(bpmInputStr, 10);
                if (isNaN(parsed) || parsed < 40) {
                  setBpm(40);
                  setBpmInputStr('40');
                } else if (parsed > 260) {
                  setBpm(260);
                  setBpmInputStr('260');
                } else {
                  setBpm(parsed);
                  setBpmInputStr(String(parsed));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-14 bg-slate-900 border border-slate-700 text-amber-400 font-bold text-center py-1 rounded focus:outline-none focus:border-amber-500 text-xs"
            />

            {/* Quick +1 / +5 BPM Button */}
            <button
              type="button"
              onClick={(e) => {
                const delta = e.shiftKey ? 5 : 1;
                const nextBpm = Math.min(260, bpm + delta);
                setBpm(nextBpm);
              }}
              className="w-5 h-6 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-black border border-slate-700 flex items-center justify-center text-xs cursor-pointer active:scale-95 transition"
              title="+1 BPM (с зажатым Shift: +5 BPM)"
            >
              +
            </button>

            {/* TAP BPM BUTTON */}
            <button
              type="button"
              onClick={handleTapBpm}
              className={`px-2.5 py-1 rounded font-black text-[11px] transition cursor-pointer flex items-center gap-1 border shadow ${
                isTapFlashing
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,1)] scale-95'
                  : 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border-amber-500/50'
              }`}
              title="Tap Tempo: нажимайте несколько раз в ритм песни для определения темпа"
            >
              <Gauge className="w-3 h-3" />
              <span>TAP</span>
            </button>
          </div>
        </div>

        {/* AI Generator & Pattern Tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {viewMode === 't8_trrec' && (
            <div className="flex items-center gap-1 mr-1">
              <span className="text-[10px] text-slate-400 font-bold hidden md:inline">{t('octaveKeys')}</span>
              <div className="flex bg-slate-900 p-0.5 rounded border border-slate-700 text-[10px]">
                <button
                  onClick={() => setBaseOctave(36)}
                  className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                    baseOctave === 36 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  C1-C2
                </button>
                <button
                  onClick={() => setBaseOctave(48)}
                  className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                    baseOctave === 48 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  C2-C3
                </button>
                <button
                  onClick={() => setBaseOctave(60)}
                  className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                    baseOctave === 60 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  C3-C4
                </button>
              </div>
            </div>
          )}

          <button
            onClick={generateNewPattern}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1 shadow text-xs"
            title="Randomize pattern (Rndm)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Rndm</span>
          </button>

          <button
            onClick={clearPattern}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer flex items-center gap-1 text-xs"
            title={t('clearConfirmTitle')}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('clearBtn')}</span>
          </button>

          {/* COMPACT BASS PITCH LFO & SPATIAL PAN STRIPS ON THE RIGHT */}
          <div className="ml-1 pl-1.5 border-l border-slate-800 flex items-center gap-1.5 flex-wrap">
            {renderCompactPitchLfoStrip()}
            {renderSpatialPanStrip()}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1 (DEFAULT / PRIMARY): T-8 TACTILE STEP SEQUENCER                    */}
      {/* ========================================================================= */}
      {viewMode === 't8_trrec' && (
        <div className="space-y-3.5 bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800 max-w-full overflow-hidden box-border">
          {/* Section Header & Selected Step HUD (Responsive, zero overflow on mobile) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs border-b border-slate-800 pb-2 min-h-9 box-border">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-amber-400 font-bold flex items-center gap-1.5 whitespace-nowrap">
                <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">T-8 Tactile Step Sequencer ({totalSteps} шагов)</span>
                <span className="sm:hidden">T-8 ({totalSteps}ш)</span>
              </span>
              <span className="text-[10px] text-slate-500 hidden md:inline truncate">
                {totalSteps === 32 ? 'Визуально отображены все 32 шага (Такт 1 и Такт 2)' : 'Отображены 16 шагов (Такт 1)'}
              </span>
            </div>

            {/* Selected Step Inspector Pill - 100% Fixed Dimensions, Zero Layout Shift */}
            {currentStepData && (
              <div
                className={`h-7 px-1.5 sm:px-2 rounded-lg border text-xs flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap transition-colors bg-slate-900 ${
                  isShiftPressed
                    ? 'border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-1 ring-amber-400'
                    : 'border-slate-700'
                }`}
              >
                <span className="text-slate-400 text-[10px] sm:text-[11px]">Шаг:</span>
                <span className="text-amber-400 font-black text-xs font-mono w-6 sm:w-7 text-left">
                  #{selectedStepIdx + 1}
                </span>
                {/* Step Note - Click to Audition */}
                <button
                  type="button"
                  onClick={(e) => {
                    auditionStep(currentStepData.note, currentStepData.accent, currentStepData.slide);
                    e.currentTarget.blur();
                  }}
                  className={`font-mono font-bold text-xs w-9 sm:w-11 text-center transition cursor-pointer select-none hover:scale-105 active:scale-95 ${
                    isShiftPressed ? 'text-amber-300 font-black animate-pulse' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                  title={`Прослушать ноту шага #${selectedStepIdx + 1} (${currentStepData.noteName})`}
                >
                  [{currentStepData.noteName}]
                </button>

                {/* Gate / Trigger Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    toggleGate(selectedStepIdx);
                    if (!currentStepData.gate) {
                      auditionStep(currentStepData.note, currentStepData.accent, currentStepData.slide);
                    }
                    e.currentTarget.blur();
                  }}
                  className={`text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded text-center w-12 sm:w-14 transition cursor-pointer select-none active:scale-95 ${
                    currentStepData.gate
                      ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 hover:text-white'
                  }`}
                  title={`Клик: ${currentStepData.gate ? 'Выключить ноту (REST)' : 'Включить ноту (TRIG ON)'} для шага #${selectedStepIdx + 1}`}
                >
                  {currentStepData.gate ? 'TRIG ON' : 'REST'}
                </button>

                {/* Accent Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    toggleAccent(selectedStepIdx);
                    if (!currentStepData.accent) {
                      auditionStep(currentStepData.note, true, currentStepData.slide);
                    }
                    e.currentTarget.blur();
                  }}
                  className={`text-[9px] font-bold px-1 py-0.5 rounded text-center w-7 sm:w-8 transition cursor-pointer select-none active:scale-95 ${
                    currentStepData.accent
                      ? 'text-red-300 bg-red-950/80 border border-red-600 shadow-[0_0_8px_rgba(239,68,68,0.4)] hover:bg-red-900'
                      : 'text-slate-600 border border-slate-800/60 bg-slate-950/40 hover:border-red-800/80 hover:text-red-400 opacity-60 hover:opacity-100'
                  }`}
                  title={`Клик: ${currentStepData.accent ? 'Убрать акцент' : 'Включить акцент (ACC)'} для шага #${selectedStepIdx + 1}`}
                >
                  ACC
                </button>

                {/* Slide Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    toggleSlide(selectedStepIdx);
                    e.currentTarget.blur();
                  }}
                  className={`text-[9px] font-bold px-1 py-0.5 rounded text-center w-9 sm:w-10 transition cursor-pointer select-none active:scale-95 ${
                    currentStepData.slide
                      ? 'text-cyan-300 bg-cyan-950/80 border border-cyan-600 shadow-[0_0_8px_rgba(6,182,212,0.4)] hover:bg-cyan-900'
                      : 'text-slate-600 border border-slate-800/60 bg-slate-950/40 hover:border-cyan-800/80 hover:text-cyan-400 opacity-60 hover:opacity-100'
                  }`}
                  title={`Клик: ${currentStepData.slide ? 'Убрать слайд' : 'Включить слайд (SLIDE)'} для шага #${selectedStepIdx + 1}`}
                >
                  SLIDE
                </button>
              </div>
            )}
          </div>

          {/* Sub-line: Keyboard Hotkeys Guide & Live Status */}
          <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 px-0.5 min-h-6 select-none border-b border-slate-900 pb-1 gap-1">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap overflow-hidden">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">{t('hotkeysGuide')}</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono">← / →</kbd> {t('hotkeysStep')}</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono">↑ / ↓</kbd> {t('hotkeysRow')}</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-mono">Enter</kbd> {t('hotkeysToggle')}</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400 font-mono">Shift+↑/↓</kbd> {t('hotkeysNote')}</span>
              <span><kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono">Space</kbd> {t('hotkeysPlay')}</span>
            </div>

            {isShiftPressed && (
              <span className="text-amber-400 font-bold text-[10px] animate-pulse whitespace-nowrap hidden sm:inline">
                ⚡ SHIFT ACTIVE: keys ↑ / ↓ change note [{currentStepData?.noteName}]
              </span>
            )}
          </div>

          {/* ALL 32 STEP TACTILE PADS VISUALLY RENDERED (Zero Layout Shift) */}
          <div className="space-y-3 max-w-full">
            {/* BAR 1: STEPS 1 - 16 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1 h-5 select-none">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className={`w-2 h-2 rounded-full transition-colors ${isPlaying && currentStep < 16 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-amber-500/40'}`} />
                  <span>{t('bar1Label')}</span>
                </span>
                <span className={`text-[10px] font-bold transition-opacity ${isPlaying && currentStep < 16 ? 'text-emerald-400 opacity-100' : 'opacity-0'}`}>
                  {t('bar1Playing')}
                </span>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 max-w-full">
                {pattern.slice(0, 16).map((step, idx) => renderStepPad(step, idx))}
              </div>
            </div>

            {/* BAR 2: STEPS 17 - 32 (VISUALLY APPEARS WHEN 32 STEPS IS CHOSEN!) */}
            {totalSteps === 32 && (
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1 h-5 select-none">
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <span className={`w-2 h-2 rounded-full transition-colors ${isPlaying && currentStep >= 16 ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-indigo-500/40'}`} />
                    <span>{t('bar2Label')}</span>
                  </span>
                  <span className={`text-[10px] font-bold transition-opacity ${isPlaying && currentStep >= 16 ? 'text-emerald-400 opacity-100' : 'opacity-0'}`}>
                    {t('bar2Playing')}
                  </span>
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 max-w-full">
                  {pattern.slice(16, 32).map((step, idx) => renderStepPad(step, 16 + idx))}
                </div>
              </div>
            )}
          </div>

          {/* Direct Note Shifter & Modifiers Strip for Selected Step */}
          {currentStepData && (
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs max-w-full overflow-hidden box-border">
              {/* Note Selector & Pitch Adjuster */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap max-w-full">
                <span className="text-slate-400 text-[10px] sm:text-[11px] font-bold whitespace-nowrap">
                  <span className="hidden sm:inline">{t('stepNoteLabel')}</span> #{selectedStepIdx + 1}:
                </span>

                {/* Direct Note Pitch Selector Dropdown */}
                <select
                  value={currentStepData.note}
                  onChange={(e) => {
                    const midi = parseInt(e.target.value, 10);
                    setStepNote(selectedStepIdx, midi);
                    auditionStep(midi, currentStepData.accent, currentStepData.slide);
                  }}
                  className="bg-slate-950 border border-slate-700 text-amber-300 font-bold px-1.5 sm:px-2 py-1 rounded text-xs focus:outline-none cursor-pointer max-w-[110px] sm:max-w-none truncate"
                >
                  {Array.from({ length: 48 }, (_, i) => 24 + i).map((midi) => (
                    <option key={midi} value={midi} className="bg-slate-900 text-white">
                      {midiToNoteName(midi)} ({midi})
                    </option>
                  ))}
                </select>

                {/* Semitone - / + Buttons */}
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <button
                    onClick={() => {
                      const newNote = Math.max(24, currentStepData.note - 1);
                      setStepNote(selectedStepIdx, newNote);
                      auditionStep(newNote, currentStepData.accent, currentStepData.slide);
                    }}
                    className="px-1.5 sm:px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] sm:text-xs cursor-pointer active:scale-95"
                    title="-1 Полутон"
                  >
                    -1 Semi
                  </button>
                  <button
                    onClick={() => {
                      const newNote = Math.min(72, currentStepData.note + 1);
                      setStepNote(selectedStepIdx, newNote);
                      auditionStep(newNote, currentStepData.accent, currentStepData.slide);
                    }}
                    className="px-1.5 sm:px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] sm:text-xs cursor-pointer active:scale-95"
                    title="+1 Полутон"
                  >
                    +1 Semi
                  </button>
                </div>

                {/* Step Octave - / + Buttons */}
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <button
                    onClick={() => {
                      const newNote = Math.max(24, currentStepData.note - 12);
                      setStepNote(selectedStepIdx, newNote);
                      auditionStep(newNote, currentStepData.accent, currentStepData.slide);
                    }}
                    className="px-1.5 sm:px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] sm:text-xs cursor-pointer active:scale-95"
                    title={language === 'ru' ? 'Сдвинуть выбранный шаг на 1 октаву вниз' : 'Shift selected step 1 octave down'}
                  >
                    -1 Oct
                  </button>
                  <button
                    onClick={() => {
                      const newNote = Math.min(72, currentStepData.note + 12);
                      setStepNote(selectedStepIdx, newNote);
                      auditionStep(newNote, currentStepData.accent, currentStepData.slide);
                    }}
                    className="px-1.5 sm:px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[11px] sm:text-xs cursor-pointer active:scale-95"
                    title={language === 'ru' ? 'Сдвинуть выбранный шаг на 1 октаву вверх' : 'Shift selected step 1 octave up'}
                  >
                    +1 Oct
                  </button>
                </div>

                {/* Entire Pattern Octave Shift Buttons */}
                <div className="flex items-center gap-0.5 sm:gap-1 pl-1 border-l border-slate-700">
                  <button
                    onClick={() => shiftPatternOctave(-1)}
                    className="px-1.5 sm:px-2 py-1 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/80 font-bold text-[10px] sm:text-xs cursor-pointer shadow-sm transition active:scale-95 whitespace-nowrap"
                    title={language === 'ru' ? 'Сдвинуть ВСЕ ноты паттерна на 1 октаву вниз (-12 полутонов)' : 'Shift ALL pattern steps 1 octave down (-12 semitones)'}
                  >
                    {language === 'ru' ? 'ВСЕ -1 ОКТ' : 'ALL -1 OCT'}
                  </button>
                  <button
                    onClick={() => shiftPatternOctave(+1)}
                    className="px-1.5 sm:px-2 py-1 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/80 font-bold text-[10px] sm:text-xs cursor-pointer shadow-sm transition active:scale-95 whitespace-nowrap"
                    title={language === 'ru' ? 'Сдвинуть ВСЕ ноты паттерна на 1 октаву вверх (+12 полутонов)' : 'Shift ALL pattern steps 1 octave up (+12 semitones)'}
                  >
                    {language === 'ru' ? 'ВСЕ +1 ОКТ' : 'ALL +1 OCT'}
                  </button>
                </div>

                {/* Step Test Sound Button */}
                <button
                  onClick={() => auditionStep(currentStepData.note, currentStepData.accent, currentStepData.slide)}
                  className="px-2 py-1 rounded bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-[11px] sm:text-xs cursor-pointer flex items-center gap-1 shadow active:scale-95 shrink-0"
                  title={language === 'ru' ? 'Прослушать ноту' : 'Audition note'}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{language === 'ru' ? 'Тест' : 'Test'}</span>
                </button>
              </div>

              {/* Action Modifiers */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap max-w-full">
                <button
                  onClick={() => toggleGate(selectedStepIdx)}
                  className={`px-2 sm:px-2.5 py-1 rounded font-bold transition cursor-pointer border text-[11px] sm:text-xs active:scale-95 ${
                    currentStepData.gate
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {currentStepData.gate ? '● TRIG' : '○ REST'}
                </button>

                <button
                  onClick={() => toggleAccent(selectedStepIdx)}
                  className={`px-2 sm:px-2.5 py-1 rounded font-bold transition cursor-pointer border text-[11px] sm:text-xs active:scale-95 ${
                    currentStepData.accent
                      ? 'bg-red-600 text-white border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  ACC
                </button>

                <button
                  onClick={() => toggleSlide(selectedStepIdx)}
                  className={`px-2 sm:px-2.5 py-1 rounded font-bold transition cursor-pointer border text-[11px] sm:text-xs active:scale-95 ${
                    currentStepData.slide
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.7)]'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  SLIDE
                </button>

                <button
                  onClick={() => toggleOctave(selectedStepIdx)}
                  className={`px-2 sm:px-2.5 py-1 rounded font-bold transition cursor-pointer border text-[11px] sm:text-xs active:scale-95 ${
                    currentStepData.octaveUp
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  +8 OCT
                </button>

                {/* Step Navigation */}
                <div className="flex items-center gap-0.5 sm:gap-1 ml-0.5">
                  <button
                    onClick={() => {
                      const prev = (selectedStepIdx - 1 + totalSteps) % totalSteps;
                      setSelectedStepIdx(prev);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer active:scale-95"
                    title="Предыдущий шаг"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                  <button
                    onClick={() => {
                      const next = (selectedStepIdx + 1) % totalSteps;
                      setSelectedStepIdx(next);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer active:scale-95"
                    title="Следующий шаг"
                  >
                    <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: AUTHENTIC VINTAGE TB-303 PROGRAMMER (PITCH & TIME MODES)          */}
      {/* ========================================================================= */}
      {viewMode === 'tb303_classic' && (
        <div className="space-y-4 bg-gradient-to-b from-slate-900 to-slate-950 p-4 rounded-xl border-2 border-slate-600 shadow-2xl text-slate-100 max-w-full overflow-hidden box-border">
          {/* TB-303 Vintage Display Header */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="px-2.5 py-1 bg-red-600 text-white font-black text-xs rounded tracking-widest">
                TB-303
              </div>
              <div className="space-y-0.5">
                <div className="text-[11px] font-black text-amber-400 tracking-wider uppercase">
                  {t('classic303Header')}
                </div>
                <div className="text-[10px] text-slate-400">
                  {t('classic303Desc')}
                </div>
              </div>
            </div>

            {/* TB-303 7-Segment Style LED Monitor */}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border-2 border-red-900/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
              <span className="text-[10px] text-red-400 font-bold uppercase">STEP:</span>
              <span className="text-base font-black text-red-500 font-mono">
                {String(selectedStepIdx + 1).padStart(2, '0')}/{totalSteps}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-[10px] text-amber-400 font-bold uppercase">NOTE:</span>
              <span className="text-sm font-black text-amber-400">
                {currentStepData?.gate ? currentStepData.noteName : 'REST'}
              </span>
              <span className="text-slate-600">|</span>
              <span className={`text-[10px] font-bold ${currentStepData?.accent ? 'text-red-400' : 'text-slate-600'}`}>
                ACC
              </span>
              <span className={`text-[10px] font-bold ${currentStepData?.slide ? 'text-cyan-400' : 'text-slate-600'}`}>
                SLD
              </span>
            </div>
          </div>

          {/* Sub-Mode Switcher: PITCH MODE vs TIME MODE */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs w-full sm:w-auto">
            <button
              onClick={() => setTb303ProgramSubMode('pitch')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                tb303ProgramSubMode === 'pitch'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>{t('pitchModeTitle')}</span>
            </button>

            <button
              onClick={() => setTb303ProgramSubMode('time')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                tb303ProgramSubMode === 'time'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('timeModeTitle')}</span>
            </button>
          </div>

          {/* SUBMODE 1: PITCH MODE (Authentic Piano & Octave Transpose) */}
          {tb303ProgramSubMode === 'pitch' && (
            <div className="space-y-3 bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-amber-400 font-bold">
                  {t('stepRecordPrompt').replace('{step}', String(selectedStepIdx + 1))}
                </span>

                {/* Transpose Octave Buttons */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[11px]">Transpose:</span>
                  <button
                    onClick={() => setBaseOctave(24)}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${baseOctave === 24 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
                  >
                    {t('transposeDown')}
                  </button>
                  <button
                    onClick={() => setBaseOctave(36)}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${baseOctave === 36 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
                  >
                    {t('transposeNorm')}
                  </button>
                  <button
                    onClick={() => setBaseOctave(48)}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${baseOctave === 48 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
                  >
                    {t('transposeUp')}
                  </button>
                </div>
              </div>

              {/* 13 Piano Keys */}
              <div className="grid grid-cols-7 sm:grid-cols-13 gap-1.5 max-w-full">
                {PIANO_KEYS.map((pk) => {
                  const targetMidi = baseOctave + pk.noteOffset;
                  const isCurrent = currentStepData?.note === targetMidi;

                  return (
                    <button
                      key={pk.name}
                      onClick={() => handleAssignNote(pk.noteOffset)}
                      className={`h-14 sm:h-16 rounded-lg font-black text-xs transition cursor-pointer flex flex-col items-center justify-between p-1.5 border ${
                        isCurrent
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] ring-2 ring-amber-300'
                          : pk.isBlack
                          ? 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          : 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-white'
                      }`}
                    >
                      <span className="text-[10px] font-mono">{pk.name}</span>
                      <span className="text-[8px] opacity-70">{targetMidi}</span>
                    </button>
                  );
                })}
              </div>

              {/* Modifiers & Step Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => toggleAccent(selectedStepIdx)}
                    className={`px-3 py-1 rounded font-bold text-xs cursor-pointer border ${
                      currentStepData?.accent ? 'bg-red-600 text-white border-red-400 shadow' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    ACCENT
                  </button>
                  <button
                    onClick={() => toggleSlide(selectedStepIdx)}
                    className={`px-3 py-1 rounded font-bold text-xs cursor-pointer border ${
                      currentStepData?.slide ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    SLIDE
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedStepIdx((prev) => (prev - 1 + totalSteps) % totalSteps)}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    {t('backBtn')}
                  </button>
                  <button
                    onClick={() => setSelectedStepIdx((prev) => (prev + 1) % totalSteps)}
                    className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow"
                  >
                    {t('forwardBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUBMODE 2: TIME MODE (Authentic Note, Tie, Rest Rhythm Buttons) */}
          {tb303ProgramSubMode === 'time' && (
            <div className="space-y-4 bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-300">
                {t('rhythmRecordPrompt').replace('{step}', String(selectedStepIdx + 1))}
              </div>

              {/* 3 Main TB-303 Rhythm Input Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleTimeInput('note')}
                  className="p-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-sm shadow-[0_0_12px_rgba(16,185,129,0.5)] border border-emerald-400 transition cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  <Music className="w-5 h-5" />
                  <span>{t('rhythmNoteBtn')}</span>
                  <span className="text-[10px] font-normal text-emerald-200">{t('rhythmNoteDesc')}</span>
                </button>

                <button
                  onClick={() => handleTimeInput('tie')}
                  className="p-4 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white font-black text-sm shadow-[0_0_12px_rgba(6,182,212,0.5)] border border-cyan-400 transition cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  <Layers className="w-5 h-5" />
                  <span>{t('rhythmTieBtn')}</span>
                  <span className="text-[10px] font-normal text-cyan-200">{t('rhythmTieDesc')}</span>
                </button>

                <button
                  onClick={() => handleTimeInput('rest')}
                  className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-sm border border-slate-600 transition cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  <Square className="w-5 h-5" />
                  <span>{t('rhythmRestBtn')}</span>
                  <span className="text-[10px] font-normal text-slate-400">{t('rhythmRestDesc')}</span>
                </button>
              </div>

              {/* Step Navigation */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setSelectedStepIdx((prev) => (prev - 1 + totalSteps) % totalSteps)}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {t('backBtn')}
                </button>
                <button
                  onClick={() => setSelectedStepIdx((prev) => (prev + 1) % totalSteps)}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {t('forwardBtn')}
                </button>
              </div>
            </div>
          )}

          {/* 32-Step Visual LED Strip */}
          <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase">
              {t('fullScale32')}
            </div>
            <div className="grid grid-cols-16 sm:grid-cols-32 gap-1">
              {pattern.slice(0, totalSteps).map((s, idx) => {
                const isCurrent = isPlaying && currentStep === idx;
                const isSelected = selectedStepIdx === idx;
                let bg = 'bg-slate-800 text-slate-600';
                if (isCurrent) {
                  bg = 'bg-amber-400 text-slate-950 font-black';
                } else if (s.gate) {
                  bg = s.accent ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedStepIdx(idx)}
                    className={`h-7 rounded text-[8px] flex items-center justify-center transition cursor-pointer ${bg} ${
                      isSelected ? 'ring-2 ring-cyan-400' : ''
                    }`}
                    title={`Step ${idx + 1}: ${s.gate ? s.noteName : 'REST'}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {statusMessage && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-300 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Save Pattern Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-white font-mono"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-black uppercase text-amber-400 flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>{t('savePatternTitle')}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">{t('patternNameLabel')}</label>
                <input
                  type="text"
                  required
                  value={newPatternName}
                  onChange={(e) => setNewPatternName(e.target.value)}
                  placeholder="e.g. Hard Acid 32-Step Groove"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">{t('patternCategoryLabel')}</label>
                <input
                  type="text"
                  value={newPatternCategory}
                  onChange={(e) => setNewPatternCategory(e.target.value)}
                  placeholder="Acid Techno / Hardfloor / Trance"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800">
                {t('patternSaveInfo')}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-bold text-xs"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer shadow text-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('saveBtn')}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
});
