import * as fs from 'fs/promises';

export interface HuggingFaceModelConfig {
  vocabSize: number;
  dModel: number;             // hidden_size
  nHeads: number;             // num_attention_heads
  nKvHeads: number;           // num_key_value_heads (GQA support)
  dHead: number;              // dModel / nHeads
  dFfn: number;               // intermediate_size
  numLayers: number;          // num_hidden_layers
  maxSeqLen: number;          // max_position_embeddings
  rmsNormEps: number;
  modelType: string;
  tieWordEmbeddings: boolean;
}

export interface LayerOffsetMap {
  layerIndex: number;
  wqOffset: number;
  wqBytes: number;
  wkOffset: number;
  wkBytes: number;
  wvOffset: number;
  wvBytes: number;
  woOffset: number;
  woBytes: number;
  wGateOffset: number;
  wGateBytes: number;
  wUpOffset: number;
  wUpBytes: number;
  wDownOffset: number;
  wDownBytes: number;
}

export interface DynamicModelLayout {
  config: HuggingFaceModelConfig;
  embeddingOffset: number;
  embeddingBytes: number;
  layers: LayerOffsetMap[];
  finalNormOffset: number;
  finalNormBytes: number;
  lmHeadOffset: number;
  lmHeadBytes: number;
  totalSizeBytes: number;
}

/**
 * Task 1: Dynamic Configuration Loader for Hugging Face config.json
 * Supports LLaMA, SmolLM, SmolLM2, Qwen2, Qwen2.5, Mistral, GPT-2, Gemma
 */
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
}

/**
 * Calculates exact sequential disk offsets for a multi-layer BitNet model
 */
export function computeDynamicModelOffsets(config: HuggingFaceModelConfig): DynamicModelLayout {
  let offset = 0;

  // 1. Embeddings: Float32 (vocabSize * dModel * 4 bytes)
  const embeddingBytes = config.vocabSize * config.dModel * 4;
  const embeddingOffset = offset;
  offset += embeddingBytes;

  // 2. Multi-layer Transformer Blocks
  const layers: LayerOffsetMap[] = [];
  const kvDim = config.nKvHeads * config.dHead; // Support Multi-Query / Grouped-Query Attention

  for (let l = 0; l < config.numLayers; l++) {
    const wqBytes = config.dModel * config.dModel; // Int8 Ternary
    const wqOffset = offset;
    offset += wqBytes;

    const wkBytes = config.dModel * kvDim;
    const wkOffset = offset;
    offset += wkBytes;

    const wvBytes = config.dModel * kvDim;
    const wvOffset = offset;
    offset += wvBytes;

    const woBytes = config.dModel * config.dModel;
    const woOffset = offset;
    offset += woBytes;

    // SwiGLU / MLP Projections
    const wGateBytes = config.dModel * config.dFfn;
    const wGateOffset = offset;
    offset += wGateBytes;

    const wUpBytes = config.dModel * config.dFfn;
    const wUpOffset = offset;
    offset += wUpBytes;

    const wDownBytes = config.dFfn * config.dModel;
    const wDownOffset = offset;
    offset += wDownBytes;

    layers.push({
      layerIndex: l,
      wqOffset,
      wqBytes,
      wkOffset,
      wkBytes,
      wvOffset,
      wvBytes,
      woOffset,
      woBytes,
      wGateOffset,
      wGateBytes,
      wUpOffset,
      wUpBytes,
      wDownOffset,
      wDownBytes,
    });
  }

  // 3. Final RMSNorm (Float32: dModel * 4 bytes)
  const finalNormBytes = config.dModel * 4;
  const finalNormOffset = offset;
  offset += finalNormBytes;

  // 4. LM Head (Int8 Ternary: dModel * vocabSize bytes)
  const lmHeadBytes = config.dModel * config.vocabSize;
  const lmHeadOffset = offset;
  offset += lmHeadBytes;

  return {
    config,
    embeddingOffset,
    embeddingBytes,
    layers,
    finalNormOffset,
    finalNormBytes,
    lmHeadOffset,
    lmHeadBytes,
    totalSizeBytes: offset,
  };
}
