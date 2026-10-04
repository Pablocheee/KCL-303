import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateTernaryModelFile,
  runDiskInference,
  DEFAULT_MODEL_FILE,
  DEFAULT_MODEL_LAYERS,
} from './src/engine/bitnet.ts';
import {
  generateTransformerModelFile,
  runDiskTextGeneration,
  DEFAULT_LLM_MODEL_FILE,
} from './src/engine/llm_engine.ts';
import { defaultTokenizer } from './src/engine/tokenizer.ts';
import {
  quantizeWeightsBitNet158,
  convertAndWriteBitNetModel,
} from './src/engine/quantizer.ts';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // 1. Model Status API (MLP & LLM)
  app.get('/api/model/status', async (_req, res) => {
    try {
      const exists = await fs.stat(DEFAULT_MODEL_FILE).then(() => true).catch(() => false);
      const llmExists = await fs.stat(DEFAULT_LLM_MODEL_FILE).then(() => true).catch(() => false);
      let sizeBytes = 0;
      let llmSizeBytes = 0;
      if (exists) {
        const stat = await fs.stat(DEFAULT_MODEL_FILE);
        sizeBytes = stat.size;
      }
      if (llmExists) {
        const stat = await fs.stat(DEFAULT_LLM_MODEL_FILE);
        llmSizeBytes = stat.size;
      }
      res.json({
        exists,
        path: DEFAULT_MODEL_FILE,
        sizeBytes,
        layers: DEFAULT_MODEL_LAYERS,
        totalWeights: DEFAULT_MODEL_LAYERS.reduce((acc, l) => acc + l.in * l.out, 0),
        llm: {
          exists: llmExists,
          path: DEFAULT_LLM_MODEL_FILE,
          sizeBytes: llmSizeBytes,
          vocabSize: 512,
          dModel: 128,
          nHeads: 4,
          dFfn: 512,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Model Generation API
  app.post('/api/model/generate', async (req, res) => {
    try {
      const { sparsity = 0.33 } = req.body || {};
      const metadata = await generateTernaryModelFile(DEFAULT_MODEL_FILE, DEFAULT_MODEL_LAYERS, sparsity);
      await generateTransformerModelFile(DEFAULT_LLM_MODEL_FILE);
      res.json({ success: true, metadata });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Weight Converter Endpoint
  app.post('/api/converter/quantize', async (req, res) => {
    try {
      const { sampleCount = 64 } = req.body || {};
      
      // Generate sample Float32 Gaussian weights to demonstrate live quantization math
      const sampleFloats = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        const u1 = Math.max(1e-7, Math.random());
        const u2 = Math.random();
        sampleFloats[i] = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * 0.08;
      }

      const { ternary, metrics } = quantizeWeightsBitNet158(sampleFloats);

      res.json({
        originalFloats: Array.from(sampleFloats).map((v) => Number(v.toFixed(4))),
        ternaryWeights: Array.from(ternary),
        metrics,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Run Inference API (Single-shot MLP)
  app.post('/api/inference/run', async (req, res) => {
    try {
      const { inputVector } = req.body || {};
      let inputFloatArray: Float32Array | undefined;
      if (Array.isArray(inputVector) && inputVector.length === DEFAULT_MODEL_LAYERS[0].in) {
        inputFloatArray = new Float32Array(inputVector);
      }

      const result = await runDiskInference(DEFAULT_MODEL_FILE, inputFloatArray, DEFAULT_MODEL_LAYERS);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Stream Inference API (Server-Sent Events for MLP)
  app.get('/api/inference/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      sendEvent('start', {
        timestamp: Date.now(),
        layers: DEFAULT_MODEL_LAYERS,
        targetSpecs: 'Dual-Core Intel Core i5 (2015 MBA / 8GB RAM)',
      });

      const delayMs = Math.max(0, parseInt((req.query.delay as string) || '150', 10));

      await runDiskInference(
        DEFAULT_MODEL_FILE,
        undefined,
        DEFAULT_MODEL_LAYERS,
        async (layerStat, currentLayerIndex, totalLayers) => {
          sendEvent('layer_complete', {
            layerStat,
            currentLayerIndex,
            totalLayers,
            timestamp: Date.now(),
          });
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      );

      sendEvent('done', { timestamp: Date.now() });
      res.end();
    } catch (err: any) {
      sendEvent('error', { message: err.message });
      res.end();
    }
  });

  // 5. LLM Tokenizer & Embeddings Test Route
  app.post('/api/llm/tokenize', (req, res) => {
    const { text = '' } = req.body || {};
    const tokens = defaultTokenizer.encode(text);
    const decoded = defaultTokenizer.decode(tokens);
    const tokenDetails = tokens.map((id) => ({
      id,
      str: defaultTokenizer.getTokenString(id),
    }));
    res.json({ text, tokens, decoded, tokenDetails });
  });

  // 6. LLM Text Generation Route (One-shot)
  app.post('/api/llm/generate', async (req, res) => {
    try {
      const { prompt = 'Hello', maxTokens = 5, temperature = 0.7 } = req.body || {};
      const result = await runDiskTextGeneration(prompt, maxTokens, DEFAULT_LLM_MODEL_FILE, temperature);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. LLM Real-Time Streaming Generation Route (SSE)
  app.get('/api/llm/stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const prompt = (req.query.prompt as string) || 'Hello';
    const maxTokens = Math.min(32, parseInt((req.query.maxTokens as string) || '5', 10));
    const temperature = parseFloat((req.query.temperature as string) || '0.7');

    try {
      sendEvent('start', { prompt, maxTokens, timestamp: Date.now() });

      const result = await runDiskTextGeneration(
        prompt,
        maxTokens,
        DEFAULT_LLM_MODEL_FILE,
        temperature,
        undefined,
        defaultTokenizer,
        (step) => {
          sendEvent('token', step);
        }
      );

      sendEvent('done', { result, timestamp: Date.now() });
      res.end();
    } catch (err: any) {
      sendEvent('error', { message: err.message });
      res.end();
    }
  });

  // 8. Mount Vite middleware for React Frontend
  if (process.env.NODE_ENV !== 'production' || !await fs.stat(path.resolve(__dirname, 'dist')).then(() => true).catch(() => false)) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        let template = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BitNet Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[BitNet Server] Failed to start:', err);
  process.exit(1);
});
