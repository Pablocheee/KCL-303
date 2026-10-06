import React from 'react';
import { Sliders, Sparkles, Flame, Zap, Waves, Activity, Disc, Mic2, Music, Radio, Lock, Unlock, Power } from 'lucide-react';
import { HybridKnob } from './HybridKnob';
import { useEngine } from '../context/EngineContext';
import { useLanguage } from '../i18n/translations';
import { FilterMorphType } from '../engine/dsp_audio_engine';

export const TB303FilterSection: React.FC = React.memo(() => {
  const { t, language } = useLanguage();
  const {
    waveform,
    setWaveform,
    baseCutoffCC,
    setBaseCutoffCC,
    baseResonanceCC,
    setBaseResonanceCC,
    baseEnvModCC,
    setBaseEnvModCC,
    baseDecayCC,
    setBaseDecayCC,
    baseAccentCC,
    setBaseAccentCC,
    baseDriveCC,
    setBaseDriveCC,
    baseNarrowCC,
    setBaseNarrowCC,
    effectiveCc,
    isMorphEnabled,
    toggleMorphEnabled,
    morphAmount,
    setMorphAmount,
    morphType,
    setMorphType,
    morphResonance,
    setMorphResonance,
    isStaticKnobsLocked,
    toggleStaticKnobs,
  } = useEngine();

  // Morph display text
  const getMorphDisplay = () => {
    if (!isMorphEnabled) {
      return language === 'ru' ? 'ВЫКЛЮЧЕНО (BYPASS) • 100% DRY' : 'BYPASS (OFF) • 100% DRY';
    }
    if (morphType === 'formant_vocal') {
      if (morphAmount < -40) return 'Vowel /O/ (400Hz)';
      if (morphAmount < 0) return 'Vowel /A/ (800Hz)';
      if (morphAmount < 40) return 'Vowel /E/ (1.4kHz)';
      if (morphAmount < 80) return 'Vowel /I/ (2.2kHz)';
      return 'Vowel /U/ (600Hz)';
    }
    if (morphType === 'comb_resonator') {
      const freq = Math.round(120 + Math.pow((morphAmount + 100) / 200, 2) * 4500);
      return `Comb Ring ${freq}Hz`;
    }
    if (morphAmount < -5) return `LPF -${Math.abs(morphAmount)}%`;
    if (morphAmount > 5) return `HPF +${morphAmount}%`;
    return 'CENTER FLAT (0%)';
  };

  return (
    <div className="bg-slate-100/95 rounded-xl p-3 sm:p-4 border-2 border-slate-400 shadow-xl font-mono text-slate-900 space-y-4 max-w-full overflow-hidden box-border">
      {/* Panel Top Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-300">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-red-600" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            TB-303 + BIPOLAR MORPH FILTER SYNTHESIS ENGINE
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Bipolar LPF ◄── CENTER FLAT ──► HPF / Formants</span>
        </div>
      </div>

      {/* BIPOLAR MORPH FILTER EXPANSION STRIP */}
      <div className={`rounded-xl p-3.5 border-2 shadow-lg text-white space-y-3 transition-all ${
        isMorphEnabled
          ? 'bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 border-amber-500/70'
          : 'bg-slate-950 border-slate-700/80 opacity-90'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Disc className={`w-4 h-4 ${isMorphEnabled ? 'text-amber-400 animate-spin' : 'text-slate-500'}`} />
            <span className={`text-xs font-black uppercase tracking-wider ${isMorphEnabled ? 'text-amber-400' : 'text-slate-400'}`}>
              {t('bipolarMacro')}
            </span>

            {/* Morph Enable / Bypass Power Toggle Button */}
            <button
              onClick={toggleMorphEnabled}
              className={`ml-1 sm:ml-2 px-2.5 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 shadow border ${
                isMorphEnabled
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-600'
              }`}
              title={
                isMorphEnabled
                  ? t('morphTooltipActive')
                  : t('morphTooltipBypass')
              }
            >
              <Power className={`w-3.5 h-3.5 ${isMorphEnabled ? 'text-slate-950 stroke-[3]' : 'text-slate-400'}`} />
              <span>{isMorphEnabled ? t('morphActive') : t('morphBypass')}</span>
            </button>
          </div>

          {/* Morph Type Selector Buttons (Responsive Grid: 2 cols on mobile, 4 cols on desktop) */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] w-full max-w-full sm:w-auto transition ${
            isMorphEnabled ? '' : 'opacity-40 pointer-events-none'
          }`}>
            <button
              onClick={() => setMorphType('tr8s_dj')}
              className={`px-2 py-1.5 rounded font-bold transition cursor-pointer flex items-center justify-center gap-1 text-center truncate ${
                morphType === 'tr8s_dj'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title={t('morphBipolarTooltip')}
            >
              <Disc className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">BIPOLAR</span>
            </button>
            <button
              onClick={() => setMorphType('formant_vocal')}
              className={`px-2 py-1.5 rounded font-bold transition cursor-pointer flex items-center justify-center gap-1 text-center truncate ${
                morphType === 'formant_vocal'
                  ? 'bg-rose-500 text-white font-black shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mic2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">FORMANT</span>
            </button>
            <button
              onClick={() => setMorphType('comb_resonator')}
              className={`px-2 py-1.5 rounded font-bold transition cursor-pointer flex items-center justify-center gap-1 text-center truncate ${
                morphType === 'comb_resonator'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Music className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">COMB RING</span>
            </button>
            <button
              onClick={() => setMorphType('diode_ladder')}
              className={`px-2 py-1.5 rounded font-bold transition cursor-pointer flex items-center justify-center gap-1 text-center truncate ${
                morphType === 'diode_ladder'
                  ? 'bg-red-600 text-white font-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">DIODE ACID</span>
            </button>
          </div>
        </div>

        {/* Morph Sliders & Visualizer */}
        <div className={`grid grid-cols-1 sm:grid-cols-12 gap-3 items-center transition ${
          isMorphEnabled ? '' : 'opacity-40'
        }`}>
          {/* Main Bipolar Morph Slider */}
          <div className="sm:col-span-8 space-y-1 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-amber-300">{t('morphPosition')}</span>
              <span className="text-amber-400 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-[11px]">
                {getMorphDisplay()}
              </span>
            </div>

            <div className="relative py-1">
              <input
                type="range"
                min="-100"
                max="100"
                value={morphAmount}
                onChange={(e) => setMorphAmount(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                <span className="text-blue-400 font-bold">◄ -100% (DARK LPF / VOWEL O)</span>
                <span className={`font-bold ${morphAmount === 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  ● 0% (CENTER FLAT)
                </span>
                <span className="text-amber-400 font-bold">+100% (CRISP HPF / VOWEL U) ►</span>
              </div>
            </div>
          </div>

          {/* Morph Peak Resonance Slider */}
          <div className="sm:col-span-4 space-y-1 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-cyan-300">{t('morphResonance')}</span>
              <span className="text-cyan-400 font-bold">{morphResonance.toFixed(1)} Q</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              step="0.5"
              value={morphResonance}
              onChange={(e) => setMorphResonance(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 pt-1">
              <span>{t('warmQ')}</span>
              <span className="text-cyan-400 font-bold">{t('screamingQ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bass Filter Controls Header Strip with Icon-only Lock Button */}
      <div className="flex items-center justify-between gap-2.5 bg-slate-200/90 p-2.5 rounded-lg border border-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <Sliders className="w-4 h-4 text-slate-700 flex-shrink-0" />
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider truncate">
            {t('vcfVcaControls')}
          </span>
          <span className="text-[10px] text-slate-500 hidden md:inline">
            (Cutoff CC74, Res CC71, EnvMod, Decay CC75, Accent, Drive CC94)
          </span>
        </div>

        {/* ICON-ONLY STATIC / JITTER LOCK BUTTON */}
        <button
          onClick={toggleStaticKnobs}
          className={`p-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center shadow border flex-shrink-0 ${
            isStaticKnobsLocked
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
              : 'bg-slate-300 hover:bg-slate-400 text-slate-800 border-slate-400'
          }`}
          title={
            isStaticKnobsLocked
              ? t('jitterTooltipActive')
              : t('jitterTooltipJitter')
          }
        >
          {isStaticKnobsLocked ? <Lock className="w-4 h-4 text-white" /> : <Unlock className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* Rotary Control Knobs Grid (Waveform + 7 Filter Knobs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3 items-start justify-items-center max-w-full">
        {/* Waveform Selector */}
        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-200/80 border border-slate-300 w-full h-[140px] space-y-2">
          <div className="text-[10px] font-black uppercase text-slate-700">{t('waveform')}</div>
          <div className="flex flex-col gap-1.5 w-full px-1">
            <button
              onClick={() => setWaveform('sawtooth')}
              className={`py-1 px-2 text-[11px] font-bold rounded cursor-pointer transition flex items-center justify-center gap-1 ${
                waveform === 'sawtooth'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
              }`}
            >
              <Waves className="w-3 h-3" />
              <span>{t('sawtooth')}</span>
            </button>
            <button
              onClick={() => setWaveform('square')}
              className={`py-1 px-2 text-[11px] font-bold rounded cursor-pointer transition flex items-center justify-center gap-1 ${
                waveform === 'square'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>{t('square')}</span>
            </button>
          </div>
          <div className="text-[9px] text-slate-500">{t('rawVcoDiode')}</div>
        </div>

        {/* 1. Cutoff Knob */}
        <HybridKnob
          label={t('knobCutoff')}
          subLabel="CC 74 (VCF Freq)"
          baseValue={baseCutoffCC}
          effectiveValue={isStaticKnobsLocked ? baseCutoffCC : effectiveCc.cutoff}
          disableJitter={isStaticKnobsLocked}
          color="purple"
          displayValue={
            isStaticKnobsLocked
              ? `${Math.round(200 + (baseCutoffCC / 127) * 3300)}Hz`
              : `${Math.round(200 + (effectiveCc.cutoff / 127) * 3300)}Hz`
          }
          onChange={setBaseCutoffCC}
        />

        {/* 2. Resonance Knob (Modulated by Token Entropy) */}
        <HybridKnob
          label={t('knobResonance')}
          subLabel="CC 71 (Entropy Q)"
          baseValue={baseResonanceCC}
          effectiveValue={isStaticKnobsLocked ? baseResonanceCC : effectiveCc.resonance}
          disableJitter={isStaticKnobsLocked}
          color="amber"
          displayValue={
            isStaticKnobsLocked
              ? `${(2 + (baseResonanceCC / 127) * 22).toFixed(1)}Q`
              : `${(2 + (effectiveCc.resonance / 127) * 22).toFixed(1)}Q`
          }
          onChange={setBaseResonanceCC}
        />

        {/* 3. Env Mod Knob */}
        <HybridKnob
          label={t('knobEnvMod')}
          subLabel="Sweep Depth"
          baseValue={baseEnvModCC}
          effectiveValue={isStaticKnobsLocked ? baseEnvModCC : effectiveCc.envMod}
          disableJitter={isStaticKnobsLocked}
          color="red"
          displayValue={`${Math.round((baseEnvModCC / 127) * 100)}%`}
          onChange={setBaseEnvModCC}
        />

        {/* 4. Decay Knob (Modulated by Thermal Noise) */}
        <HybridKnob
          label={t('knobDecay')}
          subLabel="CC 75 (Thermal)"
          baseValue={baseDecayCC}
          effectiveValue={isStaticKnobsLocked ? baseDecayCC : effectiveCc.decay}
          disableJitter={isStaticKnobsLocked}
          color="rose"
          displayValue={
            isStaticKnobsLocked
              ? `${Math.round(80 + (baseDecayCC / 127) * 500)}ms`
              : `${Math.round(80 + (effectiveCc.decay / 127) * 500)}ms`
          }
          onChange={setBaseDecayCC}
        />

        {/* 5. Accent Knob */}
        <HybridKnob
          label={t('knobAccent')}
          subLabel="Vel 127 Boost"
          baseValue={baseAccentCC}
          effectiveValue={isStaticKnobsLocked ? baseAccentCC : effectiveCc.accent}
          disableJitter={isStaticKnobsLocked}
          color="emerald"
          displayValue={`${Math.round((baseAccentCC / 127) * 100)}%`}
          onChange={setBaseAccentCC}
        />

        {/* 6. Overdrive Knob (Modulated by Joule Current) */}
        <HybridKnob
          label={t('knobOverdrive')}
          subLabel="CC 94 (Current)"
          baseValue={baseDriveCC}
          effectiveValue={isStaticKnobsLocked ? baseDriveCC : effectiveCc.drive}
          disableJitter={isStaticKnobsLocked}
          color="cyan"
          displayValue={
            isStaticKnobsLocked
              ? `${Math.round((baseDriveCC / 127) * 100)}%`
              : `${Math.round((effectiveCc.drive / 127) * 100)}%`
          }
          onChange={setBaseDriveCC}
        />

        {/* 7. Hard Wave Squeezer / Narrow Filter Knob (Always MAX by default) */}
        <HybridKnob
          label={t('knobNarrow')}
          subLabel="Wave Squeeze"
          baseValue={baseNarrowCC}
          effectiveValue={isStaticKnobsLocked ? baseNarrowCC : effectiveCc.narrow}
          disableJitter={isStaticKnobsLocked}
          color="amber"
          displayValue={
            isStaticKnobsLocked
              ? (baseNarrowCC === 127 ? 'MAX (100%)' : `${Math.round((baseNarrowCC / 127) * 100)}%`)
              : (effectiveCc.narrow === 127 ? 'MAX (100%)' : `${Math.round((effectiveCc.narrow / 127) * 100)}%`)
          }
          onChange={setBaseNarrowCC}
        />
      </div>
    </div>
  );
});
