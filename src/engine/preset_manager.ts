/**
 * Preset & Snapshot Persistence Manager (src/engine/preset_manager.ts)
 * 
 * Curated factory sound banks for:
 *  - Acid Patterns (TB-303 squelch, screaming diode resonance, accent slides)
 *  - Tribcore (175-190 BPM high-octane Frenchcore & mental tribcore drive)
 *  - Tekno / Acidcore / Hardtek (155-170 BPM soundsystem spiral rave hooks)
 */

import { AnalogHardwareSpecs } from './analog_crossbar';
import { DSPCharacterMode, FilterMorphType, ElectronMode } from './dsp_audio_engine';
import { ScaleName, TB303StepData } from './neural_303_types';
import { FACTORY_PATTERNS } from './pattern_manager';

export type PresetCategory = 'Acid' | 'Tribcore' | 'Tekno' | 'Gabba' | 'Electro' | 'User';

export interface SynthPreset {
  id: string;
  name: string;
  category: PresetCategory;
  author: string;
  createdAt: number;
  description: string;

  // Synthesizer Knobs (0..127)
  baseCutoffCC: number;
  baseResonanceCC: number;
  baseEnvModCC: number;
  baseDecayCC: number;
  baseAccentCC: number;
  baseDriveCC: number;
  waveform: 'sawtooth' | 'square';

  // TR-8S Morph Filter
  morphAmount: number; // -100..+100
  morphType: FilterMorphType;
  morphResonance: number;

  // Continuous Pitch LFO
  pitchLfoEnabled?: boolean;
  pitchLfoRate?: number;
  pitchLfoDepth?: number;

  // DSP & Quantum Physics
  dspCharacterMode: DSPCharacterMode;
  electronFlux: number; // 0..100
  electronMode?: ElectronMode;
  specs: AnalogHardwareSpecs;

  // Sequencer Settings & Pattern
  bpm: number;
  scale: ScaleName;
  pattern: TB303StepData[];
}

const STORAGE_KEY = 'neural_303_user_presets_v2';

