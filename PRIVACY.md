# Privacy

Barq Minutes for Chrome is designed for full local processing.

## What stays in your browser

- Microphone audio while recording. Audio is held in memory, transcribed in the same browser tab, and discarded when the recording ends unless you opt in to store audio.
- Uploaded audio files. The file is decoded to PCM in your browser, transcribed locally, and discarded when processing ends unless you opt in to store audio.
- Transcripts, decisions, action items, open questions, and summaries. These are stored only in your browser's IndexedDB.
- RAG transcript chunks and their MiniLM embeddings, used to answer questions about a meeting. These are stored only in your browser's IndexedDB.
- Application settings, stored only in your browser's IndexedDB.

## Network access

The only network access this extension performs is downloading the model files from Hugging Face the first time you use them. After that, the models are served from the browser cache. No other network calls are made by this extension.

The host permissions in the manifest are scoped to:

- `https://huggingface.co/*`
- `https://cdn-lfs.huggingface.co/*`
- `https://*.hf.co/*`

These hosts are used only by the Hugging Face transformers loader during initial model download.

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

Application settings are preserved. To remove model files from the browser cache, use Chrome's site data settings for the Hugging Face origin.

## Source available

This extension is open source under the Apache 2.0 license so you can audit the code and verify these claims.
