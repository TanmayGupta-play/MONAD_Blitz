
# AI Tutor Engine (Phase 1) — Google Gemini (Generative Language) Edition

This FastAPI-based AI Tutor uses Google Gemini (Generative Language API) for Phase 1 inference.
It exposes endpoints to start a session, send messages (the tutor replies), and end a session (summary).
This project uses the Gemini REST endpoint (generateContent) under the hood.

Important: you must have a valid Gemini API key (set as `GEMINI_API_KEY`). See Step 1 below.