export const FACTORY_PRESETS: SynthPreset[] = [
  // ==========================================
  // 1. ACID PATTERNS (138 - 144 BPM)
  // ==========================================
  {
    id: 'acid-hardfloor-squelch',
    name: 'Hardfloor Silver 303 Squelch',
    category: 'Acid',
    author: 'Neural Acid Lab',
    createdAt: 1710000000000,
    description: 'Iconic 90s TB-303 high-resonance diode screech with rapid envelope decay, heavy accent chirp and 32-step squelch pattern.',
    baseCutoffCC: 66,
    baseResonanceCC: 104,
    baseEnvModCC: 115,
    baseDecayCC: 36,
    baseAccentCC: 124,
    baseDriveCC: 58,
    waveform: 'sawtooth',
    morphAmount: 20,
    morphType: 'diode_ladder',
    morphResonance: 14.0,
    dspCharacterMode: 'classic_303',
    electronFlux: 60,
    specs: {
      vMax: 1.0,
      gMax: 100e-6,
      gMin: 1e-6,
      temperatureKelvin: 315,
      thermalNoiseStd: 5e-8,
      conductanceDriftStd: 0.03,
      tiaGainRf: 26000,
      adcBits: 8,
    },
    bpm: 138,
    scale: 'c_minor_pentatonic',
    pattern: FACTORY_PATTERNS[0]?.steps || [],
  },
  {
    id: 'acid-dark-phrygian-303',
    name: 'Dark Phrygian Acid Scream',
    category: 'Acid',
    author: 'Berlin Underground Acid',
    createdAt: 1710000001000,
    description: 'Aggressive hollow square-wave acid line in C Phrygian with extreme filter envelope mod and biting diode drive.',
    baseCutoffCC: 72,
    baseResonanceCC: 98,
    baseEnvModCC: 110,
    baseDecayCC: 44,
    baseAccentCC: 118,
    baseDriveCC: 75,
    waveform: 'square',
    morphAmount: -15,
    morphType: 'diode_ladder',
    morphResonance: 12.5,
    dspCharacterMode: 'neural_chaos',
    electronFlux: 75,
    specs: {
      vMax: 1.0,
      gMax: 105e-6,
      gMin: 1e-6,
      temperatureKelvin: 330,
      thermalNoiseStd: 6.5e-8,
      conductanceDriftStd: 0.04,
      tiaGainRf: 32000,
      adcBits: 8,
    },
    bpm: 140,
    scale: 'c_phrygian',
    pattern: FACTORY_PATTERNS[1]?.steps || [],
  },
  {
    id: 'acid-goa-psy-blues',
    name: 'Psy-Acid 303 Resonance Ride',
    category: 'Acid',
    author: 'Goa 303 Sound',
    createdAt: 1710000002000,
    description: 'Hypnotic psy-acid squelch with blues flatted fifth notes, singing formant morph and Poisson shot noise sizzle.',
    baseCutoffCC: 60,
    baseResonanceCC: 112,
    baseEnvModCC: 105,
    baseDecayCC: 48,
    baseAccentCC: 115,
    baseDriveCC: 62,
    waveform: 'sawtooth',
    morphAmount: 38,
    morphType: 'formant_vocal',
    morphResonance: 15.0,
    dspCharacterMode: 'neural_chaos',
    electronFlux: 82,
    specs: {
      vMax: 1.0,
      gMax: 110e-6,
      gMin: 1e-6,
      temperatureKelvin: 345,
      thermalNoiseStd: 7e-8,
      conductanceDriftStd: 0.05,
      tiaGainRf: 29000,
      adcBits: 8,
    },
    bpm: 144,
    scale: 'c_acid_blues',
    pattern: FACTORY_PATTERNS[2]?.steps || [],
  },

  // ==========================================
  // 2. TRIBCORE PRESETS (180 - 190 BPM)
  // High-speed, French Tribcore, relentless rolling basslines
  // ==========================================
  {
    id: 'tribcore-mental-185',
    name: 'Tribcore Mental Speed 185',
    category: 'Tribcore',
    author: 'French Tribcore Unit',
    createdAt: 1710000003000,
    description: '185 BPM rapid-fire rolling mental tribcore kick-riff with industrial diode overdrive, snappy decay and frantic 16th slides.',
    baseCutoffCC: 58,
    baseResonanceCC: 85,
    baseEnvModCC: 95,
    baseDecayCC: 26,
    baseAccentCC: 127,
    baseDriveCC: 98,
    waveform: 'sawtooth',
    morphAmount: -40,
    morphType: 'tr8s_dj',
    morphResonance: 9.0,
    dspCharacterMode: 'industrial_drive',
    electronFlux: 88,
    specs: {
      vMax: 1.0,
      gMax: 125e-6,
      gMin: 1e-6,
      temperatureKelvin: 380,
      thermalNoiseStd: 8.5e-8,
      conductanceDriftStd: 0.06,
      tiaGainRf: 42000,
      adcBits: 8,
    },
    bpm: 185,
    scale: 'c_minor_pentatonic',
    pattern: FACTORY_PATTERNS[3]?.steps || [],
  },
  {
    id: 'tribcore-floxy-french',
    name: 'French Tribcore Floxy Squelch',
    category: 'Tribcore',
    author: 'Floxy / Tribe 180',
    createdAt: 1710000004000,
    description: 'High-tempo Frenchcore / Tribcore square bass with heavy asymmetric diode saturation, punchy percussive attack and octave leaps.',
    baseCutoffCC: 64,
    baseResonanceCC: 90,
    baseEnvModCC: 100,
    baseDecayCC: 28,
    baseAccentCC: 125,
    baseDriveCC: 108,
    waveform: 'square',
    morphAmount: 18,
    morphType: 'diode_ladder',
    morphResonance: 11.0,
    dspCharacterMode: 'industrial_drive',
    electronFlux: 78,
    specs: {
      vMax: 1.0,
      gMax: 120e-6,
      gMin: 1e-6,
      temperatureKelvin: 360,
      thermalNoiseStd: 7.5e-8,
      conductanceDriftStd: 0.05,
      tiaGainRf: 45000,
      adcBits: 8,
    },
    bpm: 180,
    scale: 'c_phrygian',
    pattern: FACTORY_PATTERNS[4]?.steps || [],
  },
  {
    id: 'tribcore-spiral-190',
    name: 'Spiral 190 French Tekno-Tribe',
    category: 'Tribcore',
    author: 'Tekno-Tribe 23',
    createdAt: 1710000005000,
    description: 'Blistering 190 BPM acid-tribcore blast with maximum accent dynamics, extreme slide frequency glides and thermal memristor noise.',
    baseCutoffCC: 70,
    baseResonanceCC: 96,
    baseEnvModCC: 108,
    baseDecayCC: 24,
    baseAccentCC: 127,
    baseDriveCC: 115,
    waveform: 'sawtooth',
    morphAmount: -50,
    morphType: 'tr8s_dj',
    morphResonance: 10.5,
    dspCharacterMode: 'industrial_drive',
    electronFlux: 95,
    specs: {
      vMax: 1.0,
      gMax: 130e-6,
      gMin: 1e-6,
      temperatureKelvin: 405,
      thermalNoiseStd: 9.5e-8,
      conductanceDriftStd: 0.07,
      tiaGainRf: 48000,
      adcBits: 8,
    },
    bpm: 190,
    scale: 'c_acid_blues',
    pattern: FACTORY_PATTERNS[5]?.steps || [],
  },

  // ==========================================
  // 3. TEKNO / ACIDCORE / HARDTEK PRESETS (158 - 168 BPM)
  // Free party, soundsystem & acidcore rave
  // ==========================================
  {
    id: 'tekno-free-party-23',
    name: 'Free Tekno 23 Soundsystem',
    category: 'Tekno',
    author: 'Free Party Soundsystem',
    createdAt: 1710000006000,
    description: 'Raw underground soundsystem 162 BPM acid spiraling hook with dirty analog saturation, rich midrange presence and hypnotic glides.',
    baseCutoffCC: 65,
    baseResonanceCC: 88,
    baseEnvModCC: 92,
    baseDecayCC: 38,
    baseAccentCC: 120,
    baseDriveCC: 78,
    waveform: 'sawtooth',
    morphAmount: -25,
    morphType: 'tr8s_dj',
    morphResonance: 8.5,
    dspCharacterMode: 'classic_303',
    electronFlux: 65,
    specs: {
      vMax: 1.0,
      gMax: 100e-6,
      gMin: 1e-6,
      temperatureKelvin: 310,
      thermalNoiseStd: 5e-8,
      conductanceDriftStd: 0.03,
      tiaGainRf: 30000,
      adcBits: 8,
    },
    bpm: 162,
    scale: 'c_minor_pentatonic',
    pattern: FACTORY_PATTERNS[6]?.steps || [],
  },
  {
    id: 'tekno-acidcore-165',
    name: 'Acidcore Rave Mayhem 165',
    category: 'Tekno',
    author: 'Acidcore Collective',
    createdAt: 1710000007000,
    description: '165 BPM high-drive screaming acidcore line with high resonance spikes, rapid 16th slide bends and heavy diode distortion.',
    baseCutoffCC: 74,
    baseResonanceCC: 114,
    baseEnvModCC: 118,
    baseDecayCC: 32,
    baseAccentCC: 127,
    baseDriveCC: 112,
    waveform: 'square',
    morphAmount: 22,
    morphType: 'diode_ladder',
    morphResonance: 15.0,
    dspCharacterMode: 'industrial_drive',
    electronFlux: 90,
    specs: {
      vMax: 1.0,
      gMax: 120e-6,
      gMin: 1e-6,
      temperatureKelvin: 375,
      thermalNoiseStd: 8e-8,
      conductanceDriftStd: 0.06,
      tiaGainRf: 44000,
      adcBits: 8,
    },
    bpm: 165,
    scale: 'c_phrygian',
    pattern: FACTORY_PATTERNS[7]?.steps || [],
  },
  {
    id: 'tekno-hardtek-pump-168',
    name: 'Hardtek Pump 168 Bouncing Riff',
    category: 'Tekno',
    author: 'Hardtek Soundlab',
    createdAt: 1710000008000,
    description: '168 BPM bouncy syncopated hardtek bassline with punchy staccato notes, aggressive sub push and driving Dorian scale slides.',
    baseCutoffCC: 62,
    baseResonanceCC: 82,
    baseEnvModCC: 88,
    baseDecayCC: 30,
    baseAccentCC: 122,
    baseDriveCC: 84,
    waveform: 'sawtooth',
    morphAmount: -35,
    morphType: 'tr8s_dj',
    morphResonance: 7.5,
    dspCharacterMode: 'classic_303',
    electronFlux: 70,
    specs: {
      vMax: 1.0,
      gMax: 105e-6,
      gMin: 1e-6,
      temperatureKelvin: 325,
      thermalNoiseStd: 5.5e-8,
      conductanceDriftStd: 0.035,
      tiaGainRf: 34000,
      adcBits: 8,
    },
    bpm: 168,
    scale: 'c_dorian',
    pattern: FACTORY_PATTERNS[8]?.steps || [],
  },

  // ==========================================
  // 4. GABBA / HARDCORE PRESETS (185 - 190 BPM)
  // ==========================================
  {
    id: 'gabba-rotterdam-1993',
    name: 'Rotterdam 1993 Gabba Hoover',
    category: 'Gabba',
    author: 'Rotterdam Hardcore Posse',
    createdAt: 1710000010000,
    description: '185 BPM hollow biting square wave with extreme industrial drive, comb ring resonance, high-speed pitch flutter LFO and devastating offbeat gabba stomps.',
    baseCutoffCC: 88,
    baseResonanceCC: 110,
    baseEnvModCC: 115,
    baseDecayCC: 28,
    baseAccentCC: 127,
    baseDriveCC: 114,
    waveform: 'square',
    morphAmount: 40,
    morphType: 'comb_resonator',
    morphResonance: 15.0,
    pitchLfoEnabled: true,
    pitchLfoRate: 6.8,
    pitchLfoDepth: 45,
    dspCharacterMode: 'industrial_drive',
    electronFlux: 85,
    specs: {
      vMax: 1.0,
      gMax: 110e-6,
      gMin: 1e-6,
      temperatureKelvin: 380,
      thermalNoiseStd: 9e-8,
      conductanceDriftStd: 0.07,
      tiaGainRf: 48000,
      adcBits: 8,
    },
    bpm: 185,
    scale: 'c_minor_pentatonic',
    pattern: FACTORY_PATTERNS[9]?.steps || [],
  },
  {
    id: 'gabba-thunderdome-terror',
    name: 'Thunderdome Terror Screech',
    category: 'Gabba',
    author: 'Thunderdome Terror Division',
    createdAt: 1710000011000,
    description: '190 BPM razor-sharp sawtooth wave pushed to the absolute edge with 24dB screaming diode self-oscillation, high-rate pitch tremolo and dark Phrygian hook.',
    baseCutoffCC: 95,
    baseResonanceCC: 122,
    baseEnvModCC: 124,
    baseDecayCC: 24,
    baseAccentCC: 127,
    baseDriveCC: 122,
    waveform: 'sawtooth',
    morphAmount: 60,
    morphType: 'diode_ladder',
    morphResonance: 20.0,
    pitchLfoEnabled: true,
    pitchLfoRate: 8.5,
    pitchLfoDepth: 40,
    dspCharacterMode: 'industrial_drive',
    electronFlux: 95,
    specs: {
      vMax: 1.0,
      gMax: 120e-6,
      gMin: 1e-6,
      temperatureKelvin: 410,
      thermalNoiseStd: 1.2e-7,
      conductanceDriftStd: 0.09,
      tiaGainRf: 52000,
      adcBits: 8,
    },
    bpm: 190,
    scale: 'c_phrygian',
    pattern: FACTORY_PATTERNS[10]?.steps || [],
  },

  // ==========================================
  // 5. ELECTRO / DETROIT 808 PRESETS (128 - 132 BPM)
  // ==========================================
  {
    id: 'electro-drexciya-wave',
    name: 'Drexciyan Hydro-Space Bass',
    category: 'Electro',
    author: 'Sub-Aquatic Research Lab',
    createdAt: 1710000012000,
    description: '128 BPM deep Detroit electro bass with vocal formant morphing, sub-oscillator weight, slow hypnotic 1.8 Hz pitch drift and syncopated 808-style funk groove.',
    baseCutoffCC: 62,
    baseResonanceCC: 82,
    baseEnvModCC: 90,
    baseDecayCC: 42,
    baseAccentCC: 105,
    baseDriveCC: 48,
    waveform: 'square',
    morphAmount: 25,
    morphType: 'formant_vocal',
    morphResonance: 8.0,
    pitchLfoEnabled: true,
    pitchLfoRate: 1.8,
    pitchLfoDepth: 55,
    dspCharacterMode: 'classic_303',
    electronFlux: 50,
    specs: {
      vMax: 1.0,
      gMax: 95e-6,
      gMin: 1e-6,
      temperatureKelvin: 295,
      thermalNoiseStd: 3.5e-8,
      conductanceDriftStd: 0.02,
      tiaGainRf: 22000,
      adcBits: 8,
    },
    bpm: 128,
    scale: 'c_minor_pentatonic',
    pattern: FACTORY_PATTERNS[11]?.steps || [],
  },
  {
    id: 'electro-detroit-robot',
    name: 'Detroit Cybernetic 808 Funk',
    category: 'Electro',
    author: 'Kraft-Techno Systems',
    createdAt: 1710000013000,
    description: '132 BPM punchy Kraftwerk & Cybotron inspired mechanical electro line. Tight snappy envelope decay, warm transistor drive and precise robot octave bounces.',
    baseCutoffCC: 70,
    baseResonanceCC: 76,
    baseEnvModCC: 86,
    baseDecayCC: 36,
    baseAccentCC: 115,
    baseDriveCC: 52,
    waveform: 'sawtooth',
    morphAmount: -15,
    morphType: 'tr8s_dj',
    morphResonance: 6.0,
    pitchLfoEnabled: true,
    pitchLfoRate: 3.2,
    pitchLfoDepth: 28,
    dspCharacterMode: 'classic_303',
    electronFlux: 55,
    specs: {
      vMax: 1.0,
      gMax: 100e-6,
      gMin: 1e-6,
      temperatureKelvin: 300,
      thermalNoiseStd: 4e-8,
      conductanceDriftStd: 0.025,
      tiaGainRf: 24000,
      adcBits: 8,
    },
    bpm: 132,
    scale: 'c_minor_pentatonic',
    pattern: FACTORY_PATTERNS[12]?.steps || [],
  },
];

