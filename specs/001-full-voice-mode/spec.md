# Feature Specification: Full Voice Mode

**Feature Branch**: `001-full-voice-mode`  
**Created**: 2026-02-19  
**Status**: Draft  
**Input**: User description: "Complete, production-ready Full Voice Mode for the Weni Webchat. Users speak and messages are sent automatically. Agent responses are spoken back in real-time via streaming. After the call ends, messages are readable in text mode. Must handle echo cancellation for speakerphone use, reliable barge-in (interruption), service-driven language configuration, optimized TTS credit usage, and clean visual layout without text overlap. Includes a standalone HTML test page."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter Voice Mode (Priority: P1)

A user is interacting with the standard text-based webchat and wants to switch to a hands-free voice conversation. They see a voice mode button in the chat interface, click it, and the interface transitions to an immersive full-screen voice overlay inside the webchat widget. The system requests microphone access if not already granted and begins listening for speech with visual feedback.

**Why this priority**: This is the foundational entry point. Without a way to enter voice mode, no other voice functionality can exist.

**Independent Test**: Can be fully tested by clicking the voice mode button and verifying the full-screen overlay appears with listening state, microphone permission is requested, and waveform animation is active.

**Acceptance Scenarios**:

1. **Given** the user is in the standard text chat view and voice mode is enabled in configuration, **When** they click the "Voice Mode" button, **Then** the interface transitions to a full-screen voice overlay inside the webchat widget showing an active waveform animation and instructional text (e.g., "I'm listening, how can I help you?")
2. **Given** the user clicks the voice mode button, **When** microphone permission has not been granted yet, **Then** the browser's microphone permission dialog is displayed; if granted, voice mode activates; if denied, a clear error message is shown with instructions on how to enable microphone access
3. **Given** voice mode is enabled in the configuration, **When** the user's browser does not support the required audio capabilities, **Then** the voice mode button is hidden entirely from the interface
4. **Given** voice mode is not configured (no voice settings provided), **When** the chat interface loads, **Then** no voice mode button is visible
5. **Given** the user has previously granted microphone permission, **When** they click the voice mode button, **Then** voice mode starts within 3 seconds without re-prompting for permission

---

### User Story 2 - Speak and Auto-Send Message (Priority: P1)

A user in voice mode speaks naturally. The system listens, transcribes in real-time, and displays a partial transcript on screen. When the user finishes speaking (detected via silence), the message is automatically sent to the agent without requiring any button press. The sent message appears in the chat history as a regular text message.

**Why this priority**: This is the core voice input mechanism. Without speech-to-text and automatic sending, voice mode provides no value.

**Independent Test**: Can be fully tested by speaking a phrase in voice mode and verifying the transcription appears on screen, the message is sent to the agent, and it appears in the text conversation history.

**Acceptance Scenarios**:

1. **Given** the user is in voice mode with microphone active, **When** they speak a phrase and pause, **Then** the system transcribes their speech and shows a real-time partial transcript on the voice overlay
2. **Given** speech has been transcribed, **When** silence is detected for the configured threshold (default ~1.5 seconds), **Then** the message is automatically sent to the agent
3. **Given** the user is mid-sentence, **When** brief pauses occur between words, **Then** the system does not prematurely send the message (intelligent end-of-speech detection)
4. **Given** a voice message is sent, **When** the user later exits voice mode, **Then** the message appears in the text chat history indistinguishable from typed messages
5. **Given** speech recognition fails to produce any text (noise, unclear audio), **When** silence is detected, **Then** no empty message is sent and the system remains in listening state

---

### User Story 3 - Hear Agent Response Spoken Aloud (Priority: P1)

When the agent sends a text response, it is converted to speech and played aloud to the user in real-time as text streams in. The user hears a natural-sounding voice speak the response progressively, without waiting for the complete response. Visual feedback indicates the agent is speaking.

**Why this priority**: Text-to-speech is essential for a complete voice conversation experience. Without it, the user would need to read the screen, defeating the purpose of voice mode.

**Independent Test**: Can be fully tested by sending a message (via voice or text), receiving the agent response, and verifying the response is spoken aloud progressively with waveform animation indicating the speaking state.

