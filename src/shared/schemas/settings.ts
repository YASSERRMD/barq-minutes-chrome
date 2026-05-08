import { z } from 'zod';

export const SettingsSchema = z.object({
  storeAudioByDefault: z.boolean().default(false),
  preferredAsrModel: z.string().default('Xenova/whisper-base'),
  preferredLlmModel: z.string().default('yasserrmd/glm5.1-distill-onnx'),
  preferredEmbeddingModel: z.string().default('Xenova/all-MiniLM-L6-v2'),
  webgpuEnabled: z.boolean().default(true),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});
