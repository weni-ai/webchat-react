# Contract: Voice Mode Events

**Feature**: 001-full-voice-mode
**Date**: 2026-02-19

## VoiceService Events

Events emitted by the VoiceService orchestrator, consumed by the `useVoiceMode` hook and ChatContext.

### Session Lifecycle

| Event | Payload | When |
|-------|---------|------|
| `session:started` | `{ id: string, startedAt: number }` | Voice session begins (INITIALIZING → LISTENING) |
| `session:ended` | `{ sessionId: string, duration: number }` | Voice session ends (ANY → IDLE) |
| `state:changed` | `{ state: string, previousState: string }` | Any state transition |

### Speech Recognition

| Event | Payload | When |
|-------|---------|------|
| `listening:started` | — | Microphone begins capturing for STT |
| `listening:stopped` | — | Microphone stops capturing (session end) |
| `transcript:partial` | `{ text: string }` | Real-time partial transcript from STT |
| `transcript:committed` | `{ text: string }` | Final transcript committed by STT VAD |

### Text-to-Speech

| Event | Payload | When |
|-------|---------|------|
| `speaking:started` | `{ text: string }` | TTS audio begins playing |
| `speaking:ended` | — | TTS audio finishes playing |

### Interaction

| Event | Payload | When |
|-------|---------|------|
| `barge-in` | — | User interrupted agent speech |

### Errors

| Event | Payload | When |
|-------|---------|------|
| `error` | `VoiceError { code, message, suggestion, recoverable }` | Any error occurs |

## ChatContext Integration

### State Updates from VoiceService Events

| VoiceService Event | ChatContext State Update |
|--------------------|-------------------------|
| `session:started` | `isVoiceModeActive = true` |
| `session:ended` | `isVoiceModeActive = false`, clear all voice state |
| `state:changed` | `voiceModeState = state` |
| `transcript:partial` | `voicePartialTranscript = text` |
| `transcript:committed` | `voiceCommittedTranscript = text`, `voicePartialTranscript = ''` |
| `speaking:started` | `voiceAgentText = text` (accumulated) |
| `speaking:ended` | (keep voiceAgentText for display until next user message) |
| `barge-in` | `voiceAgentText = ''` |
| `error` | `voiceError = error` |

### Inbound Events (Service → Voice)

| Service Event | Voice Mode Action |
|---------------|-------------------|
| `language:changed` | Update `voiceLanguage` state; call `voiceService.setLanguage(lang)` if session active |
| `state:changed` | Detect streaming messages; feed new text chunks to `voiceService.processTextChunk()` |
| `message:received` | If voice mode active and message is incoming text, mark as complete for TTS |

### Message Detection for TTS

During voice mode, ChatContext monitors `state.messages` for incoming streaming messages:

```
On state:changed:
  1. If voice mode is NOT active → skip
  2. Get the last message in state.messages
  3. If message.direction === 'incoming' AND message.status === 'streaming':
     a. Calculate new text = message.text - previouslyProcessedText
     b. Call voiceService.processTextChunk(newText, false)
     c. Track previouslyProcessedText = message.text
  4. If message.direction === 'incoming' AND message.status !== 'streaming'
     AND previouslyProcessedText exists:
     a. Calculate remaining text
     b. Call voiceService.processTextChunk(remainingText, true)
     c. Reset previouslyProcessedText
```

## useVoiceMode Hook Return Interface

```javascript
{
  // State
  isActive: boolean,           // Voice overlay is open
  isEnabled: boolean,          // Voice mode is configured and enabled
  isSupported: boolean,        // Browser supports required APIs
  state: VoiceSessionState,    // Current session state
  partialTranscript: string,   // Real-time partial transcript
  committedTranscript: string, // Last committed user message
  agentText: string,           // Agent text being spoken
  error: VoiceError | null,    // Current error

  // Computed
  isListening: boolean,        // state is 'listening' or 'processing'
  isSpeaking: boolean,         // state is 'speaking'

  // Actions
  enter: () => Promise<boolean>,  // Enter voice mode (returns success)
  exit: () => void,               // Exit voice mode
  retry: () => Promise<boolean>,  // Clear error and re-enter

  // Config
  texts: object,               // Resolved UI texts (config override or i18n)
}
```