**Acceptance Scenarios**:

1. **Given** a message has been sent to the agent, **When** the agent begins streaming a text response, **Then** the text is progressively converted to speech and played aloud
2. **Given** text-to-speech is playing, **When** the user observes the interface, **Then** visual feedback (waveform animation) indicates the agent is currently speaking
3. **Given** the agent sends a long response, **When** text arrives in chunks, **Then** speech playback is seamless without noticeable gaps or stuttering between chunks
4. **Given** text-to-speech is configured, **When** the agent response is spoken, **Then** the voice uses the configured voice ID and language setting
5. **Given** the text-to-speech service is temporarily unavailable, **When** the agent sends a response, **Then** the system gracefully falls back to displaying the text on the voice overlay and returns to listening state without crashing

---

### User Story 4 - Echo-Free Speakerphone Usage (Priority: P1)

A user wants to use voice mode on speakerphone (device speakers active, not headphones). The agent's spoken response plays through the speakers, but the microphone must not capture the agent's audio and misinterpret it as user speech. The system must prevent feedback loops where the agent "hears itself" and triggers false speech detection.

**Why this priority**: Without proper echo handling, voice mode is unusable on speakerphone — the most common mobile and desktop use case. The agent would endlessly respond to its own audio output, making conversations impossible.

**Independent Test**: Can be fully tested by using voice mode with speakers on (no headphones), letting the agent speak a response, and verifying that the agent's audio does not trigger a new message or speech detection.

**Acceptance Scenarios**:

1. **Given** the user is in voice mode using device speakers (speakerphone), **When** the agent speaks a response through the speakers, **Then** the microphone input does not detect the agent's audio as user speech
2. **Given** the agent is speaking through speakers, **When** the speech recognition service receives audio, **Then** any transcript generated from the agent's own audio is suppressed and not sent as a user message
3. **Given** the agent is speaking on speakerphone, **When** the user simultaneously speaks to interrupt, **Then** only the user's voice is recognized and processed (the agent's echo is filtered out)
4. **Given** the system is in listening state after the agent finishes speaking, **When** residual echo or speaker reverb occurs, **Then** the system does not trigger a false speech detection

---

### User Story 5 - Interrupt Agent Response (Barge-In) (Priority: P1)

While the agent is speaking, the user wants to interrupt to redirect the conversation. They simply start speaking, and the agent's audio stops quickly. The user's new speech is captured, transcribed, and sent as a new message. The interruption must be reliable — a single clear speech attempt must consistently stop the agent.

**Why this priority**: Natural conversations require the ability to interrupt. The prototype showed that barge-in was unreliable (users had to try multiple times). Fixing this is critical for a production-quality experience.

**Independent Test**: Can be fully tested by triggering an agent response, speaking while the agent is talking, and verifying the agent audio stops and the user's message is captured and sent.

**Acceptance Scenarios**:

1. **Given** the agent is speaking, **When** the user starts speaking clearly, **Then** the agent's audio playback stops within 300ms
2. **Given** the user interrupted the agent, **When** they continue speaking their message, **Then** their speech is captured and transcribed normally
3. **Given** the user interrupted the agent, **When** they finish speaking, **Then** a new message is sent to the agent (not appended to any previous message)
4. **Given** the agent is speaking, **When** the user's first attempt to interrupt is a clear spoken word or phrase, **Then** the interruption succeeds on the first try (no multiple attempts needed)
5. **Given** the agent is speaking on speakerphone, **When** background noise or echo occurs (not user speech), **Then** the agent is not incorrectly interrupted

---

### User Story 6 - Continuous Multi-Turn Voice Conversation (Priority: P2)

The user wants to have a natural back-and-forth conversation entirely in voice mode without needing to press buttons between turns. After the agent finishes speaking, the system automatically returns to listening mode so the user can respond naturally. The cycle of listen → send → receive → speak → listen continues seamlessly.

**Why this priority**: This enables natural multi-turn conversations. Without it, users would need to manually re-activate listening after each agent response, breaking the flow.

