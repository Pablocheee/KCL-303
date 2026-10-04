/**
 * WAV Export & Live Session Studio Modal
 * (src/components/WavExportModal.tsx)
 * 
 * Supports:
 *  1. Live Session Recording up to 10 minutes with quiet pre-roll count-in (4..3..2..1)
 *     and capture of all live parameter tweaks (Cutoff, Resonance, Temp, Drive, etc.)
 *  2. Instant OfflineAudioContext Pattern rendering for 1, 2, 4, 8, 16 bars
 *  3. In-browser audio playback, waveform display, and instant .wav download
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Disc,
  Download,
  Play,
  Pause,
  Square,
  Clock,
  Sparkles,
  Sliders,
  Volume2,
  CheckCircle2,
  Flame,
  Radio,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import {
  renderPatternOffline,
  liveRecorder,
  triggerWavDownload,
} from '../engine/wav_recorder';

interface WavExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WavExportModal: React.FC<WavExportModalProps> = ({ isOpen, onClose }) => {
  const {
    pattern,
    bpm,
    waveform,
    effectiveCc,
    dspCharacterMode,
    isPlaying,
    setIsPlaying,
  } = useEngine();

  // Active Tab: 'live' (10-min live session) | 'offline' (fast OfflineAudioContext render)
  const [activeTab, setActiveTab] = useState<'live' | 'offline'>('live');

  // Live Recording State
  const [isCountingIn, setIsCountingIn] = useState<boolean>(false);
  const [countInValue, setCountInValue] = useState<number>(4);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordElapsedSec, setRecordElapsedSec] = useState<number>(0);
  const [recordPeakDb, setRecordPeakDb] = useState<number>(-60);
  const [recordSizeMb, setRecordSizeMb] = useState<number>(0);

  // Finished Recorded Result
  const [recordedWav, setRecordedWav] = useState<{
    blob: Blob;
    durationSec: number;
    sizeMb: number;
    url: string;
  } | null>(null);

  // Audio Preview Player
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);

  // Offline Render Options
  const [offlineBars, setOfflineBars] = useState<number>(4);
  const [isRenderingOffline, setIsRenderingOffline] = useState<boolean>(false);
  const [offlineRenderDone, setOfflineRenderDone] = useState<boolean>(false);

  // Clean up audio object URL on unmount
  useEffect(() => {
    return () => {
      if (recordedWav?.url) {
        URL.revokeObjectURL(recordedWav.url);
      }
    };
  }, [recordedWav]);

  // Handle Pre-Roll Count-in and Recording Start
  const handleStartLiveRecording = async () => {
    setRecordedWav(null);
    setIsPreviewPlaying(false);
    setIsCountingIn(true);
    setCountInValue(4);

    await liveRecorder.startWithCountIn(bpm, {
      onCountIn: (count) => {
        setCountInValue(count);
      },
      onStart: () => {
        setIsCountingIn(false);
        setIsRecording(true);
        // Ensure the TB-303 sequencer is running
        if (!isPlaying) {
          setIsPlaying(true);
        }
      },
      onProgress: ({ elapsedSec, peakDb, sizeMb }) => {
        setRecordElapsedSec(elapsedSec);
        setRecordPeakDb(peakDb);
        setRecordSizeMb(sizeMb);
      },
      onFinish: (result) => {
        setIsRecording(false);
        setRecordedWav(result);
      },
    });
  };

  const handleStopRecording = () => {
    liveRecorder.stop();
    setIsRecording(false);
    setIsCountingIn(false);
  };

  const handleCancelRecording = () => {
    liveRecorder.cancel();
    setIsRecording(false);
    setIsCountingIn(false);
  };

  // Handle OfflineAudioContext High-Speed Render
  const handleOfflineRender = async () => {
    try {
      setIsRenderingOffline(true);
      setOfflineRenderDone(false);

      const cutoffHz = 150 + (effectiveCc.cutoff / 127) * 3500;
      const resonanceQ = 1.0 + (effectiveCc.resonance / 127) * 22.0;
      const decaySec = 0.08 + (effectiveCc.decay / 127) * 0.70;
      const envMod = effectiveCc.envMod / 127;
      const accent = effectiveCc.accent / 127;
      const drive = effectiveCc.drive / 127;

      const result = await renderPatternOffline({
        pattern,
        bpm,
        bars: offlineBars,
        waveform,
        cutoffHz,
        resonanceQ,
        decaySec,
        envMod,
        accent,
        drive,
        characterMode: dspCharacterMode,
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `TB303_Offline_${offlineBars}Bars_${bpm}BPM_${dateStr}.wav`;
      triggerWavDownload(result.blob, filename);

      setIsRenderingOffline(false);
      setOfflineRenderDone(true);
      setTimeout(() => setOfflineRenderDone(false), 4000);
    } catch (e) {
      console.error('Offline render error:', e);
      setIsRenderingOffline(false);
    }
  };

  // Toggle Audio Preview Playback
  const handleTogglePreview = () => {
    if (!audioPreviewRef.current) return;
    if (isPreviewPlaying) {
      audioPreviewRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      audioPreviewRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col font-mono text-white">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-950 border border-rose-600 text-rose-400">
              <Disc className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <div className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                <span>WAV Audio Studio & Export</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-700 font-bold">
                  16-bit 44.1kHz PCM
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Запись сессии до 10 минут с отсчетом или мгновенный OfflineAudioContext рендер
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'live'
                ? 'bg-rose-900/40 border border-rose-600 text-rose-300 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>ЖИВАЯ ЗАПИСЬ (ДО 10 МИНУТ С ОТСЧЕТОМ)</span>
          </button>

          <button
            onClick={() => setActiveTab('offline')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'offline'
                ? 'bg-blue-900/40 border border-blue-600 text-blue-300 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-4 h-4 text-blue-400" />
            <span>БЫСТРЫЙ OFFLINE РЕНДЕР ПАТТЕРНА</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* TAB 1: LIVE RECORDING (UP TO 10 MINUTES) */}
          {activeTab === 'live' && (
            <div className="space-y-4">
              {/* Pre-Roll Count-in HUD Banner */}
              {isCountingIn && (
                <div className="bg-amber-950/80 border-2 border-amber-500 rounded-xl p-5 text-center space-y-3 animate-pulse">
                  <div className="text-xs uppercase tracking-widest text-amber-300 font-black">
                    ТИХИЙ ПРЕДВАРИТЕЛЬНЫЙ ОТСЧЕТ ТЕМПА
                  </div>
                  <div className="text-6xl font-black text-amber-400 font-mono tracking-tighter">
                    {countInValue}
                  </div>
                  <div className="text-xs text-amber-200">
                    Негромкие щелчки метронома ({bpm} BPM) ... Запись начнется автоматически на шаге 1!
                  </div>
                </div>
              )}

              {/* Active Recording State */}
              {isRecording && (
                <div className="bg-rose-950/40 border-2 border-rose-600 rounded-xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-rose-800/60">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping inline-block" />
                      <span className="text-sm font-black text-rose-400 tracking-wider uppercase">
                        ИДЕТ ЗАПИСЬ МАСТЕР-ЗВУКА TB-303
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-300">
                      Лимит: 10:00 (600 сек)
                    </div>
                  </div>

                  {/* Big Timer and Progress Bar */}
                  <div className="text-center space-y-1">
                    <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-widest">
                      {formatTime(recordElapsedSec)} <span className="text-slate-500 text-2xl">/ 10:00</span>
                    </div>
                    <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-rose-600 via-amber-500 to-emerald-500 h-full transition-all duration-150"
                        style={{ width: `${Math.min(100, (recordElapsedSec / 600) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* VU Meter & Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">ПИКОВЫЙ УРОВЕНЬ:</div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-amber-400">{recordPeakDb} dBFS</div>
                        <div className="flex-1 bg-slate-900 h-2 rounded overflow-hidden">
                          <div
                            className="bg-emerald-400 h-full"
                            style={{ width: `${Math.max(0, Math.min(100, (recordPeakDb + 60) * 1.66))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-slate-400 text-[10px]">РАЗМЕР В ПАМЯТИ:</div>
                      <div className="font-bold text-indigo-300">{recordSizeMb} MB (16-bit stereo)</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    💡 <b>Крутите любые ручки:</b> Cutoff, Resonance, Decay, Drive, Temp, Morph. Все ваши манипуляции в реальном времени записываются в файл!
                  </div>

                  {/* Action Buttons while recording */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleStopRecording}
                      className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm transition cursor-pointer shadow-lg flex items-center justify-center gap-2 border border-rose-400"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>ОСТАНОВИТЬ И СОХРАНИТЬ WAV</span>
                    </button>

                    <button
                      onClick={handleCancelRecording}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              {/* Ready to Record State (Idle) */}
              {!isRecording && !isCountingIn && !recordedWav && (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                    <div className="text-amber-400 font-bold uppercase flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>КАК РАБОТАЕТ ЖИВАЯ ЗАПИСЬ ДО 10 МИНУТ:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-[11px]">
                      <li>
                        Перед записью прозвучит <b>негромкий счет 4..3..2..1</b> на текущем темпе ({bpm} BPM).
                      </li>
                      <li>
                        Сразу после счета автоматически включится воспроизведение и пойдет непрерывная запись мастер-шины.
                      </li>
                      <li>
                        Записываются <b>все живые манипуляции со звуком</b>: фильтры, резонанс, перегруз, температура, морфинг и переключение паттернов.
                      </li>
                      <li>
                        Длительность записи — <b>до 10 минут</b> (600 секунд) с выводом студийного PCM WAV файла.
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={handleStartLiveRecording}
                    className="w-full py-3.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm tracking-wider uppercase transition cursor-pointer shadow-[0_0_20px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2.5 border border-rose-400"
                  >
                    <Disc className="w-5 h-5 text-white animate-pulse" />
                    <span>НАЧАТЬ ЖИВУЮ ЗАПИСЬ С ОТСЧЕТОМ (4..3..2..1)</span>
                  </button>
                </div>
              )}

              {/* Recorded WAV Ready Result */}
              {recordedWav && !isRecording && !isCountingIn && (
                <div className="bg-emerald-950/40 border-2 border-emerald-600 rounded-xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-800/60">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm font-black text-emerald-300 uppercase">
                        ЗАПИСЬ СЕССИИ УСПЕШНО ЗАВЕРШЕНА
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">
                      {formatTime(recordedWav.durationSec)} • {recordedWav.sizeMb} MB
                    </span>
                  </div>

                  {/* Hidden Audio Element for Preview */}
                  <audio
                    ref={audioPreviewRef}
                    src={recordedWav.url}
                    onEnded={() => setIsPreviewPlaying(false)}
                    className="hidden"
                  />

                  {/* Preview Player & Controls */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
                    <button
                      onClick={handleTogglePreview}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow"
                    >
                      {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPreviewPlaying ? 'Пауза' : 'Прослушать запись'}</span>
                    </button>

                    <div className="text-xs text-slate-400">
                      Стерео 16-bit 44.1 kHz WAV PCM
                    </div>
                  </div>

                  {/* Download Button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                        triggerWavDownload(recordedWav.blob, `TB303_LiveSession_${dateStr}.wav`);
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition cursor-pointer shadow-lg flex items-center justify-center gap-2 border border-blue-400"
                    >
                      <Download className="w-4 h-4" />
                      <span>СКАЧАТЬ WAV ФАЙЛ ({recordedWav.sizeMb} MB)</span>
                    </button>

                    <button
                      onClick={() => {
                        setRecordedWav(null);
                        setIsPreviewPlaying(false);
                      }}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer border border-slate-700 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Записать заново</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FAST OFFLINE AUDIOCONTEXT RENDER */}
          {activeTab === 'offline' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs text-slate-300">
                <div className="text-blue-400 font-bold uppercase flex items-center gap-1.5 text-xs">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span>МГНОВЕННЫЙ OFFLINEAUDIOCONTEXT РЕНДЕР:</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Рендерит текущий 16-шаговый паттерн на максимальной скорости процессора без задержек и ожидания. Включает эмуляцию диодного фильтра, перегруза и текущие настройки ручек.
                </div>

                {/* Length Selector */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                    <span>ДЛИТЕЛЬНОСТЬ РЕНДЕРА (ТАКТЫ):</span>
                    <span className="text-blue-400">{offlineBars} тактов ({offlineBars * 16} шагов)</span>
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 4, 8, 16].map((bars) => (
                      <button
                        key={bars}
                        onClick={() => setOfflineBars(bars)}
                        className={`py-1.5 rounded-lg font-bold text-xs border transition cursor-pointer ${
                          offlineBars === bars
                            ? 'bg-blue-600 text-white border-blue-400 shadow'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {bars} {bars === 1 ? 'такт' : bars < 5 ? 'такта' : 'тактов'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Parameters Summary */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-slate-400">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <div>Темп:</div>
                    <div className="font-bold text-white">{bpm} BPM</div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <div>Волна:</div>
                    <div className="font-bold text-white uppercase">{waveform}</div>
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <div>Характер:</div>
                    <div className="font-bold text-white uppercase">{dspCharacterMode}</div>
                  </div>
                </div>
              </div>

              {/* Offline Render Button */}
              <button
                disabled={isRenderingOffline}
                onClick={handleOfflineRender}
                className="w-full py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-sm tracking-wider uppercase transition cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 border border-blue-400"
              >
                {isRenderingOffline ? (
                  <>
                    <Disc className="w-5 h-5 animate-spin" />
                    <span>РЕНДЕРИНГ В ПАМЯТИ ЧЕРЕЗ OFFLINEAUDIOCONTEXT...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 text-white" />
                    <span>ОТРЕНДЕРИТЬ И СКАЧАТЬ WAV (.WAV 16-BIT 44.1kHz)</span>
                  </>
                )}
              </button>

              {offlineRenderDone && (
                <div className="p-3 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2 animate-bounce">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>WAV файл паттерна успешно сгенерирован и скачан!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <span>Несжатый студийный PCM WAV (совместим с Ableton, FL Studio, Logic, Reaper)</span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
