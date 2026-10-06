import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Play,
  Square,
  RotateCcw,
  Layers,
  Cpu,
  HardDrive,
  Activity,
  FileText,
  Eye,
  Zap,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sliders,
  Disc,
} from 'lucide-react';
import type { TokenGenerationStep, TextGenerationResult } from '../engine/llm_engine';
import { defaultTokenizer } from '../engine/tokenizer';
import { useEngine } from '../context/EngineContext';
import { useLanguage } from '../i18n/translations';

export const TransformerTextGenerator: React.FC = () => {
  const { t } = useLanguage();
  const {
    generatePatternFromTextPrompt,
    modulateSynthFromTokenStep,
    baseCutoffCC,
    baseResonanceCC,
    morphType,
    morphAmount,
    electronFlux,
    isPlaying,
    togglePlay,
    currentStep,
    pattern,
  } = useEngine();

  const [prompt, setPrompt] = useState('Hello');
  const [maxTokens, setMaxTokens] = useState(5);
  const [temperature, setTemperature] = useState(0.7);

  const [isGenerating, setIsGenerating] = useState(false);
  const [tokensStream, setTokensStream] = useState<TokenGenerationStep[]>([]);
  const [activeStep, setActiveStep] = useState<TokenGenerationStep | null>(null);
  const [finalResult, setFinalResult] = useState<TextGenerationResult | null>(null);

  // Live Neuromorphic Audio Stream Mode
  const [isLiveAudioLinkActive, setIsLiveAudioLinkActive] = useState(true);
  const [lastSynthesizedMeta, setLastSynthesizedMeta] = useState<{
    promptText: string;
    suggestedCutoffCC: number;
    suggestedResonanceCC: number;
    suggestedMorphType: string;
    telemetryLog: string[];
  } | null>(null);

  // Instant synchronous client-side tokenization preview
  const tokenizedPrompt = useMemo(() => {
    if (!prompt) return [];
    try {
      const tokens = defaultTokenizer.encode(prompt);
      return tokens.map((id) => ({
        id,
        str: defaultTokenizer.getTokenString(id),
      }));
    } catch {
      return [];
    }
  }, [prompt]);

  // Transform current text prompt into a complete 32-step Acid pattern & sound patch
  const handleSynthesizeAcid = (textToUse?: string) => {
    const targetText = textToUse || prompt;
    if (!targetText.trim()) return;

    const res = generatePatternFromTextPrompt(targetText);
    setLastSynthesizedMeta({
      promptText: targetText,
      suggestedCutoffCC: res.suggestedCutoffCC,
      suggestedResonanceCC: res.suggestedResonanceCC,
      suggestedMorphType: res.suggestedMorphType,
      telemetryLog: res.telemetryLog,
    });
  };

  // Run Real-Time Autoregressive Streaming
  const handleGenerate = () => {
    if (isGenerating || !prompt.trim()) return;

    setIsGenerating(true);
    setTokensStream([]);
    setActiveStep(null);
    setFinalResult(null);

    // Synthesize base acid pattern from initial prompt
    handleSynthesizeAcid(prompt);

    const eventSource = new EventSource(
      `/api/llm/stream?prompt=${encodeURIComponent(prompt)}&maxTokens=${maxTokens}&temperature=${temperature}`
    );

    eventSource.addEventListener('start', (e) => {
      console.log('LLM generation started:', JSON.parse(e.data));
    });

    eventSource.addEventListener('token', (e) => {
      const step: TokenGenerationStep = JSON.parse(e.data);
      setTokensStream((prev) => [...prev, step]);
      setActiveStep(step);

      // LIVE ELECTRON AUDIO MODULATION:
      // Each generated token sweeps the real TB-303 filter & triggers an electron synth step!
      if (isLiveAudioLinkActive) {
        modulateSynthFromTokenStep(step);
      }
    });

    eventSource.addEventListener('done', (e) => {
      const { result } = JSON.parse(e.data);
      setFinalResult(result);
      setIsGenerating(false);
      eventSource.close();

      if (result && result.finalText) {
        handleSynthesizeAcid(result.finalText);
      }
    });

    eventSource.onerror = () => {
      setIsGenerating(false);
      eventSource.close();
    };
  };

  const samplePrompts = ['Hello', 'BitNet', 'neural inference', 'memory disk', 'Intel i5'];

  return (
    <div className="w-full space-y-6">
      {/* 1. Generator Controls Card */}
      <div className="bg-[#0a0f18] rounded-xl border border-slate-800 p-4 lg:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                BitNet Mini-LLM Autoregressive Text Generator
              </h2>
              <p className="text-xs text-slate-400">
                Token-by-Token Disk-Streamed Transformer Inference (Embedding → 4-Head Attention → MLP → LM Head)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
            <span className="text-slate-400">Presets:</span>
            {samplePrompts.map((sp) => (
              <button
                key={sp}
                onClick={() => {
                  setPrompt(sp);
                  handleSynthesizeAcid(sp);
                }}
                disabled={isGenerating}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition text-[11px] cursor-pointer"
              >
                "{sp}"
              </button>
            ))}
          </div>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Prompt Input */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Input Prompt String</span>
              <span className="text-slate-500">{tokenizedPrompt.length} tokens detected</span>
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Type your prompt here..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition placeholder:text-slate-600"
            />
          </div>

          {/* Max Tokens Slider */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex justify-between">
              <span>Max Steps:</span>
              <span className="text-emerald-400 font-bold">{maxTokens}</span>
            </label>
            <input
              type="range"
              min="1"
              max="16"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              disabled={isGenerating}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Temperature Slider */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex justify-between">
              <span>Temperature:</span>
              <span className="text-cyan-400 font-bold">{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="1.2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              disabled={isGenerating}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Generate & Synthesize Buttons */}
          <div className="lg:col-span-3 flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-emerald-950/60 transition disabled:opacity-50 cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Генерация...' : 'Генерировать'}</span>
            </button>

            <button
              onClick={() => handleSynthesizeAcid()}
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black shadow-lg transition disabled:opacity-50 cursor-pointer border border-amber-300"
              title="Преобразовать этот текст в 32-шаговый паттерн и параметры звука TB-303"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Text → Acid</span>
            </button>
          </div>
        </div>

        {/* NEURAL ELECTRON -> TB-303 AUDIO MODULATION BRIDGE STRIP */}
        <div className="bg-slate-950 rounded-xl p-3.5 border-2 border-amber-500/60 shadow-xl space-y-2.5 font-mono">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                СВЯЗЬ МОДЕЛИ ИИ С АНАЛОГОВЫМ ЗВУКОМ TB-303 (ELECTRON AUDIO LINK)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Live Audio Link Toggle */}
              <button
                onClick={() => setIsLiveAudioLinkActive((prev) => !prev)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                  isLiveAudioLinkActive
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isLiveAudioLinkActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{isLiveAudioLinkActive ? t('soundOn') : t('soundOff')}</span>
              </button>

              {/* Play / Stop TB-303 Button */}
              <button
                type="button"
                onClick={togglePlay}
                className={`w-[110px] h-7 rounded text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow select-none whitespace-nowrap shrink-0 ${
                  isPlaying
                    ? 'bg-red-600 text-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isPlaying ? <Square className="w-3.5 h-3.5 fill-current shrink-0" /> : <Play className="w-3.5 h-3.5 fill-current shrink-0" />}
                <span>{isPlaying ? t('stop303') : t('play303')}</span>
              </button>
            </div>
          </div>

          {/* Current Physical Modulations readout */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <Sliders className="w-3 h-3 text-red-400" />
                <span>VCF CUTOFF (CC74):</span>
              </div>
              <div className="text-sm font-black text-red-400">
                {baseCutoffCC} / 127
              </div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>RESONANCE (CC71):</span>
              </div>
              <div className="text-sm font-black text-amber-400">
                {baseResonanceCC} / 127
              </div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <Disc className="w-3 h-3 text-cyan-400" />
                <span>TR-8S MORPH:</span>
              </div>
              <div className="text-sm font-black text-cyan-400 truncate">
                {morphType.replace('_', ' ').toUpperCase()} ({morphAmount}%)
              </div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span>ELECTRON FLUX:</span>
              </div>
              <div className="text-sm font-black text-emerald-400">
                {electronFlux}% (Johnson Noise)
              </div>
            </div>
          </div>

          {/* Live 32-Step Pattern Miniature Preview generated from the text */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>{t('synthesizedRiffTitle')} "{lastSynthesizedMeta?.promptText || prompt}":</span>
              {isPlaying && (
                <span className="text-emerald-400 animate-pulse">{t('stepPlaying').replace('{step}', String(currentStep + 1))}</span>
              )}
            </div>
            <div className="grid grid-cols-16 gap-0.5 max-w-full overflow-hidden">
              {pattern.slice(0, 32).map((s, idx) => {
                const isActive = isPlaying && currentStep === idx;
                return (
                  <div
                    key={idx}
                    className={`h-5 rounded text-[8px] font-bold flex flex-col items-center justify-center transition border ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow'
                        : s.gate
                        ? s.accent
                          ? 'bg-red-600 text-white border-red-400'
                          : 'bg-amber-500/80 text-slate-950 border-amber-400'
                        : 'bg-slate-900 text-slate-600 border-slate-800'
                    }`}
                    title={`Step ${idx + 1}: ${s.noteName} ${s.accent ? '(ACC)' : ''} ${s.slide ? '(SLD)' : ''}`}
                  >
                    <span>{s.gate ? s.noteName : '·'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tokenizer Breakdown Pill List */}
        <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tokenized Sequence & Disk Embedding Offsets:</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">d_model = 128 (512 bytes / token)</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {tokenizedPrompt.map((item, idx) => {
              const byteOffset = item.id * 128 * 4;
              return (
                <div
                  key={idx}
                  title={`Token ID: ${item.id} | Offset: ${byteOffset.toLocaleString()} bytes on disk`}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700/70 text-xs font-mono flex items-center gap-1.5 group hover:border-cyan-500 transition"
                >
                  <span className="text-emerald-300 font-bold">"{item.str}"</span>
                  <span className="text-[10px] text-slate-500 font-normal">#{item.id}</span>
                  <span className="text-[9px] text-cyan-400/80 hidden group-hover:inline">
                    [{byteOffset}B]
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Generation Output & Real-Time Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Generated Text Stream Box */}
        <div className="lg:col-span-7 bg-[#0a0f18] rounded-xl border border-slate-800 p-4 lg:p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <h3 className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
                Autoregressive Output Stream
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                {tokensStream.length} / {maxTokens} tokens produced
              </span>
            </div>

            {/* Rendered Text Box */}
            <div className="bg-slate-950 rounded-lg border border-slate-800/90 p-4 font-mono text-sm leading-relaxed min-h-[140px] text-slate-100 flex flex-wrap items-baseline gap-1">
              <span className="text-slate-400">{prompt}</span>
              {tokensStream.map((st, idx) => (
                <span
                  key={idx}
                  onClick={() => setActiveStep(st)}
                  className={`px-1 py-0.5 rounded cursor-pointer transition ${
                    activeStep?.step === st.step
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 border border-emerald-800/60'
                  }`}
                  title={`Step ${st.step}: Token ID ${st.tokenId} ("${st.tokenStr}") - Click to inspect attention`}
                >
                  {st.tokenStr}
                </span>
              ))}
              {isGenerating && <span className="w-2 h-4 bg-emerald-400 animate-pulse ml-1 inline-block"></span>}
            </div>
          </div>

          {/* Telemetry Summary */}
          {finalResult && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">TOTAL LATENCY</div>
                <div className="text-emerald-400 font-bold">{finalResult.totalTimeMs} ms</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">ZERO-MUL OPS</div>
                <div className="text-cyan-300 font-bold">{finalResult.totalZeroMulOps.toLocaleString()}</div>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-500">PEAK HEAP</div>
                <div className="text-purple-300 font-bold">
                  {(finalResult.peakHeapUsedBytes / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Step Inspector & Top Logits */}
        <div className="lg:col-span-5 bg-[#0a0f18] rounded-xl border border-slate-800 p-4 lg:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Step {activeStep?.step || '—'} LM Head Logits Ranking</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Top 5 Candidates</span>
          </div>

          {activeStep ? (
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-300 flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800/80">
                <span>Selected Token:</span>
                <span className="text-emerald-400 font-bold">
                  ID #{activeStep.tokenId} ("{activeStep.tokenStr}")
                </span>
              </div>

              {/* Logit Probability Bars */}
              <div className="space-y-1.5 pt-1">
                {activeStep.topLogits.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-slate-300">
                        {idx + 1}. <code className="text-emerald-300 bg-slate-950 px-1 rounded">"{item.tokenStr}"</code> (#{item.id})
                      </span>
                      <span className="text-cyan-300 font-semibold">{item.prob}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          idx === 0 ? 'bg-emerald-400' : 'bg-slate-600'
                        }`}
                        style={{ width: `${Math.max(4, item.prob)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-[10px] font-mono text-slate-500 flex justify-between">
                <span>Disk Read: {activeStep.diskReadTimeMs}ms</span>
                <span>BitNet Math: {activeStep.computeTimeMs}ms</span>
                <span>Ops: {activeStep.zeroMulOps.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center text-xs font-mono text-slate-500 space-y-1">
              <Eye className="w-5 h-5 text-slate-600 mb-1" />
              <span>Click "Generate Text" above to stream tokens</span>
              <span>and inspect real-time logits probabilities.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
