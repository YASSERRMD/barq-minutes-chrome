export type ModelKind = 'asr' | 'llm' | 'embedding';

export interface ModelDescriptor {
  kind: ModelKind;
  id: string;
  repo: string;
  quantization?: 'q4' | 'q4f16' | 'q8' | 'fp16' | 'fp32';
  task?: string;
  description: string;
}

export const ASR_MODEL: ModelDescriptor = {
  kind: 'asr',
  id: 'whisper-base',
  repo: 'Xenova/whisper-base',
  quantization: 'q8',
  task: 'automatic-speech-recognition',
  description: 'Whisper Base ASR ONNX/WebGPU',
};

export const LLM_MODEL: ModelDescriptor = {
  kind: 'llm',
  id: 'glm5.1-distill',
  repo: 'yasserrmd/glm5.1-distill-onnx',
  quantization: 'q4',
  task: 'text-generation',
  description: 'GLM5.1 distill ONNX Q4 for extraction and Q&A',
};

export const EMBEDDING_MODEL: ModelDescriptor = {
  kind: 'embedding',
  id: 'all-minilm-l6-v2',
  repo: 'Xenova/all-MiniLM-L6-v2',
  quantization: 'q8',
  task: 'feature-extraction',
  description: 'MiniLM L6 v2 sentence embeddings',
};

export const ALL_MODELS: ModelDescriptor[] = [ASR_MODEL, LLM_MODEL, EMBEDDING_MODEL];

export const MODEL_CACHE_NAMESPACE = 'barq-minutes-models';
export const MODEL_CACHE_VERSION = 1;
