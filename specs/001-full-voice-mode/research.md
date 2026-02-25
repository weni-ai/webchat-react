# Research: Full Voice Mode

**Feature**: 001-full-voice-mode
**Date**: 2026-02-19
**Status**: Complete — all unknowns resolved

## R1: Echo Cancellation Strategy (Critical — Prototype Failure)

### Problem

The prototype had `echoCancellation: false` on `getUserMedia` to allow barge-in detection, but this caused the agent's TTS audio to be picked up by the microphone on speakerphone. The result: the agent "heard itself" and entered an infinite response loop.

### Decision: Dual-Layer Echo Guard (Mic Gating + Transcript Suppression)

Implement a two-layer echo prevention system:

**Layer 1 — Microphone-to-STT Gating**: While TTS audio is actively playing, stop sending audio data to the STT WebSocket. The microphone remains open (for barge-in detection via local VAD), but audio frames are not forwarded to the remote STT service. This prevents the STT service from transcribing the agent's own voice.

**Layer 2 — Barge-In Energy Threshold**: During TTS playback, the local VAD threshold for triggering barge-in is elevated (e.g., from 0.02 to 0.08). This means only loud, clear user speech triggers barge-in — not the quieter echo from speakers. When barge-in is detected, TTS stops immediately, the STT gate opens, and the elevated threshold returns to normal.

**Post-TTS Cooldown**: After TTS playback ends, wait a short cooldown (200-300ms) before resuming normal STT forwarding. This absorbs residual echo/reverb from speakers.

### Rationale

- Using `echoCancellation: true` in getUserMedia would allow the browser's AEC to remove echo, but browser AEC also removes the user's voice when it detects the agent speaking — which defeats barge-in
- The gating approach is deterministic: we know exactly when TTS is playing, so we know exactly when to gate
- The elevated VAD threshold during playback ensures only intentional speech triggers barge-in
- This approach requires no external echo cancellation library

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| `echoCancellation: true` on getUserMedia | Breaks barge-in — browser AEC suppresses user voice during TTS playback |
| Separate AudioContext for mic vs. speakers | Browser doesn't prevent acoustic coupling between physical speaker and mic |
| WebRTC-based echo cancellation | Overly complex; requires setting up a full RTCPeerConnection for local audio routing |
| Server-side echo detection | Adds latency and complexity; ElevenLabs STT doesn't offer echo rejection |

## R2: Barge-In Reliability (Critical — Prototype Failure)

### Problem

The prototype used a simple VAD threshold (0.02) and debounce (500ms) for barge-in, but it was unreliable. Users had to speak multiple times to interrupt the agent. Root causes: (1) the 500ms debounce was too aggressive, (2) the VAD threshold was not adjusted during TTS playback, (3) audio data was still being sent to STT during speaking state, causing the STT to process echo instead of the user.

### Decision: Immediate Barge-In with Energy-Based Confirmation

- **Remove debounce on barge-in detection**. Once local VAD detects voice activity above the elevated threshold during TTS playback, trigger barge-in immediately.
- **Use sustained energy check**: Require 2-3 consecutive audio frames (each ~85ms at 4096 buffer/48kHz) with voice activity above threshold before triggering barge-in. This prevents single-frame noise spikes from interrupting.
- **On barge-in trigger**: (1) Stop TTS immediately (fast 20ms fade), (2) Clear TTS text buffer, (3) Open STT gate to resume sending audio, (4) Lower VAD threshold back to normal, (5) Emit barge-in event.
- **After barge-in**: The STT connection may need reconnection (since it was gated). Reconnect within the existing auto-reconnect mechanism.

### Rationale

- 2-3 consecutive frames (~170-255ms) is fast enough for responsive interruption but filters out transient noise
- Immediate action on detection (no 500ms debounce) makes interruption feel instant
- STT gating during TTS means the STT service doesn't accumulate garbage audio

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Keep 500ms debounce | Too slow — users perceive delay and think barge-in doesn't work |
| Single-frame VAD trigger | Too sensitive — noise spikes cause false barge-ins |
| Frequency-domain analysis (FFT) | Overkill for this use case; simple energy threshold with consecutive frames is sufficient |

