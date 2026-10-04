import * as fs from 'fs/promises';
import * as path from 'path';
import type { LayerConfig, LayerStats, InferenceResult, ModelMetadata } from './types';

export const DEFAULT_MODEL_LAYERS: LayerConfig[] = [
  { name: 'Linear-1 (Input Projection)', offset: 0, in: 256, out: 512 },
  { name: 'Linear-2 (Hidden Transformation)', offset: 131072, in: 512, out: 512 },
  { name: 'Linear-3 (Output Bottleneck)', offset: 393216, in: 512, out: 128 },
];

export const DEFAULT_MODEL_DIR = path.resolve(process.cwd(), 'data');
export const DEFAULT_MODEL_FILE = path.resolve(DEFAULT_MODEL_DIR, 'bitnet_model.bin');

/**
 * Generates a binary ternary weight file (-1, 0, 1) directly on the file system.
 * Writes in chunks to ensure zero memory spike during generation.
 */
export async function generateTernaryModelFile(
  filePath: string = DEFAULT_MODEL_FILE,
  layers: LayerConfig[] = DEFAULT_MODEL_LAYERS,
  sparsity: number = 0.33
): Promise<ModelMetadata> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const file = await fs.open(filePath, 'w');
  let currentOffset = 0;
  let totalWeights = 0;
  let countPos = 0;
  let countNeg = 0;
  let countZero = 0;

  try {
    for (const layer of layers) {
      const weightCount = layer.in * layer.out;
      totalWeights += weightCount;
      layer.offset = currentOffset;

      // Generate in chunks of 64KB to maintain minimal memory footprint
      const CHUNK_SIZE = 65536;
      let remaining = weightCount;

      while (remaining > 0) {
        const chunkSize = Math.min(remaining, CHUNK_SIZE);
        const chunk = new Int8Array(chunkSize);

        for (let i = 0; i < chunkSize; i++) {
          const rand = Math.random();
          // Ternary distribution: -1, 0, +1
          if (rand < (1 - sparsity) / 2) {
            chunk[i] = -1;
            countNeg++;
          } else if (rand < 1 - sparsity) {
            chunk[i] = 1;
            countPos++;
          } else {
            chunk[i] = 0;
            countZero++;
          }
        }

        await file.write(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength));
        remaining -= chunkSize;
        currentOffset += chunkSize;
      }
    }
  } finally {
    await file.close();
  }

  const stat = await fs.stat(filePath);

  return {
    path: filePath,
    exists: true,
    sizeBytes: stat.size,
    layers,
    totalWeights,
    createdAt: new Date().toISOString(),
    weightDistribution: {
      positive: countPos,
      negative: countNeg,
      zero: countZero,
    },
  };
}

/**
 * Reads a single layer chunk directly from the SSD at the specified offset.
 * Returned Int8Array is transient and eligible for GC once the layer completes.
 */
export async function readLayerWeights(
  fileHandle: fs.FileHandle,
  offset: number,
  length: number
): Promise<Int8Array> {
  const buffer = Buffer.alloc(length);
  await fileHandle.read(buffer, 0, length, offset);
  return new Int8Array(buffer.buffer, buffer.byteOffset, length);
}

/**
 * BitNet Ternary Linear Forward pass (BitLinear 1.58b).
 * Completely eliminates floating-point / integer matrix multiplication.
 * Uses ONLY addition (+) and subtraction (-), skipping zero weights.
 */
export function bitnetLinearForward(
  inputs: Float32Array,
  weights: Int8Array,
  inputSize: number,
  outputSize: number
): { output: Float32Array; stats: { additions: number; subtractions: number; skips: number } } {
  const output = new Float32Array(outputSize);
  let additions = 0;
  let subtractions = 0;
  let skips = 0;

  for (let outIdx = 0; outIdx < outputSize; outIdx++) {
    let sum = 0;
    const rowOffset = outIdx * inputSize;

    for (let inIdx = 0; inIdx < inputSize; inIdx++) {
      const weight = weights[rowOffset + inIdx];
      if (weight === 1) {
        sum += inputs[inIdx];
        additions++;
      } else if (weight === -1) {
        sum -= inputs[inIdx];
        subtractions++;
      } else {
        skips++;
      }
    }

    // ReLU activation: max(0, sum)
    output[outIdx] = sum > 0 ? sum : 0;
  }

  return {
    output,
    stats: { additions, subtractions, skips },
  };
}

/**
 * Full Disk-Streamed Inference Orchestrator.
 * Reads layer weights sequentially from the SSD, executes pure ternary arithmetic,
 * and releases the weight buffer before moving to the next layer.
 */
