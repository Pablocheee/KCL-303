export interface LayerConfig {
  name: string;
  in: number;
  out: number;
  offset: number;
}

export interface LayerStats {
  layerIndex: number;
  name: string;
  inSize: number;
  outSize: number;
  offset: number;
  byteLength: number;
  readTimeMs: number;
  computeTimeMs: number;
  additions: number;
  subtractions: number;
  skips: number;
  heapUsedBytes: number;
  activationSample: number[];
  activationMin: number;
  activationMax: number;
  activationMean: number;
  weightsSample: number[];
}

export interface InferenceResult {
  layers: LayerStats[];
  inputVectorSample: number[];
  outputVector: number[];
  totalTimeMs: number;
  totalDiskReadTimeMs: number;
  totalComputeTimeMs: number;
  totalAdditions: number;
  totalSubtractions: number;
  totalSkips: number;
  totalOperations: number;
  fp32EquivalentFlops: number;
  memoryPeakBytes: number;
  modelSizeBytes: number;
  modelPath: string;
}

export interface ModelMetadata {
  path: string;
  exists: boolean;
  sizeBytes: number;
  layers: LayerConfig[];
  totalWeights: number;
  createdAt?: string;
  weightDistribution?: {
    positive: number;
    negative: number;
    zero: number;
  };
}
