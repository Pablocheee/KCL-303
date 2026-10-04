import * as fs from 'fs/promises';
import { bitnetLinearForward, readLayerWeights } from './bitnet';

export interface TransformerConfig {
  vocabSize: number;     // e.g. 512 tokens
  dModel: number;        // Embedding & hidden dimension (e.g. 128)
  nHeads: number;        // Number of attention heads (e.g. 4)
  dHead: number;         // Dimension per head = dModel / nHeads (e.g. 32)
  dFfn: number;          // Feed-forward hidden dimension (e.g. 512)
  maxSeqLen: number;      // Maximum context window (e.g. 64)
}

export const DEFAULT_TRANSFORMER_CONFIG: TransformerConfig = {
  vocabSize: 512,
  dModel: 128,
  nHeads: 4,
  dHead: 32,
  dFfn: 512,
  maxSeqLen: 64,
};

/**
 * Byte layout map for the Transformer model on disk:
 * 1. Token Embeddings: vocabSize * dModel * 4 bytes (Float32)
 * 2. Positional Embeddings: maxSeqLen * dModel * 4 bytes (Float32)
 * 3. Attention W_q: dModel * dModel bytes (Int8 Ternary)
 * 4. Attention W_k: dModel * dModel bytes (Int8 Ternary)
 * 5. Attention W_v: dModel * dModel bytes (Int8 Ternary)
 * 6. Attention W_o: dModel * dModel bytes (Int8 Ternary)
 * 7. MLP W_up: dModel * dFfn bytes (Int8 Ternary)
 * 8. MLP W_down: dFfn * dModel bytes (Int8 Ternary)
 * 9. LM Head (Unembed): dModel * vocabSize bytes (Int8 Ternary)
 */
export interface TransformerModelOffsets {
  embeddingOffset: number;
  embeddingBytes: number;
  posEmbeddingOffset: number;
  posEmbeddingBytes: number;
  wqOffset: number;
  wqBytes: number;
  wkOffset: number;
  wkBytes: number;
  wvOffset: number;
  wvBytes: number;
  woOffset: number;
  woBytes: number;
  mlpUpOffset: number;
  mlpUpBytes: number;
  mlpDownOffset: number;
  mlpDownBytes: number;
  lmHeadOffset: number;
  lmHeadBytes: number;
  totalSizeBytes: number;
}

export function computeTransformerOffsets(config: TransformerConfig = DEFAULT_TRANSFORMER_CONFIG): TransformerModelOffsets {
  let offset = 0;

  const embeddingBytes = config.vocabSize * config.dModel * 4; // Float32 embeddings
  const embeddingOffset = offset;
  offset += embeddingBytes;

  const posEmbeddingBytes = config.maxSeqLen * config.dModel * 4; // Float32 positional embeddings
  const posEmbeddingOffset = offset;
  offset += posEmbeddingBytes;

  const wqBytes = config.dModel * config.dModel; // Int8 Ternary
  const wqOffset = offset;
  offset += wqBytes;

  const wkBytes = config.dModel * config.dModel; // Int8 Ternary
  const wkOffset = offset;
  offset += wkBytes;

  const wvBytes = config.dModel * config.dModel; // Int8 Ternary
  const wvOffset = offset;
  offset += wvBytes;

  const woBytes = config.dModel * config.dModel; // Int8 Ternary
  const woOffset = offset;
  offset += woBytes;

  const mlpUpBytes = config.dModel * config.dFfn; // Int8 Ternary
  const mlpUpOffset = offset;
  offset += mlpUpBytes;

  const mlpDownBytes = config.dFfn * config.dModel; // Int8 Ternary
  const mlpDownOffset = offset;
  offset += mlpDownBytes;

  const lmHeadBytes = config.dModel * config.vocabSize; // Int8 Ternary
  const lmHeadOffset = offset;
  offset += lmHeadBytes;

  return {
    embeddingOffset,
    embeddingBytes,
    posEmbeddingOffset,
    posEmbeddingBytes,
    wqOffset,
    wqBytes,
    wkOffset,
    wkBytes,
    wvOffset,
    wvBytes,
    woOffset,
    woBytes,
    mlpUpOffset,
    mlpUpBytes,
    mlpDownOffset,
    mlpDownBytes,
    lmHeadOffset,
    lmHeadBytes,
    totalSizeBytes: offset,
  };
}

