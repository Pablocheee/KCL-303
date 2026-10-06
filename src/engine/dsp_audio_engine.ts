/**
 * High-Resolution Native Web Audio API Synthesizer (src/engine/dsp_audio_engine.ts)
 * 
 * Direct Physics-to-AudioParam 32-bit floating-point DSP synthesis chain:
 *  - Procedural Physical Electron Noise Stream (Shot Noise 2*q*I + Thermal 4*kB*T + 1/f Flicker)
 *  - Quantum Electron Transport Sound Modes:
 *      * 'quantum_shot' (Discrete Poisson electron packet crackle & micro-bursts)
 *      * 'thermal_boltzmann' (Kinetic thermal velocity drift & analog tape-like hiss)
 *      * 'flicker_filament' (Low-frequency 1/f oxide vacancy ion drift & RTS pops)
 *      * 'avalanche_breakdown' (High-energy quantum tunneling & diode breakdown fuzz)
 *      * 'bypass_clean' (Pure silicon crystal bypass for instant A/B evaluation)
 *  - Dedicated Electron Solo / Audition Monitor
 *  - VCF 24dB Diode Ladder with Electron Thermal Cutoff Jitter
 *  - TR-8S Style Bipolar Morph Filter Engine (LPF <-> Flat <-> HPF / Formant / Comb / Acid)
 *  - Ultra-Smooth Pre/Post Drive Matrix (Zero-Allocation, No GC stutter)
 *  - Sub-Oscillator & Master Gain
 */

import { TB303StepData, PhysicalTelemetryData } from './neural_303_types';

export type DSPCharacterMode = 'classic_303' | 'neural_chaos' | 'industrial_drive';
export type FilterMorphType = 'tr8s_dj' | 'formant_vocal' | 'comb_resonator' | 'diode_ladder';
export type ElectronMode =
  | 'quantum_shot'
  | 'thermal_boltzmann'
  | 'flicker_filament'
  | 'avalanche_breakdown'
  | 'bypass_clean';

export type SpatialRainMode = 'off' | 'pingpong' | 'drops' | 'spiral';

export class DSPAudioEngine {
  private ctx: AudioContext | null = null;
  public isLive = false;
  public characterMode: DSPCharacterMode = 'neural_chaos';
  public morphType: FilterMorphType = 'tr8s_dj';
  public electronMode: ElectronMode = 'thermal_boltzmann';
  public electronSolo = false;
  public spatialRainMode: SpatialRainMode = 'off';
  public currentPanValue = 0;

  // Persistent Mono Synth Voice Nodes
  private osc: OscillatorNode | null = null;
  private oscGain: GainNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;
  private stereoPanner: StereoPannerNode | null = null;
  private mainFilter: BiquadFilterNode | null = null;

  // Dedicated TR-8S Morph Filter Nodes (Bipolar LPF <-> Center Flat <-> HPF & Formant)
  private morphLPF: BiquadFilterNode | null = null;
  private morphHPF: BiquadFilterNode | null = null;
  private morphFormant: BiquadFilterNode | null = null;
  private morphGainLPF: GainNode | null = null;
  private morphGainHPF: GainNode | null = null;
  private morphGainDry: GainNode | null = null;
  private morphGainFormant: GainNode | null = null;

  // Zero-Lag Distortion Matrix (Static Curves + Fast Gain Modulation + Presence Stage)
  private preDriveGain: GainNode | null = null;
  private waveShaper: WaveShaperNode | null = null;
  private drivePresenceFilter: BiquadFilterNode | null = null;
  private postDriveGain: GainNode | null = null;
  private vcaGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Pre-allocated static distortion curves for zero-allocation performance
  private staticClassicCurve: Float32Array | null = null;
  private staticChaosCurve: Float32Array | null = null;
  private staticIndustrialCurve: Float32Array | null = null;

  // Dedicated Electron Noise & Physical Agitation Nodes
  private electronNoiseNode: AudioBufferSourceNode | null = null;
  private electronNoiseGain: GainNode | null = null;
  private electronFilter: BiquadFilterNode | null = null;
  private electronBuffer: AudioBuffer | null = null;
  private electronDirectGain: GainNode | null = null;

  // Dedicated Continuous Pitch LFO for Ultra-Smooth Gapless Bass Modulation
  private pitchLfoNode: OscillatorNode | null = null;
  private pitchLfoGain: GainNode | null = null;
  public pitchLfoEnabled = false;
  public pitchLfoRateHz = 3.5;
  public pitchLfoDepthCents = 70;

  // Synthesizer & Physical Electron Settings
  private waveform: 'sawtooth' | 'square' = 'sawtooth';
  private baseCutoffHz = 900;
  private baseResonanceQ = 12;
  private envModAmount = 0.75;
  private baseDecaySec = 0.25;
  private accentAmount = 0.85;
  private driveAmount = 0.35;
  private electronFluxAmount = 0.65; // 0..1
  private operatingTempKelvin = 300;
  private conductanceDrift = 0.03;
  private tiaGain = 20000;

  // TR-8S Morph Filter State (-1.0 to +1.0, 0 = Center Flat)
  private morphAmount = 0.0;
  private morphResonance = 6.0;
  private morphEnabled = true;

  // State Tracking
  private currentNoteFreq = 130.81;
  private isEnvelopeActive = false;

  constructor() {
    this.precomputeDistortionCurves();
  }

