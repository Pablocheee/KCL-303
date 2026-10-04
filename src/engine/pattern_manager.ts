/**
 * Pattern Manager with 32-Step Support & LocalStorage Persistence
 * (src/engine/pattern_manager.ts)
 * 
 * Curated Factory Banks for:
 *  - Acid Patterns (Classic 303 squelch, slides, octave jumps)
 *  - Tribcore (175-190 BPM rolling mental kick-riff, rapid slides)
 *  - Tekno / Acidcore / Hardtek (155-170 BPM soundsystem spiral grooves)
 */

import { TB303StepData, ScaleName, midiToNoteName, SCALES } from './neural_303_types';

export interface SavedPattern {
  id: string;
  name: string;
  category: 'Acid Patterns' | 'Tribcore' | 'Tekno' | string;
  bpm: number;
  scale: ScaleName;
  stepLength: number; // 16 or 32
  steps: TB303StepData[];
  createdAt: number;
  isFactory?: boolean;
}

const STORAGE_KEY = 'neural_303_user_patterns_v3';
const ACTIVE_PATTERN_STORAGE_KEY = 'neural_303_active_pattern_v3';

export function createEmptyPattern(scale: ScaleName, totalSteps = 32): TB303StepData[] {
  const scaleNotes = SCALES[scale]?.notes || [36, 39, 41, 43, 46, 48];
  const rootNote = scaleNotes[0] || 36;
  const steps: TB303StepData[] = [];

  for (let i = 0; i < totalSteps; i++) {
    steps.push({
      stepIndex: i,
      gate: false,
      tie: false,
      note: rootNote,
      noteName: midiToNoteName(rootNote),
      velocity: 80,
      accent: false,
      slide: false,
      octaveUp: false,
      rawActivation: 0,
    });
  }

  return steps;
}