/**
 * Task 1: Disk-Streamed Embedding Lookup
 * Reads ONLY the d_model Float32 elements for a single token ID from disk.
 * Memory allocated: Exactly dModel * 4 bytes (e.g. 512 bytes for d_model=128), NOT the entire vocab table!
 */
export async function readTokenEmbedding(
  fileHandle: fs.FileHandle,
  embeddingBaseOffset: number,
  tokenId: number,
  dModel: number
): Promise<Float32Array> {
  const byteOffset = embeddingBaseOffset + tokenId * dModel * 4;
  const byteLength = dModel * 4;
  const buffer = Buffer.alloc(byteLength);
  await fileHandle.read(buffer, 0, byteLength, byteOffset);
  return new Float32Array(buffer.buffer, buffer.byteOffset, dModel);
}

/**
 * Disk-Streamed Positional Embedding Lookup for position index
 */
export async function readPositionalEmbedding(
  fileHandle: fs.FileHandle,
  posEmbeddingBaseOffset: number,
  position: number,
  dModel: number
): Promise<Float32Array> {
  const byteOffset = posEmbeddingBaseOffset + position * dModel * 4;
  const byteLength = dModel * 4;
  const buffer = Buffer.alloc(byteLength);
  await fileHandle.read(buffer, 0, byteLength, byteOffset);
  return new Float32Array(buffer.buffer, buffer.byteOffset, dModel);
}

/**
 * Task 2: Root Mean Square Normalization (RMSNorm)
 * Formula: y = x / sqrt(mean(x^2) + eps)
 * Shape: [d_model] -> [d_model]
 */
export function RMSNorm(x: Float32Array, dModel: number, eps: number = 1e-5): Float32Array {
  let sumSquares = 0;
  for (let i = 0; i < dModel; i++) {
    sumSquares += x[i] * x[i];
  }
  const rms = Math.sqrt(sumSquares / dModel + eps);
  const normalized = new Float32Array(dModel);
  for (let i = 0; i < dModel; i++) {
    normalized[i] = x[i] / rms;
  }
  return normalized;
}

/**
 * Softmax function for an array of attention scores (with numerical stability shift)
 */
export function softmax(scores: Float32Array): Float32Array {
  const len = scores.length;
  let max = -Infinity;
  for (let i = 0; i < len; i++) {
    if (scores[i] > max) max = scores[i];
  }

  let sum = 0;
  const exps = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const val = Math.exp(scores[i] - max);
    exps[i] = val;
    sum += val;
  }

  const result = new Float32Array(len);
  const invSum = sum > 0 ? 1 / sum : 0;
  for (let i = 0; i < len; i++) {
    result[i] = exps[i] * invSum;
  }
  return result;
}

export interface AttentionTelemetry {
  attentionMatrix: number[][][]; // [n_heads, seq_len, seq_len]
  qSample: number[];
  kSample: number[];
  vSample: number[];
  readTimeMs: number;
  computeTimeMs: number;
  zeroMulOps: number;
}

/**
 * Task 2: Disk-Streamed Multi-Head Attention (1-bit adapted)
 * 
 * - W_q, W_k, W_v, W_o projection weights are streamed from disk in Int8 ternary format.
 * - Projections computed using zero-multiplication bitnetLinearForward.
 * - Attention dot-products (Q * K^T / sqrt(d_k)) and value pooling use FP32 arithmetic with causal masking.
 * - Shape: Sequence of token vectors [seq_len, d_model] -> [seq_len, d_model]
 */
