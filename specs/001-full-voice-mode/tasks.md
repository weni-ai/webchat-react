# Tasks: Full Voice Mode

**Input**: Design documents from `/specs/001-full-voice-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included — the constitution requires 80% minimum coverage for all metrics. Tests are written AFTER implementation per task (not TDD).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the directory structure, shared utilities, i18n keys, and foundational modules that all user stories depend on.

- [x] T001 Create directory structure: `src/services/voice/`, `src/components/VoiceMode/`, `examples/`, `test/services/voice/`, `test/components/VoiceMode/`, `test/hooks/`, `test/utils/`
- [x] T002 [P] Create audio utility module with PCM encoding, downsampling, VAD, and merge helpers in `src/utils/audioUtils.js`
- [x] T003 [P] Create voice error types, error codes (including all ElevenLabs API error message_types), and factory functions in `src/services/voice/errors.js`
- [x] T004 [P] Create voice configuration module with defaults, validation, and API URL builders (corrected per API audit: `vad_silence_threshold_secs` in seconds, `audio_format` query param for STT, `output_format`/`optimize_streaming_latency` as TTS query params, `previous_text` in TTS body) in `src/services/voice/config.js`
- [x] T005 [P] Add voice_mode translation keys (title, listening, microphoneHint, speaking, processing, errorTitle, you, youSaid, assistant) to `src/i18n/locales/en.json`, `src/i18n/locales/pt.json`, `src/i18n/locales/es.json`
- [x] T006 [P] Create public API exports barrel file in `src/services/voice/index.js`
- [x] T007 [P] Create component exports barrel file in `src/components/VoiceMode/index.js`

**Checkpoint**: Directory structure exists, shared utilities compile, i18n keys available.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core voice service modules that MUST be complete before any user story can be implemented. These are the building blocks all stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T008 Implement AudioCapture class (mic stream acquisition, ScriptProcessorNode, PCM encoding, local VAD, voice activity events, watchdog recovery) in `src/services/voice/AudioCapture.js`
- [x] T009 Implement STTConnection class (WebSocket to `wss://api.elevenlabs.io/v1/speech-to-text/realtime`, corrected query params per R10 audit, `commit` field always required in `input_audio_chunk`, all 17 server message_type handlers, auto-reconnect on close) in `src/services/voice/STTConnection.js`
- [x] T010 Implement TTSPlayer class (HTTP streaming fetch to `/v1/text-to-speech/{voice_id}/stream` with `output_format` and `optimize_streaming_latency` as query params, Web Audio API decode/playback, TTS queue, gain node for fade-out, `previous_text` tracking for continuity) in `src/services/voice/TTSPlayer.js`
- [x] T011 Implement TextChunker class (sentence-boundary batching with min 20 chars / max 150 chars, multilingual delimiters, flush on stream complete, clear on barge-in) in `src/services/voice/TextChunker.js`
- [x] T012 Implement EchoGuard class (mic-to-STT gating during TTS, elevated VAD threshold, consecutive-frame barge-in detection, post-TTS cooldown 200-300ms) in `src/services/voice/EchoGuard.js`
- [x] T013 Implement VoiceService orchestrator (state machine with 6 states per data-model, coordinates AudioCapture + STTConnection + TTSPlayer + TextChunker + EchoGuard, event emitter, session lifecycle) in `src/services/voice/VoiceService.js`
- [x] T014 Write unit tests for audioUtils (PCM encoding, downsampling, VAD, mergeChunks) in `test/utils/audioUtils.test.js`
- [x] T015 [P] Write unit tests for errors module in `test/services/voice/errors.test.js`
- [x] T016 [P] Write unit tests for config module (validation, URL builders with corrected params) in `test/services/voice/config.test.js`
- [x] T017 Write unit tests for TextChunker (sentence boundaries, min/max size, flush, clear, multilingual punctuation) in `test/services/voice/TextChunker.test.js`
- [x] T018 Write unit tests for EchoGuard (gating, threshold elevation, consecutive frames, cooldown, barge-in bypass) in `test/services/voice/EchoGuard.test.js`
- [x] T019 Write unit tests for AudioCapture (mock getUserMedia, AudioContext, processor events, permission handling, watchdog) in `test/services/voice/AudioCapture.test.js`
- [x] T020 Write unit tests for STTConnection (mock WebSocket, all 17 message types, sendAudio with required commit field, reconnect logic) in `test/services/voice/STTConnection.test.js`
- [x] T021 Write unit tests for TTSPlayer (mock fetch/AudioContext, queue, stop with fade, barge-in stop, previous_text tracking) in `test/services/voice/TTSPlayer.test.js`
- [x] T022 Write unit tests for VoiceService (state machine transitions, event emission, component coordination, session lifecycle) in `test/services/voice/VoiceService.test.js`
- [x] T023 Update `src/services/voice/index.js` to export all implemented classes and utilities