export async function runDiskInference(
  modelPath: string = DEFAULT_MODEL_FILE,
  inputVector?: Float32Array,
  layers: LayerConfig[] = DEFAULT_MODEL_LAYERS,
  onLayerProgress?: (stats: LayerStats, currentLayerIndex: number, totalLayers: number) => void
): Promise<InferenceResult> {
  const startTime = performance.now();

  // Ensure model exists, generate if missing
  try {
    await fs.stat(modelPath);
  } catch {
    await generateTernaryModelFile(modelPath, layers);
  }

  const modelStat = await fs.stat(modelPath);

  // Initialize input vector (256-dim default)
  const initialInputSize = layers[0].in;
  let currentActivation: Float32Array;

  if (inputVector && inputVector.length === initialInputSize) {
    currentActivation = inputVector;
  } else {
    currentActivation = new Float32Array(initialInputSize);
    for (let i = 0; i < initialInputSize; i++) {
      // Realistic normalized positive float inputs
      currentActivation[i] = Math.sin((i / initialInputSize) * Math.PI * 4) * 0.5 + 0.5;
    }
  }

  const inputVectorSample = Array.from(currentActivation.slice(0, 32));

  const file = await fs.open(modelPath, 'r');
  const layerStatsList: LayerStats[] = [];

  let totalDiskReadTimeMs = 0;
  let totalComputeTimeMs = 0;
  let totalAdditions = 0;
  let totalSubtractions = 0;
  let totalSkips = 0;
  let peakMemory = 0;

  try {
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const weightSize = layer.in * layer.out;

      // 1. Disk Read Phase (SSD streaming)
      const readStart = performance.now();
      const weightsChunk = await readLayerWeights(file, layer.offset, weightSize);
      const readDuration = performance.now() - readStart;
      totalDiskReadTimeMs += readDuration;

      // 2. Pure Ternary Arithmetic Compute Phase
      const computeStart = performance.now();
      const result = bitnetLinearForward(currentActivation, weightsChunk, layer.in, layer.out);
      const computeDuration = performance.now() - computeStart;
      totalComputeTimeMs += computeDuration;

      currentActivation = result.output;
      totalAdditions += result.stats.additions;
      totalSubtractions += result.stats.subtractions;
      totalSkips += result.stats.skips;

      const mem = process.memoryUsage();
      if (mem.heapUsed > peakMemory) {
        peakMemory = mem.heapUsed;
      }

      // Sample activations and weights for visualization
      const actSample = Array.from(currentActivation.slice(0, Math.min(32, currentActivation.length)));
      const weightSample = Array.from(weightsChunk.slice(0, 64));

      let minAct = Infinity;
      let maxAct = -Infinity;
      let sumAct = 0;
      for (let k = 0; k < currentActivation.length; k++) {
        const val = currentActivation[k];
        if (val < minAct) minAct = val;
        if (val > maxAct) maxAct = val;
        sumAct += val;
      }

      const layerStat: LayerStats = {
        layerIndex: i,
        name: layer.name,
        inSize: layer.in,
        outSize: layer.out,
        offset: layer.offset,
        byteLength: weightSize,
        readTimeMs: Number(readDuration.toFixed(3)),
        computeTimeMs: Number(computeDuration.toFixed(3)),
        additions: result.stats.additions,
        subtractions: result.stats.subtractions,
        skips: result.stats.skips,
        heapUsedBytes: mem.heapUsed,
        activationSample: actSample,
        activationMin: Number(minAct.toFixed(3)),
        activationMax: Number(maxAct.toFixed(3)),
        activationMean: Number((sumAct / currentActivation.length).toFixed(3)),
        weightsSample: weightSample,
      };

      layerStatsList.push(layerStat);

      if (onLayerProgress) {
        onLayerProgress(layerStat, i, layers.length);
      }

      // Explicitly dereference weightsChunk so V8 GC can discard it immediately
      // The GC does not have to retain intermediate layer parameters
    }
  } finally {
    await file.close();
  }

  const totalTime = performance.now() - startTime;
  const totalOperations = totalAdditions + totalSubtractions;
  const fp32EquivalentFlops = (totalAdditions + totalSubtractions + totalSkips) * 2; // MatMul is 1 mul + 1 add per param

  return {
    layers: layerStatsList,
    inputVectorSample,
    outputVector: Array.from(currentActivation),
    totalTimeMs: Number(totalTime.toFixed(2)),
    totalDiskReadTimeMs: Number(totalDiskReadTimeMs.toFixed(2)),
    totalComputeTimeMs: Number(totalComputeTimeMs.toFixed(2)),
    totalAdditions,
    totalSubtractions,
    totalSkips,
    totalOperations,
    fp32EquivalentFlops,
    memoryPeakBytes: peakMemory,
    modelSizeBytes: modelStat.size,
    modelPath,
  };
}
