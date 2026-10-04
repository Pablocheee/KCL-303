import * as fs from 'fs/promises';
import * as path from 'path';
import { SimpleBPETokenizer, defaultTokenizer } from './tokenizer';
import {
  DEFAULT_TRANSFORMER_CONFIG,
  TransformerConfig,
  computeTransformerOffsets,
  readTokenEmbedding,
  readPositionalEmbedding,
  diskStreamedMultiHeadAttention,
  diskStreamedBitNetMLP,
  diskStreamedLMHead,
  AttentionTelemetry,
} from './transformer';

export const DEFAULT_LLM_MODEL_FILE = path.resolve(process.cwd(), 'data', 'bitnet_transformer.bin');

export interface TokenGenerationStep {
  step: number;
  tokenId: number;
  tokenStr: string;
  accumulatedText: string;
  zeroMulOps: number;
  diskReadTimeMs: number;
  computeTimeMs: number;
  topLogits: { id: number; tokenStr: string; prob: number }[];
  attentionTelemetry?: AttentionTelemetry;
}

export interface TextGenerationResult {
  prompt: string;
  promptTokens: number[];
  generatedTokens: number[];
  finalText: string;
  steps: TokenGenerationStep[];
  totalZeroMulOps: number;
  totalTimeMs: number;
  totalDiskReadTimeMs: number;
  peakHeapUsedBytes: number;
}

/**
 * Generates the binary weights file for the BitNet Transformer on disk in streaming chunks.
 */
export async function generateTransformerModelFile(
  filePath: string = DEFAULT_LLM_MODEL_FILE,
  config: TransformerConfig = DEFAULT_TRANSFORMER_CONFIG
): Promise<{ path: string; sizeBytes: number; offsets: any }> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const file = await fs.open(filePath, 'w');
  const offsets = computeTransformerOffsets(config);

  try {
    // 1. Write Token Embeddings: vocabSize * dModel Float32 values
    // Using simple normalized random vectors
    const embCount = config.vocabSize * config.dModel;
    const embBuffer = Buffer.alloc(embCount * 4);
    for (let i = 0; i < embCount; i++) {
      const val = (Math.random() - 0.5) * 0.1;
      embBuffer.writeFloatLE(val, i * 4);
    }
    await file.write(embBuffer);

    // 2. Write Positional Embeddings: maxSeqLen * dModel Float32 values
    const posCount = config.maxSeqLen * config.dModel;
    const posBuffer = Buffer.alloc(posCount * 4);
    for (let pos = 0; pos < config.maxSeqLen; pos++) {
      for (let d = 0; d < config.dModel; d++) {
        // Sinusoidal positional encoding
        const val = d % 2 === 0
          ? Math.sin(pos / Math.pow(10000, d / config.dModel))
          : Math.cos(pos / Math.pow(10000, (d - 1) / config.dModel));
        posBuffer.writeFloatLE(val, (pos * config.dModel + d) * 4);
      }
    }
    await file.write(posBuffer);

    // 3. Helper to write ternary layers {-1, 0, 1} in 64KB chunks
    const writeTernaryLayer = async (count: number) => {
      const CHUNK_SIZE = 65536;
      let remaining = count;
      while (remaining > 0) {
        const size = Math.min(remaining, CHUNK_SIZE);
        const chunk = Buffer.alloc(size);
        for (let i = 0; i < size; i++) {
          const rand = Math.random();
          if (rand < 0.33) chunk.writeInt8(-1, i);
          else if (rand < 0.66) chunk.writeInt8(1, i);
          else chunk.writeInt8(0, i);
        }
        await file.write(chunk);
        remaining -= size;
      }
    };

    // Write Attention Projections (W_q, W_k, W_v, W_o)
    await writeTernaryLayer(config.dModel * config.dModel); // W_q
    await writeTernaryLayer(config.dModel * config.dModel); // W_k
    await writeTernaryLayer(config.dModel * config.dModel); // W_v
    await writeTernaryLayer(config.dModel * config.dModel); // W_o

    // Write MLP Projections (W_up, W_down)
    await writeTernaryLayer(config.dModel * config.dFfn);  // W_up
    await writeTernaryLayer(config.dFfn * config.dModel);  // W_down

    // Write LM Head (dModel -> vocabSize)
    await writeTernaryLayer(config.dModel * config.vocabSize);

  } finally {
    await file.close();
  }

  const stat = await fs.stat(filePath);
  return { path: filePath, sizeBytes: stat.size, offsets };
}

/**
 * Task 3: Autoregressive Text Generation Loop with Disk Streaming
 * 
 * 1. Takes prompt string (e.g. "Hello").
 * 2. Encodes prompt to token IDs [t_0, t_1, ...].
 * 3. In each step:
 *    - Looks up embeddings token-by-token directly from disk.
 *    - Passes through DiskStreamed Attention (W_q, W_k, W_v, W_o) with zero multiplications.
 *    - Passes through DiskStreamed MLP (W_up, W_down) with zero multiplications.
 *    - Streams LM Head from disk to predict next token ID.
 *    - Appends token and loops for `maxNewTokens` iterations.
 */