**Checkpoint**: All 8 service modules implemented and tested. `npm test` passes with ≥80% coverage for services. Voice service layer is self-contained and ready for UI integration.

---

## Phase 3: User Story 1 — Enter Voice Mode (Priority: P1) MVP

**Goal**: User sees a voice mode button, clicks it, overlay appears with waveform and listening state.

**Independent Test**: Click voice mode button → full-screen overlay appears → waveform animates → instructional text visible → mic permission requested.

### Implementation for User Story 1

- [x] T024 [P] [US1] Create WaveformVisualizer component (animated bars, idle/listening/speaking/processing states, aria-label) and styles in `src/components/VoiceMode/WaveformVisualizer.jsx` and `src/components/VoiceMode/WaveformVisualizer.scss`
- [x] T025 [P] [US1] Create VoiceModeError component (error display with icon, message, suggestion, retry/dismiss buttons) in `src/components/VoiceMode/VoiceModeError.jsx`
- [x] T026 [US1] Create VoiceModeOverlay component (full-screen dialog overlay with header/close, flexbox layout with fixed center waveform + scrollable bottom conversation area, status text, teal gradient, fade-in animation on open, fade-out animation on close via CSS class before unmount) and styles in `src/components/VoiceMode/VoiceModeOverlay.jsx` and `src/components/VoiceMode/VoiceModeOverlay.scss`
- [x] T027 [US1] Create VoiceModeButton component (mic icon button for header) and styles in `src/components/VoiceMode/VoiceModeButton.jsx` and `src/components/VoiceMode/VoiceModeButton.scss`
- [x] T028 [US1] Create useVoiceMode hook (wraps ChatContext voice state: isActive, isEnabled, isSupported, state, enter, exit, retry, texts) in `src/hooks/useVoiceMode.js`
- [x] T029 [US1] Extend ChatContext with voice mode state (isVoiceModeActive, voiceModeState, voiceError, isVoiceModeSupported, voiceLanguage) and methods (enterVoiceMode, exitVoiceMode, retryVoiceMode), add VoiceService initialization/teardown, language:changed sync in `src/contexts/ChatContext.jsx`
- [x] T030 [US1] Add VoiceModeButton to Header actions section (visible only when voice enabled + supported) and VoiceModeOverlay to Chat component in `src/components/Header/Header.jsx` and `src/components/Chat/Chat.jsx`
- [x] T031 [US1] Add voiceMode config passthrough in mapConfig and ChatProvider PropTypes in `src/standalone.jsx` and `src/contexts/ChatContext.jsx`
- [x] T032 [US1] Export useVoiceMode hook from package in `src/index.js`
- [x] T033 [P] [US1] Write component tests for WaveformVisualizer (states, aria-labels, bar count) in `test/components/VoiceMode/WaveformVisualizer.test.jsx`
- [x] T034 [P] [US1] Write component tests for VoiceModeError (render error, retry click, dismiss click) in `test/components/VoiceMode/VoiceModeError.test.jsx`
- [x] T035 [US1] Write component tests for VoiceModeOverlay (open/close, Escape key, state text, transcript areas) in `test/components/VoiceMode/VoiceModeOverlay.test.jsx`
- [x] T036 [US1] Write component tests for VoiceModeButton (click handler, disabled state, hidden when not supported) in `test/components/VoiceMode/VoiceModeButton.test.jsx`
- [x] T037 [US1] Write hook tests for useVoiceMode (state mapping, enter/exit actions, isEnabled/isSupported logic) in `test/hooks/useVoiceMode.test.js`