export class PresetManager {
  /**
   * Loads all presets (Factory + saved User presets from localStorage)
   */
  public static getAllPresets(): SynthPreset[] {
    const userPresets = this.getUserPresets();
    return [...FACTORY_PRESETS, ...userPresets];
  }

  public static getUserPresets(): SynthPreset[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error loading presets from localStorage:', e);
      return [];
    }
  }

  /**
   * Saves a new or existing preset to localStorage
   */
  public static savePreset(preset: SynthPreset): boolean {
    try {
      const userPresets = this.getUserPresets();
      const existingIdx = userPresets.findIndex((p) => p.id === preset.id);

      if (existingIdx >= 0) {
        userPresets[existingIdx] = preset;
      } else {
        userPresets.unshift(preset);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets));
      return true;
    } catch (e) {
      console.error('Error saving preset:', e);
      return false;
    }
  }

  /**
   * Deletes a user preset
   */
  public static deletePreset(presetId: string): boolean {
    try {
      const userPresets = this.getUserPresets().filter((p) => p.id !== presetId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets));
      return true;
    } catch (e) {
      console.error('Error deleting preset:', e);
      return false;
    }
  }

  /**
   * Exports a preset or entire bank to a downloadable .json file
   */
  public static exportToFile(data: SynthPreset | SynthPreset[], fileName: string) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Parses uploaded JSON file content
   */
  public static parsePresetJson(jsonString: string): SynthPreset[] {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
      return [parsed as SynthPreset];
    }
    throw new Error('Invalid Neural TB-303 Preset JSON structure.');
  }
}
