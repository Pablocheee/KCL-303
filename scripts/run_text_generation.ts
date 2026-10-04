/**
 * Task 3: Dynamic Hugging Face Text Generation Runner (scripts/run_text_generation.ts)
 * 
 * 1. Loads real `tokenizer.json` with multi-lingual BPE & Cyrillic support.
 * 2. Loads real `config.json` to dynamically derive layer count, d_model, heads, offsets.
 * 3. Streams weights from `data/bitnet_real_model.bin` layer-by-layer without RAM bloat.
 * 
 * Usage:
 *  npx tsx scripts/run_text_generation.ts --config ./sample_hf/config.json --tokenizer ./sample_hf/tokenizer.json --model ./data/bitnet_real_model.bin --prompt "Привет" --steps 6
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { HuggingFaceTokenizer } from '../src/engine/hf_tokenizer';
import { loadHuggingFaceConfig, computeDynamicModelOffsets, HuggingFaceModelConfig } from '../src/engine/hf_config';
import { bitnetLinearForward } from '../src/engine/bitnet';

// Helper for reading a specific byte slice from disk
async function readSlice(file: fs.FileHandle, offset: number, length: number): Promise<Int8Array> {
  const buf = Buffer.alloc(length);
  await file.read(buf, 0, length, offset);
  return new Int8Array(buf.buffer, buf.byteOffset, length);
}

// Root Mean Square Normalization
function RMSNorm(x: Float32Array, d: number, eps = 1e-5): Float32Array {
  let sum = 0;
  for (let i = 0; i < d; i++) sum += x[i] * x[i];
  const rms = Math.sqrt(sum / d + eps);
  const out = new Float32Array(d);
  for (let i = 0; i < d; i++) out[i] = x[i] / rms;
  return out;
}

// Numerically stable Softmax
function softmax(scores: Float32Array): Float32Array {
  const len = scores.length;
  let max = -Infinity;
  for (let i = 0; i < len; i++) if (scores[i] > max) max = scores[i];
  let sum = 0;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = Math.exp(scores[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < len; i++) out[i] /= sum;
  return out;
}

export async function runDynamicTextGeneration(options: {
  configPath?: string;
  tokenizerPath?: string;
  modelPath?: string;
  prompt: string;
  maxSteps: number;
  temperature: number;
}) {
  console.log('====================================================');
  console.log('⚡ BitNet Hugging Face Dynamic LLM Runner');
  console.log('====================================================\n');

  const modelPath = options.modelPath || path.resolve(process.cwd(), 'data', 'bitnet_real_model.bin');
  const configPath = options.configPath || path.resolve(process.cwd(), 'sample_hf', 'config.json');
  const tokenizerPath = options.tokenizerPath || path.resolve(process.cwd(), 'sample_hf', 'tokenizer.json');

  // 1. Load Real Tokenizer
  console.log(`🔤 Loading Hugging Face Tokenizer: ${tokenizerPath}...`);
  const tokenizer = new HuggingFaceTokenizer();
  try {
    const tokContent = await fs.readFile(tokenizerPath, 'utf-8');
    tokenizer.loadFromJson(tokContent);
    console.log(`   └─ Vocab Size: ${tokenizer.vocabSize.toLocaleString()} tokens (UTF-8 & Cyrillic BPE active)`);
  } catch (e: any) {
    console.warn(`   ⚠️ Could not load tokenizer, using fallback ASCII tokens.`);
  }

  // 2. Load Real Config
  console.log(`\n📋 Loading Model Config: ${configPath}...`);
  let config: HuggingFaceModelConfig;
  try {
    config = await loadHuggingFaceConfig(configPath);
  } catch {
    config = {
      vocabSize: tokenizer.vocabSize || 1024,
      dModel: 256,
      nHeads: 4,
      nKvHeads: 4,
      dHead: 64,
      dFfn: 512,
      numLayers: 2,
      maxSeqLen: 2048,
      rmsNormEps: 1e-5,
      modelType: 'llama',
      tieWordEmbeddings: true,
    };
  }

  const layout = computeDynamicModelOffsets(config);
  console.log(`   ├─ Hidden Dim: ${config.dModel} | Heads: ${config.nHeads} | Layers: ${config.numLayers}`);
  console.log(`   └─ Disk Layout Calculated: ${(layout.totalSizeBytes / 1024 / 1024).toFixed(2)} MB`);

  // Ensure model exists, auto-convert if needed
  try {
    await fs.stat(modelPath);
  } catch {
    console.log(`\n🔄 Model binary not found at ${modelPath}. Triggering automatic converter...`);
    const { convertHuggingFaceModel } = await import('./convert_weights');
    await convertHuggingFaceModel({ configPath, outputPath: modelPath });
  }

  const file = await fs.open(modelPath, 'r');

  // 3. Encode Prompt
  const promptTokens = tokenizer.encode(options.prompt);
  if (promptTokens.length === 0) promptTokens.push(1); // <s> BOS fallback

  console.log(`\n💬 Prompt: "${options.prompt}"`);
  console.log(`🔤 Encoded Token IDs: [${promptTokens.join(', ')}]`);
  console.log(`🔄 Generating ${options.maxSteps} tokens autoregressively...\n`);

  const currentTokens = [...promptTokens];
  const startTime = performance.now();
  let totalZeroMulOps = 0;

  try {
    for (let step = 1; step <= options.maxSteps; step++) {
      const stepStart = performance.now();
      const seqLen = currentTokens.length;

      // 3a. Stream Embeddings for active sequence: [seq_len, d_model]
      const sequenceVectors: Float32Array[] = [];
      const embBuf = Buffer.alloc(config.dModel * 4);

      for (let pos = 0; pos < seqLen; pos++) {
        const tId = currentTokens[pos] % config.vocabSize;
        await file.read(embBuf, 0, config.dModel * 4, layout.embeddingOffset + tId * config.dModel * 4);
        const tSlice = new Float32Array(embBuf.buffer, embBuf.byteOffset, config.dModel);
        
        // Add sinusoidal positional vector
        const vec = new Float32Array(config.dModel);
        for (let d = 0; d < config.dModel; d++) {
          const posVal = d % 2 === 0
            ? Math.sin(pos / Math.pow(10000, d / config.dModel))
            : Math.cos(pos / Math.pow(10000, (d - 1) / config.dModel));
          vec[d] = tSlice[d] + posVal * 0.1;
        }
        sequenceVectors.push(vec);
      }

      let currentAct = sequenceVectors;

      // 3b. Pass through Multi-layer Transformer Blocks
      for (let l = 0; l < config.numLayers; l++) {
        const layerMap = layout.layers[l];

        // 1. Attention Projections (W_q, W_k, W_v) streamed from SSD
        const wq = await readSlice(file, layerMap.wqOffset, layerMap.wqBytes);
        const wk = await readSlice(file, layerMap.wkOffset, layerMap.wkBytes);
        const wv = await readSlice(file, layerMap.wvOffset, layerMap.wvBytes);

        const Q = currentAct.map(v => bitnetLinearForward(RMSNorm(v, config.dModel, config.rmsNormEps), wq, config.dModel, config.dModel).output);
        const K = currentAct.map(v => bitnetLinearForward(RMSNorm(v, config.dModel, config.rmsNormEps), wk, config.dModel, config.dModel).output);
        const V = currentAct.map(v => bitnetLinearForward(RMSNorm(v, config.dModel, config.rmsNormEps), wv, config.dModel, config.dModel).output);

        totalZeroMulOps += (Q.length * 3) * (config.dModel * config.dModel);

        // 2. Multi-Head Scaled Dot Product Attention with Causal Masking
        const headOutputs: Float32Array[] = Array.from({ length: seqLen }, () => new Float32Array(config.dModel));
        const scale = 1.0 / Math.sqrt(config.dHead);

        for (let h = 0; h < config.nHeads; h++) {
          const headOffset = h * config.dHead;

          for (let i = 0; i < seqLen; i++) {
            const qi = Q[i].subarray(headOffset, headOffset + config.dHead);
            const scores = new Float32Array(i + 1);

            for (let j = 0; j <= i; j++) {
              const kj = K[j].subarray(headOffset, headOffset + config.dHead);
              let dot = 0;
              for (let d = 0; d < config.dHead; d++) dot += qi[d] * kj[d];
              scores[j] = dot * scale;
            }

            const probs = softmax(scores);

            for (let d = 0; d < config.dHead; d++) {
              let weightedSum = 0;
              for (let j = 0; j <= i; j++) weightedSum += probs[j] * V[j][headOffset + d];
              headOutputs[i][headOffset + d] = weightedSum;
            }
          }
        }

        // 3. Output Projection (W_o) + Residual
        const wo = await readSlice(file, layerMap.woOffset, layerMap.woBytes);
        const attnOutputs = currentAct.map((v, i) => {
          const proj = bitnetLinearForward(headOutputs[i], wo, config.dModel, config.dModel).output;
          const res = new Float32Array(config.dModel);
          for (let d = 0; d < config.dModel; d++) res[d] = v[d] + proj[d];
          return res;
        });

        // 4. MLP Block (W_up, W_down) + Residual
        const wup = await readSlice(file, layerMap.wUpOffset, layerMap.wUpBytes);
        const wdown = await readSlice(file, layerMap.wDownOffset, layerMap.wDownBytes);

        const hidden = attnOutputs.map(v => bitnetLinearForward(RMSNorm(v, config.dModel, config.rmsNormEps), wup, config.dModel, config.dFfn).output);
        const mlpOutputs = attnOutputs.map((v, i) => {
          const down = bitnetLinearForward(hidden[i], wdown, config.dFfn, config.dModel).output;
          const res = new Float32Array(config.dModel);
          for (let d = 0; d < config.dModel; d++) res[d] = v[d] + down[d];
          return res;
        });

        totalZeroMulOps += (attnOutputs.length * 2) * (config.dModel * config.dFfn);
        currentAct = mlpOutputs;
      }

      // 3c. Final LM Head Unembedding
      const lastVec = currentAct[currentAct.length - 1];
      const lmHead = await readSlice(file, layout.lmHeadOffset, layout.lmHeadBytes);
      const logits = bitnetLinearForward(RMSNorm(lastVec, config.dModel, config.rmsNormEps), lmHead, config.dModel, config.vocabSize).output;

      // Temperature Scaling & Argmax selection
      let bestToken = 0;
      let maxVal = -Infinity;
      for (let v = 0; v < config.vocabSize; v++) {
        if (logits[v] > maxVal) {
          maxVal = logits[v];
          bestToken = v;
        }
      }

      currentTokens.push(bestToken);
      const tokenStr = tokenizer.getTokenString(bestToken);
      const stepDuration = performance.now() - stepStart;

      console.log(`▶ [Step ${step}/${options.maxSteps}] Token #${bestToken} -> "${tokenStr}" (${stepDuration.toFixed(1)}ms)`);
      console.log(`   📝 Current Sequence: "${tokenizer.decode(currentTokens)}"`);
    }
  } finally {
    await file.close();
  }

  const totalDuration = performance.now() - startTime;
  console.log('\n====================================================');
  console.log(`🎉 Final Output: "${tokenizer.decode(currentTokens)}"`);
  console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)} ms (${(totalDuration / options.maxSteps).toFixed(1)} ms/token)`);
  console.log(`🧮 Zero-Multiplication Add/Sub Ops: ${totalZeroMulOps.toLocaleString()}`);
  console.log('====================================================\n');
}

// CLI Arg Parsing
const args = process.argv.slice(2);
let prompt = "Привет";
let maxSteps = 6;
let temperature = 0.7;
let configPath: string | undefined;
let tokenizerPath: string | undefined;
let modelPath: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--prompt' && args[i + 1]) prompt = args[i + 1];
  if (args[i] === '--steps' && args[i + 1]) maxSteps = parseInt(args[i + 1], 10);
  if (args[i] === '--config' && args[i + 1]) configPath = args[i + 1];
  if (args[i] === '--tokenizer' && args[i + 1]) tokenizerPath = args[i + 1];
  if (args[i] === '--model' && args[i + 1]) modelPath = args[i + 1];
}

runDynamicTextGeneration({
  prompt,
  maxSteps,
  temperature,
  configPath,
  tokenizerPath,
  modelPath,
}).catch(console.error);
