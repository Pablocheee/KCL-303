/**
 * Global Engine Context (src/context/EngineContext.tsx)
 * 
 * Central state store persisting:
 *  - Native Web Audio API DSP Synthesizer Engine (DSPAudioEngine)
 *  - TR-8S Style Bipolar Morph Synthesis Filter
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
import { dspAudio, DSPCharacterMode, FilterMorphType, ElectronMode, SpatialRainMode } from '../engine/dsp_audio_engine';
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

  // TR-8S Bipolar Morph Filter State
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
  setPitchLfoRate: (rate: number, recordUndo?: boolean) => void;
  pitchLfoDepth: number; // Cents (5 .. 250)
  setPitchLfoDepth: (depth: number) => void;

  // Spatial Rain Mirror Pan Filter State
  spatialRainMode: SpatialRainMode;
  setSpatialRainMode: (mode: SpatialRainMode) => void;
  toggleSpatialRainMode: () => void;

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
  shiftPatternOctave: (deltaOctaves: number) => void;
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
  setAllBaseKnobsCC: (
    cutoff?: number | { cutoff?: number; resonance?: number; envMod?: number; decay?: number; accent?: number; drive?: number; morph?: number },
    resonance?: number,
    decay?: number,
    envMod?: number,
    accent?: number,
    drive?: number,
    morph?: number
  ) => void;

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

export interface FullEngineSnapshot {
  desc: string;
  timestamp: number;
  pattern: TB303StepData[];
  cutoffCC: number;
  resonanceCC: number;
  envModCC: number;
  decayCC: number;
  accentCC: number;
  driveCC: number;
  morphAmount: number;
  morphResonance: number;
  isMorphEnabled: boolean;
  morphType: FilterMorphType;
  bpm: number;
  scale: ScaleName;
  stepLength: number;
  waveform: 'sawtooth' | 'square';
  dspCharacterMode: DSPCharacterMode;
  electronFlux: number;
  electronMode: ElectronMode;
  electronSolo: boolean;
  isPitchLfoEnabled: boolean;
  pitchLfoRate: number;
  pitchLfoDepth: number;
  spatialRainMode: SpatialRainMode;
  specs: AnalogHardwareSpecs;
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

  const dspCharacterModeRef = useRef<DSPCharacterMode>('neural_chaos');
  const electronFluxRef = useRef<number>(65);
  const electronModeRef = useRef<ElectronMode>('thermal_boltzmann');
  const electronSoloRef = useRef<boolean>(false);

  // 1b. TR-8S Bipolar Morph Filter State
  const [isMorphEnabled, setIsMorphEnabledState] = useState<boolean>(true);
  const [morphAmount, setMorphAmountState] = useState<number>(0);
  const [morphType, setMorphTypeState] = useState<FilterMorphType>('tr8s_dj');
  const [morphResonance, setMorphResonanceState] = useState<number>(6);

  const isMorphEnabledRef = useRef<boolean>(true);
  const morphAmountRef = useRef<number>(0);
  const morphTypeRef = useRef<FilterMorphType>('tr8s_dj');
  const morphResonanceRef = useRef<number>(6);

  // 1b2. Continuous Pitch LFO State (Seamless Gapless Bass Vibrato / Drift)
  const [isPitchLfoEnabled, setIsPitchLfoEnabledState] = useState<boolean>(false);
  const [pitchLfoRate, setPitchLfoRateState] = useState<number>(3.5);
  const [pitchLfoDepth, setPitchLfoDepthState] = useState<number>(70);

  const isPitchLfoEnabledRef = useRef<boolean>(false);
  const pitchLfoRateRef = useRef<number>(3.5);
  const pitchLfoDepthRef = useRef<number>(70);

  // 1b3. Spatial Rain Mirror Pan Filter State
  const [spatialRainMode, setSpatialRainModeState] = useState<SpatialRainMode>('off');
  const spatialRainModeRef = useRef<SpatialRainMode>('off');

  // 1c. Preset Management
  const [presets, setPresets] = useState<SynthPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>('acid-hardfloor-squelch');

  // 2. Physical Simulation Specs
  const [specs, setSpecs] = useState<AnalogHardwareSpecs>(DEFAULT_ANALOG_SPECS);
  const specsRef = useRef<AnalogHardwareSpecs>(DEFAULT_ANALOG_SPECS);
  specsRef.current = specs;

  // 3. Sequencer Settings & View Mode
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpmState] = useState(() => {
    const savedActive = PatternManager.loadActivePatternState();
    if (savedActive && savedActive.bpm) return savedActive.bpm;
    return 162; // Tekno Default 162 BPM
  });
  const [scale, setScaleState] = useState<ScaleName>('c_minor_pentatonic');
  const [currentStep, setCurrentStep] = useState(0);
  const [stepLength, setStepLengthState] = useState<number>(32);
  const [waveform, setWaveformState] = useState<'sawtooth' | 'square'>('sawtooth');
  const [audioMuted, setAudioMuted] = useState(false);
  const [viewMode, setViewMode] = useState<SequencerViewMode>('t8_trrec');

  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const stepLengthRef = useRef(stepLength);
  stepLengthRef.current = stepLength;
  const waveformRef = useRef(waveform);
  waveformRef.current = waveform;

  // 3b. Pattern Storage & Management System
  const [patternList, setPatternList] = useState<SavedPattern[]>(() => PatternManager.getAllPatterns());
  const [activePatternId, setActivePatternId] = useState<string | null>(() => {
    const savedActive = PatternManager.loadActivePatternState();
    if (savedActive) return null;
    return 'pat-tekno-23-free-party';
  });

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

  // Initialize Pattern: 1. From localStorage active state; 2. Default to Factory Tekno 32-step pattern
  const [pattern, setPattern] = useState<TB303StepData[]>(() => {
    const savedActive = PatternManager.loadActivePatternState();
    if (savedActive && savedActive.steps && savedActive.steps.length > 0) {
      return savedActive.steps;
    }
    const teknoPat = FACTORY_PATTERNS.find((p) => p.id === 'pat-tekno-23-free-party') || FACTORY_PATTERNS[0];
    if (teknoPat && teknoPat.steps) {
      return JSON.parse(JSON.stringify(teknoPat.steps));
    }
    return createEmptyPattern('c_minor_pentatonic', 32);
  });

  const patternRef = useRef(pattern);
  patternRef.current = pattern;

  // Pattern & Complete Synth State Undo / Redo History (30 actions)
  const undoStackRef = useRef<FullEngineSnapshot[]>([]);
  const redoStackRef = useRef<FullEngineSnapshot[]>([]);
  const [undoCount, setUndoCount] = useState<number>(0);
  const [redoCount, setRedoCount] = useState<number>(0);

  const isApplyingSnapshotRef = useRef<boolean>(false);
  const dragStartSnapshotRef = useRef<FullEngineSnapshot | null>(null);
  const sliderDebounceTimerRef = useRef<any>(null);

  const createSnapshot = useCallback((desc: string): FullEngineSnapshot => ({
    desc,
    timestamp: Date.now(),
    pattern: JSON.parse(JSON.stringify(patternRef.current)),
    cutoffCC: baseCutoffRef.current,
    resonanceCC: baseResonanceRef.current,
    envModCC: baseEnvModRef.current,
    decayCC: baseDecayRef.current,
    accentCC: baseAccentRef.current,
    driveCC: baseDriveRef.current,
    morphAmount: morphAmountRef.current,
    morphResonance: morphResonanceRef.current,
    isMorphEnabled: isMorphEnabledRef.current,
    morphType: morphTypeRef.current,
    bpm: bpmRef.current,
    scale: scaleRef.current,
    stepLength: stepLengthRef.current,
    waveform: waveformRef.current,
    dspCharacterMode: dspCharacterModeRef.current,
    electronFlux: electronFluxRef.current,
    electronMode: electronModeRef.current,
    electronSolo: electronSoloRef.current,
    isPitchLfoEnabled: isPitchLfoEnabledRef.current,
    pitchLfoRate: pitchLfoRateRef.current,
    pitchLfoDepth: pitchLfoDepthRef.current,
    spatialRainMode: spatialRainModeRef.current,
    specs: { ...specsRef.current },
  }), []);

  // Universal CPU-Safe Continuous Slider Change Recorder (Debounced 350ms Gesture Capture)
  const recordContinuousChange = useCallback((desc: string) => {
    if (isApplyingSnapshotRef.current) return;

    // Capture pristine state at the beginning of the slider interaction
    if (!dragStartSnapshotRef.current) {
      dragStartSnapshotRef.current = createSnapshot(desc);
    }

    if (sliderDebounceTimerRef.current) {
      clearTimeout(sliderDebounceTimerRef.current);
    }

    sliderDebounceTimerRef.current = setTimeout(() => {
      if (isApplyingSnapshotRef.current) {
        dragStartSnapshotRef.current = null;
        return;
      }
      if (dragStartSnapshotRef.current) {
        undoStackRef.current = [...undoStackRef.current.slice(-29), dragStartSnapshotRef.current];
        redoStackRef.current = [];
        setUndoCount(undoStackRef.current.length);
        setRedoCount(0);
        dragStartSnapshotRef.current = null;
      }
    }, 350);
  }, [createSnapshot]);

  // Instant Discrete Action Snapshot (Buttons, Switches, Presets, Step toggles)
  const pushSnapshot = useCallback((desc: string) => {
    if (isApplyingSnapshotRef.current) return;

    if (sliderDebounceTimerRef.current) {
      clearTimeout(sliderDebounceTimerRef.current);
      sliderDebounceTimerRef.current = null;
    }
    dragStartSnapshotRef.current = null;

    const snap = createSnapshot(desc);
    undoStackRef.current = [...undoStackRef.current.slice(-29), snap];
    redoStackRef.current = [];
    setUndoCount(undoStackRef.current.length);
    setRedoCount(0);
  }, [createSnapshot]);

  const applySnapshot = useCallback((snap: FullEngineSnapshot) => {
    isApplyingSnapshotRef.current = true;

    // 1. Pattern
    if (snap.pattern && snap.pattern.length > 0) {
      setPattern(snap.pattern);
      patternRef.current = snap.pattern;
    }

    // 2. Knobs
    baseCutoffRef.current = snap.cutoffCC;
    setBaseCutoffCCState(snap.cutoffCC);
    baseResonanceRef.current = snap.resonanceCC;
    setBaseResonanceCCState(snap.resonanceCC);
    baseEnvModRef.current = snap.envModCC;
    setBaseEnvModCCState(snap.envModCC);
    baseDecayRef.current = snap.decayCC;
    setBaseDecayCCState(snap.decayCC);
    baseAccentRef.current = snap.accentCC;
    setBaseAccentCCState(snap.accentCC);
    baseDriveRef.current = snap.driveCC;
    setBaseDriveCCState(snap.driveCC);
    syncDspKnobs();

    // 3. Morph Filter
    isMorphEnabledRef.current = snap.isMorphEnabled;
    setIsMorphEnabledState(snap.isMorphEnabled);
    morphAmountRef.current = snap.morphAmount;
    setMorphAmountState(snap.morphAmount);
    morphTypeRef.current = snap.morphType;
    setMorphTypeState(snap.morphType);
    morphResonanceRef.current = snap.morphResonance;
    setMorphResonanceState(snap.morphResonance);
    dspAudio.setMorphFilter(snap.morphAmount / 100, snap.morphType, snap.morphResonance);
    dspAudio.setMorphEnabled(snap.isMorphEnabled);

    // 4. Sequencer
    bpmRef.current = snap.bpm;
    setBpmState(snap.bpm);
    scaleRef.current = snap.scale;
    setScaleState(snap.scale);
    stepLengthRef.current = snap.stepLength;
    setStepLengthState(snap.stepLength);
    waveformRef.current = snap.waveform;
    setWaveformState(snap.waveform);
    dspAudio.setWaveform(snap.waveform);

    // 5. Sound modes & electron physics
    dspCharacterModeRef.current = snap.dspCharacterMode;
    setDspCharacterModeState(snap.dspCharacterMode);
    dspAudio.setCharacterMode(snap.dspCharacterMode);

    electronFluxRef.current = snap.electronFlux;
    setElectronFluxState(snap.electronFlux);
    dspAudio.setElectronFluxAmount(snap.electronFlux / 100);

    electronModeRef.current = snap.electronMode;
    setElectronModeState(snap.electronMode);
    dspAudio.setElectronMode(snap.electronMode);

    electronSoloRef.current = snap.electronSolo;
    setElectronSoloState(snap.electronSolo);
    dspAudio.setElectronSolo(snap.electronSolo);

    // 6. LFO & Pan
    isPitchLfoEnabledRef.current = snap.isPitchLfoEnabled;
    setIsPitchLfoEnabledState(snap.isPitchLfoEnabled);
    dspAudio.setPitchLfoEnabled(snap.isPitchLfoEnabled);

    pitchLfoRateRef.current = snap.pitchLfoRate;
    setPitchLfoRateState(snap.pitchLfoRate);
    dspAudio.setPitchLfoRate(snap.pitchLfoRate);

    pitchLfoDepthRef.current = snap.pitchLfoDepth;
    setPitchLfoDepthState(snap.pitchLfoDepth);
    dspAudio.setPitchLfoDepth(snap.pitchLfoDepth);

    spatialRainModeRef.current = snap.spatialRainMode;
    setSpatialRainModeState(snap.spatialRainMode);
    dspAudio.setSpatialRainMode(snap.spatialRainMode);

    // 7. Specs
    if (snap.specs) {
      specsRef.current = { ...snap.specs };
      setSpecs({ ...snap.specs });
    }

    setTimeout(() => {
      isApplyingSnapshotRef.current = false;
      dragStartSnapshotRef.current = null;
      if (sliderDebounceTimerRef.current) {
        clearTimeout(sliderDebounceTimerRef.current);
        sliderDebounceTimerRef.current = null;
      }
    }, 250);
  }, [syncDspKnobs]);

  const undo = useCallback(() => {
    if (sliderDebounceTimerRef.current) {
      clearTimeout(sliderDebounceTimerRef.current);
      sliderDebounceTimerRef.current = null;
    }
    dragStartSnapshotRef.current = null;

    if (undoStackRef.current.length === 0) return;
    const current = createSnapshot('Текущее состояние');
    const target = undoStackRef.current.pop();
    if (!target) return;

    redoStackRef.current = [...redoStackRef.current.slice(-29), current];
    applySnapshot(target);
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
    setMidiByteLog((prev) => [`[UNDO] Откат назад: ${target.desc} (Осталось: ${undoStackRef.current.length})`, ...prev.slice(0, 5)]);
  }, [applySnapshot, createSnapshot]);

  const redo = useCallback(() => {
    if (sliderDebounceTimerRef.current) {
      clearTimeout(sliderDebounceTimerRef.current);
      sliderDebounceTimerRef.current = null;
    }
    dragStartSnapshotRef.current = null;

    if (redoStackRef.current.length === 0) return;
    const current = createSnapshot('Предыдущее состояние');
    const target = redoStackRef.current.pop();
    if (!target) return;

    undoStackRef.current = [...undoStackRef.current.slice(-29), current];
    applySnapshot(target);
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
    setMidiByteLog((prev) => [`[REDO] Откат вперед: ${target.desc} (Осталось: ${redoStackRef.current.length})`, ...prev.slice(0, 5)]);
  }, [applySnapshot, createSnapshot]);

  const setSpatialRainMode = useCallback((mode: SpatialRainMode) => {
    pushSnapshot(`Панорама: ${mode.toUpperCase()}`);
    spatialRainModeRef.current = mode;
    setSpatialRainModeState(mode);
    dspAudio.setSpatialRainMode(mode);
  }, [pushSnapshot]);

  const toggleSpatialRainMode = useCallback(() => {
    const prev = spatialRainModeRef.current;
    const next: SpatialRainMode =
      prev === 'off'
        ? 'pingpong'
        : prev === 'pingpong'
        ? 'drops'
        : prev === 'drops'
        ? 'spiral'
        : 'off';
    pushSnapshot(`Смена панорамы: ${next.toUpperCase()}`);
    spatialRainModeRef.current = next;
    setSpatialRainModeState(next);
    dspAudio.setSpatialRainMode(next);
  }, [pushSnapshot]);

  const setBaseCutoffCC = useCallback((val: number) => {
    recordContinuousChange(`Cutoff: ${val}`);
    baseCutoffRef.current = val;
    setBaseCutoffCCState(val);
    syncDspKnobs();
  }, [recordContinuousChange, syncDspKnobs]);

  const setBaseResonanceCC = useCallback((val: number) => {
    recordContinuousChange(`Resonance: ${val}`);
    baseResonanceRef.current = val;
    setBaseResonanceCCState(val);
    syncDspKnobs();
  }, [recordContinuousChange, syncDspKnobs]);

  const setBaseEnvModCC = useCallback((val: number) => {
    recordContinuousChange(`EnvMod: ${val}`);
    baseEnvModRef.current = val;
    setBaseEnvModCCState(val);
    syncDspKnobs();
  }, [recordContinuousChange, syncDspKnobs]);

  const setBaseDecayCC = useCallback((val: number) => {
    recordContinuousChange(`Decay: ${val}`);
    baseDecayRef.current = val;
    setBaseDecayCCState(val);
    syncDspKnobs();
  }, [recordContinuousChange, syncDspKnobs]);

  const setBaseAccentCC = useCallback((val: number) => {
    recordContinuousChange(`Accent: ${val}`);
    baseAccentRef.current = val;
    setBaseAccentCCState(val);
    syncDspKnobs();
  }, [recordContinuousChange, syncDspKnobs]);

  const setBaseDriveCC = useCallback((val: number) => {
    recordContinuousChange(`Drive: ${val}`);
    baseDriveRef.current = val;
    setBaseDriveCCState(val);
    syncDspKnobs();
  }, [recordContinuousChange, syncDspKnobs]);

  const setAllBaseKnobsCC = useCallback((
    cutoff?: number | { cutoff?: number; resonance?: number; envMod?: number; decay?: number; accent?: number; drive?: number; morph?: number },
    resonance?: number,
    decay?: number,
    envMod?: number,
    accent?: number,
    drive?: number,
    morph?: number
  ) => {
    recordContinuousChange('Macro Knobs');
    if (typeof cutoff === 'object' && cutoff !== null) {
      if (cutoff.cutoff !== undefined) { baseCutoffRef.current = cutoff.cutoff; setBaseCutoffCCState(cutoff.cutoff); }
      if (cutoff.resonance !== undefined) { baseResonanceRef.current = cutoff.resonance; setBaseResonanceCCState(cutoff.resonance); }
      if (cutoff.envMod !== undefined) { baseEnvModRef.current = cutoff.envMod; setBaseEnvModCCState(cutoff.envMod); }
      if (cutoff.decay !== undefined) { baseDecayRef.current = cutoff.decay; setBaseDecayCCState(cutoff.decay); }
      if (cutoff.accent !== undefined) { baseAccentRef.current = cutoff.accent; setBaseAccentCCState(cutoff.accent); }
      if (cutoff.drive !== undefined) { baseDriveRef.current = cutoff.drive; setBaseDriveCCState(cutoff.drive); }
      if (cutoff.morph !== undefined) { morphAmountRef.current = cutoff.morph; setMorphAmountState(cutoff.morph); }
    } else {
      if (cutoff !== undefined) { baseCutoffRef.current = cutoff; setBaseCutoffCCState(cutoff); }
      if (resonance !== undefined) { baseResonanceRef.current = resonance; setBaseResonanceCCState(resonance); }
      if (decay !== undefined) { baseDecayRef.current = decay; setBaseDecayCCState(decay); }
      if (envMod !== undefined) { baseEnvModRef.current = envMod; setBaseEnvModCCState(envMod); }
      if (accent !== undefined) { baseAccentRef.current = accent; setBaseAccentCCState(accent); }
      if (drive !== undefined) { baseDriveRef.current = drive; setBaseDriveCCState(drive); }
      if (morph !== undefined) { morphAmountRef.current = morph; setMorphAmountState(morph); }
    }
    syncDspKnobs();
  }, [recordContinuousChange, syncDspKnobs]);

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

  const shiftPatternOctave = useCallback((deltaOctaves: number) => {
    const deltaSemitones = deltaOctaves * 12;
    pushSnapshot(deltaOctaves > 0 ? 'Сдвиг всего паттерна: +1 Октава' : 'Сдвиг всего паттерна: -1 Октава');
    setPattern((prev) =>
      prev.map((step) => {
        const nextNote = Math.max(24, Math.min(72, step.note + deltaSemitones));
        return {
          ...step,
          note: nextNote,
          noteName: midiToNoteName(nextNote),
        };
      })
    );
    setMidiByteLog((prev) => [
      `[PATTERN OCTAVE] Сдвиг всего паттерна: ${deltaOctaves > 0 ? '+1 Октава (+12 st)' : '-1 Октава (-12 st)'}`,
      ...prev.slice(0, 5),
    ]);
  }, [pushSnapshot]);

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
  const heldKeyboardKeysRef = useRef<Set<string>>(new Set());

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

        // Detect overlapping key presses: if keys are already held down, trigger legato SLIDE!
        const isSlide = heldKeyboardKeysRef.current.size > 0;
        heldKeyboardKeysRef.current.add(matchedNote.keyChar);
        setActivePianoKeys(new Set(heldKeyboardKeysRef.current));

        dspAudio.init();
        setIsDspLive(true);
        dspAudio.triggerLiveNoteOn(note, 108, isSlide);
        webMidi.sendNoteOn(note, 108);

        setMidiByteLog((prev) => [
          `[KEYBOARD LIVE] ${midiToNoteName(note)} [${matchedNote.keyChar.toUpperCase()}] ${isSlide ? '⚡ [SLIDE]' : ''} (Окт: C${Math.floor(baseOct / 12) - 1})`,
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

        heldKeyboardKeysRef.current.delete(matchedNote.keyChar);
        setActivePianoKeys(new Set(heldKeyboardKeysRef.current));

        // Only release sound when ALL piano keys are released
        if (heldKeyboardKeysRef.current.size === 0) {
          dspAudio.triggerLiveNoteOff(note);
          webMidi.sendNoteOff(note);
        }
      }
    };

    const handleBlur = () => {
      heldKeyboardKeysRef.current.clear();
      setActivePianoKeys(new Set());
      dspAudio.triggerLiveNoteOff();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const clockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const neuralStateRef = useRef<Float32Array>(new Float32Array(64).map(() => Math.random() * 2 - 1));
  const layerCounterRef = useRef<number>(1);
  const prevSlideRef = useRef<boolean>(false);

  // High-performance audio clock refs (prevents UI freezing & ensures zero audio jitter)
  bpmRef.current = bpm;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
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
    pushSnapshot(enabled ? 'Морф-фильтр: ВКЛ' : 'Морф-фильтр: ВЫКЛ');
    isMorphEnabledRef.current = enabled;
    setIsMorphEnabledState(enabled);
    dspAudio.setMorphEnabled(enabled);
  };

  const toggleMorphEnabled = () => {
    const next = !isMorphEnabledRef.current;
    pushSnapshot(next ? 'Морф-фильтр: ВКЛ' : 'Морф-фильтр: ВЫКЛ');
    isMorphEnabledRef.current = next;
    setIsMorphEnabledState(next);
    dspAudio.setMorphEnabled(next);
  };

  const setMorphAmount = (val: number) => {
    recordContinuousChange(`Morph: ${val}%`);
    morphAmountRef.current = val;
    setMorphAmountState(val);
    dspAudio.setMorphFilter(val / 100, morphTypeRef.current, morphResonanceRef.current);
  };

  const setMorphType = (type: FilterMorphType) => {
    pushSnapshot(`Режим морф-фильтра: ${type}`);
    morphTypeRef.current = type;
    setMorphTypeState(type);
    dspAudio.setMorphFilter(morphAmountRef.current / 100, type, morphResonanceRef.current);
  };

  const setMorphResonance = (res: number) => {
    recordContinuousChange(`Morph Res: ${res.toFixed(1)}Q`);
    morphResonanceRef.current = res;
    setMorphResonanceState(res);
    dspAudio.setMorphFilter(morphAmountRef.current / 100, morphTypeRef.current, res);
  };

  // Continuous Pitch LFO Callbacks (Seamless Gapless Bass Vibrato / Drift)
  const setIsPitchLfoEnabled = (enabled: boolean) => {
    pushSnapshot(enabled ? 'Pitch LFO: ВКЛ' : 'Pitch LFO: ВЫКЛ');
    isPitchLfoEnabledRef.current = enabled;
    setIsPitchLfoEnabledState(enabled);
    dspAudio.setPitchLfoEnabled(enabled);
    setMidiByteLog((prev) => [`[PITCH LFO] ${enabled ? 'ENABLED' : 'DISABLED'} (${pitchLfoRateRef.current.toFixed(2)}Hz)`, ...prev.slice(0, 5)]);
  };

  const togglePitchLfoEnabled = () => {
    const next = !isPitchLfoEnabledRef.current;
    pushSnapshot(next ? 'Pitch LFO: ВКЛ' : 'Pitch LFO: ВЫКЛ');
    isPitchLfoEnabledRef.current = next;
    setIsPitchLfoEnabledState(next);
    dspAudio.setPitchLfoEnabled(next);
    setMidiByteLog((log) => [`[PITCH LFO] ${next ? 'ENABLED' : 'DISABLED'} (${pitchLfoRateRef.current.toFixed(2)}Hz)`, ...log.slice(0, 5)]);
  };

  const setPitchLfoRate = (rate: number, recordUndo = true) => {
    const clamped = Math.max(0.05, Math.min(25.0, rate));
    if (recordUndo) {
      recordContinuousChange(`LFO Rate: ${clamped.toFixed(1)}Hz`);
    }
    pitchLfoRateRef.current = clamped;
    setPitchLfoRateState(clamped);
    dspAudio.setPitchLfoRate(clamped);
  };

  const setPitchLfoDepth = (depth: number) => {
    const clamped = Math.max(10, Math.min(1200, depth));
    recordContinuousChange(`LFO Depth: ±${clamped}c`);
    pitchLfoDepthRef.current = clamped;
    setPitchLfoDepthState(clamped);
    dspAudio.setPitchLfoDepth(clamped);
  };

  const setElectronFlux = (val: number) => {
    recordContinuousChange(`Electron Flux: ${val}%`);
    electronFluxRef.current = val;
    setElectronFluxState(val);
    dspAudio.setElectronFluxAmount(val / 100);
  };

  const setElectronMode = (mode: ElectronMode) => {
    pushSnapshot(`Режим физики: ${mode.toUpperCase()}`);
    electronModeRef.current = mode;
    setElectronModeState(mode);
    dspAudio.setElectronMode(mode);
    setMidiByteLog((prev) => [`[PHYSICS] Switched Electron Mode: ${mode.toUpperCase()}`, ...prev.slice(0, 5)]);
  };

  const setElectronSolo = (solo: boolean) => {
    pushSnapshot(solo ? 'Соло электронов: ВКЛ' : 'Соло электронов: ВЫКЛ');
    electronSoloRef.current = solo;
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
    pushSnapshot(`DSP Характер: ${mode}`);
    dspCharacterModeRef.current = mode;
    setDspCharacterModeState(mode);
    dspAudio.setCharacterMode(mode);
  };

  const setWaveform = (wf: 'sawtooth' | 'square') => {
    pushSnapshot(`Форма волны: ${wf.toUpperCase()}`);
    waveformRef.current = wf;
    setWaveformState(wf);
    dspAudio.setWaveform(wf);
  };

  const setScale = (newScale: ScaleName) => {
    pushSnapshot(`Гамма: ${newScale}`);
    scaleRef.current = newScale;
    setScaleState(newScale);

    // Explicit user action: update pattern notes to match selected scale
    const scaleNotes = SCALES[newScale]?.notes || SCALES['c_minor_pentatonic'].notes;
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
  };

  const updateSpecField = (field: keyof AnalogHardwareSpecs, value: number) => {
    recordContinuousChange(`Параметр ${String(field)}`);
    setSpecs((prev) => {
      const updated = { ...prev, [field]: value };
      specsRef.current = updated;
      return updated;
    });
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
    recordContinuousChange(`BPM: ${clamped}`);
    bpmRef.current = clamped;
    setBpmState(clamped);
  }, [recordContinuousChange]);

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
        shiftPatternOctave,
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
        setAllBaseKnobsCC,
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
        // Spatial Rain Mirror Pan Filter
        spatialRainMode,
        setSpatialRainMode,
        toggleSpatialRainMode,
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
