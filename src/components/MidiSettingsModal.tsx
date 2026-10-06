import React, { useState } from 'react';
import {
  X,
  Sliders,
  Keyboard,
  Radio,
  RefreshCw,
  Zap,
  CheckCircle2,
  RotateCcw,
  Volume2,
  ChevronDown,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import { useLanguage } from '../i18n/translations';
import { MIDI_PARAMS, MidiParamDefinition } from '../engine/midi_mappings';

interface MidiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MidiSettingsModal: React.FC<MidiSettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const {
    midiInputs,
    midiOutputs,
    selectedMidiInputId,
    selectedMidiOutputId,
    selectMidiInputPort,
    selectMidiOutputPort,
    midiStatusText,
    midiByteLog,
    midiMappings,
    activeLearnParam,
    startMidiLearn,
    stopMidiLearn,
    setMidiMapping,
    resetMidiMappings,
    keyboardOctave,
    setKeyboardOctave,
    activePianoKeys,
  } = useEngine();

  const [activeTab, setActiveTab] = useState<'learn' | 'keyboard' | 'devices'>('learn');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm font-mono animate-fadeIn">
      <div className="bg-slate-950 border-2 border-indigo-500 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-900/60 border border-indigo-500 text-indigo-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>{t('midiSettingsHeader')}</span>
                {activeLearnParam && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-red-600 text-white font-black animate-pulse shadow">
                    {t('midiLearnActiveBadge')}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {t('midiSettingsSub')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopMidiLearn();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer border border-transparent hover:border-slate-700"
            title={t('closeBtn')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-3 pt-2 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('learn')}
            className={`px-3 py-2 rounded-t-lg font-bold transition cursor-pointer flex items-center gap-1.5 border-t border-x ${
              activeTab === 'learn'
                ? 'bg-slate-900 border-indigo-500 text-indigo-300 shadow'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{t('tabFaderMapping')}</span>
          </button>

          <button
            onClick={() => setActiveTab('keyboard')}
            className={`px-3 py-2 rounded-t-lg font-bold transition cursor-pointer flex items-center gap-1.5 border-t border-x ${
              activeTab === 'keyboard'
                ? 'bg-slate-900 border-amber-500 text-amber-300 shadow'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>{t('tabPcKeyboard')}</span>
          </button>

          <button
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-2 rounded-t-lg font-bold transition cursor-pointer flex items-center gap-1.5 border-t border-x ${
              activeTab === 'devices'
                ? 'bg-slate-900 border-emerald-500 text-emerald-300 shadow'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{t('tabDevicesMonitor')}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: MIDI LEARN TABLE */}
          {activeTab === 'learn' && (
            <div className="space-y-3">
              <div className="bg-indigo-950/40 border border-indigo-500/50 rounded-xl p-3 text-xs text-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-inner">
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <span>{t('quickAssignTitle')}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    {t('quickAssignDesc')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetMidiMappings}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 shadow"
                  title={t('resetCcTooltip')}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('resetCcBtn')}</span>
                </button>
              </div>

              {/* MIDI Learn Mapping Grid */}
              <div className="space-y-1.5">
                {MIDI_PARAMS.map((param) => {
                  const assignedCC = midiMappings[param.id] ?? param.defaultCC;
                  const isLearning = activeLearnParam === param.id;

                  return (
                    <div
                      key={param.id}
                      className={`p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                        isLearning
                          ? 'bg-red-950/80 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] ring-1 ring-red-400'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-200">
                            {param.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {param.category}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {param.description}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Current CC Display or Direct Input */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-bold">CC:</span>
                          <input
                            type="number"
                            min="0"
                            max="127"
                            value={assignedCC}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 0 && val <= 127) {
                                setMidiMapping(param.id, val);
                              }
                            }}
                            className="w-14 bg-slate-950 border border-slate-700 text-amber-400 font-mono font-bold text-center py-0.5 rounded text-xs focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        {/* Interactive LEARN Toggle Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isLearning) {
                              stopMidiLearn();
                            } else {
                              startMidiLearn(param.id);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 shadow active:scale-95 border ${
                            isLearning
                              ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                              : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-indigo-500/50'
                          }`}
                        >
                          <Zap className={`w-3.5 h-3.5 ${isLearning ? 'animate-bounce' : 'text-indigo-400'}`} />
                          <span>{isLearning ? t('turnKnobPrompt') : 'LEARN'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: COMPUTER KEYBOARD PIANO */}
          {activeTab === 'keyboard' && (
            <div className="space-y-4">
              <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-3 text-xs text-amber-200 space-y-1.5 shadow-inner">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <Keyboard className="w-4 h-4 text-amber-400" />
                  <span>{t('keyboardPlayTitle')}</span>
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  {t('keyboardPlayDesc')}
                </div>
              </div>

              {/* Current Octave Selector */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">{t('currentKeyOctave')}</span>
                  <span className="text-sm font-black text-amber-400 font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-700">
                    C{Math.floor(keyboardOctave / 12) - 1} ({keyboardOctave} MIDI)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setKeyboardOctave(Math.max(24, keyboardOctave - 12))}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-slate-700 transition cursor-pointer text-xs flex items-center gap-1"
                    title={t('octDownBtn')}
                  >
                    <span>{t('octDownBtn')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeyboardOctave(Math.min(72, keyboardOctave + 12))}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-slate-700 transition cursor-pointer text-xs flex items-center gap-1"
                    title={t('octUpBtn')}
                  >
                    <span>{t('octUpBtn')}</span>
                  </button>
                </div>
              </div>

              {/* Interactive Virtual Keyboard Visualizer */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  <span>{t('keyboardLayoutTitle')}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ● DSP ACID ENGINE ACTIVE
                  </span>
                </div>

                {/* Piano Visualizer */}
                <div className="relative flex justify-center pb-2 select-none overflow-x-auto py-2">
                  {/* White Keys */}
                  <div className="flex gap-1">
                    {[
                      { key: 'a', note: 'C', offset: 0 },
                      { key: 's', note: 'D', offset: 2 },
                      { key: 'd', note: 'E', offset: 4 },
                      { key: 'f', note: 'F', offset: 5 },
                      { key: 'g', note: 'G', offset: 7 },
                      { key: 'h', note: 'A', offset: 9 },
                      { key: 'j', note: 'B', offset: 11 },
                      { key: 'k', note: 'C', offset: 12 },
                      { key: 'l', note: 'D', offset: 14 },
                    ].map((item) => {
                      const noteNum = keyboardOctave + item.offset;
                      const isPressed = activePianoKeys.has(item.key.toLowerCase());
                      return (
                        <div
                          key={item.key}
                          className={`w-9 sm:w-11 h-28 sm:h-32 rounded-b-lg border-2 flex flex-col justify-end items-center pb-2 transition-all shadow ${
                            isPressed
                              ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                              : 'bg-slate-200 text-slate-900 border-slate-400 hover:bg-white'
                          }`}
                        >
                          <span className="font-black text-xs uppercase">{item.note}</span>
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-300/80 px-1 rounded mt-0.5">
                            [{item.key.toUpperCase()}]
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Black Keys Position Overlay */}
                  <div className="absolute top-2 left-0 right-0 flex justify-center pointer-events-none">
                    <div className="flex gap-1">
                      {[
                        { key: 'w', note: 'C#', offset: 1, leftMargin: 'ml-[24px] sm:ml-[30px]' },
                        { key: 'e', note: 'D#', offset: 3, leftMargin: 'ml-[10px] sm:ml-[16px]' },
                        { key: 't', note: 'F#', offset: 6, leftMargin: 'ml-[46px] sm:ml-[56px]' },
                        { key: 'y', note: 'G#', offset: 8, leftMargin: 'ml-[10px] sm:ml-[16px]' },
                        { key: 'u', note: 'A#', offset: 10, leftMargin: 'ml-[10px] sm:ml-[16px]' },
                        { key: 'o', note: 'C#', offset: 13, leftMargin: 'ml-[46px] sm:ml-[56px]' },
                        { key: 'p', note: 'D#', offset: 15, leftMargin: 'ml-[10px] sm:ml-[16px]' },
                      ].map((item) => {
                        const isPressed = activePianoKeys.has(item.key.toLowerCase());
                        return (
                          <div
                            key={item.key}
                            className={`w-6 sm:w-7 h-16 sm:h-18 rounded-b-md border flex flex-col justify-end items-center pb-1 shadow-lg ${item.leftMargin} ${
                              isPressed
                                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,1)]'
                                : 'bg-slate-900 text-slate-200 border-slate-700'
                            }`}
                          >
                            <span className="font-bold text-[9px]">{item.note}</span>
                            <span className="text-[8px] font-mono text-slate-400">
                              [{item.key.toUpperCase()}]
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONNECTED DEVICES & MIDI STREAM MONITOR */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              {/* Port Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* MIDI Input Port */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('midiInputLabel')}</span>
                    </span>
                  </div>
                  <select
                    value={selectedMidiInputId}
                    onChange={(e) => selectMidiInputPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 font-bold p-2 rounded-lg text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {midiInputs.length === 0 ? (
                      <option value="">{t('noMidiInput')}</option>
                    ) : (
                      midiInputs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.manufacturer ? `(${d.manufacturer})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* MIDI Output Port */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('midiOutputLabel')}</span>
                    </span>
                  </div>
                  <select
                    value={selectedMidiOutputId}
                    onChange={(e) => selectMidiOutputPort(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 font-bold p-2 rounded-lg text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {midiOutputs.length === 0 ? (
                      <option value="">{t('noMidiOutput')}</option>
                    ) : (
                      midiOutputs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.manufacturer ? `(${d.manufacturer})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Status and Diagnostics */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400">{t('midiStatusLabel')}</span>
                  <span className="text-emerald-400 font-bold font-mono">{midiStatusText}</span>
                </div>

                {/* Real-Time Live Byte Log */}
                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">
                    {t('liveMidiStream')}
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 h-28 overflow-y-auto space-y-0.5 font-mono text-[10px]">
                    {midiByteLog.length === 0 ? (
                      <div className="text-slate-600 italic">{t('waitingMidi')}</div>
                    ) : (
                      midiByteLog.map((log, idx) => (
                        <div key={idx} className="text-emerald-400/90 leading-tight">
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-400">
            {activeLearnParam ? (
              <span className="text-red-400 font-bold animate-pulse">
                {t('learningKnobStatus')}
              </span>
            ) : (
              <span>{t('ccSavedNotice')}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              stopMidiLearn();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer shadow border border-indigo-400 text-xs"
          >
            {t('doneBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