## R3: Language Configuration Source

### Problem

The prototype auto-detected language from `navigator.language` via a `getBrowserLanguage()` utility. This was unreliable: (1) browser language doesn't match the chatbot's configured language, (2) multi-language users got inconsistent behavior, (3) the webchat service already manages the correct language.

### Decision: Use Service `language:changed` Event, Default to English

- Listen to the `language:changed` event on the webchat service (already handled in ChatContext at line 219)
- Store the current language in ChatContext state (new state variable `voiceLanguage`)
- When entering voice mode, pass the current language to the VoiceService config
- When `language:changed` fires during an active voice session, update the language for subsequent STT connections and TTS requests (current playing TTS is not interrupted)
- If no language has been received from the service, default to `'en'`

### Rationale

- The service already emits `language:changed` and the ChatContext already handles it for i18n
- This ensures voice and text chat use the same language
- English default is safe — ElevenLabs supports it well and it's the most common fallback

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Keep browser auto-detection | Unreliable per prototype feedback |
| Force language in config only | Doesn't handle dynamic language changes mid-session |
| Detect language from first transcript | Adds latency, circular dependency, and may detect wrong language from short utterances |

## R4: TTS Credit Efficiency

### Problem

The prototype's `processTextChunk` method had `minChunkSize = 5` characters and sent TTS requests on word boundaries. A 3-sentence response could generate 10+ TTS requests, each consuming API credits.

### Decision: Sentence-Boundary Batching via TextChunker Module

- Create a dedicated `TextChunker` class that accumulates streaming text and emits chunks at sentence boundaries
- **Sentence delimiters**: `.`, `!`, `?`, `。`, `！`, `？`, `\n` (supports multilingual punctuation)
- **Minimum chunk size**: 20 characters (prevents sending very short sentences as individual requests)
- **Maximum wait**: If no sentence boundary is found after 150 characters, emit on the last word boundary. This prevents long unpunctuated text from accumulating indefinitely.
- **Stream completion**: When the stream signals completion, emit all remaining buffered text immediately.
- **Barge-in**: `flush()` method clears the buffer and returns nothing (text is discarded).

**Expected result**: A 3-sentence response generates exactly 3 TTS requests. A long unpunctuated response generates one request per ~150 characters at word boundaries.

### Rationale

- Sentence-level batching produces the most natural TTS output (complete thoughts spoken together)
- 20-character minimum prevents wasting a request on "Ok." or "Yes!"
- 150-character maximum ensures latency stays reasonable for unpunctuated streams
- Pure-function module is easy to unit test with specific edge cases

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Keep 5-char minChunkSize | Causes 10+ TTS requests per response — excessive credit usage |
| Fixed-size chunks (e.g., 200 chars) | Breaks mid-sentence, producing unnatural speech |
| Single TTS request per full response | Too much latency — user waits for entire response before hearing anything |
| ElevenLabs WebSocket TTS (streaming) | Would require a persistent WebSocket connection and different API integration; HTTP streaming is simpler and sufficient |

## R5: Visual Overlap Fix

### Problem

In the prototype, the conversation display area (transcripts) used `position: absolute; bottom: 0` with `max-height: 50%`. When transcripts were long, they overlapped with the centered waveform/status text at `top: 35%`.

### Decision: Flexbox Layout with Fixed Center and Scrollable Bottom

Replace the absolute-positioned layout with a CSS flexbox approach:

- **Overlay**: `display: flex; flex-direction: column` filling the entire widget
- **Header**: Fixed height, flex-shrink: 0
- **Center section**: Fixed height (waveform + status text), centered via flex alignment, `flex-shrink: 0`
- **Conversation area**: `flex: 1; overflow-y: auto` — takes remaining space below center, scrolls when content overflows
- **No absolute positioning** for center or conversation areas — flexbox handles the separation naturally
- **Gradient separator**: A subtle gradient between center and conversation areas provides visual separation

### Rationale