export async function diskStreamedMultiHeadAttention(
  fileHandle: fs.FileHandle,
  sequenceVectors: Float32Array[], // [seq_len, d_model]
  offsets: TransformerModelOffsets,
  config: TransformerConfig = DEFAULT_TRANSFORMER_CONFIG
): Promise<{ outputVectors: Float32Array[]; telemetry: AttentionTelemetry }> {
  const startRead = performance.now();
  const seqLen = sequenceVectors.length;
  const { dModel, nHeads, dHead } = config;

  // 1. Stream Ternary Projection Matrices from Disk
  // Each is dModel x dModel ternary weights
  const wqChunk = await readLayerWeights(fileHandle, offsets.wqOffset, offsets.wqBytes);
  const wkChunk = await readLayerWeights(fileHandle, offsets.wkOffset, offsets.wkBytes);
  const wvChunk = await readLayerWeights(fileHandle, offsets.wvOffset, offsets.wvBytes);
  const readDuration = performance.now() - startRead;

  const startCompute = performance.now();
  let zeroMulOps = 0;

  // 2. Compute Q, K, V for all tokens in sequence using BitNet ternary kernel
  // Shapes: Q, K, V each [seq_len, d_model]
  const Q: Float32Array[] = [];
  const K: Float32Array[] = [];
  const V: Float32Array[] = [];

  for (let t = 0; t < seqLen; t++) {
    const xNorm = RMSNorm(sequenceVectors[t], dModel);

    const qRes = bitnetLinearForward(xNorm, wqChunk, dModel, dModel);
    const kRes = bitnetLinearForward(xNorm, wkChunk, dModel, dModel);
    const vRes = bitnetLinearForward(xNorm, wvChunk, dModel, dModel);

    Q.push(qRes.output);
    K.push(kRes.output);
    V.push(vRes.output);

    zeroMulOps += (qRes.stats.additions + qRes.stats.subtractions) +
                  (kRes.stats.additions + kRes.stats.subtractions) +
                  (vRes.stats.additions + vRes.stats.subtractions);
  }

  // Release W_q, W_k, W_v buffers so memory is minimal!
  // wqChunk, wkChunk, wvChunk are now freed

  // 3. Multi-Head Scaled Dot-Product Attention with Causal Masking
  // Head Context vectors: [seq_len, d_model]
  const headOutputs: Float32Array[] = Array.from({ length: seqLen }, () => new Float32Array(dModel));
  const attnMatrices: number[][][] = Array.from({ length: nHeads }, () =>
    Array.from({ length: seqLen }, () => new Array(seqLen).fill(0))
  );

  const scale = 1.0 / Math.sqrt(dHead);

  for (let h = 0; h < nHeads; h++) {
    const headOffset = h * dHead;

    for (let i = 0; i < seqLen; i++) {
      // Query for position i in head h (length dHead)
      const q_i = Q[i].subarray(headOffset, headOffset + dHead);

      // Compute attention scores against all previous positions j <= i (Causal Masking)
      const scores = new Float32Array(i + 1);
      for (let j = 0; j <= i; j++) {
        const k_j = K[j].subarray(headOffset, headOffset + dHead);
        let dot = 0;
        for (let d = 0; d < dHead; d++) {
          dot += q_i[d] * k_j[d];
        }
        scores[j] = dot * scale;
      }

      // Softmax over valid causal positions [0 .. i]
      const probs = softmax(scores);

      // Record for telemetry visualization
      for (let j = 0; j <= i; j++) {
        attnMatrices[h][i][j] = probs[j];
      }

      // Compute weighted value context vector for head h
      for (let d = 0; d < dHead; d++) {
        let weightedSum = 0;
        for (let j = 0; j <= i; j++) {
          const v_val = V[j][headOffset + d];
          weightedSum += probs[j] * v_val;
        }
        headOutputs[i][headOffset + d] = weightedSum;
      }
    }
  }

  // 4. Stream Output Projection W_o (dModel x dModel) from Disk & compute BitNet forward
  const woChunk = await readLayerWeights(fileHandle, offsets.woOffset, offsets.woBytes);
  const finalAttnOutputs: Float32Array[] = [];

  for (let t = 0; t < seqLen; t++) {
    const woRes = bitnetLinearForward(headOutputs[t], woChunk, dModel, dModel);
    zeroMulOps += woRes.stats.additions + woRes.stats.subtractions;

    // Residual Addition: x = x + Attention(x)
    const residualOut = new Float32Array(dModel);
    for (let d = 0; d < dModel; d++) {
      residualOut[d] = sequenceVectors[t][d] + woRes.output[d];
    }
    finalAttnOutputs.push(residualOut);
  }

  const computeDuration = performance.now() - startCompute;

  return {
    outputVectors: finalAttnOutputs,
    telemetry: {
      attentionMatrix: attnMatrices,
      qSample: Array.from(Q[seqLen - 1].slice(0, 16)),
      kSample: Array.from(K[seqLen - 1].slice(0, 16)),
      vSample: Array.from(V[seqLen - 1].slice(0, 16)),
      readTimeMs: Number(readDuration.toFixed(2)),
      computeTimeMs: Number(computeDuration.toFixed(2)),
      zeroMulOps,
    },
  };
}

