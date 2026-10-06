/**
 * Neural TB-303 MIDI Sequencer Engine (src/engine/neural_303.ts)
 * 
 * Bridges 1-bit neural network activations & analog crossbar telemetry
 * to a TB-303 virtual MIDI stream with continuous parameter modulation.
 * 
 * Real-time Physical CC Mappings:
 *  1. Token Entropy (Model Uncertainty) -> Filter Resonance (CC 71)
 *  2. Thermal Noise / Electron Drift -> Envelope Decay (CC 75)
 *  3. Total Layer Current (Joule Power) -> Overdrive / Distortion (CC 94)
 *  4. Layer Depth (1..N) -> LFO Rate / Depth Morphing (CC 76)
 */

import {
  ScaleName,
  SCALES,
  MIDI_CC,
  PhysicalTelemetryData,
  PhysicalMidiCcState,
  TB303StepData,
  SequencerConfig,
  midiToNoteName,
  mapTelemetryToMidiCc,
} from './neural_303_types';

export * from './neural_303_types';

export class NeuralTB303Sequencer {
  private midiOutput: any = null;
  private isRunning: boolean = false;
  private clockTimer: NodeJS.Timeout | null = null;
  private currentStep: number = 0;
  private activeNotes: Set<number> = new Set();
  private pendingNoteOffTimers: NodeJS.Timeout[] = [];
  private lastTriggeredNote: number | null = null;
  private config: SequencerConfig;
  private onStepCallback?: (step: TB303StepData) => void;

  constructor(config: Partial<SequencerConfig> = {}) {
    this.config = {
      bpm: config.bpm ?? 130,
      scale: config.scale ?? 'c_minor_pentatonic',
      channel: config.channel ?? 1,
      gateThreshold: config.gateThreshold ?? 0.30,
      accentThreshold: config.accentThreshold ?? 0.72,
      slideThreshold: config.slideThreshold ?? 0.65,
      gateLengthRatio: config.gateLengthRatio ?? 0.55,
      portName: config.portName ?? 'Neural_303',
    };

    this.initMidi();
  }

  private async initMidi() {
    if (typeof window !== 'undefined') return; // Do not run node MIDI in browser
    try {
      const em = await import('easymidi');
      const EasyMidiOutput = em.default?.Output || (em as any).Output;
      if (EasyMidiOutput) {
        this.midiOutput = new EasyMidiOutput(this.config.portName!, true);
        console.log(`🎛️  Virtual MIDI Output created: "${this.config.portName}"`);
      }
    } catch (e: any) {
      console.warn(`⚠️ Could not create virtual MIDI output: ${e.message}`);
    }
  }

  public setStepCallback(cb: (step: TB303StepData) => void) {
    this.onStepCallback = cb;
  }