- Flexbox eliminates the overlap problem structurally — the two areas cannot overlap because they occupy different flex slots
- The conversation area scrolls independently, so even 20+ messages won't push into the center
- This approach is simpler and more maintainable than absolute positioning with manual max-height calculations

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Keep absolute positioning with larger gap | Fragile — different content sizes can still cause overlap |
| CSS Grid with fixed rows | Slightly more complex than flexbox for this 3-section layout with no benefit |
| Limit transcript display to last N messages | Users lose context; doesn't solve the root layout issue |

## R6: STT WebSocket Reconnection Strategy

### Problem

ElevenLabs Scribe v2 Realtime closes the WebSocket after each committed transcript (VAD commit). The prototype reconnected by creating a new STTConnection and calling `connect()`, but this sometimes failed silently or had race conditions with audio data being sent to a closing connection.

### Decision: Reconnect-on-Close with Token Refresh and Queue Drain

- When the STT WebSocket fires `onclose` with a normal close (code 1000 or VAD commit), automatically reconnect:
  1. Request a fresh single-use token via `config.getToken()`
  2. Create a new STTConnection instance
  3. Call `connect()` and wait for `session_started`
  4. Resume audio forwarding (if EchoGuard gate is open)
- During reconnection, buffer audio frames locally (up to 2 seconds). On successful reconnect, flush the buffer to STT.
- If reconnection fails 3 times consecutively, emit an error and stop retrying.
- On abnormal close (code !== 1000), apply exponential backoff: 500ms, 1s, 2s before retries.

### Rationale

- Single-use tokens are required per ElevenLabs API — each new connection needs a fresh token
- Buffering during reconnection prevents lost audio frames during the gap
- 3-retry limit prevents infinite reconnection loops if the service is down
- Exponential backoff is standard practice for transient failures

## R7: Browser Compatibility and getUserMedia Configuration

### Decision

Use the following `getUserMedia` constraints:

```javascript
{
  audio: {
    echoCancellation: false,   // Required: allows mic to capture user voice during TTS
    noiseSuppression: true,    // Reduces background noise without affecting speech
    autoGainControl: true,     // Normalizes microphone volume
    sampleRate: { ideal: 16000 } // ElevenLabs STT preferred rate
  }
}
```

**`echoCancellation: false`** is critical. With it set to `true`, the browser's AEC algorithm removes sounds it detects as echo — but during barge-in, it also removes the user's voice. Our EchoGuard module handles echo prevention at the application level instead.

**Safari note**: Safari may not honor `sampleRate` constraint; the AudioCapture module downsamples from the browser's native rate (typically 48kHz) to 16kHz using the existing `downsampleBuffer` utility.

## R8: Integration with Existing ChatContext

### Decision

Extend `ChatContext.jsx` with voice mode state and methods:

**New state variables**:
- `isVoiceModeActive` (boolean) — whether voice overlay is open
- `voiceModeState` (string | null) — current VoiceSessionState
- `voicePartialTranscript` (string) — real-time partial transcript
- `voiceCommittedTranscript` (string) — last committed user transcript
- `voiceAgentText` (string) — agent text being spoken
- `voiceError` (VoiceError | null) — current error
- `isVoiceModeSupported` (boolean) — browser capability check
- `voiceLanguage` (string) — current language from service, default 'en'

**New methods**:
- `enterVoiceMode()` — initializes VoiceService, starts session
- `exitVoiceMode()` — ends session, cleans up
- `retryVoiceMode()` — clears error and re-enters

**Service event integration**:
- `language:changed` — updates `voiceLanguage` and propagates to active VoiceService
- `state:changed` — when a streaming message is detected and voice mode is active, feed text chunks to VoiceService's `processTextChunk`

**Message flow during voice mode**:
1. User speaks → STT committed → `sendMessage(text)` via existing service
2. Agent response streams → `state:changed` fires with updated messages → detect streaming message → feed new text to TTS via `processTextChunk`
3. TTS plays audio → EchoGuard manages mic gating → TTS ends → auto-return to listening

## R9: Standalone Build and HTML Test Page

### Decision

