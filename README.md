# Barq Minutes for Chrome

Local-only meeting notes for Chrome. Records or accepts uploaded audio, transcribes it locally with Whisper on WebGPU, extracts decisions, action items, and open questions with a local LLM, summarizes the meeting, and answers questions about the meeting using local retrieval.

No backend. No telemetry. No cloud inference. The only network call is the first model download from Hugging Face. After that, everything runs from your browser cache.

## Highlights

- Manifest V3 Chrome extension running in the side panel
- Whisper Base ASR via @huggingface/transformers (WebGPU when available, WASM fallback)
- GLM5.1 distill ONNX Q4 LLM for extraction, summary, and Q&A
- MiniLM L6 v2 embeddings for dedupe and retrieval
- IndexedDB persistence with optional opt-in audio storage
- Markdown and PDF export
- Premium minimal executive UI

## Install for development

1. Install Node 20 or newer.
2. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

3. Build the unpacked extension:

   ```bash
   npm run build
   ```

   The output appears in `dist/`.

4. Load the unpacked extension in Chrome:
   1. Open `chrome://extensions`
   2. Enable Developer mode
   3. Click "Load unpacked"
   4. Select the `dist` folder

5. Click the Barq Minutes toolbar icon to open the side panel.

## First-time model download

The first time you record or upload audio, Chrome will download the model files from Hugging Face into the browser cache. Each subsequent load uses the cache only.

Approximate sizes:

| Model | Quantization | Approx. size |
| --- | --- | --- |
| Whisper Base | Q8 ONNX | ~150 MB |
| GLM5.1 distill | Q4 ONNX | ~600 MB |
| MiniLM L6 v2 | Q8 ONNX | ~25 MB |

If you do not want to download these, the extension will still run UI-only.

## Architecture

```
+-----------------------------------------------------------+
|                       Chrome browser                      |
|                                                           |
|  +--------------------+      +-----------------------+    |
|  |  Side panel (UI)   |<---->|  Background worker    |    |
|  |  React 19 + TS     |      |  (Manifest V3)        |    |
|  +---------+----------+      +-----------------------+    |
|            |                                              |
|            v                                              |
|  +--------------------+    +-----------------------+      |
|  |  Pipeline runtime  |--->|  Local model sessions |      |
|  |  Recording, ASR    |    |  - Whisper (WebGPU)   |      |
|  |  Extraction loop   |    |  - GLM5.1 distill Q4  |      |
|  |  Dedupe + summary  |    |  - MiniLM embeddings  |      |
|  |  RAG retrieval     |    +-----------+-----------+      |
|  +---------+----------+                |                  |
|            |                            v                 |
|            v                  +---------------------+     |
|  +--------------------+       |  Browser model      |     |
|  |   IndexedDB        |       |  cache (HF assets)  |     |
|  |   meetings         |       +---------------------+     |
|  |   audio (opt-in)   |                                   |
|  |   vectors (RAG)    |                                   |
|  |   settings         |                                   |
|  +--------------------+                                   |
+-----------------------------------------------------------+

External network: only Hugging Face on first model download.
After that, all processing is local.
```

## Permissions

| Permission | Why |
| --- | --- |
| `sidePanel` | Main UI lives in the side panel |
| `storage` | Settings persistence |
| `offscreen` | Reserved for offscreen audio work |
| `tabCapture` (optional) | Future tab audio capture |
| `activeTab` (optional) | Optional context for the current tab |
| Hugging Face host permissions | First-time model download only |

## Privacy

See [PRIVACY.md](./PRIVACY.md) for the full data flow.

## License

Apache 2.0. See [LICENSE](./LICENSE).