  public updateConfig(newConfig: Partial<SequencerConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.isRunning) {
      this.restartClock();
    }
  }

  /**
   * Dispatches continuous MIDI CC telemetry packets to the 303 VST / DAW
   */
  public sendTelemetryCc(ccState: PhysicalMidiCcState) {
    if (!this.midiOutput) return;
    const midiChannel = (this.config.channel - 1) & 0x0F;

    // 1. Filter Resonance (CC 71) from Token Entropy
    this.midiOutput.send('cc', {
      controller: MIDI_CC.FILTER_RESONANCE,
      value: ccState.resonanceCC71,
      channel: midiChannel,
    });

    // 2. Envelope Decay Time (CC 75) from Johnson-Nyquist Thermal Noise
    this.midiOutput.send('cc', {
      controller: MIDI_CC.ENVELOPE_DECAY,
      value: ccState.decayCC75,
      channel: midiChannel,
    });

    // 3. Overdrive / Saturation (CC 94) from Total Matrix Current
    this.midiOutput.send('cc', {
      controller: MIDI_CC.OVERDRIVE_DISTORTION,
      value: ccState.distortionCC94,
      channel: midiChannel,
    });

    // 4. LFO / Sub-Oscillator Depth (CC 76) from Layer Depth
    this.midiOutput.send('cc', {
      controller: MIDI_CC.LAYER_DEPTH_LFO,
      value: ccState.depthLfoCC76,
      channel: midiChannel,
    });

    // 5. Cutoff Frequency (CC 74)
    this.midiOutput.send('cc', {
      controller: MIDI_CC.FILTER_CUTOFF,
      value: ccState.cutoffCC74,
      channel: midiChannel,
    });
  }

  /**
   * Maps Neural Activation Array + Physical Telemetry -> Full 303 Step
   */
  public mapActivationsTo303Step(
    activations: number[] | Float32Array,
    stepIdx: number,
    telemetry?: PhysicalTelemetryData
  ): TB303StepData {
    const len = activations.length;
    if (len === 0) {
      return {
        stepIndex: stepIdx,
        gate: false,
        tie: false,
        note: 36,
        noteName: 'C1',
        velocity: 80,
        accent: false,
        slide: false,
        octaveUp: false,
        rawActivation: 0,
      };
    }

    const gateNeuron = Math.abs(activations[stepIdx % len]);
    const pitchNeuron = Math.abs(activations[(stepIdx * 3 + 1) % len]);
    const accentNeuron = Math.abs(activations[(stepIdx * 5 + 2) % len]);
    const slideNeuron = Math.abs(activations[(stepIdx * 7 + 3) % len]);
    const octaveNeuron = Math.abs(activations[(stepIdx * 2 + 4) % len]);

    const isGate = gateNeuron > this.config.gateThreshold;
    const isTie = isGate && gateNeuron < (this.config.gateThreshold + 0.12) && stepIdx > 0;

    const scaleNotes = SCALES[this.config.scale].notes;
    const normPitch = Math.min(0.999, pitchNeuron % 1.0);
    const scaleIndex = Math.floor(normPitch * scaleNotes.length);
    let note = scaleNotes[scaleIndex];

    const octaveUp = octaveNeuron > 0.70;
    if (octaveUp && note + 12 <= 72) {
      note += 12;
    }

    const isAccent = accentNeuron > this.config.accentThreshold;
    const velocity = isAccent ? 127 : 80;
    const isSlide = slideNeuron > this.config.slideThreshold;

    const ccState = telemetry ? mapTelemetryToMidiCc(telemetry) : undefined;

    return {
      stepIndex: stepIdx,
      gate: isGate,
      tie: isTie,
      note,
      noteName: midiToNoteName(note),
      velocity,
      accent: isAccent,
      slide: isSlide,
      octaveUp,
      rawActivation: gateNeuron,
      telemetry,
      ccState,
    };
  }

  /**
   * Note Lifecycle Execution + Continuous MIDI CC modulation
   */
  public execute303Step(stepData: TB303StepData, stepDurationMs: number, prevStepSlide: boolean) {
    if (!this.midiOutput) return;

    const midiChannel = (this.config.channel - 1) & 0x0F;

    // Send continuous physical CC modulation before/with note onset
    if (stepData.ccState) {
      this.sendTelemetryCc(stepData.ccState);
    }

    if (stepData.gate) {
      // 1. If previous step had SLIDE, send Note-On FIRST (overlapping note creates legato portamento)
      this.midiOutput.send('noteon', {
        note: stepData.note,
        velocity: stepData.velocity,
        channel: midiChannel,
      });
      this.activeNotes.add(stepData.note);

      // Clean up previous note if we are transitioning in slide mode
      if (prevStepSlide && this.lastTriggeredNote !== null && this.lastTriggeredNote !== stepData.note) {
        const prevNote = this.lastTriggeredNote;
        setTimeout(() => {
          this.midiOutput?.send('noteoff', {
            note: prevNote,
            velocity: 0,
            channel: midiChannel,
          });
          this.activeNotes.delete(prevNote);
        }, 15);
      }

      this.lastTriggeredNote = stepData.note;

      // 2. Schedule Note-Off
      if (!stepData.slide) {
        const gateDuration = stepDurationMs * this.config.gateLengthRatio;
        const offTimer = setTimeout(() => {
          if (this.activeNotes.has(stepData.note)) {
            this.midiOutput?.send('noteoff', {
              note: stepData.note,
              velocity: 0,
              channel: midiChannel,
            });
            this.activeNotes.delete(stepData.note);
          }
        }, gateDuration);

        this.pendingNoteOffTimers.push(offTimer);
      }
    } else {
      this.killAllNotes();
      this.lastTriggeredNote = null;
    }
  }

  public start(getNeuralData: () => { activations: number[] | Float32Array; telemetry?: PhysicalTelemetryData }) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.currentStep = 0;
    this.restartClock(getNeuralData);
    console.log(`▶ Neural TB-303 Sequencer running at ${this.config.bpm} BPM with Physical CC Modulations...`);
  }

  private restartClock(getNeuralData?: () => { activations: number[] | Float32Array; telemetry?: PhysicalTelemetryData }) {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }

    const stepDurationMs = (60000 / this.config.bpm) / 4;
    let prevSlide = false;

    const tick = () => {
      if (!this.isRunning) return;

      const data = getNeuralData ? getNeuralData() : { activations: [] };
      const stepData = this.mapActivationsTo303Step(data.activations, this.currentStep, data.telemetry);

      this.execute303Step(stepData, stepDurationMs, prevSlide);
      prevSlide = stepData.slide;

      if (this.onStepCallback) {
        this.onStepCallback(stepData);
      }

      this.currentStep = (this.currentStep + 1) % 16;
    };

    tick();
    this.clockTimer = setInterval(tick, stepDurationMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    this.killAllNotes();
  }

  public killAllNotes() {
    if (!this.midiOutput) return;
    const midiChannel = (this.config.channel - 1) & 0x0F;

    this.pendingNoteOffTimers.forEach(t => clearTimeout(t));
    this.pendingNoteOffTimers = [];

    for (const note of this.activeNotes) {
      this.midiOutput.send('noteoff', { note, velocity: 0, channel: midiChannel });
    }
    this.activeNotes.clear();

    this.midiOutput.send('cc', { controller: MIDI_CC.ALL_SOUND_OFF, value: 0, channel: midiChannel });
    this.midiOutput.send('cc', { controller: MIDI_CC.ALL_NOTES_OFF, value: 0, channel: midiChannel });
  }

  public close() {
    this.stop();
    if (this.midiOutput) {
      this.midiOutput.close();
      this.midiOutput = null;
    }
  }
}

/**
 * Generates a 16/32-step Acid Pattern and physical sound patch directly
 * from text prompt tokens, character bytes, and simulated electron flux.
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
