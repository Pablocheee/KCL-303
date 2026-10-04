/**
 * Standalone Script: Generate BitNet Transformer Weights File (.bin)
 * 
 * Creates disk layout for:
 *  - Token Embedding Matrix: [vocabSize=512, d_model=128] (Float32)
 *  - Positional Embedding:   [maxSeqLen=64, d_model=128]  (Float32)
 *  - Attention Projections:  W_q, W_k, W_v, W_o [128x128] (Int8 Ternary)
 *  - FeedForward Projections: W_up [128x512], W_down [512x128] (Int8 Ternary)
 *  - LM Head (Unembedding):  [128x512] (Int8 Ternary)
 * 
 * Total size: ~487 KB
 * Run with: npx tsx scripts/generate_transformer_model.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const VOCAB_SIZE = 512;
const D_MODEL = 128;
const MAX_SEQ_LEN = 64;
const D_FFN = 512;

const OUTPUT_PATH = path.resolve(process.cwd(), 'data', 'bitnet_transformer.bin');

async function main() {
  console.log('====================================================');
  console.log('⚡ BitNet Transformer .bin Generator');
  console.log(`🎯 Architecture: Vocab=${VOCAB_SIZE} | d_model=${D_MODEL} | d_ffn=${D_FFN} | Heads=4`);
  console.log(`📁 File Target: ${OUTPUT_PATH}`);
  console.log('====================================================');

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  const file = await fs.open(OUTPUT_PATH, 'w');
  let currentOffset = 0;

  try {
    // 1. Embeddings (Float32)
    console.log('[1/5] Writing Token Embedding table...');
    const embCount = VOCAB_SIZE * D_MODEL;
    const embBuf = Buffer.alloc(embCount * 4);
    for (let i = 0; i < embCount; i++) {
      embBuf.writeFloatLE((Math.random() - 0.5) * 0.1, i * 4);
    }
    await file.write(embBuf);
    currentOffset += embBuf.length;

    // 2. Positional Embeddings (Float32)
    console.log('[2/5] Writing Sinusoidal Positional Embeddings...');
    const posCount = MAX_SEQ_LEN * D_MODEL;
    const posBuf = Buffer.alloc(posCount * 4);
    for (let pos = 0; pos < MAX_SEQ_LEN; pos++) {
      for (let d = 0; d < D_MODEL; d++) {
        const val = d % 2 === 0
          ? Math.sin(pos / Math.pow(10000, d / D_MODEL))
          : Math.cos(pos / Math.pow(10000, (d - 1) / D_MODEL));
        posBuf.writeFloatLE(val, (pos * D_MODEL + d) * 4);
      }
    }
    await file.write(posBuf);
    currentOffset += posBuf.length;

    // Helper for writing ternary weights {-1, 0, 1}
    const writeTernary = async (name: string, count: number) => {
      console.log(`  -> Writing ${name} (${count.toLocaleString()} weights, offset: ${currentOffset})...`);
      const CHUNK = 65536;
      let rem = count;
      while (rem > 0) {
        const size = Math.min(rem, CHUNK);
        const buf = Buffer.alloc(size);
        for (let i = 0; i < size; i++) {
          const r = Math.random();
          if (r < 0.33) buf.writeInt8(-1, i);
          else if (r < 0.66) buf.writeInt8(1, i);
          else buf.writeInt8(0, i);
        }
        await file.write(buf);
        rem -= size;
        currentOffset += size;
      }
    };

    // 3. Attention Projections (Ternary Int8)
    console.log('[3/5] Writing Multi-Head Attention Projections (W_q, W_k, W_v, W_o)...');
    await writeTernary('W_q (128x128)', D_MODEL * D_MODEL);
    await writeTernary('W_k (128x128)', D_MODEL * D_MODEL);
    await writeTernary('W_v (128x128)', D_MODEL * D_MODEL);
    await writeTernary('W_o (128x128)', D_MODEL * D_MODEL);

    // 4. MLP Projections (Ternary Int8)
    console.log('[4/5] Writing Feed-Forward MLP Projections (W_up, W_down)...');
    await writeTernary('W_up (128x512)', D_MODEL * D_FFN);
    await writeTernary('W_down (512x128)', D_FFN * D_MODEL);

    // 5. LM Head (Ternary Int8)
    console.log('[5/5] Writing LM Head Unembedding (128x512)...');
    await writeTernary('LM_Head (128x512)', D_MODEL * VOCAB_SIZE);

  } finally {
    await file.close();
  }

  const stat = await fs.stat(OUTPUT_PATH);
  console.log('====================================================');
  console.log(`✅ BitNet Transformer Model created successfully!`);
  console.log(`📊 Size on Disk: ${stat.size.toLocaleString()} bytes (${(stat.size / 1024).toFixed(2)} KB)`);
  console.log('====================================================');
}

main().catch(console.error);
