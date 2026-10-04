import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TransformerConfig,
  DEFAULT_TRANSFORMER_CONFIG,
  computeTransformerOffsets,
} from './transformer';

export interface QuantizationMetrics {
  totalWeights: number;
  gamma: number; // Mean absolute value scale factor
  sparsityPercent: number;
  positiveCount: number;
  negativeCount: number;
  zeroCount: number;
  originalSizeBytes: number;
  quantizedSizeBytes: number;
  compressionRatio: string;
}

export interface SafetensorHeader {
  [tensorName: string]: {
    dtype: string;
    shape: number[];
    data_offsets: [number, number];
  };
}

/**
 * Task 2: BitNet b1.58 Quantization Function
 * 
 * Mathematical Formulation:
 * 1. Calculate scaling factor gamma = Mean(|W|) = (1 / N) * sum(|W_i|)
 * 2. Scale and round: W_scaled = Round( W / (gamma + eps) )
 * 3. Strict Clamping: W_ternary = Clip( W_scaled, -1, 1 ) in {-1, 0, +1}
 */
export function quantizeWeightsBitNet158(
  weights: Float32Array,
  eps: number = 1e-6
): { ternary: Int8Array; metrics: QuantizationMetrics } {
  const len = weights.length;
  if (len === 0) {
    return {
      ternary: new Int8Array(0),
      metrics: {
        totalWeights: 0,
        gamma: 0,
        sparsityPercent: 0,
        positiveCount: 0,
        negativeCount: 0,
        zeroCount: 0,
        originalSizeBytes: 0,
        quantizedSizeBytes: 0,
        compressionRatio: '1.0x',
      },
    };
  }

  // 1. Calculate Mean Absolute Value (Gamma)
  let absSum = 0;
  for (let i = 0; i < len; i++) {
    absSum += Math.abs(weights[i]);
  }
  const gamma = absSum / len;
  const invGamma = 1.0 / (gamma + eps);

  // 2. Quantize & Clamp to {-1, 0, +1}
  const ternary = new Int8Array(len);
  let pos = 0;
  let neg = 0;
  let zeros = 0;

  for (let i = 0; i < len; i++) {
    const scaled = weights[i] * invGamma;
    const rounded = Math.round(scaled);

    // Strict clamping to {-1, 0, +1}
    let val: number = rounded > 1 ? 1 : rounded < -1 ? -1 : rounded;
    ternary[i] = val;

    if (val === 1) pos++;
    else if (val === -1) neg++;
    else zeros++;
  }

  const origSize = len * 4; // Float32 (4 bytes per element)
  const quantSize = len * 1; // Int8 (1 byte per element)

  return {
    ternary,
    metrics: {
      totalWeights: len,
      gamma: Number(gamma.toFixed(6)),
      sparsityPercent: Number(((zeros / len) * 100).toFixed(2)),
      positiveCount: pos,
      negativeCount: neg,
      zeroCount: zeros,
      originalSizeBytes: origSize,
      quantizedSizeBytes: quantSize,
      compressionRatio: `${(origSize / quantSize).toFixed(1)}x`,
    },
  };
}

/**
 * Lightweight Safetensors Binary Header Parser
 * Safetensors format: [8-byte header length][JSON header metadata][Raw byte buffer]
 */
export function parseSafetensors(fileBuffer: Buffer): {
  header: SafetensorHeader;
  dataBufferOffset: number;
} {
  // Read first 8 bytes (little-endian uint64 header size)
  const headerLength = Number(fileBuffer.readBigUInt64LE(0));
  const headerJsonStr = fileBuffer.subarray(8, 8 + headerLength).toString('utf-8');
  const header: SafetensorHeader = JSON.parse(headerJsonStr);
  const dataBufferOffset = 8 + headerLength;

  return { header, dataBufferOffset };
}

/**
 * Extracts a specific named tensor from a Safetensors buffer as Float32Array
 */
export function extractTensorFromSafetensors(
  fileBuffer: Buffer,
  header: SafetensorHeader,
  dataBufferOffset: number,
  tensorName: string
): Float32Array | null {
  const meta = header[tensorName];
  if (!meta) return null;

  const [start, end] = meta.data_offsets;
  const tensorBytes = fileBuffer.subarray(
    dataBufferOffset + start,
    dataBufferOffset + end
  );

  return new Float32Array(
    tensorBytes.buffer,
    tensorBytes.byteOffset,
    tensorBytes.byteLength / 4
  );
}

export interface ConvertedModelReport {
  outputPath: string;
  totalSizeBytes: number;
  layers: {
    name: string;
    type: 'float32' | 'ternary_int8';
    shape: number[];
    offset: number;
    byteLength: number;
    metrics?: QuantizationMetrics;
  }[];
  totalWeightsQuantized: number;
  overallCompression: string;
}

/**
 * Task 3: Architecture Mapping & Streaming File Write
 * Takes a dictionary of Float32 weight tensors and writes them to the exact BitNet disk layout.
 */