**Independent Test**: Can be fully tested by having a 5+ turn conversation and verifying the system automatically cycles between listening and speaking states without manual intervention.

**Acceptance Scenarios**:

1. **Given** the agent has finished speaking a response, **When** audio playback completes, **Then** the system automatically returns to listening mode within 500ms
2. **Given** the system returned to listening mode, **When** the transition occurs, **Then** the waveform animation updates to indicate the listening state and the user sees instructional text
3. **Given** a multi-turn conversation is happening, **When** the user speaks after each agent response, **Then** each message is captured and sent without requiring any button press or manual interaction
4. **Given** the user has been in voice mode for 10+ turns, **When** the conversation continues, **Then** performance does not degrade (no memory leaks, increasing latency, or dropped connections)

---

### User Story 7 - Exit Voice Mode (Priority: P2)

A user wants to end the voice conversation and return to the traditional text chat. They click the close button (or press Escape). Audio playback stops immediately, the microphone is released, and all messages from the voice session are preserved in the text chat history.

**Why this priority**: Users must be able to exit voice mode at any time. Preserving messages ensures continuity between voice and text interactions.

**Independent Test**: Can be fully tested by entering voice mode, having a short conversation, exiting, and verifying all messages are visible in text chat and the microphone indicator is off.

**Acceptance Scenarios**:

1. **Given** the user is in voice mode, **When** they click the close (X) button, **Then** voice mode closes and the standard text chat interface is restored
2. **Given** the user is in voice mode, **When** they press the Escape key, **Then** voice mode closes identically to clicking the close button
3. **Given** the agent is currently speaking, **When** the user exits voice mode, **Then** audio playback stops immediately (no lingering audio)
4. **Given** the user had voice messages exchanged, **When** they view the text chat after exiting, **Then** all voice messages appear as normal text messages in chronological order
5. **Given** the user exits voice mode, **When** the microphone was previously active, **Then** the microphone is released (browser microphone indicator turns off)

---

### User Story 8 - Language Configuration via Service (Priority: P2)

The system's voice language (for both speech recognition and text-to-speech) is determined by the language configured through the webchat service, not by browser auto-detection. When the service emits a language change event, the voice system updates accordingly. If no language has been configured by the service, the system defaults to English.

**Why this priority**: Automatic browser language detection proved unreliable in the prototype. The service already manages the correct language for the conversation, so voice mode must align with it for consistent behavior.

**Independent Test**: Can be fully tested by configuring the webchat with a specific language (e.g., Portuguese), entering voice mode, and verifying that both speech recognition and text-to-speech use that language. Also testable by not configuring a language and verifying English is used by default.

**Acceptance Scenarios**:

1. **Given** the webchat service has been configured with a language (e.g., "pt" for Portuguese), **When** the user enters voice mode, **Then** speech recognition and text-to-speech both use Portuguese
2. **Given** no language has been configured on the service, **When** the user enters voice mode, **Then** the system defaults to English ("en")
3. **Given** the service emits a `language:changed` event during an active voice session, **When** the new language is received, **Then** subsequent speech recognition connections and text-to-speech requests use the updated language
4. **Given** the configured language is supported by the speech services, **When** the user speaks in that language, **Then** transcription accuracy is consistent with the service's expected behavior for that language

---

### User Story 9 - Efficient TTS Credit Usage (Priority: P2)

The system must use text-to-speech credits efficiently to minimize cost. Instead of sending every small text chunk to the TTS service individually, the system batches text intelligently — waiting for sentence boundaries or sufficient text accumulation before making TTS requests. Each TTS request carries a meaningful amount of text while still maintaining low-latency audio playback.

**Why this priority**: The prototype's TTS implementation consumed excessive credits by sending many small text fragments. For a production deployment, cost efficiency is critical to business viability.

**Independent Test**: Can be fully tested by triggering an agent response of moderate length (3-5 sentences), monitoring the number of TTS requests made, and verifying that requests are batched at sentence boundaries rather than every few characters.

**Acceptance Scenarios**:

1. **Given** the agent is streaming a response, **When** text chunks arrive, **Then** the system accumulates text until a sentence boundary (period, exclamation, question mark) or a minimum text threshold before sending to TTS
2. **Given** a 3-sentence agent response, **When** the response completes, **Then** the system makes at most 3-4 TTS requests (one per sentence or logical group), not 10+ small requests
3. **Given** the first sentence of a response is complete, **When** it is sent to TTS, **Then** audio playback begins within a reasonable time without waiting for the full response
4. **Given** the stream is complete and remaining text exists in the buffer, **When** no more text is expected, **Then** the remaining text is sent as a final TTS request
5. **Given** text accumulation is in progress, **When** the user interrupts (barge-in), **Then** the buffered text is discarded and no further TTS requests are made for the interrupted response

---

### User Story 10 - Voice Overlay Visual Isolation (Priority: P2)

The voice mode overlay must be visually isolated from the underlying chat interface. Transcript text (what the user said, what the agent is saying) must be displayed in a dedicated area within the voice overlay that does not overlap with or obscure the underlying chat messages. The overlay covers the entire webchat widget area.

**Why this priority**: The prototype had visual issues where voice transcript text overlapped with the regular chat messages, making both unreadable. Clean visual separation is essential for usability.

**Independent Test**: Can be fully tested by entering voice mode, having a conversation with multiple turns, and verifying that transcript text stays within its designated area and never overlaps with the main status text or extends beyond the overlay bounds.

**Acceptance Scenarios**:

1. **Given** the user is in voice mode, **When** the overlay is displayed, **Then** it covers the entire webchat widget area (no underlying chat elements visible)
2. **Given** a conversation is happening in voice mode, **When** transcript text is displayed (user speech, agent response), **Then** it appears in a fixed conversation area at the bottom of the overlay, separate from the centered status text
3. **Given** the transcript area has long or multiple messages, **When** content exceeds the available space, **Then** the conversation area scrolls vertically while the centered waveform and status text remain fixed in position
4. **Given** the user is in voice mode, **When** partial transcript (real-time speech) is shown, **Then** it is visually distinguished from committed transcript and agent text (different styling/labels)
5. **Given** the voice overlay is displayed, **When** the user exits voice mode, **Then** the overlay closes with a smooth transition animation and the underlying chat is fully restored

---

### User Story 11 - Standalone HTML Test Page (Priority: P3)

A developer or tester wants to quickly validate the voice mode feature without integrating into a full application. A standalone HTML file is provided that loads the webchat widget, configures voice mode, and allows end-to-end testing. The tester only needs to provide an ElevenLabs API key, a voice ID, and a Weni channel UUID.

**Why this priority**: A test page accelerates development and QA. It is secondary to the core functionality but critical for validation.

**Independent Test**: Can be fully tested by opening the HTML file in a browser, configuring the three required variables, and performing a complete voice conversation.

**Acceptance Scenarios**:

1. **Given** a developer opens the standalone HTML test file, **When** they configure the required variables (ElevenLabs API key, voice ID, channel UUID), **Then** the webchat widget loads with voice mode enabled
2. **Given** the test page is loaded with valid configuration, **When** the developer clicks the voice mode button, **Then** voice mode works identically to the production-embedded version
3. **Given** the test page is loaded without configuring the API key, **When** the developer clicks voice mode, **Then** a clear error message indicates the API key is missing
4. **Given** the test page is open, **When** the developer interacts via voice, **Then** they can complete a full multi-turn voice conversation with the agent

---

### Edge Cases

