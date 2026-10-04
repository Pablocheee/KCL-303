/**
 * Global Engine Context (src/context/EngineContext.tsx)
 * 
 * Central state store persisting:
 *  - Native Web Audio API DSP Synthesizer Engine (DSPAudioEngine)
 *  - Roland TR-8S Style Bipolar Morph Synthesis Filter
 *  - 2-Way Ableton Live Web MIDI Bridge (Receives live notes & CC automations)
 *  - Real Preset Management (Save, Load, Delete, Export/Import JSON)
 *  - Analog Physics parameters & Quantum Electron Transport
 *  - Interactive TB-303 Sequencer state with step editing & dual view modes
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DEFAULT_ANALOG_SPECS,
  AnalogHardwareSpecs,
} from '../engine/analog_crossbar';
import {
  SCALES,
  ScaleName,
  TB303StepData,
  PhysicalTelemetryData,
  PhysicalMidiCcState,
  midiToNoteName,
  mapTelemetryToMidiCc,
  generatePatternFromNeuromorphicPrompt,
} from '../engine/neural_303_types';
import { webMidi, WebMidiDevice, MidiEventData } from '../engine/web_midi';
import { dspAudio, DSPCharacterMode, FilterMorphType, ElectronMode } from '../engine/dsp_audio_engine';
import { PresetManager, SynthPreset, FACTORY_PRESETS } from '../engine/preset_manager';
import { PatternManager, SavedPattern, FACTORY_PATTERNS, createEmptyPattern } from '../engine/pattern_manager';
import { MidiMappingManager, MidiCcMap, MIDI_PARAMS } from '../engine/midi_mappings';
import type { TokenGenerationStep } from '../engine/llm_engine';

export type SequencerViewMode = 't8_trrec' | 'tb303_classic';

interface EngineContextType {
  // DSP Audio Engine Master State
  isDspLive: boolean;
  enableDsp: () => Promise<boolean>;
  disableDsp: () => void;
  toggleDsp: () => Promise<boolean>;
  dspSampleRate: number;
  playTestBeep: () => void;
  dspCharacterMode: DSPCharacterMode;
  setDspCharacterMode: (mode: DSPCharacterMode) => void;

  // Roland TR-8S Bipolar Morph Filter State
  isMorphEnabled: boolean;
  setIsMorphEnabled: (enabled: boolean) => void;
  toggleMorphEnabled: () => void;
  morphAmount: number; // -100 (Full LPF) .. 0 (Flat) .. +100 (Full HPF/Formant)
  setMorphAmount: (val: number) => void;
  morphType: FilterMorphType;
  setMorphType: (type: FilterMorphType) => void;
  morphResonance: number;
  setMorphResonance: (val: number) => void;

  // Continuous Pitch LFO State (Seamless Gapless Bass Vibrato / Drift)
  isPitchLfoEnabled: boolean;
  setIsPitchLfoEnabled: (enabled: boolean) => void;
  togglePitchLfoEnabled: () => void;
  pitchLfoRate: number; // Hz (0.1 .. 16.0)
  setPitchLfoRate: (rate: number) => void;
  pitchLfoDepth: number; // Cents (5 .. 250)
  setPitchLfoDepth: (depth: number) => void;

  // Physical Electron Flux & Distinct Sound Modes
  electronFlux: number; // 0..100%
  setElectronFlux: (val: number) => void;
  electronMode: ElectronMode;
  setElectronMode: (mode: ElectronMode) => void;
  electronSolo: boolean;
  setElectronSolo: (solo: boolean) => void;
  electronsPerSecond: number; // e.g. 2.12e16

  // Real Preset Management System
  presets: SynthPreset[];
  activePresetId: string | null;
  loadPreset: (preset: SynthPreset) => void;
  saveCurrentAsPreset: (name: string, description?: string) => boolean;
  deleteUserPreset: (id: string) => void;
  exportPresetsJson: () => void;
  importPresetsJson: (json: string) => boolean;

  // Pattern Storage & Management System (32-Step Persistent)
  patternList: SavedPattern[];
  activePatternId: string | null;
  saveUserPattern: (name: string, category?: string) => SavedPattern;
  loadSavedPattern: (pat: SavedPattern) => void;
  deleteSavedPattern: (id: string) => boolean;
  stepLength: number;
  setStepLength: (len: number) => void;

  // Physical Simulation State
  specs: AnalogHardwareSpecs;
  setSpecs: React.Dispatch<React.SetStateAction<AnalogHardwareSpecs>>;
  updateSpecField: (field: keyof AnalogHardwareSpecs, value: number) => void;

  // Sequencer & Audio State
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  scale: ScaleName;
  setScale: (scale: ScaleName) => void;
  currentStep: number;
  waveform: 'sawtooth' | 'square';
  setWaveform: (wf: 'sawtooth' | 'square') => void;
  audioMuted: boolean;
  setAudioMuted: (muted: boolean) => void;
  viewMode: SequencerViewMode;
  setViewMode: (mode: SequencerViewMode) => void;
  clearPattern: () => void;
  setPattern: React.Dispatch<React.SetStateAction<TB303StepData[]>>;

  // Base 303 Synth Knobs (0..127 MIDI space / physical units)
  baseCutoffCC: number;
  setBaseCutoffCC: (val: number) => void;
  baseResonanceCC: number;
  setBaseResonanceCC: (val: number) => void;
  baseEnvModCC: number;
  setBaseEnvModCC: (val: number) => void;
  baseDecayCC: number;
  setBaseDecayCC: (val: number) => void;
  baseAccentCC: number;
  setBaseAccentCC: (val: number) => void;
  baseDriveCC: number;
  setBaseDriveCC: (val: number) => void;

  // Static Knobs Mode (Locks knobs into steady manual / Ableton mode without twitching/jitter)
  isStaticKnobsLocked: boolean;
  setIsStaticKnobsLocked: (locked: boolean) => void;
  toggleStaticKnobs: () => void;

  // Effective Modulated CCs (Base + Physics Telemetry Delta)
  effectiveCc: {
    cutoff: number;
    resonance: number;
    decay: number;
    drive: number;
    accent: number;
    envMod: number;
  };

  // Physical Telemetry & CC State
  telemetry: PhysicalTelemetryData;
  ccState: PhysicalMidiCcState;
  pattern: TB303StepData[];
  generateNewPattern: () => void;
  generatePatternFromTextPrompt: (promptText: string) => {
    steps: TB303StepData[];
    suggestedCutoffCC: number;
    suggestedResonanceCC: number;
    suggestedMorphType: FilterMorphType;
    telemetryLog: string[];
  };
  modulateSynthFromTokenStep: (tokenStep: TokenGenerationStep) => void;

  // Step Editing Handlers (Absolute State Sync)
  toggleGate: (stepIdx: number) => void;
  toggleAccent: (stepIdx: number) => void;
  toggleSlide: (stepIdx: number) => void;
  toggleOctave: (stepIdx: number) => void;
  setStepNote: (stepIdx: number, noteMidi: number) => void;
  updateStep: (stepIdx: number, partial: Partial<TB303StepData>) => void;

  // 2-Way Web MIDI & Ableton Live Bridge State
  midiOutputs: WebMidiDevice[];
  midiInputs: WebMidiDevice[];
  selectedMidiOutputId: string;
  selectedMidiInputId: string;
  isMidiSupported: boolean;
  midiStatusText: string;
  midiByteLog: string[];
  selectMidiOutputPort: (deviceId: string) => void;
  selectMidiInputPort: (deviceId: string) => void;
  testNote: () => void;
  panicMidi: () => void;

  // Backward Compatible Aliases
  midiDevices: WebMidiDevice[];
  selectedMidiId: string;
  selectMidiPort: (deviceId: string) => void;

  // Pattern Undo / Redo History (up to 5 actions)
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  undo: () => void;
  redo: () => void;

  // MIDI Learn & Fader Mapping
  midiMappings: Record<string, number>;
  activeLearnParam: string | null;
  startMidiLearn: (paramId: string) => void;
  stopMidiLearn: () => void;
  setMidiMapping: (paramId: string, ccNumber: number) => void;
  resetMidiMappings: () => void;
  isMidiModalOpen: boolean;
  setIsMidiModalOpen: (open: boolean) => void;

  // Ableton Live Computer Keyboard Piano
  keyboardOctave: number;
  setKeyboardOctave: (octave: number) => void;
  activePianoKeys: Set<string>;
}

const EngineContext = createContext<EngineContextType | null>(null);

export const EngineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. DSP Audio Engine State & Character Mode
  const [isDspLive, setIsDspLive] = useState(false);
  const [dspSampleRate, setDspSampleRate] = useState(48000);
  const [dspCharacterMode, setDspCharacterModeState] = useState<DSPCharacterMode>('neural_chaos');
  const [electronFlux, setElectronFluxState] = useState<number>(65);
  const [electronMode, setElectronModeState] = useState<ElectronMode>('thermal_boltzmann');
  const [electronSolo, setElectronSoloState] = useState<boolean>(false);

  // 1b. Roland TR-8S Bipolar Morph Filter State
  const [isMorphEnabled, setIsMorphEnabledState] = useState<boolean>(true);
  const [morphAmount, setMorphAmountState] = useState<number>(0);
  const [morphType, setMorphTypeState] = useState<FilterMorphType>('tr8s_dj');
  const [morphResonance, setMorphResonanceState] = useState<number>(6);

  // 1b2. Continuous Pitch LFO State (Seamless Gapless Bass Vibrato / Drift)
  const [isPitchLfoEnabled, setIsPitchLfoEnabledState] = useState<boolean>(false);
  const [pitchLfoRate, setPitchLfoRateState] = useState<number>(3.5);
  const [pitchLfoDepth, setPitchLfoDepthState] = useState<number>(70);

  // 1c. Preset Management
  const [presets, setPresets] = useState<SynthPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>('acid-hardfloor-squelch');

  // 2. Physical Simulation Specs
  const [specs, setSpecs] = useState<AnalogHardwareSpecs>(DEFAULT_ANALOG_SPECS);

  // 3. Sequencer Settings & View Mode
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(138);
  const [scale, setScale] = useState<ScaleName>('c_minor_pentatonic');
  const [currentStep, setCurrentStep] = useState(0);
  const [stepLength, setStepLengthState] = useState<number>(32);
  const [waveform, setWaveformState] = useState<'sawtooth' | 'square'>('sawtooth');
  const [audioMuted, setAudioMuted] = useState(false);
  const [viewMode, setViewMode] = useState<SequencerViewMode>('t8_trrec');

  // 3b. Pattern Storage & Management System
  const [patternList, setPatternList] = useState<SavedPattern[]>(() => PatternManager.getAllPatterns());
  const [activePatternId, setActivePatternId] = useState<string | null>('pat-acid-hardfloor-303');

  // 4. Base Synthesizer Knob Settings (0-127 MIDI space)
  const [baseCutoffCC, setBaseCutoffCCState] = useState(64);
  const [baseResonanceCC, setBaseResonanceCCState] = useState(55);
  const [baseEnvModCC, setBaseEnvModCCState] = useState(80);
  const [baseDecayCC, setBaseDecayCCState] = useState(45);
  const [baseAccentCC, setBaseAccentCCState] = useState(90);
  const [baseDriveCC, setBaseDriveCCState] = useState(40);

  const baseCutoffRef = useRef(64);
  const baseResonanceRef = useRef(55);
  const baseEnvModRef = useRef(80);
  const baseDecayRef = useRef(45);
  const baseAccentRef = useRef(90);
  const baseDriveRef = useRef(40);

  const syncDspKnobs = useCallback(() => {
    const realCutoff = 200 + (baseCutoffRef.current / 127) * 3300;
    const realResonance = 2 + (baseResonanceRef.current / 127) * 22;
    const realDecay = 0.08 + (baseDecayRef.current / 127) * 0.50;
    const realDrive = 0.1 + (baseDriveRef.current / 127) * 0.8;
    const realEnvMod = baseEnvModRef.current / 127;
    const realAccent = baseAccentRef.current / 127;
    dspAudio.setBaseKnobs(realCutoff, realResonance, realDecay, realEnvMod, realAccent, realDrive);
  }, []);

  const setBaseCutoffCC = useCallback((val: number) => {
    baseCutoffRef.current = val;
    setBaseCutoffCCState(val);
    syncDspKnobs();
  }, [syncDspKnobs]);

  const setBaseResonanceCC = useCallback((val: number) => {
    baseResonanceRef.current = val;
    setBaseResonanceCCState(val);
    syncDspKnobs();
  }, [syncDspKnobs]);

  const setBaseEnvModCC = useCallback((val: number) => {
    baseEnvModRef.current = val;
    setBaseEnvModCCState(val);
    syncDspKnobs();
  }, [syncDspKnobs]);

  const setBaseDecayCC = useCallback((val: number) => {
    baseDecayRef.current = val;
    setBaseDecayCCState(val);
    syncDspKnobs();
  }, [syncDspKnobs]);

  const setBaseAccentCC = useCallback((val: number) => {
    baseAccentRef.current = val;
    setBaseAccentCCState(val);
    syncDspKnobs();
  }, [syncDspKnobs]);

  const setBaseDriveCC = useCallback((val: number) => {
    baseDriveRef.current = val;
    setBaseDriveCCState(val);
    syncDspKnobs();
  }, [syncDspKnobs]);

  // Static Knobs Mode: locks knobs to steady position (no jitter/twitching from step telemetry)
  const [isStaticKnobsLocked, setIsStaticKnobsLocked] = useState(true);
  const toggleStaticKnobs = () => setIsStaticKnobsLocked((prev) => !prev);

  // 5. Physical Telemetry & CC Stream State
  const [telemetry, setTelemetry] = useState<PhysicalTelemetryData>({
    entropy: 2.14,
    thermalNoiseAmperes: 120e-9,
    totalCurrentAmperes: 3.4e-3,
    layerIndex: 1,
    totalLayers: 4,
    powerMilliwatts: 3.4,
  });

  const [ccState, setCcState] = useState<PhysicalMidiCcState>({
    resonanceCC71: 75,
    decayCC75: 48,
    distortionCC94: 55,
    depthLfoCC76: 32,
    cutoffCC74: 80,
  });

  // Initialize Pattern: 1. From localStorage active state; 2. Default to Factory 32-step pattern
  const [pattern, setPattern] = useState<TB303StepData[]>(() => {
    const savedActive = PatternManager.loadActivePatternState();
    if (savedActive && savedActive.steps && savedActive.steps.length > 0) {
      return savedActive.steps;
    }
    const defaultPat = FACTORY_PATTERNS[0];
    if (defaultPat && defaultPat.steps) {
      return JSON.parse(JSON.stringify(defaultPat.steps));
    }
    return createEmptyPattern('c_minor_pentatonic', 32);
  });

  const patternRef = useRef(pattern);
  patternRef.current = pattern;

  // Pattern Undo / Redo History (bounded to max 5 actions)
  const undoStackRef = useRef<Array<{ pattern: TB303StepData[]; desc: string }>>([]);
  const redoStackRef = useRef<Array<{ pattern: TB303StepData[]; desc: string }>>([]);
  const [undoCount, setUndoCount] = useState<number>(0);
  const [redoCount, setRedoCount] = useState<number>(0);

  const pushSnapshot = useCallback((desc: string) => {
    const current = patternRef.current;
    if (!current || current.length === 0) return;
    const cloned: TB303StepData[] = JSON.parse(JSON.stringify(current));
    // Up to 5 actions kept in undo history
    undoStackRef.current = [...undoStackRef.current.slice(-4), { pattern: cloned, desc }];
    redoStackRef.current = []; // Clear redo stack on new action
    setUndoCount(undoStackRef.current.length);
    setRedoCount(0);
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const current = patternRef.current;
    const last = undoStackRef.current.pop();
    if (!last) return;

    if (current) {
      redoStackRef.current = [
        ...redoStackRef.current.slice(-4),
        { pattern: JSON.parse(JSON.stringify(current)), desc: 'Текущее состояние' },
      ];
    }

    setPattern(last.pattern);
    patternRef.current = last.pattern;
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
    setMidiByteLog((prev) => [`[UNDO] Откат назад: ${last.desc} (Осталось: ${undoStackRef.current.length}/5)`, ...prev.slice(0, 5)]);
  }, []);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const current = patternRef.current;
    const next = redoStackRef.current.pop();
    if (!next) return;

    if (current) {
      undoStackRef.current = [
        ...undoStackRef.current.slice(-4),
        { pattern: JSON.parse(JSON.stringify(current)), desc: 'Предыдущее состояние' },
      ];
    }

    setPattern(next.pattern);
    patternRef.current = next.pattern;
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
    setMidiByteLog((prev) => [`[REDO] Откат вперед: ${next.desc} (Осталось: ${redoStackRef.current.length}/5)`, ...prev.slice(0, 5)]);
  }, []);

  // Keyboard Shortcuts for Undo (Ctrl+Z / Cmd+Z) & Redo (Ctrl+Y / Cmd+Y / Ctrl+Shift+Z / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Auto-persist active pattern across tabs and reloads (debounced 400ms to eliminate disk I/O freezes)
  useEffect(() => {
    if (pattern && pattern.length > 0) {
      const timer = setTimeout(() => {
        PatternManager.saveActivePatternState(pattern, bpm, scale, stepLength);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [pattern, bpm, scale, stepLength]);

  const clearPattern = useCallback(() => {
    pushSnapshot('Очистка паттерна');
    setPattern(createEmptyPattern(scale, stepLength));
    setActivePatternId(null);
    setMidiByteLog((prev) => [`[PATTERN] All ${stepLength} steps cleared to empty`, ...prev.slice(0, 5)]);
  }, [pushSnapshot, scale, stepLength]);

  const setStepLength = useCallback((len: number) => {
    const newLen = len === 16 ? 16 : 32;
    pushSnapshot(`Длина ${newLen} шагов`);
    setStepLengthState(newLen);
    setPattern((prev) => {
      // Ensure the pattern array always has at least 32 steps so NO steps are ever lost when switching 16 <-> 32
      if (prev.length < 32) {
        const extra = createEmptyPattern(scale, 32 - prev.length).map((s, idx) => ({
          ...s,
          stepIndex: prev.length + idx,
        }));
        return [...prev, ...extra];
      }
      return prev; // All 32 steps are permanently preserved in memory!
    });
    setMidiByteLog((prev) => [`[SEQUENCER] Step length set to ${newLen} steps (All 32 steps preserved in memory)`, ...prev.slice(0, 5)]);
  }, [pushSnapshot, scale]);

  const saveUserPattern = useCallback((name: string, category = 'User Acid'): SavedPattern => {
    const saved = PatternManager.saveUserPattern(name, pattern, bpm, scale, stepLength, category);
    setPatternList(PatternManager.getAllPatterns());
    setActivePatternId(saved.id);
    setMidiByteLog((prev) => [`[PATTERN SAVED] "${saved.name}" (${stepLength} Steps)`, ...prev.slice(0, 5)]);
    return saved;
  }, [pattern, bpm, scale, stepLength]);

  const loadSavedPattern = useCallback((pat: SavedPattern) => {
    pushSnapshot(`Загрузка "${pat.name}"`);
    setActivePatternId(pat.id);
    setBpm(pat.bpm);
    setScale(pat.scale);
    const patLen = pat.stepLength || pat.steps.length || 32;
    setStepLengthState(patLen);
    setPattern(JSON.parse(JSON.stringify(pat.steps)));
    setMidiByteLog((prev) => [`[PATTERN LOADED] "${pat.name}" (${patLen} Steps)`, ...prev.slice(0, 5)]);
  }, [pushSnapshot]);

  const deleteSavedPattern = useCallback((id: string): boolean => {
    const ok = PatternManager.deleteUserPattern(id);
    if (ok) {
      setPatternList(PatternManager.getAllPatterns());
      if (activePatternId === id) setActivePatternId(null);
      setMidiByteLog((prev) => [`[PATTERN DELETED] Pattern ID: ${id}`, ...prev.slice(0, 5)]);
    }
    return ok;
  }, [activePatternId]);

  const [midiByteLog, setMidiByteLog] = useState<string[]>([]);

  // 6. Web MIDI & MIDI Learn State
  const [midiOutputs, setMidiOutputs] = useState<WebMidiDevice[]>([]);
  const [midiInputs, setMidiInputs] = useState<WebMidiDevice[]>([]);
  const [selectedMidiOutputId, setSelectedMidiOutputId] = useState<string>('');
  const [selectedMidiInputId, setSelectedMidiInputId] = useState<string>('');
  const [isMidiSupported, setIsMidiSupported] = useState(true);
  const [midiStatusText, setMidiStatusText] = useState<string>('Initializing Web MIDI...');

  // MIDI Learn & CC Fader Mapping
  const [midiMappings, setMidiMappings] = useState<MidiCcMap>(() => MidiMappingManager.loadMappings());
  const midiMappingsRef = useRef(midiMappings);
  midiMappingsRef.current = midiMappings;

  const [activeLearnParam, setActiveLearnParam] = useState<string | null>(null);
  const activeLearnParamRef = useRef<string | null>(null);
  activeLearnParamRef.current = activeLearnParam;

  const [isMidiModalOpen, setIsMidiModalOpen] = useState(false);

  // Ableton Live Computer Keyboard Piano state (A-K play notes, Z/X shift octave)
  const [keyboardOctave, setKeyboardOctave] = useState<number>(36); // C2 standard
  const keyboardOctaveRef = useRef(36);
  keyboardOctaveRef.current = keyboardOctave;
  const [activePianoKeys, setActivePianoKeys] = useState<Set<string>>(new Set());

  const startMidiLearn = useCallback((paramId: string) => {
    setActiveLearnParam(paramId);
    activeLearnParamRef.current = paramId;
    setMidiByteLog((prev) => [`[MIDI LEARN] Ожидание движения ручки/фейдера для "${paramId}"...`, ...prev.slice(0, 5)]);
  }, []);

  const stopMidiLearn = useCallback(() => {
    setActiveLearnParam(null);
    activeLearnParamRef.current = null;
  }, []);

  const setMidiMapping = useCallback((paramId: string, ccNumber: number) => {
    setMidiMappings((prev) => {
      const updated = { ...prev, [paramId]: ccNumber };
      MidiMappingManager.saveMappings(updated);
      return updated;
    });
    setMidiByteLog((prev) => [`[MIDI MAP] "${paramId}" назначен на CC${ccNumber}`, ...prev.slice(0, 5)]);
  }, []);

  const resetMidiMappings = useCallback(() => {
    const defaults = MidiMappingManager.resetMappings();
    setMidiMappings(defaults);
    setMidiByteLog((prev) => [`[MIDI MAP] Все CC сброшены к заводским настройкам`, ...prev.slice(0, 5)]);
  }, []);

  // Computer Keyboard Piano Handler (A-K play notes, Z/X shift octave)
  useEffect(() => {
    const CODE_NOTE_MAP: Record<string, { offset: number; keyChar: string }> = {
      KeyA: { offset: 0, keyChar: 'a' },
      KeyW: { offset: 1, keyChar: 'w' },
      KeyS: { offset: 2, keyChar: 's' },
      KeyE: { offset: 3, keyChar: 'e' },
      KeyD: { offset: 4, keyChar: 'd' },
      KeyF: { offset: 5, keyChar: 'f' },
      KeyT: { offset: 6, keyChar: 't' },
      KeyG: { offset: 7, keyChar: 'g' },
      KeyY: { offset: 8, keyChar: 'y' },
      KeyH: { offset: 9, keyChar: 'h' },
      KeyU: { offset: 10, keyChar: 'u' },
      KeyJ: { offset: 11, keyChar: 'j' },
      KeyK: { offset: 12, keyChar: 'k' },
      KeyO: { offset: 13, keyChar: 'o' },
      KeyL: { offset: 14, keyChar: 'l' },
      KeyP: { offset: 15, keyChar: 'p' },
    };

    // Cyrillic & lowercase character fallback
    const CHAR_NOTE_MAP: Record<string, { offset: number; keyChar: string }> = {
      'a': { offset: 0, keyChar: 'a' },
      'ф': { offset: 0, keyChar: 'a' },
      'w': { offset: 1, keyChar: 'w' },
      'ц': { offset: 1, keyChar: 'w' },
      's': { offset: 2, keyChar: 's' },
      'ы': { offset: 2, keyChar: 's' },
      'e': { offset: 3, keyChar: 'e' },
      'у': { offset: 3, keyChar: 'e' },
      'd': { offset: 4, keyChar: 'd' },
      'в': { offset: 4, keyChar: 'd' },
      'f': { offset: 5, keyChar: 'f' },
      'а': { offset: 5, keyChar: 'f' },
      't': { offset: 6, keyChar: 't' },
      'е': { offset: 6, keyChar: 't' },
      'g': { offset: 7, keyChar: 'g' },
      'п': { offset: 7, keyChar: 'g' },
      'y': { offset: 8, keyChar: 'y' },
      'н': { offset: 8, keyChar: 'y' },
      'h': { offset: 9, keyChar: 'h' },
      'р': { offset: 9, keyChar: 'h' },
      'u': { offset: 10, keyChar: 'u' },
      'г': { offset: 10, keyChar: 'u' },
      'j': { offset: 11, keyChar: 'j' },
      'о': { offset: 11, keyChar: 'j' },
      'k': { offset: 12, keyChar: 'k' },
      'л': { offset: 12, keyChar: 'k' },
      'o': { offset: 13, keyChar: 'o' },
      'щ': { offset: 13, keyChar: 'o' },
      'l': { offset: 14, keyChar: 'l' },
      'д': { offset: 14, keyChar: 'l' },
      'p': { offset: 15, keyChar: 'p' },
      'з': { offset: 15, keyChar: 'p' },
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is actively typing in text fields or textareas
      const target = e.target as HTMLElement;
      const isTextInput = target && (
        (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range') ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (isTextInput) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = (e.key || '').toLowerCase();
      const code = e.code || '';

      // Octave switching (Z = Down, X = Up, supporting both physical code & Cyrillic)
      const isOctaveDown = code === 'KeyZ' || key === 'z' || key === 'я';
      const isOctaveUp = code === 'KeyX' || key === 'x' || key === 'ч';

      if (isOctaveDown) {
        e.preventDefault();
        setKeyboardOctave((prev) => {
          const next = Math.max(24, prev - 12);
          keyboardOctaveRef.current = next;
          setMidiByteLog((log) => [`[OCTAVE] -1 Октава -> C${Math.floor(next / 12) - 1} (${next} MIDI)`, ...log.slice(0, 5)]);
          return next;
        });
        return;
      }
      if (isOctaveUp) {
        e.preventDefault();
        setKeyboardOctave((prev) => {
          const next = Math.min(72, prev + 12);
          keyboardOctaveRef.current = next;
          setMidiByteLog((log) => [`[OCTAVE] +1 Октава -> C${Math.floor(next / 12) - 1} (${next} MIDI)`, ...log.slice(0, 5)]);
          return next;
        });
        return;
      }

      if (e.repeat) return;

      const matchedNote = CODE_NOTE_MAP[code] || CHAR_NOTE_MAP[key];
      if (matchedNote) {
        e.preventDefault();
        const baseOct = keyboardOctaveRef.current;
        const note = baseOct + matchedNote.offset;

        setActivePianoKeys((prev) => new Set(prev).add(matchedNote.keyChar));

        dspAudio.init();
        setIsDspLive(true);
        dspAudio.triggerLiveNoteOn(note, 108, false);
        webMidi.sendNoteOn(note, 108);

        setMidiByteLog((prev) => [
          `[KEYBOARD LIVE] ${midiToNoteName(note)} [${matchedNote.keyChar.toUpperCase()}] (Окт: C${Math.floor(baseOct / 12) - 1})`,
          ...prev.slice(0, 5),
        ]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTextInput = target && (
        (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range') ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );
      if (isTextInput) return;

      const key = (e.key || '').toLowerCase();
      const code = e.code || '';
      const matchedNote = CODE_NOTE_MAP[code] || CHAR_NOTE_MAP[key];

      if (matchedNote) {
        e.preventDefault();
        const baseOct = keyboardOctaveRef.current;
        const note = baseOct + matchedNote.offset;

        setActivePianoKeys((prev) => {
          const next = new Set(prev);
          next.delete(matchedNote.keyChar);
          return next;
        });

        dspAudio.triggerLiveNoteOff(note);
        webMidi.sendNoteOff(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, []);

  const clockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const neuralStateRef = useRef<Float32Array>(new Float32Array(64).map(() => Math.random() * 2 - 1));
  const layerCounterRef = useRef<number>(1);
  const prevSlideRef = useRef<boolean>(false);

  // High-performance audio clock refs (prevents UI freezing & ensures zero audio jitter)
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const stepLengthRef = useRef(stepLength);
  stepLengthRef.current = stepLength;
  const audioMutedRef = useRef(audioMuted);
  audioMutedRef.current = audioMuted;
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  const ccStateRef = useRef(ccState);
  ccStateRef.current = ccState;
  const stepIdxRef = useRef<number>(0);
  const nextTickTimeRef = useRef<number>(0);
  const timerTimeoutRef = useRef<any>(null);

  // Load Presets on Mount
  useEffect(() => {
    setPresets(PresetManager.getAllPresets());
  }, []);

  // Update Morph Filter in Real-Time
  const setIsMorphEnabled = (enabled: boolean) => {
    setIsMorphEnabledState(enabled);
    dspAudio.setMorphEnabled(enabled);
  };

  const toggleMorphEnabled = () => {
    setIsMorphEnabledState((prev) => {
      const next = !prev;
      dspAudio.setMorphEnabled(next);
      return next;
    });
  };

  const setMorphAmount = (val: number) => {
    setMorphAmountState(val);
    dspAudio.setMorphFilter(val / 100, morphType, morphResonance);
  };

  const setMorphType = (type: FilterMorphType) => {
    setMorphTypeState(type);
    dspAudio.setMorphFilter(morphAmount / 100, type, morphResonance);
  };

  const setMorphResonance = (res: number) => {
    setMorphResonanceState(res);
    dspAudio.setMorphFilter(morphAmount / 100, morphType, res);
  };

  // Continuous Pitch LFO Callbacks (Seamless Gapless Bass Vibrato / Drift)
  const setIsPitchLfoEnabled = (enabled: boolean) => {
    setIsPitchLfoEnabledState(enabled);
    dspAudio.setPitchLfoEnabled(enabled);
    setMidiByteLog((prev) => [`[PITCH LFO] ${enabled ? 'ENABLED' : 'DISABLED'} (${pitchLfoRate.toFixed(2)}Hz)`, ...prev.slice(0, 5)]);
  };

  const togglePitchLfoEnabled = () => {
    setIsPitchLfoEnabledState((prev) => {
      const next = !prev;
      dspAudio.setPitchLfoEnabled(next);
      setMidiByteLog((log) => [`[PITCH LFO] ${next ? 'ENABLED' : 'DISABLED'} (${pitchLfoRate.toFixed(2)}Hz)`, ...log.slice(0, 5)]);
      return next;
    });
  };

  const setPitchLfoRate = (rate: number) => {
    const clamped = Math.max(0.05, Math.min(25.0, rate));
    setPitchLfoRateState(clamped);
    dspAudio.setPitchLfoRate(clamped);
  };

  const setPitchLfoDepth = (depth: number) => {
    const clamped = Math.max(10, Math.min(1200, depth));
    setPitchLfoDepthState(clamped);
    dspAudio.setPitchLfoDepth(clamped);
  };

  const setElectronFlux = (val: number) => {
    setElectronFluxState(val);
    dspAudio.setElectronFluxAmount(val / 100);
  };

  const setElectronMode = (mode: ElectronMode) => {
    setElectronModeState(mode);
    dspAudio.setElectronMode(mode);
    setMidiByteLog((prev) => [`[PHYSICS] Switched Electron Mode: ${mode.toUpperCase()}`, ...prev.slice(0, 5)]);
  };

  const setElectronSolo = (solo: boolean) => {
    setElectronSoloState(solo);
    dspAudio.setElectronSolo(solo);
    setMidiByteLog((prev) => [`[PHYSICS] Electron Particle Audition Solo: ${solo ? 'ON' : 'OFF'}`, ...prev.slice(0, 5)]);
  };

  // Sync physical electron parameters with DSP Audio Engine in real time
  useEffect(() => {
    dspAudio.updatePhysicalElectronParams(
      specs.temperatureKelvin,
      specs.tiaGainRf,
      specs.conductanceDriftStd,
      electronFlux / 100
    );
  }, [specs.temperatureKelvin, specs.tiaGainRf, specs.conductanceDriftStd, electronFlux]);

  const setDspCharacterMode = (mode: DSPCharacterMode) => {
    setDspCharacterModeState(mode);
    dspAudio.setCharacterMode(mode);
  };

  const setWaveform = (wf: 'sawtooth' | 'square') => {
    setWaveformState(wf);
    dspAudio.setWaveform(wf);
  };

  const updateSpecField = (field: keyof AnalogHardwareSpecs, value: number) => {
    setSpecs((prev) => ({ ...prev, [field]: value }));
  };

  // Sync Base Knobs with DSP Engine continuously
  useEffect(() => {
    const realCutoff = 200 + (baseCutoffCC / 127) * 3300;
    const realResonance = 2 + (baseResonanceCC / 127) * 22;
    const realDecay = 0.08 + (baseDecayCC / 127) * 0.50;
    const realDrive = 0.1 + (baseDriveCC / 127) * 0.8;
    const realEnvMod = baseEnvModCC / 127;
    const realAccent = baseAccentCC / 127;

    dspAudio.setBaseKnobs(realCutoff, realResonance, realDecay, realEnvMod, realAccent, realDrive);
  }, [baseCutoffCC, baseResonanceCC, baseDecayCC, baseDriveCC, baseEnvModCC, baseAccentCC]);

  // Master DSP Power Handlers
  const enableDsp = async (): Promise<boolean> => {
    const ok = await dspAudio.init();
    if (ok) {
      const status = dspAudio.getStatus();
      setIsDspLive(true);
      setDspSampleRate(status.sampleRate);
      dspAudio.setMasterMute(audioMuted);
      dspAudio.setMorphFilter(morphAmount / 100, morphType, morphResonance);
    }
    return ok;
  };

  const disableDsp = () => {
    dspAudio.setMasterMute(true);
    setIsDspLive(false);
  };

  const toggleDsp = async (): Promise<boolean> => {
    if (isDspLive) {
      disableDsp();
      return false;
    } else {
      return await enableDsp();
    }
  };

  const playTestBeep = () => {
    dspAudio.playDirectBeep(440, 0.25);
    setIsDspLive(true);
  };

  // Preset Load Handler
  const loadPreset = (preset: SynthPreset) => {
    setActivePresetId(preset.id);
    setBaseCutoffCC(preset.baseCutoffCC);
    setBaseResonanceCC(preset.baseResonanceCC);
    setBaseEnvModCC(preset.baseEnvModCC);
    setBaseDecayCC(preset.baseDecayCC);
    setBaseAccentCC(preset.baseAccentCC);
    setBaseDriveCC(preset.baseDriveCC);
    setWaveform(preset.waveform);

    setMorphAmount(preset.morphAmount);
    setMorphType(preset.morphType);
    setMorphResonance(preset.morphResonance);

    if (preset.pitchLfoEnabled !== undefined) {
      setIsPitchLfoEnabled(preset.pitchLfoEnabled);
    }
    if (preset.pitchLfoRate !== undefined) {
      setPitchLfoRate(preset.pitchLfoRate);
    }
    if (preset.pitchLfoDepth !== undefined) {
      setPitchLfoDepth(preset.pitchLfoDepth);
    }

    setDspCharacterMode(preset.dspCharacterMode);
    setElectronFlux(preset.electronFlux);
    if (preset.electronMode) {
      setElectronMode(preset.electronMode);
    }
    setSpecs(preset.specs);

    setBpm(preset.bpm);
    setScale(preset.scale);

    if (preset.pattern && preset.pattern.length > 0) {
      setPattern(preset.pattern);
    }

    setMidiByteLog((prev) => [`[PRESET] Loaded "${preset.name}" (${preset.category})`, ...prev.slice(0, 5)]);
  };

  // Preset Save Handler
  const saveCurrentAsPreset = (name: string, description = 'Custom User Patch'): boolean => {
    const newPreset: SynthPreset = {
      id: `user-${Date.now()}`,
      name,
      category: 'User',
      author: 'User',
      createdAt: Date.now(),
      description,
      baseCutoffCC,
      baseResonanceCC,
      baseEnvModCC,
      baseDecayCC,
      baseAccentCC,
      baseDriveCC,
      waveform,
      morphAmount,
      morphType,
      morphResonance,
      pitchLfoEnabled: isPitchLfoEnabled,
      pitchLfoRate,
      pitchLfoDepth,
      dspCharacterMode,
      electronFlux,
      electronMode,
      specs,
      bpm,
      scale,
      pattern,
    };

    const ok = PresetManager.savePreset(newPreset);
    if (ok) {
      setPresets(PresetManager.getAllPresets());
      setActivePresetId(newPreset.id);
      setMidiByteLog((prev) => [`[PRESET] Saved "${name}" to browser storage`, ...prev.slice(0, 5)]);
    }
    return ok;
  };

  const deleteUserPreset = (id: string) => {
    const ok = PresetManager.deletePreset(id);
    if (ok) {
      setPresets(PresetManager.getAllPresets());
      if (activePresetId === id) setActivePresetId('acid-hardfloor-squelch');
    }
  };

  const exportPresetsJson = () => {
    PresetManager.exportToFile(presets, `Neural_TB303_Preset_Bank_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const importPresetsJson = (jsonString: string): boolean => {
    try {
      const imported = PresetManager.parsePresetJson(jsonString);
      imported.forEach((p) => PresetManager.savePreset(p));
      setPresets(PresetManager.getAllPresets());
      if (imported.length > 0) {
        loadPreset(imported[0]);
      }
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  };

  // Calculate physical electron count
  const electronsPerSecond = telemetry.totalCurrentAmperes / 1.60217663e-19;

  // Hybrid Modulated Values (Memoized to prevent massive React re-render thrashing)
  const effectiveCc = useMemo(() => ({
    cutoff: Math.max(0, Math.min(127, Math.round(baseCutoffCC + ((telemetry.totalCurrentAmperes * 1e3) / 8.0 - 0.4) * 35))),
    resonance: Math.max(0, Math.min(127, Math.round(baseResonanceCC + (telemetry.entropy / 4.0 - 0.5) * 50))),
    decay: Math.max(0, Math.min(127, Math.round(baseDecayCC + ((telemetry.thermalNoiseAmperes * 1e9) / 400.0 - 0.3) * 45))),
    drive: Math.max(0, Math.min(127, Math.round(baseDriveCC + ((telemetry.powerMilliwatts / 8.0) - 0.3) * 40))),
    accent: baseAccentCC,
    envMod: baseEnvModCC,
  }), [baseCutoffCC, baseResonanceCC, baseDecayCC, baseDriveCC, baseAccentCC, baseEnvModCC, telemetry.totalCurrentAmperes, telemetry.entropy, telemetry.thermalNoiseAmperes, telemetry.powerMilliwatts]);

  const effectiveCcRef = useRef(effectiveCc);
  effectiveCcRef.current = effectiveCc;

  // Web MIDI Initialization & Ableton Live MIDI IN Handler (Runs ONCE on mount, zero thread-blocking)
  useEffect(() => {
    const initMidi = async () => {
      const res = await webMidi.init();
      if (res.success) {
        setMidiOutputs(res.outputs);
        setMidiInputs(res.inputs);
        setIsMidiSupported(true);

        if (res.outputs.length > 0) {
          const firstOutId = res.outputs[0].id;
          setSelectedMidiOutputId(firstOutId);
          webMidi.selectOutput(firstOutId);
        }

        if (res.inputs.length > 0) {
          const firstInId = res.inputs[0].id;
          setSelectedMidiInputId(firstInId);
          webMidi.selectInput(firstInId);
        }

        setMidiStatusText('Web MIDI 2-Way Bridge Connected.');
      } else {
        setIsMidiSupported(false);
        setMidiStatusText(res.error || 'Web MIDI not supported.');
      }
    };
    initMidi();

    // Attach Incoming MIDI Message Listener
    const onIncomingMidi = (event: MidiEventData) => {
      if (event.type === 'noteon' && event.note !== undefined) {
        // Direct MIDI Note Play on DSP Synth Voice
        dspAudio.init();
        setIsDspLive(true);
        const isAccent = (event.velocity || 80) > 100;
        const currentTelem = telemetryRef.current;
        const liveStep: TB303StepData = {
          stepIndex: 0,
          gate: true,
          tie: false,
          note: event.note!,
          noteName: midiToNoteName(event.note!),
          velocity: event.velocity || 100,
          accent: isAccent,
          slide: false,
          octaveUp: false,
          rawActivation: 0.9,
          telemetry: currentTelem,
        };
        dspAudio.triggerStep(liveStep, 0.4, false, currentTelem);
        setMidiByteLog((prev) => [
          `[MIDI IN] NoteOn ${event.note} (${midiToNoteName(event.note!)}) Vel:${event.velocity}`,
          ...prev.slice(0, 5),
        ]);
      } else if (event.type === 'noteoff') {
        setMidiByteLog((prev) => [
          `[MIDI IN] NoteOff ${event.note}`,
          ...prev.slice(0, 5),
        ]);
      } else if (event.type === 'cc' && event.cc !== undefined && event.value !== undefined) {
        const cc = event.cc;
        const val = event.value;

        // 1. If currently in MIDI Learn mode, bind incoming CC to the active parameter!
        const learningParam = activeLearnParamRef.current;
        if (learningParam) {
          setMidiMappings((prev) => {
            const next = { ...prev, [learningParam]: cc };
            MidiMappingManager.saveMappings(next);
            return next;
          });
          setActiveLearnParam(null);
          activeLearnParamRef.current = null;
          setMidiByteLog((prev) => [
            `[MIDI LEARN УСПЕХ] "${learningParam}" успешно назначен на CC${cc}!`,
            ...prev.slice(0, 5),
          ]);
          return;
        }

        // 2. Route CC based on custom user mappings
        const mappings = midiMappingsRef.current;
        for (const [paramId, mappedCC] of Object.entries(mappings)) {
          if (mappedCC === cc) {
            if (paramId === 'cutoff') setBaseCutoffCC(val);
            else if (paramId === 'resonance') setBaseResonanceCC(val);
            else if (paramId === 'envMod') setBaseEnvModCC(val);
            else if (paramId === 'decay') setBaseDecayCC(val);
            else if (paramId === 'accent') setBaseAccentCC(val);
            else if (paramId === 'drive') setBaseDriveCC(val);
            else if (paramId === 'morph') {
              const morphVal = Math.round(((val / 127) * 200) - 100);
              setMorphAmount(morphVal);
            } else if (paramId === 'flux') {
              setElectronFlux(Math.round((val / 127) * 100));
            } else if (paramId === 'lfoDepth') {
              setPitchLfoDepth(Math.round(20 + (val / 127) * 1180));
            } else if (paramId === 'lfoRate') {
              setPitchLfoRate(0.1 + (val / 127) * 15.0);
            } else if (paramId === 'bpm') {
              setBpm(Math.round(40 + (val / 127) * 220));
            }
          }
        }

        setMidiByteLog((prev) => [
          `[MIDI CC IN] CC${cc} = ${val}`,
          ...prev.slice(0, 5),
        ]);
      }
    };

    webMidi.addInputListener(onIncomingMidi);
    return () => {
      webMidi.removeInputListener(onIncomingMidi);
    };
  }, []);

  const selectMidiOutputPort = (deviceId: string) => {
    setSelectedMidiOutputId(deviceId);
    webMidi.selectOutput(deviceId);
    const port = midiOutputs.find((d) => d.id === deviceId);
    setMidiStatusText(`Output: ${port ? port.name : deviceId}`);
  };

  const selectMidiInputPort = (deviceId: string) => {
    setSelectedMidiInputId(deviceId);
    webMidi.selectInput(deviceId);
    const port = midiInputs.find((d) => d.id === deviceId);
    setMidiStatusText(`Input: ${port ? port.name : deviceId}`);
  };

  const testNote = async () => {
    await dspAudio.init();
    setIsDspLive(true);
    if (!audioMuted) {
      dspAudio.playDirectBeep(130.81, 0.3); // C3 Test Beep
    }
    webMidi.sendNoteOn(36, 127, 1);
    setMidiByteLog((prev) => [`[TEST] 0x90 36 127 (Note-On C1 Vel:127)`, ...prev.slice(0, 5)]);
    setTimeout(() => {
      webMidi.sendNoteOff(36, 1);
      setMidiByteLog((prev) => [`[TEST] 0x80 36 0 (Note-Off C1)`, ...prev.slice(0, 5)]);
    }, 250);
  };

  const panicMidi = () => {
    webMidi.killAllNotes(1);
    dspAudio.stopEngine();
    setMidiByteLog((prev) => [`[PANIC] Sent CC 120 (All Sound Off) & CC 123 (All Notes Off)`, ...prev.slice(0, 5)]);
  };

  // Generate Pattern from Neural Inference
  const generateNewPattern = useCallback(() => {
    const scaleNotes = SCALES[scale].notes;
    const newPattern: TB303StepData[] = [];

    for (let i = 0; i < 64; i++) {
      neuralStateRef.current[i] = Math.tanh(neuralStateRef.current[i] * 1.4 + (Math.random() - 0.5));
    }

    const totalStepsToGen = stepLength || 32;

    for (let step = 0; step < totalStepsToGen; step++) {
      const actGate = Math.abs(neuralStateRef.current[step % 64]);
      const actPitch = Math.abs(neuralStateRef.current[(step * 3 + 1) % 64]);
      const actAccent = Math.abs(neuralStateRef.current[(step * 5 + 2) % 64]);
      const actSlide = Math.abs(neuralStateRef.current[(step * 7 + 3) % 64]);
      const actOct = Math.abs(neuralStateRef.current[(step * 2 + 4) % 64]);

      const gate = actGate > 0.28;
      const noteIdx = Math.floor((actPitch % 1.0) * scaleNotes.length);
      let note = scaleNotes[noteIdx];
      const octaveUp = actOct > 0.70;
      if (octaveUp && note + 12 <= 72) note += 12;

      const accent = actAccent > 0.68;
      const slide = actSlide > 0.65;

      const kB = 1.380649e-23;
      const T = specs.temperatureKelvin;
      const B = 1e8;
      const gTotal = 64 * specs.gMax * 0.5;
      const thermalNoiseVariance = 4 * kB * T * B * gTotal;
      const noise = (Math.sqrt(thermalNoiseVariance) + specs.thermalNoiseStd) * (0.5 + Math.random() * 1.5);

      let currentTotal = 0;
      for (let j = 0; j < 64; j++) {
        currentTotal += Math.abs(neuralStateRef.current[j]) * (specs.gMax * 0.45);
      }

      const layerIdx = layerCounterRef.current;
      layerCounterRef.current = (layerCounterRef.current % 4) + 1;
      const entropy = 1.8 + specs.conductanceDriftStd * 15.0 + Math.random() * 0.6;

      const stepTelemetry: PhysicalTelemetryData = {
        entropy: Number(entropy.toFixed(3)),
        thermalNoiseAmperes: noise,
        totalCurrentAmperes: currentTotal,
        layerIndex: layerIdx,
        totalLayers: 4,
        powerMilliwatts: Number((currentTotal * 1000).toFixed(2)),
      };

      const stepCc = mapTelemetryToMidiCc(stepTelemetry);

      newPattern.push({
        stepIndex: step,
        gate,
        tie: false,
        note,
        noteName: midiToNoteName(note),
        velocity: accent ? 127 : 80,
        accent,
        slide,
        octaveUp,
        rawActivation: actGate,
        telemetry: stepTelemetry,
        ccState: stepCc,
      });
    }

    pushSnapshot('Rndm паттерн');
    setPattern(newPattern);
    setActivePatternId(null);
  }, [pushSnapshot, scale, specs, stepLength]);

  /**
   * Generates a 32-Step Acid Pattern and physical sound patch directly from
   * text prompt tokens, character bytes, and simulated electron flux.
   */
  const generatePatternFromTextPrompt = useCallback((promptText: string) => {
    const result = generatePatternFromNeuromorphicPrompt(
      promptText,
      scale,
      stepLength || 32,
      0.7
    );

    // Update 32-step pattern
    pushSnapshot('AI генерация паттерна');
    setPattern(result.steps);
    setActivePatternId(null);

    // Apply neuromorphic physical synthesizer settings
    setBaseCutoffCC(result.suggestedCutoffCC);
    setBaseResonanceCC(result.suggestedResonanceCC);
    setBaseDecayCC(result.suggestedDecayCC);
    setBaseEnvModCC(result.suggestedEnvModCC);
    setBaseAccentCC(result.suggestedAccentCC);
    setBaseDriveCC(result.suggestedDriveCC);

    // Apply TR-8S morph filter & electron flux
    setMorphTypeState(result.suggestedMorphType);
    setMorphAmountState(result.suggestedMorphAmount);
    setElectronFluxState(result.suggestedElectronFlux);

    dspAudio.setMorphFilter(
      result.suggestedMorphAmount / 100,
      result.suggestedMorphType,
      morphResonance
    );
    dspAudio.setElectronFluxAmount(result.suggestedElectronFlux / 100);

    // Log to MIDI stream
    setMidiByteLog((prev) => [
      `[NEURAL ACID] Text "${promptText.slice(0, 20)}" -> ${result.steps.length} Steps synthesized | Cutoff:${result.suggestedCutoffCC} Res:${result.suggestedResonanceCC}`,
      ...prev.slice(0, 5),
    ]);

    return {
      steps: result.steps,
      suggestedCutoffCC: result.suggestedCutoffCC,
      suggestedResonanceCC: result.suggestedResonanceCC,
      suggestedMorphType: result.suggestedMorphType,
      telemetryLog: result.telemetryLog,
    };
  }, [scale, stepLength, morphResonance]);

  /**
   * Live streaming modulation: each generated token step sweeps and triggers
   * the physical electron TB-303 audio engine in real time.
   */
  const modulateSynthFromTokenStep = useCallback((tokenStep: TokenGenerationStep) => {
    // 1. Calculate token electron entropy
    const topProb = tokenStep.topLogits[0]?.prob || 0.5;
    const tokenCharSum = tokenStep.tokenStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    const tokenCutoffCC = Math.min(120, Math.max(35, Math.round(50 + (tokenStep.tokenId % 60) + topProb * 20)));
    const tokenResonanceCC = Math.min(110, Math.max(45, Math.round(55 + (tokenCharSum % 45))));
    const tokenMorphAmount = Math.max(-100, Math.min(100, Math.round((topProb - 0.5) * 160)));

    // Sweep DSP Audio Engine Filter live
    dspAudio.setMorphFilter(tokenMorphAmount / 100, morphType, morphResonance);
    dspAudio.setElectronFluxAmount(Math.min(1, 0.4 + topProb * 0.5));

    // Send MIDI CC out
    webMidi.sendPhysicalTelemetryCCs(
      tokenResonanceCC,
      baseDecayCC,
      baseDriveCC,
      ccState.depthLfoCC76,
      tokenCutoffCC,
      1
    );

    // Audition a quick neural electron beep/step
    const scaleNotes = SCALES[scale]?.notes || SCALES.c_minor_pentatonic.notes;
    const noteMidi = scaleNotes[tokenStep.tokenId % scaleNotes.length] || 36;
    const isAcc = topProb > 0.65;
    const isSld = tokenStep.tokenId % 4 === 0;

    const mockStep: TB303StepData = {
      stepIndex: tokenStep.step % 32,
      gate: true,
      tie: false,
      note: noteMidi,
      noteName: midiToNoteName(noteMidi),
      velocity: isAcc ? 127 : 85,
      accent: isAcc,
      slide: isSld,
      octaveUp: false,
      rawActivation: topProb,
    };

    dspAudio.init();
    dspAudio.triggerStep(mockStep, 0.18, isSld);
  }, [baseDecayCC, baseDriveCC, ccState.depthLfoCC76, morphResonance, morphType, scale]);

  const isScaleInitializedRef = useRef(false);
  useEffect(() => {
    if (!isScaleInitializedRef.current) {
      isScaleInitializedRef.current = true;
      return;
    }
    // Only transpose pitches of existing steps if user changes scale, leaving gates intact
    const scaleNotes = SCALES[scale].notes;
    setPattern((prev) =>
      prev.map((step, idx) => {
        const newNote = scaleNotes[idx % scaleNotes.length];
        return {
          ...step,
          note: newNote,
          noteName: midiToNoteName(newNote),
        };
      })
    );
  }, [scale]);

  const updateStep = useCallback((stepIdx: number, partial: Partial<TB303StepData>) => {
    pushSnapshot(`Шаг #${stepIdx + 1}`);
    setPattern((prev) => {
      const next = [...prev];
      if (next[stepIdx]) {
        next[stepIdx] = { ...next[stepIdx], ...partial };
      }
      return next;
    });
  }, [pushSnapshot]);

  const toggleGate = useCallback((stepIdx: number) => {
    pushSnapshot(`Шаг #${stepIdx + 1} вкл/выкл`);
    setPattern((prev) => {
      const next = [...prev];
      if (next[stepIdx]) {
        next[stepIdx] = { ...next[stepIdx], gate: !next[stepIdx].gate };
      }
      return next;
    });
  }, [pushSnapshot]);

  const toggleAccent = useCallback((stepIdx: number) => {
    pushSnapshot(`Шаг #${stepIdx + 1} акцент`);
    setPattern((prev) => {
      const next = [...prev];
      if (next[stepIdx]) {
        const newAcc = !next[stepIdx].accent;
        next[stepIdx] = {
          ...next[stepIdx],
          accent: newAcc,
          velocity: newAcc ? 127 : 80,
        };
      }
      return next;
    });
  }, [pushSnapshot]);

  const toggleSlide = useCallback((stepIdx: number) => {
    pushSnapshot(`Шаг #${stepIdx + 1} слайд`);
    setPattern((prev) => {
      const next = [...prev];
      if (next[stepIdx]) {
        next[stepIdx] = { ...next[stepIdx], slide: !next[stepIdx].slide };
      }
      return next;
    });
  }, [pushSnapshot]);

  const toggleOctave = useCallback((stepIdx: number) => {
    pushSnapshot(`Шаг #${stepIdx + 1} октава`);
    setPattern((prev) => {
      const next = [...prev];
      if (next[stepIdx]) {
        const isUp = !next[stepIdx].octaveUp;
        const baseNote = isUp ? next[stepIdx].note + 12 : next[stepIdx].note - 12;
        next[stepIdx] = {
          ...next[stepIdx],
          octaveUp: isUp,
          note: Math.max(36, Math.min(72, baseNote)),
          noteName: midiToNoteName(Math.max(36, Math.min(72, baseNote))),
        };
      }
      return next;
    });
  }, [pushSnapshot]);

  const setStepNote = useCallback((stepIdx: number, noteMidi: number) => {
    pushSnapshot(`Шаг #${stepIdx + 1} нота`);
    setPattern((prev) => {
      const next = [...prev];
      if (next[stepIdx]) {
        next[stepIdx] = {
          ...next[stepIdx],
          note: noteMidi,
          noteName: midiToNoteName(noteMidi),
        };
      }
      return next;
    });
  }, [pushSnapshot]);

  const nextNoteTimeRef = useRef<number>(0);
  const lookaheadIntervalRef = useRef<any>(null);

  // Web Audio Hardware Lookahead Scheduler (zero stutter, zero audio jitter, sample-accurate clock)
  const schedulerTick = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx = dspAudio.getAudioContext();
    if (!ctx) return;

    const currentAudioTime = ctx.currentTime;
    const scheduleAheadSec = 0.120; // 120ms lookahead buffer in hardware audio clock

    // Guard against drift if tab was suspended or frozen
    if (nextNoteTimeRef.current < currentAudioTime) {
      nextNoteTimeRef.current = currentAudioTime + 0.01;
    }

    while (nextNoteTimeRef.current < currentAudioTime + scheduleAheadSec) {
      const currentPattern = patternRef.current;
      if (!currentPattern || currentPattern.length === 0) break;

      const activeLen = stepLengthRef.current || 32;
      const safeIdx = stepIdxRef.current % activeLen;
      const stepData = currentPattern[safeIdx];

      // Instant BPM reactivity: read from ref on every 16th note!
      const currentBpm = Math.max(40, Math.min(260, bpmRef.current));
      const stepDurationSec = (60.0 / currentBpm) / 4.0;
      const noteTime = nextNoteTimeRef.current;

      if (stepData) {
        // 1. Hardware-scheduled DSP Synthesizer Trigger at exact sample-accurate noteTime
        if (!audioMutedRef.current) {
          dspAudio.triggerStep(
            stepData,
            stepDurationSec,
            prevSlideRef.current,
            stepData.telemetry || telemetryRef.current,
            noteTime
          );
        }

        // 2. Schedule MIDI transmission and visual indicator for when this step sounds
        const delayMs = Math.max(0, (noteTime - currentAudioTime) * 1000);
        const prevSlideVal = prevSlideRef.current;

        window.setTimeout(() => {
          if (!isPlayingRef.current) return;
          const eff = effectiveCcRef.current;
          webMidi.sendPhysicalTelemetryCCs(
            eff.resonance,
            eff.decay,
            eff.drive,
            ccStateRef.current.depthLfoCC76,
            eff.cutoff,
            1
          );

          if (stepData.gate) {
            const gateMs = (stepData.slide ? stepDurationSec : stepDurationSec * 0.60) * 1000;
            webMidi.trigger303Step(
              stepData.note,
              stepData.velocity,
              stepData.slide,
              gateMs,
              prevSlideVal,
              1
            );
          } else {
            webMidi.killAllNotes(1);
          }

          setCurrentStep(safeIdx);
        }, delayMs);

        prevSlideRef.current = stepData.slide;
      }

      stepIdxRef.current = (safeIdx + 1) % activeLen;
      nextNoteTimeRef.current += stepDurationSec;
    }
  }, []);

  // Instant BPM reactivity: updates bpmRef immediately and synchronizes state
  const setBpm = useCallback((newBpm: number) => {
    const clamped = Math.max(40, Math.min(260, Math.round(newBpm)));
    bpmRef.current = clamped;
    setBpmState(clamped);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (lookaheadIntervalRef.current) clearInterval(lookaheadIntervalRef.current);
      if (clockTimerRef.current) clearInterval(clockTimerRef.current);
    };
  }, []);

  const togglePlay = async () => {
    if (isPlaying) {
      if (lookaheadIntervalRef.current) {
        clearInterval(lookaheadIntervalRef.current);
        lookaheadIntervalRef.current = null;
      }
      if (clockTimerRef.current) {
        clearInterval(clockTimerRef.current);
        clockTimerRef.current = null;
      }
      isPlayingRef.current = false;
      webMidi.killAllNotes(1);
      dspAudio.stopEngine();
      setIsPlaying(false);
    } else {
      // Auto-unlock DSP AudioContext immediately
      await dspAudio.init();
      setIsDspLive(true);
      dspAudio.setMorphFilter(morphAmount / 100, morphType, morphResonance);

      isPlayingRef.current = true;
      setIsPlaying(true);
      stepIdxRef.current = 0;
      prevSlideRef.current = false;

      const ctx = dspAudio.getAudioContext();
      nextNoteTimeRef.current = (ctx?.currentTime || 0) + 0.04;

      // Run immediate tick and start lookahead interval
      schedulerTick();
      lookaheadIntervalRef.current = setInterval(schedulerTick, 25);
    }
  };

  return (
    <EngineContext.Provider
      value={{
        isDspLive,
        enableDsp,
        disableDsp,
        toggleDsp,
        dspSampleRate,
        playTestBeep,
        dspCharacterMode,
        setDspCharacterMode,
        isMorphEnabled,
        setIsMorphEnabled,
        toggleMorphEnabled,
        morphAmount,
        setMorphAmount,
        morphType,
        setMorphType,
        morphResonance,
        setMorphResonance,
        isPitchLfoEnabled,
        setIsPitchLfoEnabled,
        togglePitchLfoEnabled,
        pitchLfoRate,
        setPitchLfoRate,
        pitchLfoDepth,
        setPitchLfoDepth,
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
        saveCurrentAsPreset,
        deleteUserPreset,
        exportPresetsJson,
        importPresetsJson,
        patternList,
        activePatternId,
        saveUserPattern,
        loadSavedPattern,
        deleteSavedPattern,
        stepLength,
        setStepLength,
        specs,
        setSpecs,
        updateSpecField,
        isPlaying,
        setIsPlaying,
        togglePlay,
        bpm,
        setBpm,
        scale,
        setScale,
        currentStep,
        waveform,
        setWaveform,
        audioMuted,
        setAudioMuted,
        viewMode,
        setViewMode,
        clearPattern,
        setPattern,
        baseCutoffCC,
        setBaseCutoffCC,
        baseResonanceCC,
        setBaseResonanceCC,
        baseEnvModCC,
        setBaseEnvModCC,
        baseDecayCC,
        setBaseDecayCC,
        baseAccentCC,
        setBaseAccentCC,
        baseDriveCC,
        setBaseDriveCC,
        isStaticKnobsLocked,
        setIsStaticKnobsLocked,
        toggleStaticKnobs,
        effectiveCc,
        telemetry,
        ccState,
        pattern,
        generateNewPattern,
        generatePatternFromTextPrompt,
        modulateSynthFromTokenStep,
        toggleGate,
        toggleAccent,
        toggleSlide,
        toggleOctave,
        setStepNote,
        updateStep,
        midiOutputs,
        midiInputs,
        selectedMidiOutputId,
        selectedMidiInputId,
        isMidiSupported,
        midiStatusText,
        midiByteLog,
        selectMidiOutputPort,
        selectMidiInputPort,
        testNote,
        panicMidi,
        midiDevices: midiOutputs,
        selectedMidiId: selectedMidiOutputId,
        selectMidiPort: selectMidiOutputPort,
        canUndo: undoCount > 0,
        canRedo: redoCount > 0,
        undoCount,
        redoCount,
        undo,
        redo,
        midiMappings,
        activeLearnParam,
        startMidiLearn,
        stopMidiLearn,
        setMidiMapping,
        resetMidiMappings,
        isMidiModalOpen,
        setIsMidiModalOpen,
        keyboardOctave,
        setKeyboardOctave,
        activePianoKeys,
      }}
    >
      {children}
    </EngineContext.Provider>
  );
};

export const useEngine = () => {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error('useEngine must be used within an EngineProvider');
  }
  return context;
};
