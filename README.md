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

## Local model inference

Barq Minutes runs every model in your browser tab. There is no remote inference, no API key, and no cloud cost.

- **ASR.** Audio is decoded to mono 16 kHz PCM in the browser using the Web Audio API. The PCM is fed to Whisper running through `@huggingface/transformers`. WebGPU is used when available, otherwise the WASM backend runs.
- **LLM.** GLM5.1 distill is loaded as ONNX Q4 with `@huggingface/transformers`. The transcript is never sent to the model in one call. It is split into ~6,000 character windows with 600 character overlap, and each window is processed three times: extract decisions, extract action items, extract open questions. JSON output is parsed and validated with zod, with one strict retry on malformed output. The summary is built in two passes: a short summary per window, then a final 3 to 6 bullet executive summary made from those chunk summaries.
- **Embeddings.** MiniLM L6 v2 embeds extracted items for deduplication and embeds RAG transcript chunks for retrieval. Cosine similarity above 0.85 collapses duplicate items into one canonical entry.
- **Retrieval.** Q&A retrieves the top 5 transcript chunks for a question and only those chunks are passed to the LLM. The retrieved chunks are also displayed with timestamps so you can verify the answer.
- **Singletons.** Each model is loaded once per tab and reused. The cache is keyed in IndexedDB so the UI can show "Loading from cache" instead of "Downloading" on subsequent loads.

## Privacy

See [PRIVACY.md](./PRIVACY.md) for the full data flow.

## License

Apache 2.0. See [LICENSE](./LICENSE).
