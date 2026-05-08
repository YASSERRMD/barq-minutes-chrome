# Changelog

## v0.1.0 - 2026-05-08

Initial public release.

### Added
- Manifest V3 Chrome extension with side panel, popup launcher, options page, and offscreen scaffold.
- Local-only audio recording, live ASR transcription, and finalize-on-stop pipeline using Whisper Base via WebGPU when available.
- Audio file upload and chunked transcription for mp3, m4a, wav, ogg, webm, flac.
- Long-context extraction pipeline with 6,000 char windows and 600 char overlap, separate prompts for decisions, action items, and open questions.
- Embedding-based deduplication using MiniLM L6 v2 with cosine similarity threshold 0.85.
- Two-pass summary: per-window summaries merged into a 3 to 6 bullet executive summary.
- RAG question answering: top 5 retrieved transcript chunks per question, answers constrained to retrieved context only.
- IndexedDB persistence for meetings, optional opt-in audio storage, settings, and transcript vectors.
- Markdown and PDF export with timestamps in the transcript only.
- Premium minimal executive UI in light theme with Midnight Blue, Warm Gray, and Accent Gold palette.
- README with install steps, architecture diagram, and local model inference explanation.
- PRIVACY.md documenting data flow and storage guarantees.
