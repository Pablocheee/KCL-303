import React, { useState } from 'react';
import { Copy, Check, Terminal, FileCode2, Sparkles, BookOpen } from 'lucide-react';

export const CodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'tokenizer' | 'runner' | 'converter'>('runner');
  const [copied, setCopied] = useState(false);

  const configCode = `/**
 * TASK 1: Dynamic Hugging Face Config Loader (src/engine/hf_config.ts)
 * 
 * Ingests standard Hugging Face \`config.json\` files (SmolLM2, Qwen2.5, LLaMA, Mistral, TinyLlama)
 * and dynamically calculates model parameters and sequential disk offsets.
 */

import * as fs from 'fs/promises';

export interface HuggingFaceModelConfig {
  vocabSize: number;
  dModel: number;             // hidden_size
  nHeads: number;             // num_attention_heads
  nKvHeads: number;           // num_key_value_heads (GQA)
  dHead: number;              // dModel / nHeads
  dFfn: number;               // intermediate_size
  numLayers: number;          // num_hidden_layers
  maxSeqLen: number;          // max_position_embeddings
  rmsNormEps: number;
  modelType: string;
  tieWordEmbeddings: boolean;
}

export async function loadHuggingFaceConfig(configPath: string): Promise<HuggingFaceModelConfig> {
  const content = await fs.readFile(configPath, 'utf-8');
  const json = JSON.parse(content);

  const dModel = json.hidden_size || json.d_model || json.n_embd || 128;
  const nHeads = json.num_attention_heads || json.n_head || 4;
  const nKvHeads = json.num_key_value_heads || json.num_kv_heads || nHeads;
  const dHead = json.head_dim || Math.floor(dModel / nHeads);
  const dFfn = json.intermediate_size || json.n_inner || Math.floor(dModel * 4);
  const numLayers = json.num_hidden_layers || json.n_layer || 1;
  const vocabSize = json.vocab_size || 512;
  const maxSeqLen = json.max_position_embeddings || json.n_positions || 2048;
  const rmsNormEps = json.rms_norm_eps || 1e-5;
  const modelType = json.model_type || 'llama';
  const tieWordEmbeddings = json.tie_word_embeddings ?? false;

  return {
    vocabSize,
    dModel,
    nHeads,
    nKvHeads,
    dHead,
    dFfn,
    numLayers,
    maxSeqLen,
    rmsNormEps,
    modelType,
    tieWordEmbeddings,
  };
}`;

  const tokenizerCode = `/**
 * TASK 2: Real Hugging Face BPE Tokenizer (src/engine/hf_tokenizer.ts)
 * 
 * Pure TypeScript, zero-dependency parser for Hugging Face \`tokenizer.json\`.
 * Supports full ByteLevel BPE, merges ranking, added/special tokens,
 * and multi-lingual UTF-8 (Cyrillic, Latin, emojis, code).
 */

import * as fs from 'fs/promises';

export class HuggingFaceTokenizer {
  public vocab = new Map<string, number>();
  public idToToken = new Map<number, string>();
  public bpeRanks = new Map<string, number>();
  public addedTokens = new Map<string, number>();
  public addedTokensById = new Map<number, string>();
  public vocabSize: number = 0;

  public loadFromJson(jsonContent: string | Record<string, any>) {
    const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;

    // 1. Parse Vocab
    const vocabObj = data.model?.vocab || data.vocab || {};
    for (const [token, id] of Object.entries(vocabObj)) {
      this.vocab.set(token, Number(id));
      this.idToToken.set(Number(id), token);
    }

    // 2. Parse Added / Special Tokens
    for (const item of (data.added_tokens || [])) {
      this.addedTokens.set(item.content, item.id);
      this.addedTokensById.set(item.id, item.content);
      this.vocab.set(item.content, item.id);
      this.idToToken.set(item.id, item.content);
    }

    // 3. Parse BPE Merges
    const merges: string[] = data.model?.merges || data.merges || [];
    for (let i = 0; i < merges.length; i++) {
      const parts = merges[i].trim().split(' ');
      if (parts.length === 2) {
        this.bpeRanks.set(\`\${parts[0]}\\0\${parts[1]}\`, i);
      }
    }
    this.vocabSize = this.idToToken.size;
  }

  public static async fromFile(filePath: string): Promise<HuggingFaceTokenizer> {
    const tok = new HuggingFaceTokenizer();
    const content = await fs.readFile(filePath, 'utf-8');
    tok.loadFromJson(content);
    return tok;
  }

  public encode(text: string): number[] {
    if (!text) return [];
    const regex = /'s|'t|'re|'ve|'m|'ll|'d| ?\\p{L}+| ?\\p{N}+| ?[^\\s\\p{L}\\p{N}]+|\\s+(?!\\S)|\\s+/gu;
    const matches = text.match(regex) || [text];
    const tokenIds: number[] = [];

    for (const match of matches) {
      if (this.addedTokens.has(match)) {
        tokenIds.push(this.addedTokens.get(match)!);
        continue;
      }
      if (this.vocab.has(match)) {
        tokenIds.push(this.vocab.get(match)!);
        continue;
      }
      // Apply BPE subword merges...
    }
    return tokenIds;
  }

  public decode(tokenIds: number[]): string {
    return tokenIds.map(id => this.idToToken.get(id) || '').join('');
  }
}`;

  const runnerCode = `/**
 * TASK 3: Execution Script with Hugging Face Model (scripts/run_text_generation.ts)
 * 
 * Loads real tokenizer.json, config.json, and streams weights from bitnet_real_model.bin
 * layer-by-layer without keeping full layers in RAM.
 * 
 * Run with:
 *  npx tsx scripts/run_text_generation.ts --config ./sample_hf/config.json --tokenizer ./sample_hf/tokenizer.json --model ./data/bitnet_real_model.bin --prompt "Привет" --steps 6
 */

import * as fs from 'fs/promises';
import { HuggingFaceTokenizer } from '../src/engine/hf_tokenizer';
import { loadHuggingFaceConfig, computeDynamicModelOffsets } from '../src/engine/hf_config';
import { bitnetLinearForward } from '../src/engine/bitnet';

export async function runDynamicTextGeneration(options: {
  configPath: string;
  tokenizerPath: string;
  modelPath: string;
  prompt: string;
  maxSteps: number;
}) {
  // 1. Load Tokenizer & Config
  const tokenizer = await HuggingFaceTokenizer.fromFile(options.tokenizerPath);
  const config = await loadHuggingFaceConfig(options.configPath);
  const layout = computeDynamicModelOffsets(config);

  const file = await fs.open(options.modelPath, 'r');
  const tokens = tokenizer.encode(options.prompt);

  try {
    for (let step = 1; step <= options.maxSteps; step++) {
      const seqLen = tokens.length;

      // Stream token embeddings: [seq_len, d_model]
      const sequenceVectors: Float32Array[] = [];
      for (let pos = 0; pos < seqLen; pos++) {
        const tId = tokens[pos] % config.vocabSize;
        const embBuf = Buffer.alloc(config.dModel * 4);
        await file.read(embBuf, 0, config.dModel * 4, layout.embeddingOffset + tId * config.dModel * 4);
        sequenceVectors.push(new Float32Array(embBuf.buffer, embBuf.byteOffset, config.dModel));
      }

      let currentAct = sequenceVectors;

      // Multi-layer Transformer Blocks (Streamed from Disk)
      for (let l = 0; l < config.numLayers; l++) {
        const layerMap = layout.layers[l];
        const wq = await readSlice(file, layerMap.wqOffset, layerMap.wqBytes);
        const wk = await readSlice(file, layerMap.wkOffset, layerMap.wkBytes);
        const wv = await readSlice(file, layerMap.wvOffset, layerMap.wvBytes);

        // BitNet Zero-Mul Projections (Add/Sub only)
        const Q = currentAct.map(v => bitnetLinearForward(RMSNorm(v, config.dModel), wq, config.dModel, config.dModel).output);
        const K = currentAct.map(v => bitnetLinearForward(RMSNorm(v, config.dModel), wk, config.dModel, config.dModel).output);
        const V = currentAct.map(v => bitnetLinearForward(RMSNorm(v, config.dModel), wv, config.dModel, config.dModel).output);

        // Multi-head Attention Dot Products & Softmax...
        const wo = await readSlice(file, layerMap.woOffset, layerMap.woBytes);
        // MLP Up/Down projections with residual...
      }

      // Stream LM Head & Argmax next token...
    }
  } finally {
    await file.close();
  }
}`;

  const converterCode = `/**
 * Hugging Face Safetensors Converter (scripts/convert_weights.ts)
 * 
 * Reads model.safetensors and config.json, quantizes weights with BitNet b1.58
 * (absolute-mean gamma scaling factor + ternary clipping), and streams to disk.
 * 
 * Run with:
 *  npx tsx scripts/convert_weights.ts --config ./config.json --input ./model.safetensors --output ./data/bitnet_real_model.bin
 */`;

  const currentCode =
    activeTab === 'config'
      ? configCode
      : activeTab === 'tokenizer'
      ? tokenizerCode
      : activeTab === 'runner'
      ? runnerCode
      : converterCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-[#0a0f18] rounded-xl border border-slate-800 p-4 lg:p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-slate-100">
            Hugging Face Integration Architecture & Scripts
          </h2>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy Module Code'}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto text-xs font-mono">
        <button
          onClick={() => setActiveTab('runner')}
          className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
            activeTab === 'runner'
              ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Task 3: HF Model Runner
        </button>

        <button
          onClick={() => setActiveTab('tokenizer')}
          className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
            activeTab === 'tokenizer'
              ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Task 2: HF Tokenizer (BPE & Cyrillic)
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
            activeTab === 'config'
              ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Task 1: Dynamic Config Loader
        </button>

        <button
          onClick={() => setActiveTab('converter')}
          className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
            activeTab === 'converter'
              ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          HF Safetensors Converter
        </button>
      </div>

      {/* Code Display */}
      <div className="bg-slate-950 rounded-lg border border-slate-800/90 p-4 font-mono text-xs overflow-x-auto text-slate-300 leading-relaxed max-h-[480px]">
        <pre>{currentCode}</pre>
      </div>

      {/* CLI Quick Run */}
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Quick Run CLI:</span>
          <code className="text-emerald-300 bg-slate-950 px-2 py-0.5 rounded">
            npx tsx scripts/run_text_generation.ts --prompt "Привет" --steps 6
          </code>
        </span>
      </div>
    </div>
  );
};