export async function runDiskTextGeneration(
  prompt: string,
  maxNewTokens: number = 5,
  modelPath: string = DEFAULT_LLM_MODEL_FILE,
  temperature: number = 0.7,
  config: TransformerConfig = DEFAULT_TRANSFORMER_CONFIG,
  tokenizer: SimpleBPETokenizer = defaultTokenizer,
  onTokenGenerated?: (step: TokenGenerationStep) => void
): Promise<TextGenerationResult> {
  const startTime = performance.now();

  // Ensure model exists on disk
  try {
    await fs.stat(modelPath);
  } catch {
    await generateTransformerModelFile(modelPath, config);
  }

  const offsets = computeTransformerOffsets(config);
  const fileHandle = await fs.open(modelPath, 'r');

  // 1. Tokenize prompt string
  const promptTokens = tokenizer.encode(prompt);
  if (promptTokens.length === 0) {
    promptTokens.push(1); // <bos> fallback
  }

  const currentTokens = [...promptTokens];
  const generatedTokens: number[] = [];
  const steps: TokenGenerationStep[] = [];

  let totalZeroMulOps = 0;
  let totalDiskReadTime = 0;
  let peakHeap = 0;

  try {
    // 2. Autoregressive loop for maxNewTokens steps
    for (let stepIdx = 0; stepIdx < maxNewTokens; stepIdx++) {
      const stepStart = performance.now();
      const seqLen = Math.min(currentTokens.length, config.maxSeqLen);
      const activeWindowTokens = currentTokens.slice(-seqLen);

      // 2a. Disk-Stream Token Embeddings + Positional Embeddings
      const readStart = performance.now();
      const sequenceVectors: Float32Array[] = [];

      for (let pos = 0; pos < seqLen; pos++) {
        const tokenId = activeWindowTokens[pos];
        // Read ONLY this token's vector from disk (zero RAM bloat)
        const tokenVec = await readTokenEmbedding(fileHandle, offsets.embeddingOffset, tokenId, config.dModel);
        const posVec = await readPositionalEmbedding(fileHandle, offsets.posEmbeddingOffset, pos, config.dModel);

        const combined = new Float32Array(config.dModel);
        for (let d = 0; d < config.dModel; d++) {
          combined[d] = tokenVec[d] + posVec[d];
        }
        sequenceVectors.push(combined);
      }
      const readDuration = performance.now() - readStart;
      totalDiskReadTime += readDuration;

      // 2b. Multi-Head Attention Block (Disk-Streamed W_q, W_k, W_v, W_o)
      const computeStart = performance.now();
      const attnResult = await diskStreamedMultiHeadAttention(fileHandle, sequenceVectors, offsets, config);
      totalZeroMulOps += attnResult.telemetry.zeroMulOps;

      // 2c. Feed-Forward MLP Block (Disk-Streamed W_up, W_down)
      const mlpResult = await diskStreamedBitNetMLP(fileHandle, attnResult.outputVectors, offsets, config);
      totalZeroMulOps += mlpResult.zeroMulOps;

      // 2d. LM Head: Unembedding last token to predict next token ID
      const lastActivation = mlpResult.outputVectors[mlpResult.outputVectors.length - 1];
      const lmResult = await diskStreamedLMHead(fileHandle, lastActivation, offsets, config, temperature);
      const computeDuration = performance.now() - computeStart;

      const nextId = lmResult.nextTokenId;
      generatedTokens.push(nextId);
      currentTokens.push(nextId);

      const tokenStr = tokenizer.getTokenString(nextId);
      const accumulatedText = tokenizer.decode(currentTokens);

      const mem = process.memoryUsage();
      if (mem.heapUsed > peakHeap) peakHeap = mem.heapUsed;

      const stepData: TokenGenerationStep = {
        step: stepIdx + 1,
        tokenId: nextId,
        tokenStr,
        accumulatedText,
        zeroMulOps: attnResult.telemetry.zeroMulOps + mlpResult.zeroMulOps,
        diskReadTimeMs: Number(readDuration.toFixed(2)),
        computeTimeMs: Number(computeDuration.toFixed(2)),
        topLogits: lmResult.topLogits.map((item) => ({
          id: item.id,
          tokenStr: tokenizer.getTokenString(item.id),
          prob: Number((item.prob * 100).toFixed(1)),
        })),
        attentionTelemetry: attnResult.telemetry,
      };

      steps.push(stepData);

      if (onTokenGenerated) {
        onTokenGenerated(stepData);
      }
    }
  } finally {
    await fileHandle.close();
  }

  const totalTime = performance.now() - startTime;
  const finalText = tokenizer.decode(currentTokens);

  return {
    prompt,
    promptTokens,
    generatedTokens,
    finalText,
    steps,
    totalZeroMulOps,
    totalTimeMs: Number(totalTime.toFixed(2)),
    totalDiskReadTimeMs: Number(totalDiskReadTime.toFixed(2)),
    peakHeapUsedBytes: peakHeap,
  };
}
