/**
 * Configurable MIDI CC Mapping & MIDI Learn Manager (src/engine/midi_mappings.ts)
 * 
 * Allows binding ANY incoming hardware MIDI CC controller to ANY plugin fader/knob.
 * Persists in localStorage.
 */

export interface MidiParamDefinition {
  id: string;
  name: string;
  category: 'VCF Filter' | 'Envelopes & Drive' | 'Morph & Physics' | 'LFO & Master';
  defaultCC: number;
  min: number;
  max: number;
  unit: string;
  description: string;
}

export const MIDI_PARAMS: MidiParamDefinition[] = [
  {
    id: 'cutoff',
    name: 'VCF Cutoff (Срез фильтра)',
    category: 'VCF Filter',
    defaultCC: 74,
    min: 0,
    max: 127,
    unit: 'CC',
    description: 'Частота среза аналогового 24dB диодного лестничного фильтра',
  },
  {
    id: 'resonance',
    name: 'VCF Resonance (Резонанс Q)',
    category: 'VCF Filter',
    defaultCC: 71,
    min: 0,
    max: 127,
    unit: 'CC',
    description: 'Фидбек и самовозбуждение кислотного резонанса TB-303',
  },
  {
    id: 'envMod',
    name: 'Env Mod (Глубина огибающей)',
    category: 'VCF Filter',
    defaultCC: 12,
    min: 0,
    max: 127,
    unit: 'CC',
    description: 'Размах движения фильтра при ударе ноты',
  },
  {
    id: 'decay',
    name: 'VCF Decay (Длительность спада)',
    category: 'Envelopes & Drive',
    defaultCC: 75,
    min: 0,
    max: 127,
    unit: 'CC',
    description: 'Время затухания фильтра от пика до базового уровня',
  },
  {
    id: 'accent',
    name: 'Accent (Сила акцента)',
    category: 'Envelopes & Drive',
    defaultCC: 16,
    min: 0,
    max: 127,
    unit: 'CC',
    description: 'Ударная динамика и усиление акцентированных шагов',
  },
  {
    id: 'drive',
    name: 'Overdrive (Аналоговый перегруз)',
    category: 'Envelopes & Drive',
    defaultCC: 94,
    min: 0,
    max: 127,
    unit: 'CC',
    description: 'Сатурация диодного моста и мягкий транзисторный клиппинг',
  },
  {
    id: 'morph',
    name: 'TR-8S Morph Filter (LP/HP)',
    category: 'Morph & Physics',
    defaultCC: 1, // Mod Wheel
    min: -100,
    max: 100,
    unit: '%',
    description: 'Биполярный морфинг High-Pass / Low-Pass фильтра Roland TR-8S',
  },
  {
    id: 'flux',
    name: 'Electron Flux (Квантовый шум)',
    category: 'Morph & Physics',
    defaultCC: 76,
    min: 0,
    max: 100,
    unit: '%',
    description: 'Дробовой шум Джонсона-Найквиста и кинетическая температура',
  },
  {
    id: 'lfoDepth',
    name: 'Pitch LFO Depth (Глубина воббла)',
    category: 'LFO & Master',
    defaultCC: 77,
    min: 20,
    max: 1200,
    unit: 'cents',
    description: 'Размах циклической модуляции высоты ноты и среза фильтра',
  },
  {
    id: 'lfoRate',
    name: 'Pitch LFO Rate (Скорость LFO)',
    category: 'LFO & Master',
    defaultCC: 78,
    min: 1,
    max: 20,
    unit: 'Hz',
    description: 'Частота колебаний LFO в герцах',
  },
  {
    id: 'bpm',
    name: 'Tempo / BPM (Темп секвенсора)',
    category: 'LFO & Master',
    defaultCC: 14,
    min: 40,
    max: 260,
    unit: 'BPM',
    description: 'Скорость воспроизведения шагового секвенсора',
  },
  {
    id: 'tuning',
    name: 'Master Tuning (Строй / Pitch)',
    category: 'LFO & Master',
    defaultCC: 104,
    min: 0,
    max: 127,
    unit: 'CC',
    description: 'Общая подстройка строя синтезатора TB-303 (±2 полутона)',
  },
];

const STORAGE_KEY = 'tb303_midi_cc_mappings_v1';

export type MidiCcMap = Record<string, number>; // paramId -> ccNumber

export class MidiMappingManager {
  public static getDefaultMappings(): MidiCcMap {
    const map: MidiCcMap = {};
    MIDI_PARAMS.forEach((p) => {
      map[p.id] = p.defaultCC;
    });
    return map;
  }

  public static loadMappings(): MidiCcMap {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.getDefaultMappings(), ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load MIDI mappings from localStorage:', e);
    }
    return this.getDefaultMappings();
  }

  public static saveMappings(mappings: MidiCcMap): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    } catch (e) {
      console.warn('Failed to save MIDI mappings to localStorage:', e);
    }
  }

  public static resetMappings(): MidiCcMap {
    const defaults = this.getDefaultMappings();
    this.saveMappings(defaults);
    return defaults;
  }
}
