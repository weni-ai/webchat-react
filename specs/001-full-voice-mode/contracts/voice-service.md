# Contract: VoiceService API

**Feature**: 001-full-voice-mode
**Date**: 2026-02-19

## VoiceService (Orchestrator)

The main entry point for voice mode functionality. Coordinates AudioCapture, STTConnection, TTSPlayer, TextChunker, and EchoGuard.

### Static Methods

```javascript
VoiceService.isSupported()
// Returns: boolean
// Checks if browser supports getUserMedia, AudioContext, and WebSocket
```

### Instance Methods

```javascript
// Lifecycle
async init(config: VoiceConfiguration): void
  // Validates config, creates sub-components (AudioCapture, TTSPlayer, TextChunker, EchoGuard)
  // Throws: VoiceError if config is invalid

async startSession(): { id: string, startedAt: number }
  // Requests mic permission, starts AudioCapture, connects STT
  // Transitions: IDLE → INITIALIZING → LISTENING
  // Throws: VoiceError on mic denial, STT connection failure

endSession(): void
  // Stops all components, releases mic, clears state
  // Transitions: ANY → IDLE

// Speech Processing
processTextChunk(textChunk: string, isComplete?: boolean): void
  // Feeds incoming agent text to TextChunker → TTSPlayer pipeline
  // Called by ChatContext when streaming messages are detected
  // Handles: text batching, echo guard gating, TTS queuing

stopSpeaking(immediate?: boolean): void
  // Stops TTS playback. immediate=true for exit, false for barge-in fade

// Message Handling
setMessageCallback(callback: (text: string) => void): void
  // Registers callback invoked when STT commits a transcript
  // ChatContext uses this to call service.sendMessage(text)

// Language
setLanguage(languageCode: string): void
  // Updates language for subsequent STT connections and TTS requests
  // Does not interrupt currently playing TTS

// State
getSession(): { id, state, startedAt, config, partialTranscript, isPlaying, error } | null
setState(newState: VoiceSessionState): void  // internal
```

### Properties

```javascript
state: VoiceSessionState       // Current state (read-only externally)
partialTranscript: string      // Current partial transcript from STT
error: VoiceError | null       // Current error
config: VoiceConfiguration     // Merged configuration
```

## AudioCapture

Handles microphone access, PCM encoding, and local voice activity detection.

### Methods

```javascript
static isSupported(): boolean
async requestPermission(): boolean
async checkPermission(): PermissionState  // 'granted' | 'denied' | 'prompt'
async start(options?: { vadThreshold?: number }): void
stop(): void
pause(): void
resume(): void
resetSpeakingState(): void
destroy(): void
```

### Events Emitted

```javascript
'audioData'       → { data: string (base64 PCM), sampleRate: number, hasVoice: boolean }
'voiceActivity'   → { speaking: boolean }
'silenceDetected' → { duration: number (ms) }
'error'           → VoiceError
```

## STTConnection

WebSocket connection to ElevenLabs Scribe v2 Realtime.

**API Reference**: `wss://api.elevenlabs.io/v1/speech-to-text/realtime`

### WebSocket Query Parameters (built by `config.js`)

```javascript
{
  model_id: 'scribe_v2_realtime',
  token: '<single-use-token>',
  language_code: 'en',
  audio_format: 'pcm_16000',         // REQUIRED — explicit audio format
  commit_strategy: 'vad',
  vad_silence_threshold_secs: 1.5,    // NOTE: seconds, NOT milliseconds
  vad_threshold: 0.4,
  min_speech_duration_ms: 100,        // NOTE: no 'vad_' prefix
  min_silence_duration_ms: 100,
}
```

### Methods

```javascript
constructor(config: VoiceConfiguration, token: string)
connect(): Promise<void>        // Connects and waits for session_started
sendAudio(audioBase64: string, sampleRate: number, commit: boolean): void
  // NOTE: commit is REQUIRED (not optional) per API spec. Use false for normal audio.
commit(): void                  // Force commit (sends commit: true with empty audio)
isConnected(): boolean
disconnect(): void
destroy(): void
```

### Client Message Format (input_audio_chunk)

```javascript
{
  "message_type": "input_audio_chunk",
  "audio_base_64": "<base64-encoded-pcm>",
  "commit": false,        // REQUIRED — always include
  "sample_rate": 16000    // REQUIRED
}
```

### Server Message Types Handled