- What happens when the network connection is lost during an active voice session? → The system displays a clear error message on the voice overlay, attempts reconnection to the speech services, and if reconnection fails within a reasonable timeout, falls back to text mode with a notification.
- What happens when there is excessive background noise? → The speech recognition service applies its own noise filtering; if speech cannot be recognized, the system remains in listening state without sending empty messages.
- What happens when the agent sends an extremely long response (1000+ words)? → The system continues streaming TTS in batches; the user can interrupt at any time via barge-in.
- What happens when multiple browser tabs have voice mode active? → Only one tab can have an active microphone at a time (browser limitation); other tabs will receive a microphone permission error and display an appropriate message.
- What happens when the speech recognition WebSocket connection closes unexpectedly? → The system automatically reconnects with a new session to allow continuous conversation without requiring the user to exit and re-enter voice mode.
- What happens when the user grants microphone permission but their microphone hardware fails or disconnects mid-session? → The system detects the loss of audio input, displays an error message, and allows retry or fallback to text mode.
- What happens when the TTS service returns an error for a specific text chunk? → The system skips the failed chunk, displays the agent text visually on the overlay, and continues listening. It does not crash or exit voice mode.
- What happens when the user speaks but no speech-to-text result is returned (timeout)? → The system remains in listening state and does not block; the user can speak again.
- What happens when the agent response contains only non-speakable content (e.g., only emojis, URLs, or code blocks)? → The system skips TTS for non-speakable content and returns to listening state. The content is still visible in the text chat history.

## Requirements *(mandatory)*

### Functional Requirements

**Voice Mode Activation & Lifecycle**

- **FR-001**: System MUST provide a voice mode entry point (button) visible in the chat interface when voice mode is enabled in configuration and the browser supports the required capabilities
- **FR-002**: System MUST hide the voice mode button when voice mode is not configured or the browser lacks required capabilities
- **FR-003**: System MUST display a full-screen overlay within the webchat widget when voice mode is activated, covering all underlying chat elements
- **FR-004**: System MUST request microphone permission when the user first enters voice mode, with clear feedback for all permission states (granted, denied, prompt)
- **FR-005**: System MUST allow users to exit voice mode at any time via a close button or the Escape key
- **FR-006**: System MUST stop all audio playback and release the microphone when exiting voice mode

**Speech-to-Text (STT)**

- **FR-007**: System MUST capture user speech through the device microphone and stream it to a real-time speech recognition service
- **FR-008**: System MUST display a real-time partial transcript on the voice overlay as the user speaks
- **FR-009**: System MUST automatically detect end-of-speech using voice activity detection with a configurable silence threshold (default ~1.5 seconds)
- **FR-010**: System MUST automatically send the final transcribed text as a chat message when speech ends
- **FR-011**: System MUST NOT send empty or blank messages when no speech is recognized
- **FR-012**: System MUST automatically reconnect to the speech recognition service if the connection closes unexpectedly during an active session

**Text-to-Speech (TTS)**

- **FR-013**: System MUST convert agent text responses to speech and play them aloud to the user
- **FR-014**: System MUST process TTS in efficient batches — accumulating text until sentence boundaries or a minimum threshold before sending TTS requests — to minimize credit consumption
- **FR-015**: System MUST begin audio playback of the first batch as soon as it is ready, without waiting for the full response
- **FR-016**: System MUST queue TTS batches for seamless sequential playback without gaps
- **FR-017**: System MUST use the voice ID specified in the configuration for all TTS requests
- **FR-018**: System MUST gracefully handle TTS service failures by displaying text visually and returning to listening state

**Echo Cancellation & Audio Isolation**

- **FR-019**: System MUST prevent the agent's TTS audio output from being captured by the microphone and interpreted as user speech (echo cancellation)
- **FR-020**: System MUST suppress any speech recognition results that originate from the agent's own audio playback when using speakerphone
- **FR-021**: System MUST pause or mute the microphone input stream to the speech recognition service while TTS audio is playing, resuming only after playback completes (or when barge-in is detected)

**Barge-In (Interruption)**

- **FR-022**: System MUST detect user speech while the agent is speaking and stop TTS playback reliably on the first clear speech attempt
- **FR-023**: System MUST stop TTS audio within 300ms of detecting user voice activity during barge-in
- **FR-024**: System MUST discard any buffered TTS text when barge-in occurs
- **FR-025**: System MUST capture and send the user's interrupting speech as a new message
- **FR-026**: System MUST distinguish between actual user speech and background noise/echo when deciding to trigger barge-in

**Language Configuration**

- **FR-027**: System MUST use the language provided by the webchat service's `language:changed` event for both STT and TTS
- **FR-028**: System MUST default to English ("en") when no language has been configured by the service
- **FR-029**: System MUST update the active language for STT and TTS when a `language:changed` event is received during an active voice session