// 9 Rich Factory Patterns: Acid, Tribcore & Tekno
export const FACTORY_PATTERNS: SavedPattern[] = [
  // ==========================================
  // 1. ACID PATTERNS (138 - 144 BPM)
  // ==========================================
  {
    id: 'pat-acid-hardfloor-303',
    name: 'Hardfloor 303 Silver Squelch',
    category: 'Acid Patterns',
    bpm: 138,
    scale: 'c_minor_pentatonic',
    stepLength: 32,
    createdAt: 1710000000000,
    isFactory: true,
    steps: [
      // Bar 1 (Steps 0-7)
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 1, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 2, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.88 },
      { stepIndex: 3, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 4, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 5, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.92 },
      { stepIndex: 6, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 7, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      // Bar 1 (Steps 8-15)
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.85 },
      { stepIndex: 9, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 10, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 11, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 12, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 13, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 14, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.88 },
      { stepIndex: 15, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      // Bar 2 (Steps 16-23)
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 17, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 80, accent: false, slide: true, octaveUp: true, rawActivation: 0.75 },
      { stepIndex: 18, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 19, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 20, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 21, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 22, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 23, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      // Bar 2 (Steps 24-31)
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 25, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 26, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.92 },
      { stepIndex: 27, gate: true, tie: false, note: 53, noteName: 'F2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.98 },
      { stepIndex: 28, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 29, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 30, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 31, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
    ],
  },
  {
    id: 'pat-acid-phrygian-storm',
    name: 'Phrygian Acid Squelch Storm',
    category: 'Acid Patterns',
    bpm: 140,
    scale: 'c_phrygian',
    stepLength: 32,
    createdAt: 1710000001000,
    isFactory: true,
    steps: [
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 1, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 2, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 3, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.85 },
      { stepIndex: 4, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 5, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 6, gate: true, tie: false, note: 40, noteName: 'E1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 7, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.8 },
      { stepIndex: 9, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 10, gate: true, tie: false, note: 44, noteName: 'G#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 11, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 12, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 13, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 14, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.88 },
      { stepIndex: 15, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      // Bar 2
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 17, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 18, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 19, gate: true, tie: false, note: 55, noteName: 'G2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 20, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 21, gate: true, tie: false, note: 52, noteName: 'E2', velocity: 80, accent: false, slide: true, octaveUp: true, rawActivation: 0.8 },
      { stepIndex: 22, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 23, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 80, accent: false, slide: false, octaveUp: true, rawActivation: 0.75 },
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 25, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 26, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 27, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 28, gate: true, tie: false, note: 44, noteName: 'G#1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.85 },
      { stepIndex: 29, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 30, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 31, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
    ],
  },
  {
    id: 'pat-acid-psy-blues-ride',
    name: 'Psy-Acid 303 Hypnosis',
    category: 'Acid Patterns',
    bpm: 144,
    scale: 'c_acid_blues',
    stepLength: 32,
    createdAt: 1710000002000,
    isFactory: true,
    steps: [
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 1, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 2, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 3, gate: true, tie: false, note: 42, noteName: 'F#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 4, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 5, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 6, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.88 },
      { stepIndex: 7, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.85 },
      { stepIndex: 9, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 10, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 11, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 12, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 13, gate: true, tie: false, note: 42, noteName: 'F#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 14, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.85 },
      { stepIndex: 15, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      // Bar 2
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 17, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 18, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 80, accent: false, slide: true, octaveUp: true, rawActivation: 0.7 },
      { stepIndex: 19, gate: true, tie: false, note: 54, noteName: 'F#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.98 },
      { stepIndex: 20, gate: true, tie: false, note: 55, noteName: 'G2', velocity: 80, accent: false, slide: false, octaveUp: true, rawActivation: 0.8 },
      { stepIndex: 21, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 22, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 23, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 80, accent: false, slide: false, octaveUp: true, rawActivation: 0.7 },
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.85 },
      { stepIndex: 25, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.5 },
      { stepIndex: 26, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 27, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 28, gate: true, tie: false, note: 42, noteName: 'F#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 29, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 30, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 31, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
    ],
  },

  // ==========================================
  // 2. TRIBCORE PATTERNS (180 - 190 BPM)
  // High-speed, French Tribcore, relentless rolling basslines
  // ==========================================
  {
    id: 'pat-tribcore-mental-185',
    name: 'Tribcore Mental Kick-Riff 185',
    category: 'Tribcore',
    bpm: 185,
    scale: 'c_minor_pentatonic',
    stepLength: 32,
    createdAt: 1710000003000,
    isFactory: true,
    steps: [
      // Fast rolling 16th tribcore gallop: heavy kicks on 0, 4, 8, 12, accented slides on offbeats
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 1, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 2, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 3, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 4, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 5, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 6, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 7, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 9, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 90, accent: false, slide: true, octaveUp: true, rawActivation: 0.75 },
      { stepIndex: 10, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.98 },
      { stepIndex: 11, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.6 },
      { stepIndex: 12, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 13, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 14, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 15, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.65 },
      // Bar 2 (Variation)
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 17, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 90, accent: false, slide: true, octaveUp: true, rawActivation: 0.7 },
      { stepIndex: 18, gate: true, tie: false, note: 53, noteName: 'F2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 19, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.6 },
      { stepIndex: 20, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 21, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 22, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 23, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 25, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 26, gate: true, tie: false, note: 55, noteName: 'G2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.98 },
      { stepIndex: 27, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.6 },
      { stepIndex: 28, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 29, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 30, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 31, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
    ],
  },
  {
    id: 'pat-tribcore-french-floxy',
    name: 'Floxy Frenchcore Drive 180',
    category: 'Tribcore',
    bpm: 180,
    scale: 'c_phrygian',
    stepLength: 32,
    createdAt: 1710000004000,
    isFactory: true,
    steps: [
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 1, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 2, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 3, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 4, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 5, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 6, gate: true, tie: false, note: 40, noteName: 'E1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 7, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 9, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 90, accent: false, slide: true, octaveUp: true, rawActivation: 0.75 },
      { stepIndex: 10, gate: true, tie: false, note: 52, noteName: 'E2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 11, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 12, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 13, gate: true, tie: false, note: 44, noteName: 'G#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 14, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 15, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      // Bar 2
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 17, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 18, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 19, gate: true, tie: false, note: 52, noteName: 'E2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.65 },
      { stepIndex: 20, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 21, gate: true, tie: false, note: 55, noteName: 'G2', velocity: 90, accent: false, slide: true, octaveUp: true, rawActivation: 0.8 },
      { stepIndex: 22, gate: true, tie: false, note: 52, noteName: 'E2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 23, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.65 },
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 25, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 26, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 27, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 28, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 29, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 30, gate: true, tie: false, note: 40, noteName: 'E1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.92 },
      { stepIndex: 31, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
    ],
  },
  {
    id: 'pat-tribcore-spiral-190',
    name: 'Spiral 190 BPM Tekno-Tribe',
    category: 'Tribcore',
    bpm: 190,
    scale: 'c_acid_blues',
    stepLength: 32,
    createdAt: 1710000005000,
    isFactory: true,
    steps: [
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 1, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 2, gate: true, tie: false, note: 42, noteName: 'F#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 3, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 4, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 5, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 90, accent: false, slide: true, octaveUp: true, rawActivation: 0.75 },
      { stepIndex: 6, gate: true, tie: false, note: 54, noteName: 'F#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 1.0 },
      { stepIndex: 7, gate: true, tie: false, note: 55, noteName: 'G2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.7 },
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 9, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 10, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 11, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 12, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 13, gate: true, tie: false, note: 42, noteName: 'F#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 14, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 15, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
      // Bar 2
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 17, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 90, accent: false, slide: true, octaveUp: true, rawActivation: 0.75 },
      { stepIndex: 18, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 19, gate: true, tie: false, note: 54, noteName: 'F#2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.98 },
      { stepIndex: 20, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 21, gate: true, tie: false, note: 55, noteName: 'G2', velocity: 90, accent: false, slide: true, octaveUp: true, rawActivation: 0.8 },
      { stepIndex: 22, gate: true, tie: false, note: 54, noteName: 'F#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 23, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.65 },
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 25, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 26, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.92 },
      { stepIndex: 27, gate: true, tie: false, note: 42, noteName: 'F#1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 28, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 1.0 },
      { stepIndex: 29, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 30, gate: true, tie: false, note: 42, noteName: 'F#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 31, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.75 },
    ],
  },

  // ==========================================
  // 3. TEKNO / ACIDCORE / HARDTEK PATTERNS (158 - 168 BPM)
  // Spiral Tribe, Free Party, hypnotic rolling screeches
  // ==========================================
  {
    id: 'pat-tekno-23-free-party',
    name: 'Free Tekno 23 Soundsystem',
    category: 'Tekno',
    bpm: 162,
    scale: 'c_minor_pentatonic',
    stepLength: 32,
    createdAt: 1710000006000,
    isFactory: true,
    steps: [
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 1, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 2, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 90, accent: false, slide: true, octaveUp: true, rawActivation: 0.75 },
      { stepIndex: 3, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 4, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 5, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 6, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 7, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 9, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 10, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 11, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.92 },
      { stepIndex: 12, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 13, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 14, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.88 },
      { stepIndex: 15, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      // Bar 2
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 17, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 85, accent: false, slide: true, octaveUp: true, rawActivation: 0.7 },
      { stepIndex: 18, gate: true, tie: false, note: 53, noteName: 'F2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 19, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 80, accent: false, slide: false, octaveUp: true, rawActivation: 0.6 },
      { stepIndex: 20, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 21, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 22, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 23, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 25, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 26, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 27, gate: true, tie: false, note: 55, noteName: 'G2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.98 },
      { stepIndex: 28, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 29, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 30, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.92 },
      { stepIndex: 31, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
    ],
  },
  {
    id: 'pat-tekno-acidcore-165',
    name: 'Acidcore Rave Mayhem 165',
    category: 'Tekno',
    bpm: 165,
    scale: 'c_phrygian',
    stepLength: 32,
    createdAt: 1710000007000,
    isFactory: true,
    steps: [
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 1, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 2, gate: true, tie: false, note: 40, noteName: 'E1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.92 },
      { stepIndex: 3, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 4, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 5, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 85, accent: false, slide: true, octaveUp: true, rawActivation: 0.75 },
      { stepIndex: 6, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 7, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 9, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 10, gate: true, tie: false, note: 44, noteName: 'G#1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 11, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 12, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 13, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 14, gate: true, tie: false, note: 52, noteName: 'E2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 15, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.65 },
      // Bar 2
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 17, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 85, accent: false, slide: true, octaveUp: true, rawActivation: 0.7 },
      { stepIndex: 18, gate: true, tie: false, note: 55, noteName: 'G2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.98 },
      { stepIndex: 19, gate: true, tie: false, note: 52, noteName: 'E2', velocity: 80, accent: false, slide: false, octaveUp: true, rawActivation: 0.6 },
      { stepIndex: 20, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 21, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 85, accent: false, slide: true, octaveUp: true, rawActivation: 0.7 },
      { stepIndex: 22, gate: true, tie: false, note: 44, noteName: 'G#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 23, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 25, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 26, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.92 },
      { stepIndex: 27, gate: true, tie: false, note: 40, noteName: 'E1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.88 },
      { stepIndex: 28, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 29, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 30, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 31, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
    ],
  },
  {
    id: 'pat-tekno-hardtek-168',
    name: 'Hardtek 168 Bouncing Bassline',
    category: 'Tekno',
    bpm: 168,
    scale: 'c_dorian',
    stepLength: 32,
    createdAt: 1710000008000,
    isFactory: true,
    steps: [
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 1, gate: true, tie: false, note: 38, noteName: 'D1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 2, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 3, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 4, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 5, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 6, gate: true, tie: false, note: 45, noteName: 'A1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.92 },
      { stepIndex: 7, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 9, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 10, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 90, accent: false, slide: true, octaveUp: true, rawActivation: 0.75 },
      { stepIndex: 11, gate: true, tie: false, note: 50, noteName: 'D2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 12, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 13, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 14, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 15, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      // Bar 2
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 17, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 85, accent: false, slide: true, octaveUp: true, rawActivation: 0.7 },
      { stepIndex: 18, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 19, gate: true, tie: false, note: 53, noteName: 'F2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.98 },
      { stepIndex: 20, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 21, gate: true, tie: false, note: 50, noteName: 'D2', velocity: 85, accent: false, slide: true, octaveUp: true, rawActivation: 0.7 },
      { stepIndex: 22, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 23, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 25, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 26, gate: true, tie: false, note: 45, noteName: 'A1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 27, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 80, accent: false, slide: false, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 28, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 29, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 30, gate: true, tie: false, note: 38, noteName: 'D1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.92 },
      { stepIndex: 31, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
    ],
  },

  // ==========================================
  // 4. GABBA / HARDCORE PATTERNS (185 - 192 BPM)
  // ==========================================
  {
    id: 'pat-gabba-rotterdam-93',
    name: 'Rotterdam 1993 Gabba Stomp',
    category: 'Gabba',
    bpm: 185,
    scale: 'c_minor_pentatonic',
    stepLength: 32,
    createdAt: 1710000010000,
    isFactory: true,
    steps: [
      // Bar 1 (Steps 0-7): Relentless offbeat stomp with octave punch
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 1, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 2, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.92 },
      { stepIndex: 3, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 4, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 5, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 6, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.88 },
      { stepIndex: 7, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
      // Bar 1 (Steps 8-15)
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 9, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 10, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.92 },
      { stepIndex: 11, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 12, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.88 },
      { stepIndex: 13, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 14, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 15, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      // Bar 2 (Steps 16-23): Screaming gabba hook variation
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 17, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 18, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 19, gate: true, tie: false, note: 53, noteName: 'F2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.98 },
      { stepIndex: 20, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 21, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 22, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.92 },
      { stepIndex: 23, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
      // Bar 2 (Steps 24-31): Final brutal turnaround
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 25, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 26, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 27, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.88 },
      { stepIndex: 28, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 29, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 30, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 31, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
    ],
  },
  {
    id: 'pat-gabba-terror-screech',
    name: 'Thunderdome Terror Screech',
    category: 'Gabba',
    bpm: 190,
    scale: 'c_phrygian',
    stepLength: 32,
    createdAt: 1710000011000,
    isFactory: true,
    steps: [
      // Bar 1 (Steps 0-7)
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 1, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 2, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 3, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 4, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 5, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 6, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 7, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.92 },
      // Bar 1 (Steps 8-15)
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 9, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 10, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 11, gate: true, tie: false, note: 44, noteName: 'G#1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.92 },
      { stepIndex: 12, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 13, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.75 },
      { stepIndex: 14, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 15, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.96 },
      // Bar 2 (Steps 16-23)
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 17, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.92 },
      { stepIndex: 18, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 19, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 20, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 21, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 90, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 22, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 23, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.75 },
      // Bar 2 (Steps 24-31)
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.98 },
      { stepIndex: 25, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 26, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.96 },
      { stepIndex: 27, gate: true, tie: false, note: 55, noteName: 'G2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.99 },
      { stepIndex: 28, gate: true, tie: false, note: 49, noteName: 'C#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 29, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 90, accent: false, slide: true, octaveUp: true, rawActivation: 0.8 },
      { stepIndex: 30, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 31, gate: true, tie: false, note: 37, noteName: 'C#1', velocity: 90, accent: false, slide: false, octaveUp: false, rawActivation: 0.75 },
    ],
  },

  // ==========================================
  // 5. ELECTRO / DETROIT 808 PATTERNS (128 - 132 BPM)
  // ==========================================
  {
    id: 'pat-electro-drexciya-wave',
    name: 'Drexciyan Hydro-Funk',
    category: 'Electro',
    bpm: 128,
    scale: 'c_minor_pentatonic',
    stepLength: 32,
    createdAt: 1710000012000,
    isFactory: true,
    steps: [
      // Bar 1 (Steps 0-7): Syncopated Drexciya funk bounce
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 1, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 2, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.65 },
      { stepIndex: 3, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 4, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 5, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 6, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.92 },
      { stepIndex: 7, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.65 },
      // Bar 1 (Steps 8-15)
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 9, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 10, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 11, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 12, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 13, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 14, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.88 },
      { stepIndex: 15, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      // Bar 2 (Steps 16-23): High aquatic variation
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 17, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 18, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.65 },
      { stepIndex: 19, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.92 },
      { stepIndex: 20, gate: true, tie: false, note: 53, noteName: 'F2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 21, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 22, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.92 },
      { stepIndex: 23, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.65 },
      // Bar 2 (Steps 24-31): Bouncy electro turnaround
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 25, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 26, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 27, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.88 },
      { stepIndex: 28, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 29, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 30, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 31, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.7 },
    ],
  },
  {
    id: 'pat-electro-detroit-robot',
    name: 'Detroit Cybernetic 808',
    category: 'Electro',
    bpm: 132,
    scale: 'c_minor_pentatonic',
    stepLength: 32,
    createdAt: 1710000013000,
    isFactory: true,
    steps: [
      // Bar 1 (Steps 0-7): Kraftwerk / Cybotron mechanical drive
      { stepIndex: 0, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 1, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 2, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 3, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 4, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 5, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 6, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.88 },
      { stepIndex: 7, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.65 },
      // Bar 1 (Steps 8-15)
      { stepIndex: 8, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 9, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 10, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 11, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 12, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 13, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 14, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: true, octaveUp: true, rawActivation: 0.95 },
      { stepIndex: 15, gate: true, tie: false, note: 46, noteName: 'A#1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.65 },
      // Bar 2 (Steps 16-23)
      { stepIndex: 16, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 17, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.6 },
      { stepIndex: 18, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 19, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.9 },
      { stepIndex: 20, gate: true, tie: false, note: 51, noteName: 'D#2', velocity: 85, accent: false, slide: true, octaveUp: true, rawActivation: 0.7 },
      { stepIndex: 21, gate: true, tie: false, note: 53, noteName: 'F2', velocity: 127, accent: true, slide: false, octaveUp: true, rawActivation: 0.92 },
      { stepIndex: 22, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 23, gate: true, tie: false, note: 48, noteName: 'C2', velocity: 85, accent: false, slide: false, octaveUp: true, rawActivation: 0.65 },
      // Bar 2 (Steps 24-31)
      { stepIndex: 24, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.95 },
      { stepIndex: 25, gate: false, tie: false, note: 36, noteName: 'C1', velocity: 0, accent: false, slide: false, octaveUp: false, rawActivation: 0 },
      { stepIndex: 26, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.7 },
      { stepIndex: 27, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: false, octaveUp: false, rawActivation: 0.88 },
      { stepIndex: 28, gate: true, tie: false, note: 39, noteName: 'D#1', velocity: 85, accent: false, slide: true, octaveUp: false, rawActivation: 0.65 },
      { stepIndex: 29, gate: true, tie: false, note: 41, noteName: 'F1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.9 },
      { stepIndex: 30, gate: true, tie: false, note: 43, noteName: 'G1', velocity: 127, accent: true, slide: true, octaveUp: false, rawActivation: 0.92 },
      { stepIndex: 31, gate: true, tie: false, note: 36, noteName: 'C1', velocity: 85, accent: false, slide: false, octaveUp: false, rawActivation: 0.7 },
    ],
  },
];

export class PatternManager {
  public static getAllPatterns(): SavedPattern[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const userPatterns: SavedPattern[] = JSON.parse(stored);
        return [...FACTORY_PATTERNS, ...userPatterns];
      }
    } catch (e) {
      console.error('Error loading patterns from localStorage', e);
    }
    return FACTORY_PATTERNS;
  }

  public static getUserPatterns(): SavedPattern[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading user patterns', e);
    }
    return [];
  }

  public static saveUserPattern(name: string, steps: TB303StepData[], bpm: number, scale: ScaleName, stepLength = 32, category = 'User'): SavedPattern {
    const userPatterns = this.getUserPatterns();
    const newPattern: SavedPattern = {
      id: `user-pat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim() || `Pattern ${userPatterns.length + 1}`,
      category,
      bpm,
      scale,
      stepLength,
      steps: JSON.parse(JSON.stringify(steps)),
      createdAt: Date.now(),
      isFactory: false,
    };

    const updated = [newPattern, ...userPatterns];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving user pattern to localStorage', e);
    }
    return newPattern;
  }

  public static deleteUserPattern(id: string): boolean {
    const userPatterns = this.getUserPatterns();
    const updated = userPatterns.filter((p) => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.error('Error deleting pattern', e);
      return false;
    }
  }

  public static saveActivePatternState(steps: TB303StepData[], bpm: number, scale: ScaleName, stepLength = 32) {
    try {
      const state = { steps, bpm, scale, stepLength, timestamp: Date.now() };
      localStorage.setItem(ACTIVE_PATTERN_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving active pattern state', e);
    }
  }

  public static loadActivePatternState(): { steps: TB303StepData[]; bpm: number; scale: ScaleName; stepLength: number } | null {
    try {
      const stored = localStorage.getItem(ACTIVE_PATTERN_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading active pattern state', e);
    }
    return null;
  }

  public static exportPatternsJson(): string {
    const all = this.getAllPatterns();
    return JSON.stringify(all, null, 2);
  }

  public static importPatternsJson(jsonStr: string): number {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return 0;
      const valid = parsed.filter((p) => p && p.steps && Array.isArray(p.steps) && p.name);
      const userPatterns = this.getUserPatterns();
      const merged = [...valid.map((p) => ({ ...p, id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, isFactory: false })), ...userPatterns];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return valid.length;
    } catch (e) {
      console.error('Error importing patterns', e);
      return 0;
    }
  }
}
