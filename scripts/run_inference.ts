/**
 * Step 2: Execution Script (run_inference.ts)
 * 
 * Runs disk-streamed BitNet inference on the generated .bin weights file:
 *  1. Opens the binary model directly from disk (no loading model into RAM).
 *  2. Reads layer-by-layer chunks using fs.promises.read at exact byte offsets.
 *  3. Computes zero-multiplication ternary additions & subtractions with ReLU.
 *  4. Drops previous weight buffers for instant GC collection.
 * 
 * Run with: npx tsx scripts/run_inference.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface LayerDef {
  name: string;
  offset: number;
  in: number;
  out: number;
}

const LAYERS: LayerDef[] = [
  { name: 'Layer 1 (Input Projection)', offset: 0, in: 256, out: 512 },
  { name: 'Layer 2 (Hidden Layer)', offset: 131072, in: 512, out: 512 }, 
  { name: 'Layer 3 (Bottleneck / Output)', offset: 393216, in: 512, out: 128 }
];

const MODEL_PATH = path.resolve(process.cwd(), 'data', 'bitnet_model.bin');

/**
 * Reads a single layer slice directly from disk into an Int8Array.
 */
async function readLayerWeights(fileHandle: fs.FileHandle, offset: number, length: number): Promise<Int8Array> {
  const buffer = Buffer.alloc(length);
  await fileHandle.read(buffer, 0, length, offset);
  return new Int8Array(buffer.buffer, buffer.byteOffset, length);
}

/**
 * BitNet Linear Forward: 100% Addition & Subtraction (Zero Multiplications).
 */
function bitnetLinearForward(
  inputs: Float32Array,
  weights: Int8Array,
  inputSize: number,
  outputSize: number
): { output: Float32Array; adds: number; subs: number; skips: number } {
  const output = new Float32Array(outputSize);
  let adds = 0;
  let subs = 0;
  let skips = 0;

  for (let outIdx = 0; outIdx < outputSize; outIdx++) {
    let sum = 0;
    const rowOffset = outIdx * inputSize;

    for (let inIdx = 0; inIdx < inputSize; inIdx++) {
      const weight = weights[rowOffset + inIdx];
      if (weight === 1) {
        sum += inputs[inIdx];
        adds++;
      } else if (weight === -1) {
        sum -= inputs[inIdx];
        subs++;
      } else {
        skips++;
      }
    }

    // ReLU activation: max(0, sum)
    output[outIdx] = sum > 0 ? sum : 0;
  }

  return { output, adds, subs, skips };
}

/**
 * Main Disk-Streamed Inference Orchestrator
 */
export async function runDiskInference(modelPath: string = MODEL_PATH, inputVector?: Float32Array) {
  console.log('====================================================');
  console.log('🚀 BitNet Disk-Streaming Inference Engine');
  console.log('💻 Target Specs: Legacy Dual-Core Intel i5 (2015 MBA)');
  console.log(`📂 Streaming weights from: ${modelPath}`);
  console.log('====================================================\n');

  const startMemory = process.memoryUsage();
  const overallStart = performance.now();

  // 1. Initialize mock Float32 input vector (256 elements)
  const inputSize = LAYERS[0].in;
  let currentActivation: Float32Array;

  if (inputVector && inputVector.length === inputSize) {
    currentActivation = inputVector;
    console.log(`📥 Using custom input vector (length: ${inputSize})`);
  } else {
    currentActivation = new Float32Array(inputSize);
    for (let i = 0; i < inputSize; i++) {
      // Mock sensor/embedding input in range [0.0, 1.0]
      currentActivation[i] = Math.sin((i / inputSize) * Math.PI * 2) * 0.5 + 0.5;
    }
    console.log(`📥 Initialized synthetic Float32 input vector (${inputSize} dims)`);
  }

  console.log(`   Sample: [${Array.from(currentActivation.slice(0, 5)).map(v => v.toFixed(3)).join(', ')}, ...]`);

  // 2. Open binary file handle (does NOT read entire file into RAM)
  const file = await fs.open(modelPath, 'r');
  let totalAdditions = 0;
  let totalSubtractions = 0;
  let totalSkips = 0;

  try {
    for (let i = 0; i < LAYERS.length; i++) {
      const layer = LAYERS[i];
      const weightSize = layer.in * layer.out;

      console.log(`\n⚙️  Processing [Layer ${i + 1}/${LAYERS.length}]: ${layer.name}`);
      console.log(`   ├─ Dimensions: [${layer.in} → ${layer.out}]`);
      console.log(`   ├─ Disk Offset: ${layer.offset.toLocaleString()} bytes (Chunk size: ${(weightSize / 1024).toFixed(1)} KB)`);

      // 2a. Stream slice from SSD
      const readStart = performance.now();
      const weightsChunk = await readLayerWeights(file, layer.offset, weightSize);
      const readTime = performance.now() - readStart;

      // 2b. Compute BitNet forward pass (Zero-Mul Add/Sub)
      const computeStart = performance.now();
      const result = bitnetLinearForward(currentActivation, weightsChunk, layer.in, layer.out);
      const computeTime = performance.now() - computeStart;

      currentActivation = result.output;
      totalAdditions += result.adds;
      totalSubtractions += result.subs;
      totalSkips += result.skips;

      const mem = process.memoryUsage();

      console.log(`   ├─ ⚡ Disk Read: ${readTime.toFixed(3)} ms | Compute: ${computeTime.toFixed(3)} ms`);
      console.log(`   ├─ 🧮 Operations: +${result.adds.toLocaleString()} (Add) | -${result.subs.toLocaleString()} (Sub) | 0 (${result.skips.toLocaleString()} skipped)`);
      console.log(`   └─ 🧠 Current Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);

      // Note: weightsChunk goes out of scope here and is immediately garbage collected!
    }
  } finally {
    await file.close();
  }

  const overallDuration = performance.now() - overallStart;
  const endMemory = process.memoryUsage();
  const totalOps = totalAdditions + totalSubtractions;
  const fp32MultiplicationsSaved = totalOps + totalSkips;

  console.log('\n====================================================');
  console.log('🏁 Inference Finished Successfully!');
  console.log(`⏱️  Total Latency: ${overallDuration.toFixed(2)} ms`);
  console.log(`📊 Total Binary Ops: ${totalOps.toLocaleString()} (${totalAdditions.toLocaleString()} adds, ${totalSubtractions.toLocaleString()} subs)`);
  console.log(`🔥 Floating Point Multiplications Saved: ${fp32MultiplicationsSaved.toLocaleString()} (100% Zero-Mul!)`);
  console.log(`💾 Heap Usage Delta: ${((endMemory.heapUsed - startMemory.heapUsed) / 1024).toFixed(2)} KB`);
  console.log(`📤 Output Vector Size: ${currentActivation.length} elements`);
  console.log(`   Output Preview: [${Array.from(currentActivation.slice(0, 8)).map(v => v.toFixed(3)).join(', ')}, ...]`);
  console.log('====================================================\n');

  return currentActivation;
}

// Auto-run if executed directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('run_inference')) {
  runDiskInference().catch(console.error);
}
