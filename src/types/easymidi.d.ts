declare module 'easymidi' {
  export interface Note {
    note: number;
    velocity: number;
    channel: number;
  }

  export interface ControlChange {
    controller: number;
    value: number;
    channel: number;
  }

  export class Output {
    constructor(name: string, isVirtual?: boolean);
    send(type: 'noteon' | 'noteoff', note: Note): void;
    send(type: 'cc', cc: ControlChange): void;
    send(type: string, data: any): void;
    close(): void;
  }

  export class Input {
    constructor(name: string, isVirtual?: boolean);
    on(event: string, callback: (msg: any) => void): void;
    close(): void;
  }

  export function getOutputs(): string[];
  export function getInputs(): string[];
}
