# Data Model: Full Voice Mode

**Feature**: 001-full-voice-mode
**Date**: 2026-02-19

## Entities

### VoiceSessionState (Enum)

Finite state machine representing the lifecycle of a voice mode session.

```
States:
  IDLE           — No active session; voice mode is closed
  INITIALIZING   — Session starting; requesting mic, connecting STT
  LISTENING      — Microphone active, STT connected, awaiting user speech
  PROCESSING     — Voice activity detected; user is speaking, STT processing
  SPEAKING       — TTS audio is playing (agent response)
  ERROR          — An error occurred; awaiting retry or dismiss

Transitions:
  IDLE → INITIALIZING           trigger: user clicks voice mode button
  INITIALIZING → LISTENING      trigger: mic granted + STT connected
  INITIALIZING → ERROR          trigger: mic denied, STT connection failed, or timeout
  LISTENING → PROCESSING        trigger: local VAD detects voice activity
  PROCESSING → LISTENING        trigger: STT commits transcript + message sent
  PROCESSING → LISTENING        trigger: silence without valid transcript (stay listening)
  LISTENING → SPEAKING          trigger: agent streaming message detected, TTS starts
  SPEAKING → LISTENING          trigger: TTS playback completes, auto-return to listening
  SPEAKING → PROCESSING         trigger: barge-in detected (user interrupts agent)
  ANY → ERROR                   trigger: unrecoverable error (network loss, mic failure)
  ERROR → INITIALIZING          trigger: user clicks retry
  ANY → IDLE                    trigger: user exits voice mode (close button / Escape)
```

**Simplified vs. Prototype**: The prototype had SENDING and RECEIVING states, but these created unnecessary complexity. In the production version:
- SENDING is removed: after STT commits, the message is sent immediately and we return to LISTENING
- RECEIVING is removed: agent streaming is detected from the existing service state; we transition directly to SPEAKING when TTS starts

### VoiceConfiguration

Settings provided by the host application to configure voice mode behavior.

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| enabled | boolean | yes | — | must be `true` | Master toggle for voice mode |
| voiceId | string | yes | — | non-empty string | ElevenLabs voice ID for TTS |
| languageCode | string | no | `'en'` (overridden by service `language:changed`) | ISO 639-1 code | Initial language for STT/TTS |
| silenceThreshold | number | no | `1.5` | 0.3 – 3.0 (seconds) | Silence duration before auto-send |
| vadThreshold | number | no | `0.02` | 0.01 – 0.5 | Local VAD sensitivity for barge-in detection |
| bargeInVadThreshold | number | no | `0.08` | 0.03 – 0.5 | Elevated VAD threshold during TTS playback |
| sttVadThreshold | number | no | `0.5` | 0.0 – 1.0 | ElevenLabs STT VAD sensitivity |
| enableBargeIn | boolean | no | `true` | — | Allow user to interrupt agent |
| autoListen | boolean | no | `true` | — | Auto-listen after agent speaks |
| ttsModel | string | no | `'eleven_flash_v2_5'` | enum: `eleven_flash_v2_5`, `eleven_multilingual_v2` | TTS model selection |
| audioFormat | string | no | `'mp3_44100_128'` | enum: `mp3_44100_128`, `pcm_24000` | TTS audio output format |
| latencyOptimization | number | no | `3` | 0 – 4 | ElevenLabs latency optimization level |
| getToken | function | yes | — | must be async function returning string | Provides single-use STT token |
| getApiKey | function | yes | — | must be function returning string | Provides API key for TTS |
| texts | object | no | (see below) | — | UI text customization |

**texts sub-object**:

| Field | Type | Default |
|-------|------|---------|
| title | string | i18n `voice_mode.title` |
| listening | string | i18n `voice_mode.listening` |
| microphoneHint | string | i18n `voice_mode.microphoneHint` |
| speaking | string | i18n `voice_mode.speaking` |
| processing | string | i18n `voice_mode.processing` |
| errorTitle | string | i18n `voice_mode.errorTitle` |

### VoiceError

Structured error for voice mode operations.

| Field | Type | Description |
|-------|------|-------------|
| code | string (VoiceErrorCode) | Machine-readable error code |
| message | string | User-friendly error message (localized) |
| suggestion | string | Recovery suggestion for the user |
| recoverable | boolean | Whether retry is possible |
| originalError | Error \| null | Original error that caused this |

