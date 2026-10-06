/**
 * WAV Recorder & OfflineAudioContext Pattern Exporter
 * (src/engine/wav_recorder.ts)
 * 
 * Features:
 * 1. High-speed OfflineAudioContext Pattern Renderer to Studio Master .wav
 * 2. Live Session Master Bus Recorder up to 10 minutes (600s) capturing all knob tweaks
 * 3. Quiet pre-roll count-in (4, 3, 2, 1 at current BPM) with soft audio clicks
 * 4. Standard 16-bit PCM Stereo RIFF WAVE file encoder and instant browser downloader
 */

import { TB303StepData } from './neural_303_types';
import { dspAudio } from './dsp_audio_engine';

// Helper: writes ASCII string into DataView
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Encodes an AudioBuffer into standard 16-bit PCM RIFF WAVE Blob
 */
export function encodeAudioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = buffer.length;
  const dataSize = numSamples * blockAlign;
  const byteRate = sampleRate * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave and quantize to 16-bit signed PCM
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Clamp to -1.0 .. +1.0
      sample = Math.max(-1.0, Math.min(1.0, sample));
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Encodes accumulated raw Float32 chunks into a 16-bit PCM RIFF WAVE Blob
 */
export function encodeChunksToWav(
  leftChunks: Float32Array[],
  rightChunks: Float32Array[],
  sampleRate: number
): Blob {
  let totalSamples = 0;
  for (const chunk of leftChunks) {
    totalSamples += chunk.length;
  }

  const numChannels = 2;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = totalSamples * blockAlign;
  const byteRate = sampleRate * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave chunks into 16-bit PCM
  let offset = 44;
  for (let cIdx = 0; cIdx < leftChunks.length; cIdx++) {
    const left = leftChunks[cIdx];
    const right = rightChunks[cIdx] || left;
    const len = left.length;

    for (let i = 0; i < len; i++) {
      // Left channel
      let sL = Math.max(-1.0, Math.min(1.0, left[i]));
      view.setInt16(offset, sL < 0 ? sL * 32768 : sL * 32767, true);
      offset += 2;

      // Right channel
      let sR = Math.max(-1.0, Math.min(1.0, right[i]));
      view.setInt16(offset, sR < 0 ? sR * 32768 : sR * 32767, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Triggers direct browser download of a WAV Blob
 */
export function triggerWavDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename.endsWith('.wav') ? filename : `${filename}.wav`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export interface OfflineRenderOptions {
  pattern: TB303StepData[];
  bpm: number;
  bars: number;
  waveform: 'sawtooth' | 'square';
  cutoffHz: number;
  resonanceQ: number;
  decaySec: number;
  envMod: number;
  accent: number;
  drive: number;
  characterMode: string;
}

/**
 * Renders the 16-step pattern using OfflineAudioContext at ultra-high speed
 */
export async function renderPatternOffline(
  options: OfflineRenderOptions
): Promise<{ blob: Blob; durationSec: number; sampleRate: number; sizeBytes: number }> {
  const {
    pattern,
    bpm,
    bars = 4,
    waveform = 'sawtooth',
    cutoffHz = 900,
    resonanceQ = 12,
    decaySec = 0.25,
    envMod = 0.75,
    accent = 0.85,
    drive = 0.35,
    characterMode = 'neural_chaos',
  } = options;

  const sampleRate = 44100;
  const secondsPerStep = 60 / (bpm * 4);
  const totalSteps = 16 * bars;
  const loopDuration = totalSteps * secondsPerStep;
  const tailDuration = 0.8; // Allow final note decay to naturally ring out
  const totalDuration = loopDuration + tailDuration;
  const totalFrames = Math.ceil(totalDuration * sampleRate);

  const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineCtxClass(2, totalFrames, sampleRate);

  // 1. Oscillators
  const osc = offlineCtx.createOscillator();
  const oscGain = offlineCtx.createGain();
  const subOsc = offlineCtx.createOscillator();
  const subGain = offlineCtx.createGain();

  osc.type = waveform;
  oscGain.gain.setValueAtTime(1.0, 0);

  subOsc.type = 'square';
  subGain.gain.setValueAtTime(0.26, 0);

  // 2. Diode Ladder 24dB Filter (Cascaded dual biquad for authentic steep slope)
  const lpf1 = offlineCtx.createBiquadFilter();
  lpf1.type = 'lowpass';
  lpf1.frequency.setValueAtTime(cutoffHz, 0);
  lpf1.Q.setValueAtTime(resonanceQ * 0.7, 0);

  const lpf2 = offlineCtx.createBiquadFilter();
  lpf2.type = 'lowpass';
  lpf2.frequency.setValueAtTime(cutoffHz, 0);
  lpf2.Q.setValueAtTime(resonanceQ * 0.7, 0);

  // 3. Distortion Stage
  const preDrive = offlineCtx.createGain();
  const preGainVal = 1.0 + drive * 8.0;
  preDrive.gain.setValueAtTime(preGainVal, 0);

  const waveShaper = offlineCtx.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  const deg = Math.PI / 180;
  const k = characterMode === 'classic_303' ? 18 : 32;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  waveShaper.curve = curve;
  waveShaper.oversample = '4x';

  const postDrive = offlineCtx.createGain();
  postDrive.gain.setValueAtTime(1.0 / Math.sqrt(preGainVal), 0);

  // 4. VCA Envelope
  const vcaGain = offlineCtx.createGain();
  vcaGain.gain.setValueAtTime(0.00001, 0);

  // 5. Master Output
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, 0);

  // Audio Graph Connections
  osc.connect(oscGain);
  subOsc.connect(subGain);
  oscGain.connect(lpf1);
  subGain.connect(lpf1);
  lpf1.connect(lpf2);
  lpf2.connect(preDrive);
  preDrive.connect(waveShaper);
  waveShaper.connect(postDrive);
  postDrive.connect(vcaGain);
  vcaGain.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  osc.start(0);
  subOsc.start(0);

  // Schedule Pattern Steps
  let prevSlide = false;
  let lastNoteFreq = 130.81;

  for (let stepIdx = 0; stepIdx < totalSteps; stepIdx++) {
    const patternStepIdx = stepIdx % 16;
    const stepData = pattern[patternStepIdx];
    const stepTime = stepIdx * secondsPerStep;

    if (stepData && stepData.gate) {
      const noteFreq = 440 * Math.pow(2, (stepData.note - 69) / 12);
      lastNoteFreq = noteFreq;

      // Frequency glide or immediate jump
      if (prevSlide) {
        osc.frequency.setTargetAtTime(noteFreq, stepTime, 0.04);
        subOsc.frequency.setTargetAtTime(noteFreq * 0.5, stepTime, 0.04);
      } else {
        osc.frequency.setValueAtTime(noteFreq, stepTime);
        subOsc.frequency.setValueAtTime(noteFreq * 0.5, stepTime);
      }

      // Filter Envelope
      const peakCutoff = stepData.accent
        ? Math.min(12500, cutoffHz + envMod * 5200 + accent * 3400)
        : Math.min(9500, cutoffHz + envMod * 3600);
      const decayDuration = stepData.accent ? Math.max(0.08, decaySec * 0.65) : decaySec;
      const baseFloor = Math.max(120, cutoffHz * 0.35);

      lpf1.frequency.setValueAtTime(peakCutoff, stepTime);
      lpf1.frequency.exponentialRampToValueAtTime(baseFloor, stepTime + decayDuration);
      lpf2.frequency.setValueAtTime(peakCutoff, stepTime);
      lpf2.frequency.exponentialRampToValueAtTime(baseFloor, stepTime + decayDuration);

      // VCA Amplitude Envelope
      const targetVol = stepData.accent ? 0.90 : 0.65;
      const gateTime = stepData.slide ? secondsPerStep : secondsPerStep * 0.68;

      vcaGain.gain.setValueAtTime(0.00001, stepTime);
      vcaGain.gain.linearRampToValueAtTime(targetVol, stepTime + 0.003);
      vcaGain.gain.setValueAtTime(targetVol, stepTime + gateTime);
      vcaGain.gain.exponentialRampToValueAtTime(0.00001, stepTime + gateTime + decayDuration * 0.85);

      prevSlide = !!stepData.slide;
    } else {
      prevSlide = false;
    }
  }

  // Render AudioBuffer
  const renderedBuffer = await offlineCtx.startRendering();
  const blob = encodeAudioBufferToWav(renderedBuffer);

  return {
    blob,
    durationSec: totalDuration,
    sampleRate,
    sizeBytes: blob.size,
  };
}

/**
 * Live Master Bus Recorder (Up to 10 Minutes / 600s)
 * Captures all live parameter tweaks, filter squelches, entropy, and morph modulations
 */
export class LiveSessionRecorder {
  private isRecording = false;
  private isCountingIn = false;
  private currentCountIn = 4;
  private leftChunks: Float32Array[] = [];
  private rightChunks: Float32Array[] = [];
  private processorNode: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private sampleRate = 44100;
  private totalSamplesRecorded = 0;
  private maxDurationSec = 600; // 10 minutes maximum
  private maxSamples = 0;
  private countInTimer: any = null;
  private progressInterval: any = null;
  private startTime = 0;
  private lastRecordedResult: {
    blob: Blob;
    durationSec: number;
    sizeMb: number;
    url: string;
  } | null = null;

  // Callbacks
  private onCountInCallback?: (count: number) => void;
  private onStartCallback?: () => void;
  private onProgressCallback?: (status: {
    elapsedSec: number;
    maxSec: number;
    peakDb: number;
    sizeMb: number;
  }) => void;
  private onFinishCallback?: (result: {
    blob: Blob;
    durationSec: number;
    sizeMb: number;
    url: string;
  }) => void;

  public getStatus() {
    return {
      isRecording: this.isRecording,
      isCountingIn: this.isCountingIn,
      countInValue: this.currentCountIn,
      elapsedSec: this.isRecording ? (Date.now() - this.startTime) / 1000 : 0,
      maxSec: this.maxDurationSec,
    };
  }

  public getLastResult() {
    return this.lastRecordedResult;
  }

  /**
   * Starts a 4-beat quiet pre-roll count-in, then automatically starts recording
   */
  public async startWithCountIn(
    bpm: number,
    callbacks: {
      onCountIn: (count: number) => void;
      onStart: () => void;
      onProgress: (status: { elapsedSec: number; maxSec: number; peakDb: number; sizeMb: number }) => void;
      onFinish: (result: { blob: Blob; durationSec: number; sizeMb: number; url: string }) => void;
    }
  ) {
    if (this.isRecording || this.isCountingIn) return;

    // Ensure audio engine is running
    await dspAudio.init();

    this.onCountInCallback = callbacks.onCountIn;
    this.onStartCallback = callbacks.onStart;
    this.onProgressCallback = callbacks.onProgress;
    this.onFinishCallback = callbacks.onFinish;

    this.isCountingIn = true;
    this.currentCountIn = 4;
    const beatIntervalMs = (60 / bpm) * 1000;

    let count = 4;
    // Immediate beat 4 click
    dspAudio.playCountInClick(false);
    this.onCountInCallback(count);

    this.countInTimer = setInterval(() => {
      count--;
      this.currentCountIn = count;
      if (count > 0) {
        // Soft click on 3 and 2, higher click on 1
        dspAudio.playCountInClick(count === 1);
        this.onCountInCallback?.(count);
      } else {
        // Count-in finished! Start real-time recording
        clearInterval(this.countInTimer);
        this.isCountingIn = false;
        this.currentCountIn = 0;
        this.startLiveRecording();
      }
    }, beatIntervalMs);
  }

  /**
   * Begins recording audio directly from the Master Output Gain node
   */
  private startLiveRecording() {
    const ctx = dspAudio.getAudioContext();
    const masterNode = dspAudio.getMasterNode();

    if (!ctx || !masterNode) {
      console.error('Cannot record: AudioContext or MasterNode is unavailable');
      this.cancel();
      return;
    }

    this.sampleRate = ctx.sampleRate;
    this.maxSamples = this.sampleRate * this.maxDurationSec;
    this.leftChunks = [];
    this.rightChunks = [];
    this.totalSamplesRecorded = 0;
    this.isRecording = true;
    this.startTime = Date.now();

    // 4096 frames buffer (approx 92ms chunks)
    this.processorNode = ctx.createScriptProcessor(4096, 2, 2);
    this.silentGain = ctx.createGain();
    this.silentGain.gain.setValueAtTime(0, ctx.currentTime);

    let currentPeak = 0;

    this.processorNode.onaudioprocess = (e) => {
      if (!this.isRecording) return;

      const inputL = e.inputBuffer.getChannelData(0);
      const inputR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : inputL;

      // Calculate instantaneous peak level
      let framePeak = 0;
      for (let i = 0; i < inputL.length; i++) {
        const absL = Math.abs(inputL[i]);
        if (absL > framePeak) framePeak = absL;
      }
      currentPeak = framePeak;

      // Copy raw Float32 chunks
      const copyL = new Float32Array(inputL);
      const copyR = new Float32Array(inputR);
      this.leftChunks.push(copyL);
      this.rightChunks.push(copyR);
      this.totalSamplesRecorded += copyL.length;

      // Auto-stop at 10 minutes limit
      if (this.totalSamplesRecorded >= this.maxSamples) {
        this.stop();
      }
    };

    // Tap master output into processor without altering live monitor volume
    masterNode.connect(this.processorNode);
    this.processorNode.connect(this.silentGain);
    this.silentGain.connect(ctx.destination);

    this.onStartCallback?.();

    // Emit live progress every 150ms
    this.progressInterval = setInterval(() => {
      if (!this.isRecording) return;
      const elapsedSec = (Date.now() - this.startTime) / 1000;
      const peakDb = currentPeak > 0 ? Math.max(-60, Math.round(20 * Math.log10(currentPeak))) : -60;
      const bytes = this.totalSamplesRecorded * 4; // 16-bit stereo = 4 bytes per sample
      const sizeMb = Math.round((bytes / (1024 * 1024)) * 10) / 10;

      this.onProgressCallback?.({
        elapsedSec: Math.min(this.maxDurationSec, elapsedSec),
        maxSec: this.maxDurationSec,
        peakDb,
        sizeMb,
      });
    }, 150);
  }

  /**
   * Stops recording, builds standard 16-bit WAV file, and invokes finish callback
   */
  public stop() {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.countInTimer) clearInterval(this.countInTimer);
    if (this.progressInterval) clearInterval(this.progressInterval);

    // Disconnect recording nodes
    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch (e) {}
      this.processorNode = null;
    }
    if (this.silentGain) {
      try {
        this.silentGain.disconnect();
      } catch (e) {}
      this.silentGain = null;
    }

    const durationSec = this.totalSamplesRecorded / this.sampleRate;
    const blob = encodeChunksToWav(this.leftChunks, this.rightChunks, this.sampleRate);
    const sizeMb = Math.round((blob.size / (1024 * 1024)) * 10) / 10;
    const url = URL.createObjectURL(blob);

    this.lastRecordedResult = {
      blob,
      durationSec,
      sizeMb,
      url,
    };

    this.onFinishCallback?.(this.lastRecordedResult);
  }

  /**
   * Cancels active recording or count-in without generating a file
   */
  public cancel() {
    this.isRecording = false;
    this.isCountingIn = false;
    if (this.countInTimer) clearInterval(this.countInTimer);
    if (this.progressInterval) clearInterval(this.progressInterval);

    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch (e) {}
      this.processorNode = null;
    }
    if (this.silentGain) {
      try {
        this.silentGain.disconnect();
      } catch (e) {}
      this.silentGain = null;
    }
    this.leftChunks = [];
    this.rightChunks = [];
  }
}

// Global Singleton Recorder
export const liveRecorder = new LiveSessionRecorder();