  /**
   * Precomputes rich harmonic saturation curves with preserved upper frequencies
   */
  private precomputeDistortionCurves() {
    const n = 1024;
    const classic = new Float32Array(n);
    const chaos = new Float32Array(n);
    const industrial = new Float32Array(n);

    for (let i = 0; i < n; ++i) {
      const x = (i * 2) / n - 1;

      // 1. Classic TB-303 Diode Saturation (Warm 2nd & 3rd order harmonics + bright top-end sparkle)
      const x_classic = x * 1.8;
      classic[i] = Math.tanh(x_classic) + 0.14 * Math.sin(Math.PI * x) * (1.0 - Math.abs(x) * 0.4);

      // 2. Neural Chaos Diode Overdrive (Screaming Acid, razor-sharp bite, rich harmonic overtones)
      const x_chaos = x > 0 ? Math.tanh(2.6 * x) : -0.88 * Math.tanh(2.0 * Math.abs(x));
      const harmonicExciter = 0.28 * Math.sin(Math.PI * 1.5 * x) * (1.0 - Math.abs(x) * 0.5);
      chaos[i] = Math.max(-1.0, Math.min(1.0, x_chaos + harmonicExciter));

      // 3. Industrial Hard Clipper / MOSFET Fuzz (Biting crunch & high-frequency edge)
      const x_ind = Math.tanh(3.2 * x) + 0.22 * Math.sin(Math.PI * 2.0 * x) * (1.0 - x * x);
      industrial[i] = Math.max(-1.0, Math.min(1.0, x_ind));
    }

    this.staticClassicCurve = classic;
    this.staticChaosCurve = chaos;
    this.staticIndustrialCurve = industrial;
  }

  /**
   * Initializes or resumes the AudioContext on user interaction
   */
  public async init(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtxClass();
      }

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      if (!this.osc || !this.mainFilter || !this.vcaGain) {
        this.buildAudioGraph();
      }