**Continuous Conversation**

- **FR-030**: System MUST automatically return to listening state after TTS playback completes
- **FR-031**: System MUST maintain continuous voice conversation across multiple turns without requiring manual re-activation
- **FR-032**: System MUST preserve all voice messages (user and agent) in the text chat history for access after exiting voice mode

**Visual Interface**

- **FR-033**: System MUST display a waveform animation that reflects the current state (listening, processing, speaking, idle)
- **FR-034**: System MUST display the current state as instructional text (e.g., "I'm listening, how can I help you?")
- **FR-035**: System MUST display transcript text (partial, committed, agent) in a dedicated conversation area at the bottom of the overlay, visually separated from the centered status elements
- **FR-036**: System MUST ensure transcript text never overlaps with the waveform or status text, using scrollable areas when content overflows
- **FR-037**: System MUST display errors with clear messages, recovery suggestions, and retry/dismiss actions

**Configuration & Integration**

- **FR-038**: System MUST accept voice mode configuration through the webchat initialization options, including: enabled flag, voice ID, language code (optional), silence threshold, barge-in toggle, auto-listen toggle, token provider function, and API key provider function
- **FR-039**: System MUST provide a standalone HTML test page that demonstrates voice mode with minimal configuration (API key, voice ID, channel UUID)
- **FR-040**: System MUST expose voice mode functionality through a React hook for integration with the existing component architecture
- **FR-041**: System MUST work correctly when the webchat is embedded in both embedded mode and popup mode

### Key Entities

- **VoiceSession**: Represents an active voice mode session with lifecycle states (idle, initializing, listening, processing, speaking, error), session ID, start time, and reference to the active conversation
- **VoiceConfiguration**: Settings for voice mode including voice ID, language code, silence threshold, VAD sensitivity, barge-in toggle, auto-listen toggle, TTS model, audio format, and provider functions for authentication tokens
- **VoiceError**: Structured error with error code, user-friendly message, recovery suggestion, and a flag indicating whether the error is recoverable (retry possible)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enter voice mode and speak their first message within 3 seconds of clicking the voice mode button
- **SC-002**: Speech-to-text transcription completes within 1 second of the user finishing speaking
- **SC-003**: Agent voice response begins playing within 2 seconds of the first text chunk being received by the TTS service
- **SC-004**: Audio playback between TTS batches has no perceptible gap (under 100ms transition time)
- **SC-005**: User interruption (barge-in) stops agent audio within 300ms of voice activity detection, and succeeds on the first clear attempt in 95% of cases
- **SC-006**: Voice mode works correctly on speakerphone without false speech detections from agent audio in 95%+ of test sessions
- **SC-007**: A 3-sentence agent response generates at most 3-4 TTS requests (not 10+ small requests as in the prototype)
- **SC-008**: Users can have conversations of 10+ turns without performance degradation, connection drops, or memory leaks
- **SC-009**: All voice conversation messages are readable as normal text messages in the chat history after exiting voice mode
- **SC-010**: Voice mode interface renders cleanly with no visual overlap between transcript text and the centered waveform/status elements
- **SC-011**: Voice mode works reliably on Chrome, Firefox, Safari, and Edge (latest 2 versions) on both desktop and mobile
- **SC-012**: The standalone HTML test page allows a complete end-to-end voice conversation after configuring only 3 variables (API key, voice ID, channel UUID)

## Assumptions

- Users have a working microphone on their device
- Users have a stable internet connection for real-time speech services
- The webchat is served over HTTPS (required for microphone access)
- ElevenLabs is used as the provider for both speech-to-text (Scribe) and text-to-speech services
- Authentication to ElevenLabs STT uses single-use tokens obtained via a token provider function; TTS uses an API key provided via configuration
- Agent responses are delivered via streaming (existing webchat service infrastructure)
- The default silence threshold for end-of-speech detection is approximately 1.5 seconds (configurable)
- The host application is responsible for securely providing ElevenLabs API credentials (the webchat does not store or manage API keys beyond runtime use)
- Voice mode is an opt-in feature that does not affect the standard text chat experience when not configured

