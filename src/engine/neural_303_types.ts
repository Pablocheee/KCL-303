/**
 * Neural TB-303 Data Types & Physical-to-MIDI Mapping Constants
 */

export type ScaleName = 'c_minor_pentatonic' | 'c_phrygian' | 'c_dorian' | 'c_acid_blues';

export const SCALES: Record<ScaleName, { name: string; notes: number[] }> = {
  // C1 (36) to C3 (60) - 2 Octaves
  c_minor_pentatonic: {
    name: 'C Minor Pentatonic',
    notes: [36, 39, 41, 43, 46, 48, 51, 53, 55, 58, 60],
  },
  c_phrygian: {
    name: 'C Phrygian (Dark Acid)',
    notes: [36, 37, 40, 41, 43, 44, 46, 48, 49, 52, 53, 55, 56, 58, 60],
  },
  c_dorian: {
    name: 'C Dorian (Classic Acid)',
    notes: [36, 38, 39, 41, 43, 45, 46, 48, 50, 51, 53, 55, 57, 58, 60],
  },
  c_acid_blues: {
    name: 'C Acid Blues',
    notes: [36, 39, 41, 42, 43, 46, 48, 51, 53, 54, 55, 58, 60],
  },
};

/**
 * Standard MIDI Continuous Controller (CC) Mappings for TB-303 / Acid Synths
 */
export const MIDI_CC = {
  FILTER_CUTOFF: 74,     // CC 74: Standard Sound Controller 5 (Brightness / Cutoff)
  FILTER_RESONANCE: 71,   // CC 71: Standard Sound Controller 2 (Harmonic Content / Q)
  ENVELOPE_DECAY: 75,     // CC 75: Standard Sound Controller 6 (Decay Time)
  OVERDRIVE_DISTORTION: 94, // CC 94: Standard Effect 4 Depth (Overdrive / Drive)
  LAYER_DEPTH_LFO: 76,    // CC 76: Standard Sound Controller 7 (LFO Rate / Vibrato Depth)
  ACCENT_AMOUNT: 73,      // CC 73: Attack / Accent Level
  ALL_SOUND_OFF: 120,
  ALL_NOTES_OFF: 123,
} as const;

export interface PhysicalTelemetryData {
  entropy: number;             // Shannon entropy H(X) in bits (e.g. 0.2 - 4.5)
  thermalNoiseAmperes: number; // Absolute thermal noise current |i_noise| (e.g. 10 nA - 500 nA)
  totalCurrentAmperes: number; // Sum of absolute bitline currents ∑|I| (e.g. 0.5 mA - 12 mA)
  layerIndex: number;          // Current active layer (e.g. 1..N)
  totalLayers: number;         // Total depth (e.g. 4)
  powerMilliwatts: number;     // Total Joule heating power (P = V * I)
}

export interface PhysicalMidiCcState {
  resonanceCC71: number;       // 0..127 (From Token Entropy)
  decayCC75: number;           // 0..127 (From Thermal Noise)
  distortionCC94: number;      // 0..127 (From Total Current / Power)
  depthLfoCC76: number;        // 0..127 (From Layer Depth)
  cutoffCC74: number;          // 0..127 (From Primary Bitline Current)
}

export interface TB303StepData {
  stepIndex: number;           // 0..15
  gate: boolean;               // Active trigger vs Rest
  tie: boolean;                // Extend previous note
  note: number;                // MIDI Note Number (36..60)
  noteName: string;            // e.g. "C1", "D#1", "F1"
  velocity: number;            // 127 (Accent) vs 80 (Standard)
  accent: boolean;             // High activation spike
  slide: boolean;              // Legato glide to next note
  octaveUp: boolean;           // Octave transposition
  rawActivation: number;       // Neuron activation level
  telemetry?: PhysicalTelemetryData;
  ccState?: PhysicalMidiCcState;
}

