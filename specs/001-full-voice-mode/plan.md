# Implementation Plan: Full Voice Mode

**Branch**: `001-full-voice-mode` | **Date**: 2026-02-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-full-voice-mode/spec.md`

## Summary

Full Voice Mode adds an immersive, hands-free voice conversation interface to the Weni Webchat. Users enter voice mode via a button in the chat header, speak naturally to send messages (ElevenLabs Scribe STT via WebSocket), and hear agent responses spoken aloud (ElevenLabs TTS via streaming HTTP). The implementation addresses five critical issues from the prototype: echo/speakerphone feedback loops, unreliable barge-in, browser-based language detection, excessive TTS credit consumption, and visual overlap of transcript text. The feature integrates into the existing Service/Template architecture with new voice services under `src/services/voice/`, React components under `src/components/VoiceMode/`, a `useVoiceMode` hook, and ChatContext integration for the voice lifecycle.

## Technical Context

**Language/Version**: JavaScript (ES2020+), React 18, JSX
**Primary Dependencies**: `@weni/webchat-service ^1.7.0` (peer), `i18next`, `prop-types`, `react-i18next`. External API: ElevenLabs (STT WebSocket, TTS HTTP streaming). No new npm packages needed.
**Storage**: N/A (voice state is ephemeral in-memory; messages persist through existing service)
**Testing**: Jest 29.7 + @testing-library/react 16.2; 80% minimum coverage for statements, branches, functions, lines
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge — latest 2 versions), desktop and mobile. HTTPS required for microphone access.
**Project Type**: Frontend library (React component library + UMD standalone build via Vite 5)
**Performance Goals**: Voice mode entry < 3s, TTS playback start < 2s from first text chunk, barge-in audio stop < 300ms, no perceptible gaps between TTS batches (< 100ms)
**Constraints**: ElevenLabs TTS credit efficiency (max 3-4 requests per 3-sentence response), speakerphone echo prevention (95%+ sessions without false detection), all CSS scoped under `.weni-widget` via PostCSS prefix
**Scale/Scope**: Single-feature addition to existing ~35-file React template codebase; ~15 new files (services, components, hook, utils, styles, tests, translations, HTML test page)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Clean Code & Readability** — PASS. Voice services follow single responsibility (AudioCapture, STTConnection, TTSPlayer, VoiceService orchestrator). Functions are focused and self-descriptive. Files stay under 350 lines each.
2. **Code Style Standards** — PASS. Will follow ESLint config (`@weni/eslint-config/react16.js`), Prettier, 2-space indent, single quotes, semicolons, trailing commas. No `any` types. No trailing whitespace.
3. **Naming Conventions** — PASS. Components in PascalCase (`VoiceModeOverlay`, `WaveformVisualizer`), functions/variables in camelCase (`handleBargeIn`, `isPlaying`), SCSS uses BEM (`.weni-voice-overlay__header`), events prefixed with `on`/`handle`.
4. **Testing & Quality (80% coverage)** — PASS. All services and components will have dedicated test files. Voice services tested with mocked WebSocket/Audio APIs. Components tested with @testing-library/react.
5. **Semantic HTML & Accessibility** — PASS. Voice overlay uses `role="dialog"`, `aria-modal="true"`, `aria-label` on all interactive elements. Waveform uses `role="img"` with state-based aria-labels. Close button has explicit aria-label.
6. **Pre-Commit Compliance** — PASS. All code will pass `npm run format && npm run lint -- --fix` before committing. No `--no-verify`.

**Constitution Check Result: ALL GATES PASS. Proceeding to Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/001-full-voice-mode/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── voice-config.md  # Configuration interface contract
│   ├── voice-service.md # VoiceService API contract
│   └── voice-events.md  # Event system contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── services/
│   └── voice/
│       ├── index.js              # Public API exports
│       ├── VoiceService.js       # Main orchestrator (lifecycle, state machine)
│       ├── AudioCapture.js       # Microphone capture, PCM encoding, local VAD
│       ├── STTConnection.js      # ElevenLabs Scribe WebSocket (STT)
│       ├── TTSPlayer.js          # ElevenLabs TTS HTTP streaming + Web Audio playback
│       ├── TextChunker.js        # Sentence-boundary text batching for TTS efficiency
│       ├── EchoGuard.js          # Echo cancellation / audio isolation logic
│       ├── config.js             # Configuration defaults, validation, URL builders
│       └── errors.js             # VoiceError class, error codes, error factories
├── components/
│   └── VoiceMode/
│       ├── index.js              # Component exports
│       ├── VoiceModeButton.jsx   # Header entry point button
│       ├── VoiceModeButton.scss  # Button styles
│       ├── VoiceModeOverlay.jsx  # Full-screen overlay (dialog)
│       ├── VoiceModeOverlay.scss # Overlay styles (gradient, layout)
│       ├── VoiceModeError.jsx    # Error display with retry/dismiss
│       ├── WaveformVisualizer.jsx# Animated waveform bars
│       └── WaveformVisualizer.scss # Waveform animations
├── hooks/
│   └── useVoiceMode.js           # React hook for voice mode state/actions
├── utils/
│   └── audioUtils.js             # PCM encoding, downsampling, VAD, merge chunks
├── i18n/
│   └── locales/
│       ├── en.json               # + voice_mode.* keys
│       ├── pt.json               # + voice_mode.* keys
│       └── es.json               # + voice_mode.* keys
├── contexts/
│   └── ChatContext.jsx           # + voice mode state, enter/exit methods, language sync
├── standalone.jsx                # + voiceMode config passthrough in mapConfig
└── index.js                      # + useVoiceMode export

examples/
└── voice-mode-test.html          # Standalone HTML test page

test/
├── services/
│   └── voice/
│       ├── VoiceService.test.js
│       ├── AudioCapture.test.js
│       ├── STTConnection.test.js
│       ├── TTSPlayer.test.js
│       ├── TextChunker.test.js
│       ├── EchoGuard.test.js
│       ├── config.test.js
│       └── errors.test.js
├── components/
│   └── VoiceMode/
│       ├── VoiceModeButton.test.jsx
│       ├── VoiceModeOverlay.test.jsx
│       ├── VoiceModeError.test.jsx
│       └── WaveformVisualizer.test.jsx
├── hooks/
│   └── useVoiceMode.test.js
└── utils/
    └── audioUtils.test.js
```