```javascript
// Success messages
'session_started'                          → emit 'session'
'partial_transcript'                       → emit 'partial'
'committed_transcript'                     → emit 'committed'
'committed_transcript_with_timestamps'     → emit 'committed' (with timestamps)

// Error messages (API uses these exact message_type values)
'error'                          → emit 'error' (general error)
'auth_error'                     → emit 'error' (TOKEN_EXPIRED)
'rate_limited'                   → emit 'error' (RATE_LIMITED)
'quota_exceeded'                 → emit 'error' (RATE_LIMITED)
'commit_throttled'               → emit 'error' (RATE_LIMITED)
'input_error'                    → emit 'error' (STT_TRANSCRIPTION_FAILED)
'chunk_size_exceeded'            → emit 'error' (STT_TRANSCRIPTION_FAILED)
'insufficient_audio_activity'    → (ignore — stay listening)
'transcriber_error'              → emit 'error' (STT_TRANSCRIPTION_FAILED)
'queue_overflow'                 → emit 'error' (RATE_LIMITED)
'resource_exhausted'             → emit 'error' (STT_CONNECTION_FAILED)
'session_time_limit_exceeded'    → emit 'error' (STT_CONNECTION_FAILED) + trigger reconnect
'unaccepted_terms'               → emit 'error' (UNKNOWN_ERROR)
```

### Events Emitted

```javascript
'session'    → { sessionId: string, config: object }
'partial'    → { text: string }
'committed'  → { text: string, languageCode?: string, words?: array }
'error'      → VoiceError
'close'      → { code: number, reason: string }
```

## TTSPlayer

Handles ElevenLabs TTS HTTP streaming and Web Audio API playback.

**API Reference**: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream`

### API Call Format

```javascript
// URL (output_format and optimize_streaming_latency are QUERY params, NOT body)
POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream
  ?output_format=mp3_44100_128
  &optimize_streaming_latency=3

// Headers
xi-api-key: <api-key>
Content-Type: application/json

// Body
{
  "text": "Hello, how can I help?",
  "model_id": "eleven_flash_v2_5",
  "language_code": "en",
  "previous_text": "..."   // Text from previous TTS call for audio continuity
}
```

### Methods

```javascript
async speak(text: string, options?: TTSOptions): void
  // Queues text for TTS. Makes HTTP request, streams response, plays audio.
  // Options: { voiceId, apiKey, ttsModel, audioFormat, languageCode, latencyOptimization }
  // Tracks previousText internally for continuity between sequential calls.

stop(immediate?: boolean, bargeIn?: boolean): void
  // immediate=true: hard stop (exit voice mode)
  // bargeIn=true: fast 20ms fade (user interrupting)
  // neither: 150ms fade (standard stop)

clearPreviousText(): void
  // Resets previous_text tracking (called on barge-in, new conversation turn)

destroy(): void
```

### Properties

```javascript
isPlaying: boolean      // Whether audio is currently playing
isStopped: boolean      // Whether stop was called
previousText: string    // Last spoken text (for continuity in next request)
```

### Events Emitted

```javascript
'started' → { text: string }
'ended'   → void
'error'   → VoiceError
```

## TextChunker

Pure-function text batching for TTS credit efficiency.

### Methods

```javascript
constructor(options?: { minChunkSize?: number, maxChunkSize?: number })

addText(text: string): string | null
  // Adds text to buffer. Returns a chunk if a sentence boundary or max size is reached.
  // Returns null if more text is needed.

flush(): string | null
  // Returns remaining buffered text and clears buffer.
  // Returns null if buffer is empty.

clear(): void
  // Discards all buffered text (used on barge-in).

getBufferLength(): number
  // Returns current buffer length.
```

### Behavior

- Sentence delimiters: `.!?。！？\n`
- Emits on sentence boundary when buffer >= minChunkSize (20 chars)
- Force-emits on word boundary when buffer >= maxChunkSize (150 chars)
- `flush()` emits everything remaining (used when stream completes)
- `clear()` discards everything (used on barge-in)

## EchoGuard

Manages microphone-to-STT gating during TTS playback for echo prevention.

### Methods

```javascript
constructor(options?: { cooldownMs?: number, consecutiveFramesRequired?: number })

onTTSStarted(): void
  // Activates gate: stops forwarding audio to STT, elevates VAD threshold

onTTSStopped(): void
  // Starts cooldown timer. After cooldown, deactivates gate.

onBargeInDetected(): void
  // Immediately deactivates gate (bypass cooldown)

shouldForwardAudio(): boolean
  // Returns true if audio should be sent to STT (gate is open)

shouldTriggerBargeIn(hasVoice: boolean): boolean
  // Checks if voice activity should trigger barge-in
  // Uses elevated threshold and consecutive frame counting during TTS

reset(): void
  // Clears all state (used on session end)

destroy(): void
  // Clears timeouts
```

### Properties

```javascript
isGated: boolean           // Whether mic-to-STT forwarding is blocked
isTTSPlaying: boolean      // Whether TTS is currently playing
bargeInThreshold: number   // Current VAD threshold (elevated or normal)
```
