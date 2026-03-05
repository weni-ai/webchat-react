# Quickstart: Full Voice Mode Development

**Feature**: 001-full-voice-mode
**Date**: 2026-02-19

## Prerequisites

- Node.js 18+
- npm 9+
- An ElevenLabs account with API key ([elevenlabs.io](https://elevenlabs.io))
- A Weni channel UUID (from [flows.weni.ai](https://flows.weni.ai))
- A modern browser with microphone support (Chrome recommended for development)
- HTTPS context (or localhost) for microphone access

## Getting Started

### 1. Install dependencies

```bash
cd /Users/johncordeiro/workspaces/weni-ai/webchat-react
npm install
```

### 2. Verify you're on the feature branch

```bash
git checkout 001-full-voice-mode
```

### 3. Development server

```bash
npm run dev
```

Opens the Vite dev server. For testing voice mode in a browser, you'll use the standalone HTML test page.

### 4. Build standalone bundle (for HTML test page)

```bash
npm run build:standalone
```

This generates `dist-standalone/webchat.umd.js`, which is loaded by the test page.

### 5. Test with standalone HTML page

1. Open `examples/voice-mode-test.html`
2. Replace the 3 configuration variables:
   - `ELEVENLABS_API_KEY` — Your ElevenLabs API key
   - `VOICE_ID` — An ElevenLabs voice ID (e.g., `pFZP5JQG7iQjIQuC4Bku` for "Lily")
   - `CHANNEL_UUID` — Your Weni channel UUID
3. Serve the file over HTTPS (or use localhost):
   ```bash
   npx serve . -l 3000
   ```
4. Open `http://localhost:3000/examples/voice-mode-test.html` in Chrome
5. Click the voice mode button in the chat header

### 6. Run tests

```bash
# All tests
npm test

# Voice-specific tests
npm test -- --testPathPattern="voice|Voice|audio"

# With coverage
npm test -- --coverage
```

### 7. Lint and format

```bash
npm run format          # Prettier
npm run lint -- --fix   # ESLint auto-fix
npm run lint:check      # Verify no errors
```

## Project Structure Overview

```
src/services/voice/     — Voice service layer (8 files)
src/components/VoiceMode/ — React components (7 files)
src/hooks/useVoiceMode.js — React hook
src/utils/audioUtils.js — Audio encoding utilities
examples/voice-mode-test.html — Standalone test page
```

## Key Development Notes

### Echo Cancellation Testing

The echo cancellation (EchoGuard) is best tested on real devices:
- **Desktop**: Use speakers (not headphones) and speak while agent is talking
- **Mobile**: Use speakerphone mode
- **Expected**: Agent audio should NOT trigger a new user message

### Barge-In Testing

- Let the agent speak a long response
- Speak clearly while the agent is talking
- **Expected**: Agent audio stops immediately, your speech is captured

### TTS Credit Monitoring

During development, monitor TTS requests in the browser's Network tab:
- Filter by `api.elevenlabs.io/v1/text-to-speech`
- A 3-sentence agent response should produce 3-4 requests max

### Language Testing

- Configure the webchat with `languageCode: 'pt'` to test Portuguese
- Or let the service send a `language:changed` event
- Verify STT transcribes in the correct language
- Verify TTS speaks in the correct language

### Browser Testing Matrix

| Browser | Desktop | Mobile | Priority |
|---------|---------|--------|----------|
| Chrome | Primary | Primary | P1 |
| Firefox | Secondary | — | P2 |
| Safari | Secondary | Primary (iOS) | P2 |
| Edge | Secondary | — | P3 |

## ElevenLabs API Quick Reference (Verified 2026-02-19)

### Get Single-Use Token (for STT)

```bash
curl -X POST https://api.elevenlabs.io/v1/single-use-token/realtime_scribe \
  -H "xi-api-key: YOUR_API_KEY"
```

Response: `{ "token": "sutkn_..." }` (expires after 15 minutes, single-use)

### STT WebSocket URL

```
wss://api.elevenlabs.io/v1/speech-to-text/realtime
  ?model_id=scribe_v2_realtime
  &token=TOKEN
  &language_code=en
  &audio_format=pcm_16000
  &commit_strategy=vad
  &vad_threshold=0.4
  &vad_silence_threshold_secs=1.5
  &min_speech_duration_ms=100
```

**WARNING**: The prototype used incorrect parameter names:
- `vad_silence_duration_ms` → correct: `vad_silence_threshold_secs` (in **seconds**)
- `vad_min_speech_duration_ms` → correct: `min_speech_duration_ms`
- `vad_prefix_padding_ms` → does NOT exist in the API

### STT Client Message Format

```json
{
  "message_type": "input_audio_chunk",
  "audio_base_64": "<base64-pcm-data>",
  "commit": false,
  "sample_rate": 16000
}
```

**NOTE**: `commit` is **required** (not optional). Always send `false` for normal chunks.

### TTS HTTP Streaming

```bash
curl -X POST \
  "https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID/stream?output_format=mp3_44100_128&optimize_streaming_latency=3" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how can I help you?",
    "model_id": "eleven_flash_v2_5",
    "language_code": "en",
    "previous_text": "Optional: text from previous TTS call for continuity"
  }'
```

Response: Streaming `application/octet-stream` (binary audio bytes)

**WARNING**: The prototype incorrectly sent `output_format` and `optimize_streaming_latency` in the request body. They are **query parameters**.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Microphone permission denied" | Check browser settings → Site Settings → Microphone |
| No voice mode button visible | Verify `voiceMode.enabled: true` and `voiceMode.voiceId` are set in config |
| STT not connecting | Check token is valid; verify WebSocket URL in Network tab |
| TTS not playing | Check API key is valid; verify audio autoplay isn't blocked by browser |
| Echo feedback loop | Ensure EchoGuard is active; test with `echoCancellation: false` in getUserMedia |
| Tests failing on CI | Mock `navigator.mediaDevices`, `AudioContext`, and `WebSocket` in test setup |