export interface SequencerConfig {
  bpm: number;                 // e.g. 130 BPM
  scale: ScaleName;            // Scale quantization
  channel: number;             // MIDI Channel (1..16, default 1)
  gateThreshold: number;       // Activation required for Note On (e.g. 0.30)
  accentThreshold: number;     // Activation required for Accent (e.g. 0.72)
  slideThreshold: number;      // Activation required for Slide (e.g. 0.65)
  gateLengthRatio: number;     // Note gate length (e.g. 0.55 = 55% of 16th note)
  portName?: string;           // Virtual MIDI port name (default: "Neural_303")
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

/**
 * Calculates Shannon Entropy H(X) = -sum(p * log2(p)) from a probability distribution
 */
export function calculateShannonEntropy(probs: Float32Array | number[]): number {
  let entropy = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (p > 1e-9) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Maps physical telemetry metrics to continuous 0-127 MIDI CC values
 */
export function mapTelemetryToMidiCc(telemetry: PhysicalTelemetryData): PhysicalMidiCcState {
  // 1. Token Entropy -> Filter Resonance (CC 71)
  // Max entropy for typical vocab/top-k is ~4.0 bits.
  // High uncertainty = screaming, high resonance. Low uncertainty = tight, subtle resonance.
  const normEntropy = Math.max(0, Math.min(1.0, telemetry.entropy / 4.0));
  const resonanceCC71 = Math.round(20 + normEntropy * 107); // Range 20..127

  // 2. Thermal Noise / Drift -> Envelope Decay (CC 75)
  // Typical noise standard deviation ranges from 10 nA to 400 nA.
  const normNoise = Math.max(0, Math.min(1.0, (telemetry.thermalNoiseAmperes * 1e9) / 400.0));
  const decayCC75 = Math.round(15 + normNoise * 112); // Range 15..127 (splashy vs tight)

  // 3. Total Layer Current / Power -> Overdrive / Distortion (CC 94)
  // Typical total current sum ranges from 0.5 mA to 8.0 mA.
  const normCurrent = Math.max(0, Math.min(1.0, (telemetry.totalCurrentAmperes * 1e3) / 8.0));
  const distortionCC94 = Math.round(normCurrent * 127); // Range 0..127

  // 4. Layer Depth -> LFO Rate / Sub-Octave Shift (CC 76)
  // Maps 1..N layers linearly across MIDI range.
  const normDepth = Math.max(0, Math.min(1.0, (telemetry.layerIndex - 1) / Math.max(1, telemetry.totalLayers - 1)));
  const depthLfoCC76 = Math.round(normDepth * 127); // Range 0..127

  // 5. Cutoff (CC 74) based on power / activation density
  const cutoffCC74 = Math.round(30 + (1.0 - normEntropy * 0.4) * 97);

  return {
    resonanceCC71,
    decayCC75,
    distortionCC94,
    depthLfoCC76,
    cutoffCC74,
  };
}

/**
 * Generates a 16/32-step Acid Pattern and physical sound patch directly
 * from text prompt tokens, character bytes, and simulated electron flux.
 * 100% Pure TypeScript - Safe for both Browser and Node.js.
 */
export function generatePatternFromNeuromorphicPrompt(
  prompt: string,
  scaleName: ScaleName = 'c_minor_pentatonic',
  stepCount: number = 32,
  temperature: number = 0.7
): {
  steps: TB303StepData[];
  suggestedCutoffCC: number;
  suggestedResonanceCC: number;
  suggestedDecayCC: number;
  suggestedEnvModCC: number;
  suggestedAccentCC: number;
  suggestedDriveCC: number;
  suggestedMorphType: 'tr8s_dj' | 'formant_vocal' | 'comb_resonator' | 'diode_ladder';
  suggestedMorphAmount: number;
  suggestedElectronFlux: number;
  telemetryLog: string[];
} {
  const cleanPrompt = prompt.trim() || 'Acid 303';
  const scaleNotes = SCALES[scaleName]?.notes || SCALES.c_minor_pentatonic.notes;

  // Convert prompt characters to byte values and hash seeds
  const bytes: number[] = [];
  for (let i = 0; i < cleanPrompt.length; i++) {
    bytes.push(cleanPrompt.charCodeAt(i));
  }

  // Calculate prompt electron characteristics
  let charSum = 0;
  let vowelCount = 0;
  let consonantCount = 0;
  let uppercaseCount = 0;

  for (let i = 0; i < cleanPrompt.length; i++) {
    const ch = cleanPrompt[i].toLowerCase();
    charSum += cleanPrompt.charCodeAt(i);
    if ('aeiouyаеёиоуыэюя'.includes(ch)) vowelCount++;
    else if (/[a-zа-я]/i.test(ch)) consonantCount++;
    if (/[A-ZА-Я]/.test(cleanPrompt[i])) uppercaseCount++;
  }

  // Determine physical synthesis parameters based on prompt electron signature
  const entropy = Math.min(4.5, 1.2 + (charSum % 100) / 30);
  const suggestedCutoffCC = Math.min(115, Math.max(45, 50 + (charSum % 65)));
  const suggestedResonanceCC = Math.min(105, Math.max(48, 55 + (vowelCount * 7) % 50));
  const suggestedDecayCC = Math.min(85, Math.max(30, 40 + (consonantCount * 5) % 45));
  const suggestedEnvModCC = Math.min(110, Math.max(50, 65 + (uppercaseCount * 8) % 45));
  const suggestedAccentCC = Math.min(115, Math.max(60, 75 + (cleanPrompt.length * 4) % 40));
  const suggestedDriveCC = Math.min(90, Math.max(25, 30 + (charSum % 55)));

  // Morph filter type selection
  const lower = cleanPrompt.toLowerCase();
  let suggestedMorphType: 'tr8s_dj' | 'formant_vocal' | 'comb_resonator' | 'diode_ladder' = 'tr8s_dj';
  if (lower.includes('vocal') || lower.includes('voice') || vowelCount > 3) {
    suggestedMorphType = 'formant_vocal';
  } else if (lower.includes('comb') || lower.includes('ring') || lower.includes('space')) {
    suggestedMorphType = 'comb_resonator';
  } else if (lower.includes('acid') || lower.includes('squelch') || lower.includes('diode')) {
    suggestedMorphType = 'diode_ladder';
  }

  const polarity = (vowelCount - consonantCount);
  const suggestedMorphAmount = Math.max(-100, Math.min(100, polarity * 15));
  const suggestedElectronFlux = Math.min(95, Math.max(35, 45 + (charSum % 45)));

  // Build the 16/32 steps
  const steps: TB303StepData[] = [];
  for (let s = 0; s < stepCount; s++) {
    // Generate pseudo-random deterministic neuron activations from prompt bytes + step index
    const byteIdx = s % bytes.length;
    const byteVal = bytes[byteIdx];
    const pseudoSeed = Math.sin(s * 12.9898 + byteVal * 78.233 + temperature * 43.12) * 43758.5453;
    const normActivation = Math.abs(pseudoSeed - Math.floor(pseudoSeed));

    // Note Selection from Scale
    const pitchSeed = (byteVal + s * 3 + Math.floor(normActivation * 100)) % scaleNotes.length;
    let note = scaleNotes[pitchSeed];

    // Octave modulation: higher steps or uppercase
    const octaveUp = (s % 8 === 2 || s % 8 === 6 || (byteVal > 90 && s % 4 === 1)) && note + 12 <= 72;
    if (octaveUp) {
      note += 12;
    }

    // Gate: ~75% density for driving acid grooves
    const isGate = (s % 4 === 0) || normActivation > (0.28 / Math.max(0.5, temperature));
    const isTie = isGate && s > 0 && normActivation < 0.38;

    // Accent: ~25% on syncopated steps
    const isAccent = isGate && ((s % 4 === 0 && s % 8 !== 0) || normActivation > 0.72);
    const velocity = isAccent ? 127 : 85;

    // Slide: ~20% on consecutive notes
    const isSlide = isGate && !isTie && (normActivation > 0.65 || (s > 0 && steps[s - 1]?.accent));

    // Telemetry packet
    const stepTelemetry: PhysicalTelemetryData = {
      entropy: entropy + (normActivation * 0.5),
      thermalNoiseAmperes: (80 + normActivation * 60) * 1e-9,
      totalCurrentAmperes: (2.5 + normActivation * 2.0) * 1e-3,
      layerIndex: (s % 4) + 1,
      totalLayers: 4,
      powerMilliwatts: 3.0 + normActivation * 2.5,
    };

    const ccState = mapTelemetryToMidiCc(stepTelemetry);

    steps.push({
      stepIndex: s,
      gate: isGate,
      tie: isTie,
      note,
      noteName: midiToNoteName(note),
      velocity,
      accent: isAccent,
      slide: isSlide,
      octaveUp,
      rawActivation: normActivation,
      telemetry: stepTelemetry,
      ccState,
    });
  }

  const telemetryLog = [
    `[NEUROMORPHIC PROMPT] "${cleanPrompt}"`,
    `[ELECTRON SIGNATURE] Entropy: ${entropy.toFixed(2)} | Flux: ${suggestedElectronFlux}%`,
    `[PHYSICAL FILTER] Cutoff CC74: ${suggestedCutoffCC} | Res CC71: ${suggestedResonanceCC} | Morph: ${suggestedMorphType}`,
    `[32-STEP ACID PATTERN] ${steps.filter(s => s.gate).length} gates, ${steps.filter(s => s.accent).length} accents, ${steps.filter(s => s.slide).length} slides generated.`,
  ];

  return {
    steps,
    suggestedCutoffCC,
    suggestedResonanceCC,
    suggestedDecayCC,
    suggestedEnvModCC,
    suggestedAccentCC,
    suggestedDriveCC,
    suggestedMorphType,
    suggestedMorphAmount,
    suggestedElectronFlux,
    telemetryLog,
  };
}