**Structure Decision**: Follows the existing React template's structure. Voice services are self-contained under `src/services/voice/` (new directory — the project currently has no `src/services/`). Components follow existing patterns under `src/components/VoiceMode/`. The architecture adds two new modules compared to the prototype: `TextChunker` (splits the monolithic chunk logic out of VoiceService for testability and TTS credit optimization) and `EchoGuard` (encapsulates the echo cancellation strategy, which was the prototype's biggest failure point).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New `src/services/` directory | Project has no services dir yet; voice mode needs 8 service files | Putting services in `src/utils/` would violate separation of concerns — utils are stateless helpers, voice services manage stateful connections and lifecycle |
| `EchoGuard` as separate module | Echo cancellation requires coordinating mic muting with TTS playback timing, tracking speaking state, and cooldown periods | Inline logic in VoiceService would make the orchestrator too complex (~500+ lines) and untestable in isolation |
| `TextChunker` as separate module | Sentence-boundary batching is a pure-function concern with specific test cases (edge cases around punctuation, incomplete sentences, barge-in) | Inline in VoiceService made the prototype's processTextChunk method hard to test and tune independently |

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts are complete.*

1. **Clean Code & Readability** — PASS. Each service file has a single responsibility (AudioCapture: mic, STTConnection: websocket, TTSPlayer: playback, TextChunker: batching, EchoGuard: echo prevention). The VoiceService orchestrator delegates to these modules. No file exceeds 350 lines. Function names are self-descriptive (`shouldForwardAudio`, `shouldTriggerBargeIn`, `addText`, `flush`).
2. **Code Style Standards** — PASS. All contracts use camelCase for methods/variables, PascalCase for classes. SCSS uses BEM (`.weni-voice-overlay__header`). No `any` types. ESLint/Prettier compliant.
3. **Naming Conventions** — PASS. Components: `VoiceModeOverlay`, `WaveformVisualizer` (PascalCase). Hooks: `useVoiceMode` (camelCase with `use` prefix). Events: `on` prefix for handlers (`onClose`, `onRetry`). State booleans: `is` prefix (`isPlaying`, `isGated`, `isSpeaking`).
4. **Testing & Quality (80% coverage)** — PASS. Test plan covers all 8 service files, 4 component files, 1 hook, and 1 utility file. Service tests mock WebSocket/AudioContext/getUserMedia. Component tests use @testing-library/react. Edge cases (barge-in, echo, reconnection) have dedicated test scenarios.
5. **Semantic HTML & Accessibility** — PASS. Overlay: `<div role="dialog" aria-modal="true">`. Header uses `<header>` and `<h2>`. Close button: `aria-label="Fechar modo de voz"`. Waveform: `<div role="img" aria-label="...">` with state-based labels. Error section uses `<h3>` for title.
6. **Pre-Commit Compliance** — PASS. No new tooling required. Existing ESLint config, Prettier, and Jest pipeline apply to all new files. SCSS variables are auto-imported via Vite config. PostCSS prefixing scopes all new styles under `.weni-widget`.

**Post-Design Constitution Check Result: ALL GATES PASS.**