**Checkpoint**: User can click voice mode button → overlay opens with waveform → close button/Escape exits. Mic permission flow works. US1 independently testable.

---

## Phase 4: User Story 2 — Speak and Auto-Send Message (Priority: P1)

**Goal**: User speaks in voice mode, partial transcript shows in real-time, message auto-sends on silence.

**Independent Test**: Speak a phrase → partial transcript appears → silence → message sent to agent → appears in chat history.

**Depends on**: US1 (overlay must be open to speak)

### Implementation for User Story 2

- [x] T038 [US2] Wire AudioCapture → STTConnection audio forwarding in VoiceService (integrate EchoGuard.shouldForwardAudio check before sending), handle transcript:partial and transcript:committed events, invoke message callback on commit in `src/services/voice/VoiceService.js`
- [x] T039 [US2] Wire ChatContext to receive VoiceService transcript events, update voicePartialTranscript and voiceCommittedTranscript state, call service.sendMessage(text) on committed transcript in `src/contexts/ChatContext.jsx`
- [x] T040 [US2] Display partial transcript and committed transcript in VoiceModeOverlay conversation area (bottom section, scrollable, visually distinct labels) in `src/components/VoiceMode/VoiceModeOverlay.jsx`
- [x] T041 [US2] Add STT reconnect-on-close logic with token refresh and audio buffering during reconnection gap (max 3 retries, exponential backoff on abnormal close) in `src/services/voice/VoiceService.js`

**Checkpoint**: Full STT pipeline works: speak → see transcript → message sent → visible in chat history. Reconnection handles multi-turn.

---

## Phase 5: User Story 3 — Hear Agent Response Spoken Aloud (Priority: P1)

**Goal**: Agent text response is converted to speech and played progressively via TTS.

**Independent Test**: Send a message → agent responds → hear response spoken → waveform shows speaking state.

**Depends on**: US2 (messages must be sent to get responses)

### Implementation for User Story 3

- [x] T042 [US3] Wire ChatContext streaming message detection: monitor state.messages for incoming streaming messages, calculate new text delta, feed to voiceService.processTextChunk(), handle stream completion in `src/contexts/ChatContext.jsx`
- [x] T043 [US3] Wire VoiceService processTextChunk to TextChunker → TTSPlayer pipeline (TextChunker.addText → on chunk emit → TTSPlayer.speak with previous_text, flush on stream complete, EchoGuard.onTTSStarted/onTTSStopped, state transitions LISTENING → SPEAKING → LISTENING). Also filter non-speakable content (emojis-only, bare URLs, code blocks) before feeding to TTS — skip TTS and return to listening for non-speakable chunks. In `src/services/voice/VoiceService.js`
- [x] T044 [US3] Display agent text in VoiceModeOverlay conversation area (agent transcript section with label, accumulated text) and update waveform state to 'speaking' during TTS in `src/components/VoiceMode/VoiceModeOverlay.jsx`
- [x] T045 [US3] Handle TTS errors gracefully: on TTSPlayer error, display text visually on overlay, skip failed chunk, return to listening state in `src/services/voice/VoiceService.js`

**Checkpoint**: Full TTS pipeline works: agent streams text → hear speech → waveform animates → auto-return to listening. Credit-efficient batching verified (3-4 requests per 3-sentence response).

---