export async function convertAndWriteBitNetModel(
  tensors: {
    tokenEmbeddings: Float32Array;      // [vocabSize, dModel] (Float32)
    positionalEmbeddings?: Float32Array; // [maxSeqLen, dModel] (Float32)
    wq: Float32Array;                   // [dModel, dModel] (Float32 -> Ternary)
    wk: Float32Array;                   // [dModel, dModel] (Float32 -> Ternary)
    wv: Float32Array;                   // [dModel, dModel] (Float32 -> Ternary)
    wo: Float32Array;                   // [dModel, dModel] (Float32 -> Ternary)
    wup: Float32Array;                  // [dModel, dFfn] (Float32 -> Ternary)
    wdown: Float32Array;                // [dFfn, dModel] (Float32 -> Ternary)
    lmHead: Float32Array;               // [dModel, vocabSize] (Float32 -> Ternary)
  },
  outputPath: string,
  config: TransformerConfig = DEFAULT_TRANSFORMER_CONFIG
): Promise<ConvertedModelReport> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const file = await fs.open(outputPath, 'w');
  const offsets = computeTransformerOffsets(config);

  const reportLayers: ConvertedModelReport['layers'] = [];
  let currentOffset = 0;
  let totalQuantizedWeights = 0;
  let totalFp32Bytes = 0;
  let totalFinalBytes = 0;

  try {
    // 1. Token Embeddings: Written as unquantized Float32
    const embBytes = Buffer.from(
      tensors.tokenEmbeddings.buffer,
      tensors.tokenEmbeddings.byteOffset,
      tensors.tokenEmbeddings.byteLength
    );
    await file.write(embBytes);
    reportLayers.push({
      name: 'token_embeddings',
      type: 'float32',
      shape: [config.vocabSize, config.dModel],
      offset: currentOffset,
      byteLength: embBytes.length,
    });
    currentOffset += embBytes.length;
    totalFp32Bytes += embBytes.length;
    totalFinalBytes += embBytes.length;

    // 2. Positional Embeddings: Written as unquantized Float32
    const posEmbeddings = tensors.positionalEmbeddings || generateSinusoidalPosEmbeddings(config.maxSeqLen, config.dModel);
    const posBytes = Buffer.from(
      posEmbeddings.buffer,
      posEmbeddings.byteOffset,
      posEmbeddings.byteLength
    );
    await file.write(posBytes);
    reportLayers.push({
      name: 'position_embeddings',
      type: 'float32',
      shape: [config.maxSeqLen, config.dModel],
      offset: currentOffset,
      byteLength: posBytes.length,
    });
    currentOffset += posBytes.length;
    totalFp32Bytes += posBytes.length;
    totalFinalBytes += posBytes.length;

    // 3. Helper to quantize and write ternary layers
    const quantizeAndWrite = async (name: string, floatTensor: Float32Array, shape: number[]) => {
      const { ternary, metrics } = quantizeWeightsBitNet158(floatTensor);
      const buf = Buffer.from(ternary.buffer, ternary.byteOffset, ternary.byteLength);
      await file.write(buf);

      reportLayers.push({
        name,
        type: 'ternary_int8',
        shape,
        offset: currentOffset,
        byteLength: buf.length,
        metrics,
      });

      currentOffset += buf.length;
      totalQuantizedWeights += floatTensor.length;
      totalFp32Bytes += floatTensor.length * 4;
      totalFinalBytes += buf.length;
    };

    // Quantize Attention Projections
    await quantizeAndWrite('attention.wq', tensors.wq, [config.dModel, config.dModel]);
    await quantizeAndWrite('attention.wk', tensors.wk, [config.dModel, config.dModel]);
    await quantizeAndWrite('attention.wv', tensors.wv, [config.dModel, config.dModel]);
    await quantizeAndWrite('attention.wo', tensors.wo, [config.dModel, config.dModel]);

    // Quantize MLP Projections
    await quantizeAndWrite('mlp.w_up', tensors.wup, [config.dModel, config.dFfn]);
    await quantizeAndWrite('mlp.w_down', tensors.wdown, [config.dFfn, config.dModel]);

    // Quantize LM Head
    await quantizeAndWrite('lm_head', tensors.lmHead, [config.dModel, config.vocabSize]);

  } finally {
    await file.close();
  }

  const stat = await fs.stat(outputPath);

  return {
    outputPath,
    totalSizeBytes: stat.size,
    layers: reportLayers,
    totalWeightsQuantized: totalQuantizedWeights,
    overallCompression: `${(totalFp32Bytes / totalFinalBytes).toFixed(2)}x`,
  };
}

function generateSinusoidalPosEmbeddings(maxLen: number, dModel: number): Float32Array {
  const result = new Float32Array(maxLen * dModel);
  for (let pos = 0; pos < maxLen; pos++) {
    for (let d = 0; d < dModel; d++) {
      const val = d % 2 === 0
        ? Math.sin(pos / Math.pow(10000, d / dModel))
        : Math.cos(pos / Math.pow(10000, (d - 1) / dModel));
      result[pos * dModel + d] = val;
    }
  }
  return result;
}
