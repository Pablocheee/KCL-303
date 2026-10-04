/**
 * Step 1: Weight Generator (generate_model.ts)
 * 
 * Generates a dummy .bin weight file on disk matching the layer structure:
 *  - Layer 1: 256  -> 512 (131,072 bytes) [Offset 0]
 *  - Layer 2: 512  -> 512 (262,144 bytes) [Offset 131072]
 *  - Layer 3: 512  -> 128 (65,536 bytes)  [Offset 393216]
 * Total size: 458,752 bytes (~448 KB)
 * Populated entirely with random ternary weights (-1, 0, 1) encoded as Int8.
 * 
 * Run with: npx tsx scripts/generate_model.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface LayerDef {
  name: string;
  in: number;
  out: number;
  offset: number;
}

const LAYERS: LayerDef[] = [
  { name: 'Layer 1 (256 -> 512)', in: 256, out: 512, offset: 0 },
  { name: 'Layer 2 (512 -> 512)', in: 512, out: 512, offset: 131072 },
  { name: 'Layer 3 (512 -> 128)', in: 512, out: 128, offset: 393216 }
];

const OUTPUT_PATH = path.resolve(process.cwd(), 'data', 'bitnet_model.bin');

export async function generateBitNetModel(outputPath: string = OUTPUT_PATH): Promise<void> {
  console.log('====================================================');
  console.log('⚡ BitNet b1.58 Ternary Model Generator');
  console.log('🎯 Target Architecture: 256 -> 512 -> 512 -> 128');
  console.log(`📁 Destination: ${outputPath}`);
  console.log('====================================================');

  const startTime = Date.now();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const file = await fs.open(outputPath, 'w');
  let currentOffset = 0;
  let totalWeights = 0;
  let posCount = 0;
  let negCount = 0;
  let zeroCount = 0;

  try {
    for (let i = 0; i < LAYERS.length; i++) {
      const layer = LAYERS[i];
      const count = layer.in * layer.out;
      console.log(`\n[Layer ${i + 1}/3] Generating ${layer.name}...`);
      console.log(`  -> Offset: ${currentOffset} bytes | Size: ${count.toLocaleString()} weights (${count} bytes)`);

      // Write in 64 KB streaming chunks to keep Node.js heap footprint < 1 MB
      const CHUNK_SIZE = 65536;
      let remaining = count;

      while (remaining > 0) {
        const chunkSize = Math.min(remaining, CHUNK_SIZE);
        const buffer = Buffer.alloc(chunkSize);

        for (let j = 0; j < chunkSize; j++) {
          // Uniform ternary distribution {-1, 0, 1}
          const rand = Math.random();
          if (rand < 0.333) {
            buffer.writeInt8(-1, j);
            negCount++;
          } else if (rand < 0.666) {
            buffer.writeInt8(1, j);
            posCount++;
          } else {
            buffer.writeInt8(0, j);
            zeroCount++;
          }
        }

        await file.write(buffer);
        remaining -= chunkSize;
        currentOffset += chunkSize;
      }

      totalWeights += count;
    }
  } finally {
    await file.close();
  }

  const stat = await fs.stat(outputPath);
  const duration = Date.now() - startTime;

  console.log('\n====================================================');
  console.log('✅ Model Binary Successfully Created on Disk!');
  console.log(`  • Total File Size: ${stat.size.toLocaleString()} bytes (${(stat.size / 1024).toFixed(2)} KB)`);
  console.log(`  • Total Ternary Weights: ${totalWeights.toLocaleString()}`);
  console.log(`  • Distribution: +1 (${((posCount / totalWeights) * 100).toFixed(1)}%), -1 (${((negCount / totalWeights) * 100).toFixed(1)}%), 0 (${((zeroCount / totalWeights) * 100).toFixed(1)}%)`);
  console.log(`  • Generation Time: ${duration} ms`);
  console.log('====================================================\n');
}

// Auto-run if executed directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('generate_model')) {
  generateBitNetModel().catch(console.error);
}