- Pass `voiceMode` config through `mapConfig()` in `standalone.jsx` (add it to the config mapping)
- The HTML test page loads `dist-standalone/webchat.umd.js` and calls `WebChat.init()` with `voiceMode` configuration
- The test page provides two functions: `getVoiceToken()` (fetches single-use STT token from ElevenLabs API) and `getApiKey()` (returns the configured API key for TTS)
- Clear instructions in the HTML file explain the 3 required variables and where to find them

### Security Note

The test page exposes the ElevenLabs API key in client-side JavaScript. This is acceptable for development/testing. The HTML file includes prominent warnings that production deployments must proxy token generation through a backend.

## R10: ElevenLabs API Audit (Verified Against Official Docs — 2026-02-19)

The prototype code was built against an older version of the ElevenLabs API. Verification against the current official API documentation revealed several discrepancies that must be corrected in the production implementation.

### STT WebSocket API (Scribe v2 Realtime)

**Endpoint**: `wss://api.elevenlabs.io/v1/speech-to-text/realtime`

**Authentication**: Either `xi-api-key` header OR `token` query parameter. For frontend clients, use single-use tokens via `POST /v1/single-use-token/realtime_scribe`.

**Query Parameters (corrected)**:

| Parameter | Type | Default | Prototype Used | Correction Needed |
|-----------|------|---------|----------------|-------------------|
| `model_id` | string | — | `scribe_v2_realtime` | OK (verify model still exists) |
| `token` | string | — | Correct | OK |
| `language_code` | string | — | Correct | OK |
| `commit_strategy` | `"manual"` \| `"vad"` | `"manual"` | `"vad"` | OK |
| `audio_format` | enum | `pcm_16000` | Not used (relied on sample_rate in chunk) | **ADD** — use `pcm_16000` explicitly |
| `vad_silence_threshold_secs` | number | `1.5` | `vad_silence_duration_ms` (ms, wrong!) | **FIX** — use seconds, rename param |
| `vad_threshold` | number | `0.4` | `vad_threshold` with value `0.5` | OK (param name correct, value is fine) |
| `min_speech_duration_ms` | integer | `100` | `vad_min_speech_duration_ms` | **FIX** — remove `vad_` prefix |
| `min_silence_duration_ms` | integer | `100` | Not used | OK (use default) |
| `include_timestamps` | boolean | `false` | Not used | OK (not needed) |
| `include_language_detection` | boolean | `false` | Not used | OK (not needed) |
| `enable_logging` | boolean | `true` | Not used | OK (use default) |

**Parameters that DON'T EXIST in the API** (prototype had them):
- `vad_prefix_padding_ms` — Remove from config builder
- `vad_silence_duration_ms` — Use `vad_silence_threshold_secs` instead (in seconds!)
- `vad_min_speech_duration_ms` — Use `min_speech_duration_ms` instead

**Client Message (`input_audio_chunk`)**:

```javascript
{
  "message_type": "input_audio_chunk",  // required
  "audio_base_64": "...",               // required (base64 PCM)
  "commit": false,                      // REQUIRED (not optional!)
  "sample_rate": 16000                  // required
}
```

**CRITICAL**: The `commit` field is **required**, not optional. The prototype treated it as optional. Always send `commit: false` for normal audio chunks and `commit: true` to force-commit.

**Server Messages (corrected `message_type` values)**:

| message_type | Description | Prototype Had |
|-------------|-------------|---------------|
| `session_started` | Session initialized | `session_started` ✓ |
| `partial_transcript` | Partial text | `partial_transcript` ✓ |
| `committed_transcript` | Final text (VAD/manual commit) | `committed_transcript` ✓ |
| `committed_transcript_with_timestamps` | Final text + timestamps | `committed_transcript_with_timestamps` ✓ |
| `error` | General error | `scribe_error` ✗ |
| `auth_error` | Auth failure | `scribe_auth_error` ✗ |
| `rate_limited` | Rate limit hit | `scribe_rate_limited_error` ✗ |
| `commit_throttled` | Too many commits | `scribe_throttled_error` ✗ |
| `quota_exceeded` | Quota exceeded | `scribe_quota_exceeded_error` ✗ |
| `input_error` | Invalid input | (not handled) |
| `chunk_size_exceeded` | Audio chunk too large | (not handled) |
| `insufficient_audio_activity` | Not enough speech | (not handled) |
| `transcriber_error` | Internal transcription error | (not handled) |
| `queue_overflow` | Queue full | (not handled) |
| `resource_exhausted` | Server resources exhausted | (not handled) |
| `session_time_limit_exceeded` | Session too long | (not handled) |
| `unaccepted_terms` | Terms not accepted | (not handled) |

