# Privacy

Barq Minutes for Chrome is designed for full local processing.

## What stays in your browser

- **Microphone audio while recording.** Audio is held in memory, transcribed in the same browser tab, and discarded when the recording ends unless you opt in to store audio.
- **Uploaded audio files.** The file is decoded to PCM in your browser, transcribed locally, and discarded when processing ends unless you opt in to store audio.
- **Transcripts, decisions, action items, open questions, and summaries.** Stored only in your browser's IndexedDB.
- **RAG transcript chunks and their MiniLM embeddings**, used to answer questions about a meeting. Stored only in your browser's IndexedDB.
- **Application settings.** Stored only in your browser's IndexedDB.

## Where model files live

Whisper, GLM5.1 distill, and MiniLM ONNX files are not stored in IndexedDB. The `@huggingface/transformers` loader puts them in the browser's **Cache Storage** under the extension's own origin (`chrome-extension://<id>/`). onnxruntime-web likewise caches WASM artefacts in Cache Storage. Both are first-party to the extension and are never read by web pages.

## Network access

The extension is **constrained by** the host permissions declared in its manifest. The only intended outbound traffic is the first-time model download from Hugging Face. After that download, every subsequent run serves the models from local Cache Storage.

Host permissions are scoped to:

- `https://huggingface.co/*`
- `https://cdn-lfs.huggingface.co/*`
- `https://*.hf.co/*`

The extension does not call any other host, and Chrome will block any attempt to fetch outside those origins.

## Pinned model revisions

Each model is loaded with an explicit `revision` field (a Hugging Face commit SHA) so a future upstream change cannot silently alter inference behaviour on your machine. See `src/shared/models/config.ts` for the pinned revisions.

## What we do not do

- No analytics
- No telemetry
- No background data collection
- No third-party trackers
- No remote inference of any kind
- No cloud transcription
- No external APIs (no OpenAI, Anthropic, Google, etc.)
- No remote logging of meeting content
- No automatic uploads of any kind

## Audio storage

Audio storage is **opt-in and disabled by default**. To store audio for a recording or upload, tick the "Store audio in browser" checkbox before starting the action. Stored audio lives in IndexedDB on this device only and can be removed at any time from the Settings page.

## Clearing your data

The Settings page in the side panel offers a one-click "Clear all meeting data" action. This removes:

- All meetings and their transcripts, summaries, decisions, action items, and questions
- All audio that was opted in for storage
- All RAG vectors

Application settings are preserved. To remove the cached model files as well, open `chrome://extensions`, find Barq Minutes, click **Details**, then **Site settings**, and use **Clear data** for the extension's storage. Alternatively, remove the extension and re-add it.

## Source available

This extension is open source under the Apache 2.0 license so you can audit the code and verify these claims.