## Phase 6: User Story 4 — Echo-Free Speakerphone Usage (Priority: P1)

**Goal**: Agent audio does not get picked up by mic and misinterpreted as user speech on speakerphone.

**Independent Test**: Use speakers (no headphones) → agent speaks → no false speech detection or echo loop.

**Depends on**: US3 (TTS must be playing to test echo)

### Implementation for User Story 4

- [x] T046 [US4] Wire EchoGuard into VoiceService audio pipeline: call EchoGuard.onTTSStarted when TTS begins (gates mic-to-STT), call EchoGuard.onTTSStopped when TTS ends (starts cooldown), check shouldForwardAudio before every sendAudio call, apply bargeInThreshold in VAD check in `src/services/voice/VoiceService.js`
- [x] T047 [US4] Implement post-TTS cooldown in EchoGuard: after TTS stops, keep gate closed for 200-300ms to absorb residual echo, then resume normal STT forwarding in `src/services/voice/EchoGuard.js`
- [x] T048 [US4] Add integration test scenario: simulate TTS playing → verify no audio forwarded to STT → TTS stops → verify cooldown → verify resume in `test/services/voice/VoiceService.test.js`

**Checkpoint**: Speakerphone usage works without echo feedback loops. 95%+ sessions without false detection.

---

## Phase 7: User Story 5 — Interrupt Agent Response / Barge-In (Priority: P1)

**Goal**: User can reliably interrupt agent on first clear speech attempt. Agent audio stops within 300ms.

**Independent Test**: Agent is speaking → speak clearly → agent stops → user speech captured and sent.

**Depends on**: US4 (echo guard must work for barge-in to distinguish user from echo)

### Implementation for User Story 5

- [x] T049 [US5] Wire EchoGuard barge-in detection in VoiceService: during SPEAKING state, check EchoGuard.shouldTriggerBargeIn on every audio frame, on trigger → stop TTS (fast 20ms fade), clear TextChunker buffer, call EchoGuard.onBargeInDetected (opens STT gate), reset to LISTENING, emit barge-in event in `src/services/voice/VoiceService.js`
- [x] T050 [US5] Ensure STT reconnection works after barge-in: if STT connection was closed during gate, reconnect with fresh token before capturing user speech in `src/services/voice/VoiceService.js`
- [x] T051 [US5] Clear voiceAgentText in ChatContext on barge-in event, update overlay to show listening state in `src/contexts/ChatContext.jsx`
- [x] T052 [US5] Add barge-in test scenarios: simulate voice frames during SPEAKING → verify TTS stopped, verify consecutive-frame threshold prevents noise triggers, verify STT reconnects in `test/services/voice/VoiceService.test.js`

**Checkpoint**: Barge-in works reliably on first attempt. Agent stops within 300ms. User speech captured correctly after interruption.

---

## Phase 8: User Story 6 — Continuous Multi-Turn Conversation (Priority: P2)

**Goal**: After agent finishes speaking, system auto-returns to listening. Multi-turn conversation flows without manual intervention.

**Independent Test**: Have 5+ turn conversation → system cycles listen/speak automatically → no manual re-activation needed.

**Depends on**: US3 (TTS must complete to trigger auto-return)

### Implementation for User Story 6

- [x] T053 [US6] Ensure VoiceService auto-transitions SPEAKING → LISTENING when TTSPlayer emits 'ended' and all queued TTS batches are complete, emit listening:started in `src/services/voice/VoiceService.js`
- [x] T054 [US6] Verify no memory leaks in multi-turn: clean up STT connections on reconnect, ensure AudioCapture watchdog doesn't accumulate intervals, verify no event listener buildup after 10+ turns in `src/services/voice/VoiceService.js`
- [x] T055 [US6] Add multi-turn test scenario: simulate 10-turn conversation (commit → TTS → end → listen → commit → TTS...) and verify state transitions are correct and no resource leaks in `test/services/voice/VoiceService.test.js`