**VoiceErrorCode enum**:

| Code | Recoverable | Trigger | ElevenLabs API message_type(s) |
|------|-------------|---------|-------------------------------|
| MICROPHONE_PERMISSION_DENIED | yes | User denied mic permission | — (browser) |
| MICROPHONE_NOT_FOUND | no | No microphone hardware detected | — (browser) |
| BROWSER_NOT_SUPPORTED | no | Missing getUserMedia or AudioContext | — (browser) |
| STT_CONNECTION_FAILED | yes | WebSocket connection failed, timed out, or resource exhausted | `resource_exhausted`, `session_time_limit_exceeded` |
| STT_TRANSCRIPTION_FAILED | yes | STT service returned processing error | `error`, `input_error`, `chunk_size_exceeded`, `transcriber_error` |
| TTS_GENERATION_FAILED | yes | TTS HTTP request failed | — (HTTP 4xx/5xx) |
| NETWORK_ERROR | yes | General network connectivity loss | — (fetch/WebSocket network errors) |
| TOKEN_EXPIRED | yes | Authentication token rejected | `auth_error` |
| RATE_LIMITED | yes | Too many requests or quota exceeded | `rate_limited`, `quota_exceeded`, `commit_throttled`, `queue_overflow` |
| UNKNOWN_ERROR | yes | Unclassified error | `unaccepted_terms`, any unknown type |

**Note**: The `insufficient_audio_activity` message from the API is not treated as an error — it simply means no speech was detected and the system stays in listening state.

### EchoGuardState

Internal state for the echo cancellation module.

| Field | Type | Description |
|-------|------|-------------|
| isTTSPlaying | boolean | Whether TTS audio is currently playing |
| isGated | boolean | Whether mic-to-STT forwarding is blocked |
| cooldownActive | boolean | Whether post-TTS cooldown is in progress |
| cooldownTimeoutId | number \| null | Timeout ID for cooldown timer |
| consecutiveVoiceFrames | number | Count of consecutive audio frames with voice above threshold |
| bargeInThreshold | number | Current VAD threshold (elevated during TTS, normal otherwise) |

### TextChunkerState

Internal state for the text batching module.

| Field | Type | Description |
|-------|------|-------------|
| buffer | string | Accumulated text not yet emitted |
| minChunkSize | number | Minimum characters before emitting (default: 20) |
| maxChunkSize | number | Maximum characters before forced emit at word boundary (default: 150) |

## State Machine Diagram

```
                          ┌──────────────────┐
                          │      IDLE        │
                          └────────┬─────────┘
                                   │ enterVoiceMode()
                                   ▼
                          ┌──────────────────┐
                     ┌────│  INITIALIZING    │────┐
                     │    └──────────────────┘    │
                     │ success                    │ failure
                     ▼                            ▼
              ┌──────────────┐           ┌──────────────┐
         ┌───►│  LISTENING   │◄──────────│    ERROR     │
         │    └──────┬───────┘  retry    └──────────────┘
         │           │ VAD detects                ▲
         │           │ voice                      │ unrecoverable
         │           ▼                            │ error
         │    ┌──────────────┐                    │
         │    │  PROCESSING  │────────────────────┘
         │    └──────┬───────┘
         │           │ STT commits
         │           │ message sent
         │           │
         │    ┌──────┴───────┐
         │    │              │
         │    ▼              │ (no agent response)
         │  agent text       │
         │  streaming        ▼
         │    │          back to LISTENING
         │    ▼
         │  ┌──────────────┐
         │  │   SPEAKING   │──── barge-in ───► PROCESSING
         │  └──────┬───────┘
         │         │ TTS ends
         └─────────┘

    ─── ANY state ──► IDLE (exitVoiceMode)
```

## Relationship to Existing Data

Voice mode does not introduce new persistent data structures. All messages are sent via the existing `service.sendMessage(text)` and appear as standard text messages in `state.messages`. The voice session state is ephemeral and lives entirely in React state within ChatContext.

The only integration point with existing data is:
- **Messages**: Voice mode reads `state.messages` to detect streaming agent responses and feed text to TTS
- **Language**: Voice mode reads the language from the `language:changed` event (already in ChatContext)
- **Connection**: Voice mode checks `state.connection.status === 'connected'` before starting a session