      this.isLive = true;
      this.setMasterMute(false);
      return true;
    } catch (e) {
      console.error('AudioContext init error:', e);
      return false;
    }
  }

  /**
   * Generates a realistic physical electron audio buffer containing:
   *  - Thermal Gaussian White Noise (Johnson-Nyquist)
   *  - 1/f Pink Flicker Noise (Oxide Vacancy Hopping)
   *  - Poisson Discrete Shot Noise (Electron Particle Discharges)
   */
  private createPhysicalElectronAudioBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      // Thermal Gaussian White Noise
      const u1 = Math.max(1e-9, Math.random());
      const u2 = Math.random();
      const thermalGaussian = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * 0.25;

      // 1/f Pink Flicker Noise
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pinkFlicker = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.07;
      b6 = white * 0.115926;

      // Poisson Shot Noise Pulses
      const shotPulse = Math.random() < 0.018 ? (Math.random() - 0.5) * 2.2 : 0;
      data[i] = Math.max(-1.0, Math.min(1.0, thermalGaussian + pinkFlicker + shotPulse));
    }

    return buffer;
  }

  /**
   * Constructs the full Web Audio graph with TR-8S Morph Synthesis Filter & Electron Transport
   */
  private buildAudioGraph() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Oscillators: Main VCO + Sub-Oscillator with Individual Gains
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    osc.type = this.waveform;
    osc.frequency.setValueAtTime(130.81, now); // C3
    oscGain.gain.setValueAtTime(1.0, now);

    subOsc.type = 'square';
    subOsc.frequency.setValueAtTime(65.41, now); // C2 (-1 octave)
    subGain.gain.setValueAtTime(0.28, now);

    // 1b. Dedicated Continuous Pitch LFO (Pure Gapless Sine Wave modulating Osc + SubOsc Detune)
    if (this.pitchLfoNode) {
      try {
        this.pitchLfoNode.stop();
        this.pitchLfoNode.disconnect();
      } catch {}
    }
    const pitchLfo = this.ctx.createOscillator();
    const pitchLfoGain = this.ctx.createGain();
    pitchLfo.type = 'sine';
    pitchLfo.frequency.setValueAtTime(this.pitchLfoRateHz, now);
    pitchLfoGain.gain.setValueAtTime(this.pitchLfoEnabled ? this.pitchLfoDepthCents : 0.0001, now);
    pitchLfo.connect(pitchLfoGain);
    pitchLfoGain.connect(osc.detune);
    pitchLfoGain.connect(subOsc.detune);
    pitchLfo.start(now);

    this.pitchLfoNode = pitchLfo;
    this.pitchLfoGain = pitchLfoGain;

    // 2. Physical Electron Noise Stream Generator
    this.electronBuffer = this.createPhysicalElectronAudioBuffer(this.ctx);
    const electronSource = this.ctx.createBufferSource();
    electronSource.buffer = this.electronBuffer;
    electronSource.loop = true;

    const electronFilter = this.ctx.createBiquadFilter();
    electronFilter.type = 'bandpass';
    electronFilter.frequency.setValueAtTime(1800, now);
    electronFilter.Q.setValueAtTime(1.5, now);

    // Injection gain into the main filter
    const electronGain = this.ctx.createGain();
    electronGain.gain.setValueAtTime(this.calculateElectronInjectionGain(), now);

    // Direct audition / solo gain
    const electronDirectGain = this.ctx.createGain();
    electronDirectGain.gain.setValueAtTime(0.0, now);

    electronSource.connect(electronFilter);
    electronFilter.connect(electronGain);
    electronFilter.connect(electronDirectGain);
    electronSource.start();

    this.electronNoiseNode = electronSource;
    this.electronFilter = electronFilter;
    this.electronNoiseGain = electronGain;
    this.electronDirectGain = electronDirectGain;

    // 3. Voltage Controlled Filter (VCF 24dB Main Diode Ladder)
    const mainFilter = this.ctx.createBiquadFilter();
    mainFilter.type = 'lowpass';
    mainFilter.frequency.setValueAtTime(this.baseCutoffHz, now);
    mainFilter.Q.setValueAtTime(this.baseResonanceQ, now);
    pitchLfoGain.connect(mainFilter.detune); // Injects rich synced LFO modulation to filter cutoff in cents!

    // 4. Dedicated TR-8S MORPH FILTER Parallel Structure
    const morphLPF = this.ctx.createBiquadFilter();
    morphLPF.type = 'lowpass';
    morphLPF.frequency.setValueAtTime(20000, now);
    morphLPF.Q.setValueAtTime(this.morphResonance, now);

    const morphHPF = this.ctx.createBiquadFilter();
    morphHPF.type = 'highpass';
    morphHPF.frequency.setValueAtTime(20, now);
    morphHPF.Q.setValueAtTime(this.morphResonance, now);

    const morphFormant = this.ctx.createBiquadFilter();
    morphFormant.type = 'peaking';
    morphFormant.frequency.setValueAtTime(1200, now);
    morphFormant.Q.setValueAtTime(8.0, now);
    morphFormant.gain.setValueAtTime(12.0, now);

    const morphGainLPF = this.ctx.createGain();
    const morphGainHPF = this.ctx.createGain();
    const morphGainDry = this.ctx.createGain();
    const morphGainFormant = this.ctx.createGain();

    morphGainLPF.gain.setValueAtTime(0.0, now);
    morphGainHPF.gain.setValueAtTime(0.0, now);
    morphGainDry.gain.setValueAtTime(1.0, now);
    morphGainFormant.gain.setValueAtTime(0.0, now);

    // 5. Morph Merger Node
    const morphMerger = this.ctx.createGain();
    morphMerger.gain.setValueAtTime(1.0, now);

    mainFilter.connect(morphGainDry);
    morphGainDry.connect(morphMerger);

    mainFilter.connect(morphLPF);
    morphLPF.connect(morphGainLPF);
    morphGainLPF.connect(morphMerger);

    mainFilter.connect(morphHPF);
    morphHPF.connect(morphGainHPF);
    morphGainHPF.connect(morphMerger);

    mainFilter.connect(morphFormant);
    morphFormant.connect(morphGainFormant);
    morphGainFormant.connect(morphMerger);

    // 6. Zero-Allocation Drive Stage (PreGain -> WaveShaper -> Presence Stage -> PostGain)
    const preDriveGain = this.ctx.createGain();
    const initialPreGain = 1.0 + this.driveAmount * 6.5;
    preDriveGain.gain.setValueAtTime(initialPreGain, now);

    const waveShaper = this.ctx.createWaveShaper();
    (waveShaper as any).curve = this.staticChaosCurve;
    waveShaper.oversample = '4x';

    // Presence & High-Frequency Acid Sizzle Filter (Ensures drive adds bright crunch instead of muffling)
    const drivePresenceFilter = this.ctx.createBiquadFilter();
    drivePresenceFilter.type = 'peaking';
    drivePresenceFilter.frequency.setValueAtTime(3400, now);
    drivePresenceFilter.Q.setValueAtTime(1.1, now);
    drivePresenceFilter.gain.setValueAtTime(this.driveAmount * 6.5, now);

    const postDriveGain = this.ctx.createGain();
    const initialPostGain = 1.0 / (1.0 + this.driveAmount * 0.35);
    postDriveGain.gain.setValueAtTime(initialPostGain, now);

    // 7. Voltage Controlled Amplifier (VCA Gain Envelope)
    const vcaGain = this.ctx.createGain();
    vcaGain.gain.setValueAtTime(0.00001, now);

    // 8. Master Output Gain
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.90, now);

    // Connect Complete Audio Chain:
    osc.connect(oscGain);
    oscGain.connect(mainFilter);

    subOsc.connect(subGain);
    subGain.connect(mainFilter);

    electronGain.connect(mainFilter);

    morphMerger.connect(preDriveGain);
    preDriveGain.connect(waveShaper);
    waveShaper.connect(drivePresenceFilter);
    drivePresenceFilter.connect(postDriveGain);
    postDriveGain.connect(vcaGain);

    // Direct electron audition signal joins the post-drive stage
    electronDirectGain.connect(vcaGain);

    // 7b. Spatial Rain Mirror Stereo Panner
    let stereoPanner: StereoPannerNode | null = null;
    if (this.ctx && typeof this.ctx.createStereoPanner === 'function') {
      stereoPanner = this.ctx.createStereoPanner();
      stereoPanner.pan.setValueAtTime(0, now);
      vcaGain.connect(stereoPanner);
      stereoPanner.connect(masterGain);
    } else {
      vcaGain.connect(masterGain);
    }

    masterGain.connect(this.ctx.destination);

    osc.start();
    subOsc.start();

    this.osc = osc;
    this.oscGain = oscGain;
    this.subOsc = subOsc;
    this.subGain = subGain;
    this.stereoPanner = stereoPanner;
    this.mainFilter = mainFilter;
    this.morphLPF = morphLPF;
    this.morphHPF = morphHPF;
    this.morphFormant = morphFormant;
    this.morphGainLPF = morphGainLPF;
    this.morphGainHPF = morphGainHPF;
    this.morphGainDry = morphGainDry;
    this.morphGainFormant = morphGainFormant;
    this.preDriveGain = preDriveGain;
    this.waveShaper = waveShaper;
    this.drivePresenceFilter = drivePresenceFilter;
    this.postDriveGain = postDriveGain;
    this.vcaGain = vcaGain;
    this.masterGain = masterGain;

    this.updateMorphFilterParams();
    this.applyElectronModeParams();
  }

  /**
   * Computes the electron noise level injected into the filter based on mode and flux
   */
  private calculateElectronInjectionGain(): number {
    if (this.electronMode === 'bypass_clean') return 0.0;
    const baseFlux = this.electronFluxAmount; // 0..1
    const tempMultiplier = Math.max(0.2, this.operatingTempKelvin / 300);

    let modeMultiplier = 0.28;
    if (this.electronMode === 'quantum_shot') modeMultiplier = 0.38;
    if (this.electronMode === 'thermal_boltzmann') modeMultiplier = 0.32;
    if (this.electronMode === 'flicker_filament') modeMultiplier = 0.40;
    if (this.electronMode === 'avalanche_breakdown') modeMultiplier = 0.65;

    return baseFlux * modeMultiplier * Math.sqrt(tempMultiplier);
  }

  /**
   * Sets the active Electron Mode and reshapes the physical audio parameters
   */
  public setElectronMode(mode: ElectronMode) {
    this.electronMode = mode;
    this.applyElectronModeParams();
  }

  /**
   * Toggles Solo / Audition mode for electrons
   */
  public setElectronSolo(solo: boolean) {
    this.electronSolo = solo;
    if (!this.ctx || !this.oscGain || !this.subGain || !this.electronDirectGain) return;
    const now = this.ctx.currentTime;
    const TC = 0.01;

    if (solo) {
      // Mute synth oscillators and route loud electron noise directly through VCA
      this.oscGain.gain.setTargetAtTime(0.0001, now, TC);
      this.subGain.gain.setTargetAtTime(0.0001, now, TC);
      this.electronDirectGain.gain.setTargetAtTime(0.75, now, TC);
    } else {
      this.oscGain.gain.setTargetAtTime(1.0, now, TC);
      const subLevel = this.characterMode === 'industrial_drive' ? 0.40 : this.characterMode === 'classic_303' ? 0.20 : 0.28;
      this.subGain.gain.setTargetAtTime(subLevel, now, TC);
      this.electronDirectGain.gain.setTargetAtTime(0.0, now, TC);
    }
  }

  /**
   * Applies the physical filtering and modulation curves specific to each Electron Mode
   */
  private applyElectronModeParams() {
    if (!this.ctx || !this.electronFilter || !this.electronNoiseGain) return;
    const now = this.ctx.currentTime;
    const TC = 0.008;

    const injectionGain = this.calculateElectronInjectionGain();
    this.electronNoiseGain.gain.setTargetAtTime(injectionGain, now, TC);

    switch (this.electronMode) {
      case 'quantum_shot':
        // Crisp high-frequency bandpass for discrete Poisson packet crackle
        this.electronFilter.type = 'bandpass';
        this.electronFilter.frequency.setTargetAtTime(4500, now, TC);
        this.electronFilter.Q.setTargetAtTime(3.8, now, TC);
        break;

      case 'thermal_boltzmann':
        // Warm wideband kinetic substrate noise
        this.electronFilter.type = 'bandpass';
        this.electronFilter.frequency.setTargetAtTime(1600, now, TC);
        this.electronFilter.Q.setTargetAtTime(1.2, now, TC);
        break;

      case 'flicker_filament':
        // Heavy low-frequency 1/f filament drift and oxide vacancy sub-rumble
        this.electronFilter.type = 'lowpass';
        this.electronFilter.frequency.setTargetAtTime(650, now, TC);
        this.electronFilter.Q.setTargetAtTime(2.2, now, TC);
        break;

      case 'avalanche_breakdown':
        // Wide high-energy bandpass pushing into saturation
        this.electronFilter.type = 'peaking';
        this.electronFilter.frequency.setTargetAtTime(2400, now, TC);
        this.electronFilter.Q.setTargetAtTime(2.8, now, TC);
        this.electronFilter.gain.setTargetAtTime(14.0, now, TC);
        break;

      case 'bypass_clean':
        // Silence noise
        this.electronNoiseGain.gain.setTargetAtTime(0.0, now, TC);
        break;
    }
  }

  /**
   * Updates physical parameters (Temp, TIA gain, memristor drift, flux) and reflects immediately in the sound
   */
  public updatePhysicalElectronParams(tempKelvin: number, tiaGainRf: number, driftStd: number, fluxAmount: number) {
    this.operatingTempKelvin = tempKelvin;
    this.tiaGain = tiaGainRf;
    this.conductanceDrift = driftStd;
    this.electronFluxAmount = fluxAmount;

    this.applyElectronModeParams();

    // If audio is running live, immediately update the audio filter and pitch response
    if (this.ctx && this.mainFilter && !this.isEnvelopeActive) {
      const now = this.ctx.currentTime;
      // Thermal temperature shifts filter baseline cutoff
      const tempCutoffShift = (tempKelvin - 300) * 2.8;
      const targetCutoff = Math.max(100, Math.min(12000, this.baseCutoffHz + tempCutoffShift));
      this.mainFilter.frequency.setTargetAtTime(targetCutoff, now, 0.01);
    }
  }

  /**
   * Sets the TR-8S Bipolar Morph Filter with instantaneous sample-accurate smoothing (5ms)
   */
  public setMorphFilter(amount: number, type: FilterMorphType = this.morphType, resonance = this.morphResonance) {
    this.morphAmount = Math.max(-1.0, Math.min(1.0, amount));
    this.morphType = type;
    this.morphResonance = Math.max(0.5, Math.min(25.0, resonance));
    this.updateMorphFilterParams();
  }

  /**
   * Enables or completely bypasses the TR-8S Morph filter stage
   */
  public setMorphEnabled(enabled: boolean) {
    this.morphEnabled = enabled;
    this.updateMorphFilterParams();
  }

  public isMorphFilterEnabled(): boolean {
    return this.morphEnabled;
  }

  private updateMorphFilterParams() {
    if (!this.ctx || !this.morphLPF || !this.morphHPF || !this.morphFormant || !this.morphGainLPF || !this.morphGainHPF || !this.morphGainDry || !this.morphGainFormant) {
      return;
    }

    const now = this.ctx.currentTime;
    const TC = 0.005; // 5ms ultra-smooth time constant, zero stutter

    // If morph filter influence is disabled/bypassed: 100% dry passthrough
    if (!this.morphEnabled) {
      this.morphGainLPF.gain.setTargetAtTime(0.0, now, TC);
      this.morphGainHPF.gain.setTargetAtTime(0.0, now, TC);
      this.morphGainFormant.gain.setTargetAtTime(0.0, now, TC);
      this.morphGainDry.gain.setTargetAtTime(1.0, now, TC);
      return;
    }

    const morph = this.morphAmount; // -1.0 to +1.0

    if (this.morphType === 'tr8s_dj' || this.morphType === 'diode_ladder') {
      this.morphGainFormant.gain.setTargetAtTime(0.0, now, TC);

      if (morph < -0.02) {
        // TURN LEFT: Sweeps Low-Pass Filter downwards (20,000Hz -> 80Hz)
        const lpfProgress = Math.abs(morph);
        const lpfFreq = 20000 * Math.pow(80 / 20000, Math.pow(lpfProgress, 1.3));
        const wet = Math.min(1.0, lpfProgress * 1.4);
        const dry = Math.max(0.0, 1.0 - wet);

        this.morphLPF.frequency.setTargetAtTime(Math.max(60, lpfFreq), now, TC);
        this.morphLPF.Q.setTargetAtTime(this.morphResonance, now, TC);
        this.morphGainLPF.gain.setTargetAtTime(wet, now, TC);
        this.morphGainHPF.gain.setTargetAtTime(0.0, now, TC);
        this.morphGainDry.gain.setTargetAtTime(dry, now, TC);
      } else if (morph > 0.02) {
        // TURN RIGHT: Sweeps High-Pass Filter upwards (20Hz -> 10,000Hz)
        const hpfProgress = morph;
        const hpfFreq = 20 * Math.pow(10000 / 20, Math.pow(hpfProgress, 1.3));
        const wet = Math.min(1.0, hpfProgress * 1.4);
        const dry = Math.max(0.0, 1.0 - wet);

        this.morphHPF.frequency.setTargetAtTime(Math.max(20, hpfFreq), now, TC);
        this.morphHPF.Q.setTargetAtTime(this.morphResonance, now, TC);
        this.morphGainHPF.gain.setTargetAtTime(wet, now, TC);
        this.morphGainLPF.gain.setTargetAtTime(0.0, now, TC);
        this.morphGainDry.gain.setTargetAtTime(dry, now, TC);
      } else {
        // CENTER DETENT (0%): Pure Flat
        this.morphGainLPF.gain.setTargetAtTime(0.0, now, TC);
        this.morphGainHPF.gain.setTargetAtTime(0.0, now, TC);
        this.morphGainDry.gain.setTargetAtTime(1.0, now, TC);
      }
    } else if (this.morphType === 'formant_vocal') {
      const norm = (morph + 1.0) / 2.0;
      const vowelFreq = 350 + Math.sin(norm * Math.PI) * 2200;

      this.morphFormant.frequency.setTargetAtTime(vowelFreq, now, TC);
      this.morphFormant.Q.setTargetAtTime(Math.max(4.0, this.morphResonance * 1.8), now, TC);

      const wet = Math.abs(morph) > 0.05 ? 0.85 : 0.0;
      this.morphGainFormant.gain.setTargetAtTime(wet, now, TC);
      this.morphGainDry.gain.setTargetAtTime(1.0 - wet * 0.5, now, TC);
      this.morphGainLPF.gain.setTargetAtTime(0.0, now, TC);
      this.morphGainHPF.gain.setTargetAtTime(0.0, now, TC);
    } else if (this.morphType === 'comb_resonator') {
      const combFreq = 120 + Math.pow((morph + 1.0) / 2.0, 2) * 4500;
      this.morphFormant.frequency.setTargetAtTime(combFreq, now, TC);
      this.morphFormant.Q.setTargetAtTime(18.0, now, TC);

      const wet = Math.abs(morph) > 0.05 ? 0.75 : 0.0;
      this.morphGainFormant.gain.setTargetAtTime(wet, now, TC);
      this.morphGainDry.gain.setTargetAtTime(1.0 - wet * 0.4, now, TC);
      this.morphGainLPF.gain.setTargetAtTime(0.0, now, TC);
      this.morphGainHPF.gain.setTargetAtTime(0.0, now, TC);
    }
  }

  public setElectronFluxAmount(amount: number) {
    this.electronFluxAmount = Math.max(0, Math.min(1.0, amount));
    this.applyElectronModeParams();
  }

  public setCharacterMode(mode: DSPCharacterMode) {
    this.characterMode = mode;
    if (this.waveShaper) {
      if (mode === 'classic_303') (this.waveShaper as any).curve = this.staticClassicCurve;
      else if (mode === 'industrial_drive') (this.waveShaper as any).curve = this.staticIndustrialCurve;
      else (this.waveShaper as any).curve = this.staticChaosCurve;
    }
    if (this.subGain && this.ctx && !this.electronSolo) {
      const subLevel = mode === 'industrial_drive' ? 0.40 : mode === 'classic_303' ? 0.20 : 0.28;
      this.subGain.gain.setTargetAtTime(subLevel, this.ctx.currentTime, 0.01);
    }
  }

  public setMasterMute(muted: boolean) {
    if (this.masterGain && this.ctx) {
      const target = muted ? 0.00001 : 0.90;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.005);
    }
  }

  /**
   * Continuous Pitch LFO Controls (Seamless, click-free, gapless modulation directly on oscillator detune)
   */
  public setPitchLfoEnabled(enabled: boolean) {
    this.pitchLfoEnabled = enabled;
    if (!this.ctx || !this.pitchLfoGain) {
      this.init();
      return;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const now = this.ctx.currentTime;
    const targetGain = enabled ? this.pitchLfoDepthCents : 0.0001;
    this.pitchLfoGain.gain.cancelScheduledValues(now);
    this.pitchLfoGain.gain.setValueAtTime(targetGain, now);
  }

  public setPitchLfoRate(rateHz: number) {
    this.pitchLfoRateHz = Math.max(0.05, Math.min(25.0, rateHz));
    if (this.pitchLfoNode && this.ctx) {
      const now = this.ctx.currentTime;
      this.pitchLfoNode.frequency.cancelScheduledValues(now);
      this.pitchLfoNode.frequency.setValueAtTime(this.pitchLfoRateHz, now);
    }
  }

  public setPitchLfoDepth(cents: number) {
    this.pitchLfoDepthCents = Math.max(10, Math.min(1200, cents));
    if (this.pitchLfoGain && this.ctx) {
      const now = this.ctx.currentTime;
      const targetGain = this.pitchLfoEnabled ? this.pitchLfoDepthCents : 0.0001;
      this.pitchLfoGain.gain.cancelScheduledValues(now);
      this.pitchLfoGain.gain.setValueAtTime(targetGain, now);
    }
  }

  public getPitchLfoState() {
    return {
      enabled: this.pitchLfoEnabled,
      rate: this.pitchLfoRateHz,
      depth: this.pitchLfoDepthCents,
    };
  }

  public stopEngine() {
    if (this.ctx && this.vcaGain) {
      const now = this.ctx.currentTime;
      this.vcaGain.gain.cancelScheduledValues(now);
      this.vcaGain.gain.linearRampToValueAtTime(0.00001, now + 0.01);
      this.isEnvelopeActive = false;
    }
  }

  public getStatus(): { isLive: boolean; sampleRate: number; state: string; mode: string } {
    return {
      isLive: this.isLive && this.ctx?.state === 'running',
      sampleRate: this.ctx?.sampleRate || 48000,
      state: this.ctx?.state || 'closed',
      mode: this.characterMode,
    };
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterNode(): GainNode | null {
    return this.masterGain;
  }

  /**
   * Plays a quiet, pleasant pre-roll count-in click (volume ~0.15)
   */
  public playCountInClick(isHigh: boolean = false) {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isHigh ? 1600 : 950, now);
      osc.frequency.exponentialRampToValueAtTime(isHigh ? 450 : 250, now + 0.035);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(isHigh ? 1800 : 1100, now);
      filter.Q.setValueAtTime(2.2, now);

      // Low gentle volume (0.15)
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('Count-in click error:', e);
    }
  }

  public setWaveform(type: 'sawtooth' | 'square') {
    this.waveform = type;
    if (this.osc) {
      this.osc.type = type;
    }
  }

  /**
   * Ultra-smooth parameter updates without memory allocation or audio thread locks
   */
  public setBaseKnobs(cutoffHz: number, resonanceQ: number, decaySec: number, envMod: number, accent: number, drive: number) {
    this.baseCutoffHz = Math.max(100, cutoffHz);
    this.baseResonanceQ = Math.max(1, resonanceQ);
    this.baseDecaySec = Math.max(0.05, decaySec);
    this.envModAmount = envMod;
    this.accentAmount = accent;
    this.driveAmount = drive;

    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const TC = 0.005; // 5ms seamless continuous smoothing

    if (this.mainFilter) {
      this.mainFilter.Q.setTargetAtTime(this.baseResonanceQ, now, TC);
      if (!this.isEnvelopeActive) {
        this.mainFilter.frequency.setTargetAtTime(this.baseCutoffHz, now, TC);
      } else {
        // Smoothly adjust filter cutoff in real-time during note decay with zero lag
        this.mainFilter.frequency.setTargetAtTime(this.baseCutoffHz, now, 0.015);
      }
    }

    if (this.preDriveGain && this.postDriveGain) {
      const preGainVal = 1.0 + drive * 6.5;
      const postGainVal = 1.0 / (1.0 + drive * 0.35);
      this.preDriveGain.gain.setTargetAtTime(preGainVal, now, TC);
      this.postDriveGain.gain.setTargetAtTime(postGainVal, now, TC);
    }

    if (this.drivePresenceFilter) {
      // High-Frequency harmonic presence boost scaling with drive (0dB to +7.5dB)
      const presenceGain = drive * 7.5;
      this.drivePresenceFilter.gain.setTargetAtTime(presenceGain, now, TC);
    }
  }

  /**
   * Executes a step on the Web Audio Synth Voice with full physical electron transport modulations
   * Supports precise sample-accurate hardware lookahead scheduling via scheduleTime
   */
  public triggerStep(
    stepData: TB303StepData,
    stepDurationSec: number,
    prevSlide: boolean,
    telemetry?: PhysicalTelemetryData,
    scheduleTime?: number
  ) {
    if (!this.ctx || !this.osc || !this.mainFilter || !this.vcaGain || !this.subOsc) {
      this.init().then(() => {
        this.triggerStep(stepData, stepDurationSec, prevSlide, telemetry, scheduleTime);
      });
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = (scheduleTime !== undefined && scheduleTime >= this.ctx.currentTime)
      ? scheduleTime
      : this.ctx.currentTime;
    const baseFreq = 440 * Math.pow(2, (stepData.note - 69) / 12);
    this.currentNoteFreq = baseFreq;

    // 1. QUANTUM ELECTRON DYNAMICS (Shot Noise + Johnson-Nyquist)
    let thermalNoiseAmp = 120e-9;
    let currentAmps = 3.4e-3;

    if (telemetry) {
      thermalNoiseAmp = telemetry.thermalNoiseAmperes;
      currentAmps = telemetry.totalCurrentAmperes;
    }

    // Direct pitch micro-drift from thermal electron kinetic collisions
    let driftMultiplier = 0.15;
    if (this.electronMode === 'quantum_shot') driftMultiplier = 0.22;
    if (this.electronMode === 'thermal_boltzmann') driftMultiplier = 0.35; // Maximum audible warm thermal drift
    if (this.electronMode === 'flicker_filament') driftMultiplier = 0.28;
    if (this.electronMode === 'avalanche_breakdown') driftMultiplier = 0.50; // Heavy breakdown jitter
    if (this.electronMode === 'bypass_clean') driftMultiplier = 0.0; // Crystal pure

    const tempFactor = (this.operatingTempKelvin - 273) / 100;
    const driftCents = (thermalNoiseAmp * 1e9 - 150) * driftMultiplier * this.electronFluxAmount * (1 + Math.max(0, tempFactor));
    const pitchDriftHz = baseFreq * (Math.pow(2, driftCents / 1200) - 1);
    const netFreq = Math.max(25, baseFreq + pitchDriftHz);

    // 2. KCL BITLINE CURRENT ELECTRON FLOW -> FILTER CUTOFF EXPANSION
    const normCurrent = Math.max(0, Math.min(1.0, (currentAmps * 1e3) / 8.0));
    let currentOpeningHz = normCurrent * 3800;
    if (this.electronMode === 'bypass_clean') currentOpeningHz = 0;

    // Modulate Electron Noise Filter with live matrix current
    if (this.electronFilter && this.electronMode !== 'bypass_clean') {
      const electronBandHz = Math.min(7500, 1200 + normCurrent * 3500);
      this.electronFilter.frequency.setTargetAtTime(electronBandHz, now, 0.015);
    }

    // 3. MEMRISTOR FILAMENT ENTROPY -> SCREAMING SELF-OSCILLATION
    let dynamicResonanceQ = this.baseResonanceQ;
    if (telemetry && this.electronMode !== 'bypass_clean') {
      const normEntropy = Math.max(0, Math.min(1.0, telemetry.entropy / 4.0));
      const driftBoost = this.conductanceDrift * 100; // Conductance drift directly boosts squelch
      dynamicResonanceQ = Math.max(1.5, Math.min(26.0, this.baseResonanceQ + normEntropy * 10.0 + driftBoost * 0.8));
    }
    this.mainFilter.Q.setTargetAtTime(dynamicResonanceQ, now, 0.008);

    // 4. THERMAL ELECTRON COLLISION DURATION -> EXPONENTIAL DECAY
    const thermalDecayShift = this.electronMode === 'bypass_clean' ? 0 : (thermalNoiseAmp * 1e9 / 400.0) * 0.25;
    const dynamicDecayTime = Math.max(0.08, Math.min(0.80, this.baseDecaySec + thermalDecayShift));

    // Handle Note Gate vs Rest
    if (stepData.gate) {
      this.isEnvelopeActive = true;

      // Frequency Slide
      if (prevSlide) {
        this.osc.frequency.cancelScheduledValues(now);
        this.osc.frequency.setTargetAtTime(netFreq, now, 0.045);
        this.subOsc.frequency.setTargetAtTime(netFreq * 0.5, now, 0.045);
      } else {
        this.osc.frequency.setValueAtTime(netFreq, now);
        this.subOsc.frequency.setValueAtTime(netFreq * 0.5, now);
      }

      // Filter Envelope Sweep
      const peakCutoff = stepData.accent
        ? Math.min(13000, this.baseCutoffHz + currentOpeningHz + this.envModAmount * 4800 + this.accentAmount * 3200)
        : Math.min(10000, this.baseCutoffHz + currentOpeningHz + this.envModAmount * 3400);

      const decayDuration = stepData.accent ? Math.max(0.08, dynamicDecayTime * 0.65) : dynamicDecayTime;
      const baseFloor = Math.max(120, this.baseCutoffHz + currentOpeningHz * 0.25);

      this.mainFilter.frequency.cancelScheduledValues(now);
      this.mainFilter.frequency.setValueAtTime(Math.max(100, peakCutoff), now);
      this.mainFilter.frequency.exponentialRampToValueAtTime(
        Math.max(100, baseFloor),
        now + decayDuration
      );

      // VCA Volume Envelope (Punchy 3ms Attack -> Gate Hold -> Clean Decay)
      const targetVolume = stepData.accent ? 0.88 : 0.62;
      const gateTime = stepData.slide ? stepDurationSec : stepDurationSec * 0.68;

      this.vcaGain.gain.cancelScheduledValues(now);
      this.vcaGain.gain.setValueAtTime(0.0001, now);
      this.vcaGain.gain.linearRampToValueAtTime(targetVolume, now + 0.003);
      this.vcaGain.gain.setValueAtTime(targetVolume, now + Math.max(0.005, gateTime - 0.006));
      this.vcaGain.gain.linearRampToValueAtTime(0.0001, now + gateTime);

      // Spatial Rain Mirror Panner (Flying rain drops / mirror ping-pong modulation)
      if (this.stereoPanner && this.spatialRainMode !== 'off') {
        const idx = stepData.stepIndex;
        let targetPan = 0;
        if (this.spatialRainMode === 'pingpong') {
          // Mirror Ping-Pong Bounce (Alternates L/R with variable depth per step)
          const depth = 0.75 + 0.20 * Math.sin(idx * 1.7);
          targetPan = (idx % 2 === 0 ? -1 : 1) * depth;
        } else if (this.spatialRainMode === 'drops') {
          // 3D Rain Drops Scatter (Flying across stereo points mirror-wise)
          const DROPS_MAP = [-0.88, 0.78, -0.42, 0.94, -0.72, 0.62, -0.96, 0.42, -0.38, 0.86, -0.82, 0.94, -0.68, 0.52, -0.92, 0.72];
          targetPan = DROPS_MAP[idx % DROPS_MAP.length];
        } else if (this.spatialRainMode === 'spiral') {
          // Hypnotic Vortex Orbit across 360 stereo spectrum
          targetPan = Math.sin((idx / 16) * Math.PI * 2) * 0.92;
        }
        this.currentPanValue = targetPan;
        this.stereoPanner.pan.cancelScheduledValues(now);
        this.stereoPanner.pan.setTargetAtTime(targetPan, now, 0.02);
      }
    } else {
      this.isEnvelopeActive = false;
      this.vcaGain.gain.cancelScheduledValues(now);
      this.vcaGain.gain.linearRampToValueAtTime(0.0001, now + 0.01);
    }
  }

  public playDirectBeep(freq = 440, duration = 0.3) {
    try {
      if (!this.ctx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtxClass();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.65, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.05);

      this.init();
    } catch (e) {
      console.error('Test beep error:', e);
    }
  }

  /**
   * Live Keyboard Note On (Ableton Live computer keyboard & MIDI keyboard playing)
   */
  public triggerLiveNoteOn(note: number, velocity = 100, slide = false) {
    if (!this.ctx || !this.osc || !this.mainFilter || !this.vcaGain || !this.subOsc) {
      this.init().then(() => {
        this.triggerLiveNoteOn(note, velocity, slide);
      });
      return;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const now = this.ctx.currentTime;
    const baseFreq = 440 * Math.pow(2, (note - 69) / 12);
    this.currentNoteFreq = baseFreq;

    const isAccent = velocity > 100;
    const peakCutoff = isAccent
      ? Math.min(13000, this.baseCutoffHz + this.envModAmount * 5200 + this.accentAmount * 3500)
      : Math.min(10000, this.baseCutoffHz + this.envModAmount * 3600);

    const decayDuration = isAccent ? Math.max(0.1, this.baseDecaySec * 0.65) : this.baseDecaySec;
    const baseFloor = Math.max(120, this.baseCutoffHz * 0.25);
    const targetVolume = isAccent ? 0.92 : 0.68;

    if (slide) {
      // Authentic TB-303 Legato Slide (smooth portamento glide without re-triggering attack clicks)
      this.osc.frequency.cancelScheduledValues(now);
      this.osc.frequency.setTargetAtTime(baseFreq, now, 0.045);
      this.subOsc.frequency.cancelScheduledValues(now);
      this.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.045);

      this.mainFilter.frequency.cancelScheduledValues(now);
      this.mainFilter.frequency.setTargetAtTime(peakCutoff, now, 0.03);
      this.mainFilter.frequency.exponentialRampToValueAtTime(
        Math.max(100, baseFloor),
        now + decayDuration
      );

      this.vcaGain.gain.cancelScheduledValues(now);
      this.vcaGain.gain.setTargetAtTime(targetVolume, now, 0.015);
    } else {
      // Fresh Note Trigger (Attack ramp & envelope sweep)
      this.osc.frequency.cancelScheduledValues(now);
      this.osc.frequency.setValueAtTime(baseFreq, now);
      this.subOsc.frequency.cancelScheduledValues(now);
      this.subOsc.frequency.setValueAtTime(baseFreq * 0.5, now);

      this.mainFilter.frequency.cancelScheduledValues(now);
      this.mainFilter.frequency.setValueAtTime(Math.max(100, peakCutoff), now);
      this.mainFilter.frequency.exponentialRampToValueAtTime(
        Math.max(100, baseFloor),
        now + decayDuration
      );

      this.vcaGain.gain.cancelScheduledValues(now);
      this.vcaGain.gain.setValueAtTime(0.0001, now);
      this.vcaGain.gain.linearRampToValueAtTime(targetVolume, now + 0.003);
    }

    // Live keyboard spatial rain modulation
    if (this.stereoPanner && this.spatialRainMode !== 'off') {
      let targetPan = 0;
      if (this.spatialRainMode === 'pingpong') {
        targetPan = Math.random() > 0.5 ? 0.8 : -0.8;
      } else if (this.spatialRainMode === 'drops') {
        targetPan = (Math.random() * 1.8 - 0.9);
      } else if (this.spatialRainMode === 'spiral') {
        targetPan = Math.sin(now * 4) * 0.9;
      }
      this.currentPanValue = targetPan;
      this.stereoPanner.pan.cancelScheduledValues(now);
      this.stereoPanner.pan.setTargetAtTime(targetPan, now, 0.02);
    }
  }

  public setSpatialRainMode(mode: SpatialRainMode) {
    this.spatialRainMode = mode;
    if (this.stereoPanner && this.ctx) {
      if (mode === 'off') {
        this.stereoPanner.pan.cancelScheduledValues(this.ctx.currentTime);
        this.stereoPanner.pan.setTargetAtTime(0, this.ctx.currentTime, 0.04);
        this.currentPanValue = 0;
      }
    }
  }

  public getSpatialRainMode(): SpatialRainMode {
    return this.spatialRainMode;
  }

  /**
   * Live Keyboard Note Off
   */
  public triggerLiveNoteOff(note?: number) {
    if (!this.ctx || !this.vcaGain) return;
    const now = this.ctx.currentTime;
    this.vcaGain.gain.cancelScheduledValues(now);
    this.vcaGain.gain.setTargetAtTime(0.0001, now, 0.03);
  }
}

export const dspAudio = new DSPAudioEngine();