**Checkpoint**: Continuous conversation works for 10+ turns without degradation.

---

## Phase 9: User Story 7 — Exit Voice Mode (Priority: P2)

**Goal**: User exits voice mode cleanly. Audio stops, mic released, messages preserved in chat history.

**Independent Test**: Enter voice mode → have conversation → exit → all messages visible in text chat → mic indicator off.

**Depends on**: US1 (overlay must exist to exit)

### Implementation for User Story 7

- [x] T056 [US7] Ensure VoiceService.endSession stops all components (AudioCapture.stop, STTConnection.disconnect, TTSPlayer.stop immediate, TextChunker.clear, EchoGuard.reset), releases mic stream, resets all state to IDLE in `src/services/voice/VoiceService.js`
- [x] T057 [US7] Ensure ChatContext.exitVoiceMode calls endSession, clears all voice state (transcript, agentText, error), preserves messages in state.messages (already there via sendMessage) in `src/contexts/ChatContext.jsx`
- [x] T058 [US7] Verify Escape key handler in VoiceModeOverlay calls onClose, verify close button calls onClose, verify body overflow restored on unmount in `src/components/VoiceMode/VoiceModeOverlay.jsx`
- [x] T059 [US7] Add exit test scenarios: exit during TTS playing (verify audio stops), exit during STT listening (verify mic released), exit after error (verify clean state) in `test/services/voice/VoiceService.test.js`

**Checkpoint**: Clean exit from any state. No lingering audio, no mic indicator, messages preserved.

---

## Phase 10: User Story 8 — Language Configuration via Service (Priority: P2)

**Goal**: Voice language comes from service `language:changed` event, defaults to English.

**Independent Test**: Configure webchat with Portuguese → enter voice mode → STT/TTS use Portuguese. No config → defaults to English.

**Depends on**: US2 + US3 (STT and TTS must be working)

### Implementation for User Story 8

- [x] T060 [US8] Wire language:changed event in ChatContext to update voiceLanguage state (default 'en'), pass voiceLanguage to VoiceService config on enterVoiceMode, call voiceService.setLanguage on mid-session language change in `src/contexts/ChatContext.jsx`
- [x] T061 [US8] Implement VoiceService.setLanguage: update config.languageCode, propagate to next STT connection (on reconnect) and next TTS request (immediately) in `src/services/voice/VoiceService.js`
- [x] T062 [US8] Verify config.js buildSTTWebSocketURL and buildTTSRequestBody both use config.languageCode for the `language_code` parameter in `src/services/voice/config.js`

**Checkpoint**: Language from service is used for both STT and TTS. English default works when no language configured.

---

## Phase 11: User Story 9 — Efficient TTS Credit Usage (Priority: P2)

**Goal**: TTS requests are batched at sentence boundaries. 3-sentence response = max 3-4 requests.

**Independent Test**: Trigger 3-sentence agent response → monitor network tab → verify ≤4 TTS requests.

**Depends on**: US3 (TTS pipeline must work)

### Implementation for User Story 9

- [x] T063 [US9] Verify TextChunker is correctly wired in VoiceService.processTextChunk: addText returns chunks at sentence boundaries, flush on stream complete, clear on barge-in in `src/services/voice/VoiceService.js`
- [x] T064 [US9] Verify TTSPlayer passes `previous_text` from last spoken text to next TTS request body for audio continuity in `src/services/voice/TTSPlayer.js`
- [x] T065 [US9] Add credit efficiency test: simulate 3-sentence streaming response → verify TextChunker emits exactly 3 chunks → verify TTSPlayer.speak called 3 times (not 10+) in `test/services/voice/TextChunker.test.js`

**Checkpoint**: TTS credit usage is efficient. 3 sentences = 3 requests. Audio continuity maintained via previous_text.

---

## Phase 12: User Story 10 — Voice Overlay Visual Isolation (Priority: P2)