/**
 * Disk-Streamed Feed-Forward Network (MLP Block)
 * Structure: RMSNorm -> BitNet Up-projection (dModel -> dFfn) -> ReLU -> BitNet Down-projection (dFfn -> dModel) -> Residual
 */
export async function diskStreamedBitNetMLP(
  fileHandle: fs.FileHandle,
  sequenceVectors: Float32Array[],
  offsets: TransformerModelOffsets,
  config: TransformerConfig = DEFAULT_TRANSFORMER_CONFIG
): Promise<{ outputVectors: Float32Array[]; zeroMulOps: number }> {
  const { dModel, dFfn } = config;
  const seqLen = sequenceVectors.length;
  let zeroMulOps = 0;

  // 1. Stream Up-Projection from Disk: dModel -> dFfn (e.g. 128 -> 512 = 65,536 ternary weights)
  const upChunk = await readLayerWeights(fileHandle, offsets.mlpUpOffset, offsets.mlpUpBytes);
  const hiddenActivations: Float32Array[] = [];

  for (let t = 0; t < seqLen; t++) {
    const xNorm = RMSNorm(sequenceVectors[t], dModel);
    const upRes = bitnetLinearForward(xNorm, upChunk, dModel, dFfn);
    hiddenActivations.push(upRes.output);
    zeroMulOps += upRes.stats.additions + upRes.stats.subtractions;
  }
  // Release upChunk

  // 2. Stream Down-Projection from Disk: dFfn -> dModel (e.g. 512 -> 128 = 65,536 ternary weights)
  const downChunk = await readLayerWeights(fileHandle, offsets.mlpDownOffset, offsets.mlpDownBytes);
  const finalOutputs: Float32Array[] = [];

  for (let t = 0; t < seqLen; t++) {
    const downRes = bitnetLinearForward(hiddenActivations[t], downChunk, dFfn, dModel);
    zeroMulOps += downRes.stats.additions + downRes.stats.subtractions;

    // Residual Addition: x = x + MLP(x)
    const residualOut = new Float32Array(dModel);
    for (let d = 0; d < dModel; d++) {
      residualOut[d] = sequenceVectors[t][d] + downRes.output[d];
    }
    finalOutputs.push(residualOut);
  }

  return { outputVectors: finalOutputs, zeroMulOps };
}

/**
 * Disk-Streamed LM Head (Unembedding)
 * Takes the last token activation [d_model], streams LM Head weights (dModel -> vocabSize),
 * and computes logits with zero multiplications.
 */
export async function diskStreamedLMHead(
  fileHandle: fs.FileHandle,
  lastTokenActivation: Float32Array,
  offsets: TransformerModelOffsets,
  config: TransformerConfig = DEFAULT_TRANSFORMER_CONFIG,
  temperature: number = 0.7
): Promise<{ nextTokenId: number; topLogits: { id: number; logit: number; prob: number }[] }> {
  const { dModel, vocabSize } = config;

  // Stream LM Head ternary weights from disk: dModel -> vocabSize
  const lmHeadChunk = await readLayerWeights(fileHandle, offsets.lmHeadOffset, offsets.lmHeadBytes);
  const xNorm = RMSNorm(lastTokenActivation, dModel);
  const headRes = bitnetLinearForward(xNorm, lmHeadChunk, dModel, vocabSize);

  const logits = headRes.output;

  // Apply temperature scaling
  const scaled = new Float32Array(vocabSize);
  for (let i = 0; i < vocabSize; i++) {
    scaled[i] = logits[i] / Math.max(0.1, temperature);
  }

  const probs = softmax(scaled);

  // Top logits ranking
  const indexed = Array.from(probs).map((prob, id) => ({ id, prob, logit: logits[id] }));
  indexed.sort((a, b) => b.prob - a.prob);

  // Sample or Greedy select
  let selectedToken = indexed[0].id;
  if (temperature > 0.1) {
    const rand = Math.random();
    let cumulative = 0;
    for (const item of indexed) {
      cumulative += item.prob;
      if (rand <= cumulative) {
        selectedToken = item.id;
        break;
      }
    }
  }

  return {
    nextTokenId: selectedToken,
    topLogits: indexed.slice(0, 5),
  };
}