### TTS Stream API

**Endpoint**: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`

**CRITICAL CORRECTION**: `output_format` and `optimize_streaming_latency` are **query parameters**, NOT body parameters. The prototype incorrectly put them in the request body.

**Correct URL format**:
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream?output_format=mp3_44100_128&optimize_streaming_latency=3
```

**Request Body (corrected)**:
```javascript
{
  "text": "...",                    // required
  "model_id": "eleven_flash_v2_5", // optional (default: eleven_multilingual_v2)
  "language_code": "en",           // optional
  "previous_text": "...",          // NEW: previous sentence for continuity
  "previous_request_ids": ["..."], // NEW: alternative to previous_text
  "voice_settings": {              // optional
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0,
    "speed": 1.0
  }
}
```

**Key additions for sentence-batching continuity**:
- `previous_text`: Send the previously spoken sentence text to improve audio continuity between TTS batches. This is critical for our TextChunker approach — each subsequent TTS request should include the text from the previous request as `previous_text`.
- `previous_request_ids`: Alternative to `previous_text` — can send up to 3 previous request IDs for even better continuity. However, this requires tracking request IDs from the response headers, adding complexity. **Decision**: Use `previous_text` (simpler, sufficient).

**Auth**: `xi-api-key` header.

**Response**: Streaming `application/octet-stream` (binary audio data).

**Valid `output_format` values**: `mp3_22050_32`, `mp3_24000_48`, `mp3_44100_32`, `mp3_44100_64`, `mp3_44100_96`, `mp3_44100_128`, `mp3_44100_192`, `pcm_8000`, `pcm_16000`, `pcm_22050`, `pcm_24000`, `pcm_32000`, `pcm_44100`, `pcm_48000`, `ulaw_8000`, `alaw_8000`, `opus_48000_32` through `opus_48000_192`.

### Single-Use Token API

**Endpoint**: `POST https://api.elevenlabs.io/v1/single-use-token/realtime_scribe`

**Auth**: `xi-api-key` header.

**Request Body**: None required (prototype sent `{}`, which is accepted but unnecessary).

**Response**:
```json
{
  "token": "sutkn_..."
}
```

**Token behavior**:
- Expires after 15 minutes
- Single-use — consumed on first WebSocket connection
- Token types: `realtime_scribe` (for STT) or `tts_websocket` (for WebSocket TTS — not used in our approach)

### Summary of Required Changes from Prototype

| Area | Change | Impact |
|------|--------|--------|
| `config.js` → `buildSTTWebSocketURL` | Fix param names: `vad_silence_threshold_secs` (seconds), `min_speech_duration_ms`, add `audio_format=pcm_16000`, remove `vad_prefix_padding_ms` | STT connection will fail with incorrect params |
| `config.js` → `buildTTSStreamURL` | Move `output_format` and `optimize_streaming_latency` from body to query params | TTS requests may not apply format/latency settings |
| `config.js` → `buildTTSRequestBody` | Remove `output_format` and `optimize_streaming_latency` from body, add `previous_text` | Better audio continuity between batches |
| `STTConnection.js` → `handleMessage` | Update error message_type matching (remove `scribe_` prefix, add new types) | Unhandled errors will be silently ignored |
| `STTConnection.js` → `sendAudio` | Always include `commit: false` (required field) | API may reject messages without commit field |
| `TTSPlayer.js` | Track `previous_text` for continuity between sequential TTS calls | Improved audio quality at sentence boundaries |
| `errors.js` | Add error codes for new API error types | Better error handling coverage |