**Goal**: Transcript text stays in bottom area, never overlaps with waveform/status text.

**Independent Test**: Have multi-turn conversation → transcript stays in scrollable bottom → center elements fixed.

**Depends on**: US1 (overlay layout)

### Implementation for User Story 10

- [x] T066 [US10] Verify VoiceModeOverlay uses flexbox layout (not absolute positioning): header flex-shrink:0, center section fixed height, conversation area flex:1 overflow-y:auto in `src/components/VoiceMode/VoiceModeOverlay.scss`
- [x] T067 [US10] Verify conversation area scrolls independently and gradient separator exists between center and conversation sections in `src/components/VoiceMode/VoiceModeOverlay.scss`
- [x] T068 [US10] Add overlay layout test: render overlay with long transcript content → verify no overlap with center elements (check DOM structure, verify scrollable container) in `test/components/VoiceMode/VoiceModeOverlay.test.jsx`

**Checkpoint**: Visual layout is clean. No overlap between transcript and waveform/status.

---

## Phase 13: User Story 11 — Standalone HTML Test Page (Priority: P3)

**Goal**: HTML file for quick end-to-end testing with 3 configurable variables.

**Independent Test**: Open HTML → set API key + voice ID + channel UUID → click voice mode → complete voice conversation.

**Depends on**: All P1 stories (core voice mode must work)

### Implementation for User Story 11

- [x] T069 [US11] Create standalone HTML test page with configuration panel, instructions, webchat initialization with voiceMode config, getVoiceToken and getApiKey functions, clear error messages for missing config in `examples/voice-mode-test.html`
- [x] T070 [US11] Verify standalone build includes voice mode: run `npm run build:standalone` and confirm `dist-standalone/webchat.umd.js` includes voice services and components

**Checkpoint**: Developer can open HTML, configure 3 variables, and have a full voice conversation.

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Final quality, coverage, and documentation tasks.

- [x] T071 Run `npm run format && npm run lint -- --fix && npm run lint:check` to verify all new files pass linting
- [x] T072 Run `npm test -- --coverage` and verify ≥80% coverage for statements, branches, functions, and lines across all new files
- [x] T073 [P] Fix any coverage gaps: add tests for uncovered branches/functions identified by coverage report
- [x] T074 [P] Review all SCSS files for BEM compliance and ensure PostCSS `.weni-widget` scoping applies correctly
- [x] T075 Run quickstart.md validation: follow the steps in `specs/001-full-voice-mode/quickstart.md` to verify the developer setup flow works end-to-end. During validation, add `console.time`/`console.timeEnd` markers to measure SC-001 (entry < 3s), SC-002 (STT < 1s), SC-003 (TTS < 2s), SC-004 (batch gap < 100ms) and confirm they meet targets.
- [x] T076 [P] Verify voice overlay renders correctly in both embedded mode (`embedded: true`) and popup mode (`embedded: false`) — test that overlay covers widget area, close button works, and no layout breaks in either mode (FR-041)
- [x] T077 [P] Cross-browser smoke test: open voice mode in Firefox, Safari, and Edge — verify `getUserMedia`, `AudioContext`, and `WebSocket` initialize without errors, overlay renders, and basic enter/exit flow works (SC-011)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 Enter Voice Mode (Phase 3)**: Depends on Foundational phase — first UI integration
- **US2 Speak & Auto-Send (Phase 4)**: Depends on US1 (overlay must be open)
- **US3 Hear Agent Response (Phase 5)**: Depends on US2 (messages must be sent to get responses)
- **US4 Echo-Free Speakerphone (Phase 6)**: Depends on US3 (TTS must be playing)
- **US5 Barge-In (Phase 7)**: Depends on US4 (echo guard must distinguish user from echo)
- **US7 Exit Voice Mode (Phase 9)**: Can start after US1 (independent of US2-US6)
- **US6 Continuous Conversation (Phase 8)**: Depends on US3
- **US8 Language Config (Phase 10)**: Depends on US2 + US3
- **US9 TTS Efficiency (Phase 11)**: Depends on US3
- **US10 Visual Isolation (Phase 12)**: Can start after US1
- **US11 Test Page (Phase 13)**: Depends on all P1 stories
- **Polish (Phase 14)**: Depends on all desired stories being complete

