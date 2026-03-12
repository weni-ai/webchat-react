# Contract: Voice Mode Configuration

**Feature**: 001-full-voice-mode
**Date**: 2026-02-19

## WebChat.init() Configuration Extension

Voice mode is configured via a `voiceMode` property in the WebChat initialization options.

### Interface

```javascript
WebChat.init({
  // ... existing config ...

  voiceMode: {
    // Required
    enabled: true,
    voiceId: 'pFZP5JQG7iQjIQuC4Bku',
    getToken: async () => { /* returns single-use STT token */ },
    getApiKey: () => { /* returns ElevenLabs API key for TTS */ },

    // Optional — all have sensible defaults
    languageCode: 'pt',           // default: 'en' (overridden by service language:changed)
    silenceThreshold: 1.5,        // seconds (0.3 – 3.0)
    vadThreshold: 0.02,           // local VAD sensitivity (0.01 – 0.5)
    bargeInVadThreshold: 0.08,    // elevated VAD during TTS (0.03 – 0.5)
    sttVadThreshold: 0.5,         // ElevenLabs STT VAD (0.0 – 1.0)
    enableBargeIn: true,          // allow interrupting agent
    autoListen: true,             // auto-listen after agent speaks
    ttsModel: 'eleven_flash_v2_5',// TTS model
    audioFormat: 'mp3_44100_128', // TTS output format
    latencyOptimization: 3,       // 0–4 (higher = more optimization)

    // UI text overrides (optional — falls back to i18n)
    texts: {
      title: 'Voice Mode',
      listening: "I'm listening, how can I help you?",
      microphoneHint: 'The microphone is on, you can speak whenever you\'re ready.',
      speaking: 'Speaking...',
      processing: 'Processing...',
      errorTitle: 'Something went wrong',
    },
  },
});
```

### Validation Rules

| Field | Rule | Error on Violation |
|-------|------|--------------------|
| `enabled` | must be `true` for voice mode to activate | Voice mode silently disabled |
| `voiceId` | non-empty string | Error: "voiceId is required" |
| `getToken` | must be a function returning `Promise<string>` | Error: "getToken must be an async function" |
| `getApiKey` | must be a function returning `string` | Error: "getApiKey must be a function" |
| `silenceThreshold` | number, 0.3 – 3.0 | Error with range description |
| `vadThreshold` | number, 0.01 – 0.5 | Error with range description |
| `ttsModel` | one of `eleven_flash_v2_5`, `eleven_multilingual_v2` | Error listing valid values |
| `audioFormat` | one of `mp3_44100_128`, `pcm_24000` | Error listing valid values |
| `latencyOptimization` | integer, 0 – 4 | Error with range description |

### Standalone Build (standalone.jsx)

The `mapConfig()` function in `standalone.jsx` passes the `voiceMode` object through to the config unchanged:

```javascript
function mapConfig(params) {
  return {
    // ... existing mappings ...
    voiceMode: params.voiceMode,
  };
}
```

### React Library Usage

When using the React library directly (not standalone):

```jsx
import { ChatProvider } from '@weni/webchat-template-react';

<ChatProvider config={{
  socketUrl: '...',
  channelUuid: '...',
  host: '...',
  voiceMode: {
    enabled: true,
    voiceId: '...',
    getToken: async () => { /* ... */ },
    getApiKey: () => { /* ... */ },
  },
}}>
  {children}
</ChatProvider>
```

## ElevenLabs API URL Builders (config.js)

These functions build the correct API URLs. The prototype had several parameter errors that are corrected here.

### buildSTTWebSocketURL(config, token)

```javascript
// Returns: wss://api.elevenlabs.io/v1/speech-to-text/realtime?...
// Query parameters (verified against API docs 2026-02-19):
{
  model_id: config.sttModel,                    // 'scribe_v2_realtime'
  token: token,                                  // single-use token
  language_code: config.languageCode,            // ISO 639-1
  audio_format: 'pcm_16000',                    // NEW — explicit audio format
  commit_strategy: 'vad',                        // auto-commit on silence
  vad_silence_threshold_secs: config.silenceThreshold,  // FIXED — seconds, not ms!
  vad_threshold: config.sttVadThreshold,         // default 0.4
  min_speech_duration_ms: config.minSpeechDuration,     // FIXED — no 'vad_' prefix
  min_silence_duration_ms: config.minSilenceDuration,   // default 100
}
// REMOVED: vad_prefix_padding_ms (does not exist in API)
```

### buildTTSStreamURL(voiceId, config)

```javascript
// FIXED — output_format and optimize_streaming_latency are QUERY params
// Returns: https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream
//          ?output_format=mp3_44100_128&optimize_streaming_latency=3
```

### buildTTSRequestBody(text, config, previousText)

```javascript
// Returns request body object:
{
  text: text,                         // required
  model_id: config.ttsModel,         // 'eleven_flash_v2_5'
  language_code: config.languageCode, // ISO 639-1
  previous_text: previousText || undefined,  // NEW — for audio continuity
}
// REMOVED from body: output_format, optimize_streaming_latency (now in URL)
```

### PropTypes Addition (ChatProvider)

```javascript
voiceMode: PropTypes.shape({
  enabled: PropTypes.bool.isRequired,
  voiceId: PropTypes.string.isRequired,
  getToken: PropTypes.func.isRequired,
  getApiKey: PropTypes.func.isRequired,
  languageCode: PropTypes.string,
  silenceThreshold: PropTypes.number,
  vadThreshold: PropTypes.number,
  bargeInVadThreshold: PropTypes.number,
  sttVadThreshold: PropTypes.number,
  enableBargeIn: PropTypes.bool,
  autoListen: PropTypes.bool,
  ttsModel: PropTypes.string,
  audioFormat: PropTypes.string,
  latencyOptimization: PropTypes.number,
  texts: PropTypes.shape({
    title: PropTypes.string,
    listening: PropTypes.string,
    microphoneHint: PropTypes.string,
    speaking: PropTypes.string,
    processing: PropTypes.string,
    errorTitle: PropTypes.string,
  }),
}),
```
