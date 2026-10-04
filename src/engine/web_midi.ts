/**
 * Native Browser Web MIDI API Driver with Bidirectional Ableton Live Routing (src/engine/web_midi.ts)
 * 
 * Full 2-Way MIDI:
 *  - MIDI OUT: Sends 303 sequence notes + physical CC streams to DAWs / hardware.
 *  - MIDI IN: Receives live notes, pitch-bend, mod-wheel & CC automations directly from Ableton Live.
 */

export interface WebMidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
}

export interface MidiEventData {
  type: 'noteon' | 'noteoff' | 'cc' | 'pitchbend' | 'clock';
  note?: number;
  velocity?: number;
  cc?: number;
  value?: number;
  channel: number;
  rawBytes: number[];
}

export type MidiInputCallback = (event: MidiEventData) => void;

export class WebMidiManager {
  private midiAccess: any = null;
  private selectedOutput: any = null;
  private selectedInput: any = null;
  private isSupported: boolean = false;
  private activeNotes: Set<number> = new Set();
  private pendingNoteOffTimers: number[] = [];
  private lastNote: number | null = null;
  private inputListeners: Set<MidiInputCallback> = new Set();
  private lastSentCC: Map<number, number> = new Map();

  constructor() {
    this.isSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  public checkSupport(): boolean {
    return this.isSupported;
  }

  /**
   * Requests browser MIDI access and populates available hardware & virtual ports
   */
  public async init(): Promise<{
    success: boolean;
    outputs: WebMidiDevice[];
    inputs: WebMidiDevice[];
    error?: string;
  }> {
    if (!this.isSupported) {
      return {
        success: false,
        outputs: [],
        inputs: [],
        error: 'Web MIDI API is not supported in this browser. Use Chrome, Edge, or Opera.',
      };
    }

    try {
      this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: false });
      const outputs = this.getAvailableOutputs();
      const inputs = this.getAvailableInputs();

      if (outputs.length > 0 && !this.selectedOutput) {
        this.selectOutput(outputs[0].id);
      }

      if (inputs.length > 0 && !this.selectedInput) {
        this.selectInput(inputs[0].id);
      }

      // Listen for port connection/disconnection events
      this.midiAccess.onstatechange = () => {
        // Handled dynamically
      };

      return { success: true, outputs, inputs };
    } catch (err: any) {
      return {
        success: false,
        outputs: [],
        inputs: [],
        error: err.message || 'Permission denied for Web MIDI.',
      };
    }
  }

  public getAvailableOutputs(): WebMidiDevice[] {
    if (!this.midiAccess || !this.midiAccess.outputs) return [];
    const devices: WebMidiDevice[] = [];
    this.midiAccess.outputs.forEach((port: any) => {
      devices.push({
        id: port.id,
        name: port.name || 'Virtual MIDI Output',
        manufacturer: port.manufacturer || 'Generic',
        state: port.state || 'connected',
      });
    });
    return devices;
  }

  public getAvailableInputs(): WebMidiDevice[] {
    if (!this.midiAccess || !this.midiAccess.inputs) return [];
    const devices: WebMidiDevice[] = [];
    this.midiAccess.inputs.forEach((port: any) => {
      devices.push({
        id: port.id,
        name: port.name || 'Virtual MIDI Input',
        manufacturer: port.manufacturer || 'Generic',
        state: port.state || 'connected',
      });
    });
    return devices;
  }

  public selectOutput(deviceId: string): boolean {
    if (!this.midiAccess || !this.midiAccess.outputs) return false;
    const output = this.midiAccess.outputs.get(deviceId);
    if (output) {
      this.selectedOutput = output;
      return true;
    }
    return false;
  }

  public selectInput(deviceId: string): boolean {
    if (!this.midiAccess || !this.midiAccess.inputs) return false;
    const input = this.midiAccess.inputs.get(deviceId);
    if (input) {
      // Remove old handler if any
      if (this.selectedInput) {
        this.selectedInput.onmidimessage = null;
      }
      this.selectedInput = input;
      this.selectedInput.onmidimessage = this.handleIncomingMidiMessage.bind(this);
      return true;
    }
    return false;
  }

  public addInputListener(cb: MidiInputCallback) {
    this.inputListeners.add(cb);
  }

  public removeInputListener(cb: MidiInputCallback) {
    this.inputListeners.delete(cb);
  }

  private handleIncomingMidiMessage(event: any) {
    const data = event.data;
    if (!data || data.length < 1) return;

    const statusByte = data[0];
    const messageType = statusByte & 0xF0;
    const channel = (statusByte & 0x0F) + 1;

    let eventData: MidiEventData | null = null;

    if (messageType === 0x90) {
      // Note On (or Note Off if velocity === 0)
      const note = data[1];
      const velocity = data[2];
      if (velocity > 0) {
        eventData = { type: 'noteon', note, velocity, channel, rawBytes: Array.from(data) };
      } else {
        eventData = { type: 'noteoff', note, velocity: 0, channel, rawBytes: Array.from(data) };
      }
    } else if (messageType === 0x80) {
      // Note Off
      eventData = { type: 'noteoff', note: data[1], velocity: data[2], channel, rawBytes: Array.from(data) };
    } else if (messageType === 0xB0) {
      // Control Change (CC)
      eventData = { type: 'cc', cc: data[1], value: data[2], channel, rawBytes: Array.from(data) };
    } else if (messageType === 0xE0) {
      // Pitch Bend
      const val = (data[2] << 7) | data[1]; // 0..16383 (8192 center)
      eventData = { type: 'pitchbend', value: val, channel, rawBytes: Array.from(data) };
    }

    if (eventData) {
      this.inputListeners.forEach((listener) => {
        try {
          listener(eventData!);
        } catch (err) {
          console.error('MIDI Input Listener error:', err);
        }
      });
    }
  }

  public sendNoteOn(note: number, velocity = 80, channel = 1) {
    if (!this.selectedOutput) return;
    const status = 0x90 | ((channel - 1) & 0x0F);
    const clampedNote = Math.max(0, Math.min(127, Math.round(note)));
    const clampedVel = Math.max(1, Math.min(127, Math.round(velocity)));

    this.selectedOutput.send([status, clampedNote, clampedVel]);
    this.activeNotes.add(clampedNote);
  }

  public sendNoteOff(note: number, channel = 1) {
    if (!this.selectedOutput) return;
    const status = 0x80 | ((channel - 1) & 0x0F);
    const clampedNote = Math.max(0, Math.min(127, Math.round(note)));

    this.selectedOutput.send([status, clampedNote, 0]);
    this.activeNotes.delete(clampedNote);
  }

  public sendCC(controller: number, value: number, channel = 1) {
    if (!this.selectedOutput) return;
    const clampedCC = Math.max(0, Math.min(127, Math.round(controller)));
    const clampedVal = Math.max(0, Math.min(127, Math.round(value)));

    // Avoid saturating MIDI with duplicate CC values
    if (this.lastSentCC.get(clampedCC) === clampedVal) return;
    this.lastSentCC.set(clampedCC, clampedVal);

    const status = 0xB0 | ((channel - 1) & 0x0F);
    try {
      this.selectedOutput.send([status, clampedCC, clampedVal]);
    } catch {
      // Ignored
    }
  }

  public sendPhysicalTelemetryCCs(
    resonanceCC: number,
    decayCC: number,
    driveCC: number,
    lfoDepthCC: number,
    cutoffCC: number,
    channel = 1
  ) {
    this.sendCC(71, resonanceCC, channel);
    this.sendCC(75, decayCC, channel);
    this.sendCC(94, driveCC, channel);
    this.sendCC(76, lfoDepthCC, channel);
    this.sendCC(74, cutoffCC, channel);
  }

  public trigger303Step(
    note: number,
    velocity: number,
    slide: boolean,
    durationMs: number,
    prevSlide: boolean,
    channel = 1
  ) {
    if (prevSlide && this.lastNote !== null) {
      this.sendNoteOn(note, velocity, channel);
      const noteToKill = this.lastNote;
      const offTimer = window.setTimeout(() => {
        this.sendNoteOff(noteToKill, channel);
      }, 20);
      this.pendingNoteOffTimers.push(offTimer);
    } else {
      this.sendNoteOn(note, velocity, channel);
    }

    this.lastNote = note;

    if (!slide) {
      const offTimer = window.setTimeout(() => {
        this.sendNoteOff(note, channel);
        if (this.lastNote === note) this.lastNote = null;
      }, Math.max(20, durationMs));
      this.pendingNoteOffTimers.push(offTimer);
    }
  }

  public killAllNotes(channel = 1) {
    this.pendingNoteOffTimers.forEach((timer) => clearTimeout(timer));
    this.pendingNoteOffTimers = [];

    this.activeNotes.forEach((note) => {
      this.sendNoteOff(note, channel);
    });
    this.activeNotes.clear();
    this.lastNote = null;

    this.sendCC(123, 0, channel); // All Notes Off
    this.sendCC(120, 0, channel); // All Sound Off
  }
}

export const webMidi = new WebMidiManager();