### User Story Dependencies

```text
Phase 1: Setup
  └── Phase 2: Foundational (BLOCKS everything)
        ├── US1: Enter Voice Mode ──┬── US2: Speak & Send ──┬── US3: TTS ──┬── US4: Echo ── US5: Barge-In
        │                           │                        │              └── US6: Continuous
        │                           │                        ├── US8: Language
        │                           │                        └── US9: TTS Efficiency
        ├── US7: Exit (independent) │
        └── US10: Visual (independent)
                                    └── US11: Test Page (after all P1)
```

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T005, T006, T007 all [P] — different files
- **Phase 2**: T014-T022 tests can run after their implementation task completes
- **Phase 3**: T024, T025 [P] — separate components. T033, T034 [P] — separate test files
- **US7, US10**: Can be done in parallel with US2-US6 (only depend on US1)
- **US8, US9**: Can be done in parallel with each other (both depend on US3)

### Within Each User Story

- Services before UI wiring
- ChatContext integration before component updates
- Component implementation before component tests
- Verify at checkpoint before proceeding

---

## Parallel Example: Phase 2 (Foundational)

```text
# After T008-T013 are complete (sequential — services depend on each other):
# Launch all test tasks in parallel:
T014: audioUtils.test.js
T015: errors.test.js          [P]
T016: config.test.js           [P]
T017: TextChunker.test.js
T018: EchoGuard.test.js
T019: AudioCapture.test.js
T020: STTConnection.test.js
T021: TTSPlayer.test.js
T022: VoiceService.test.js
```

## Parallel Example: Phase 3 (US1)

```text
# Launch component creation in parallel:
T024: WaveformVisualizer.jsx   [P]
T025: VoiceModeError.jsx       [P]

# Then sequential (depends on components):
T026: VoiceModeOverlay.jsx
T027: VoiceModeButton.jsx
T028: useVoiceMode.js
T029: ChatContext.jsx
T030: Header.jsx + Chat.jsx

# Launch tests in parallel:
T033: WaveformVisualizer.test  [P]
T034: VoiceModeError.test      [P]
```

---

## Implementation Strategy

### MVP First (US1 Only — Phase 1 + 2 + 3)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational services (T008-T023)
3. Complete Phase 3: US1 Enter Voice Mode (T024-T037)
4. **STOP and VALIDATE**: User can enter/exit voice mode with waveform overlay
5. Deploy/demo if ready — voice mode entry point is live

### Core Voice Loop (Add US2 + US3 + US4 + US5)

6. Complete Phase 4: US2 Speak & Send (T038-T041)
7. Complete Phase 5: US3 TTS Playback (T042-T045)
8. Complete Phase 6: US4 Echo Guard (T046-T048)
9. Complete Phase 7: US5 Barge-In (T049-T052)
10. **STOP and VALIDATE**: Full voice conversation works on speakerphone with reliable barge-in

### Production Polish (Add P2 stories)

11. Complete US6-US10 in priority order (or parallel if staffed)
12. Complete US11 Test Page
13. Complete Phase 14: Polish & coverage

### Incremental Delivery

Each user story adds value independently:
- US1 alone: Users see voice mode is available (market signal)
- US1+US2: Users can speak to send messages (one-way voice)
- US1+US2+US3: Full voice conversation (two-way voice)
- +US4+US5: Production-ready (speakerphone + interruption)
- +US6-US10: Polished experience
- +US11: QA-ready with test page

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable at its checkpoint
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All ElevenLabs API parameters have been verified against official docs (see research.md R10)
- Total tasks: **77** (T001-T077)
