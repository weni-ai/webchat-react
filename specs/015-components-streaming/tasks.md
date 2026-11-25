---
description: "Actionable, dependency-ordered task list for Shopping Assistant Components Streaming in webchat-react"
---

# Tasks: Shopping Assistant Components Streaming

**Input**: Design documents from `/specs/015-components-streaming/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/component-streaming-ui.md`, `quickstart.md`

**Tests**: Required by Constitution `Quality Standards > Testing` (>=80% statements, branches, functions, lines) and `spec.md > Test Strategy`. Every new module gets a colocated `<name>.test.ts(x)` file and modified components get updated colocated tests.

**Organization**: Tasks are grouped by inherited Product Spec User Story (`US1`–`US7`, ordered P1 -> P2) so each story is an independently testable increment, followed by the dev-only simulation harness and final quality gate.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`US1`–`US7`) for user story phases only
- Every task includes exact repository-relative file paths and verbatim constraints from `data-model.md` and `contracts/component-streaming-ui.md`

## Path Conventions

- Single frontend package at repository root: `src/`, `test/`, `package.json`
- New modules MUST be strict TypeScript (`.ts`/`.tsx`) with zero `any` (Constitution VIII)
- ONLY `src/i18n/locales/en.json` may be edited for UI strings; never touch `pt.json`, `es.json`, or `ro.json` (Constitution `Internationalization`, `.githooks/pre-commit`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared keyframes, test mock helpers, and English source i18n keys used across all stories

- [X] T001 Add reusable `@keyframes` ONLY (no `:root` or selector blocks, avoiding CSS duplication across `@use` imports) for `weni-component-pop-in` (`opacity: 0 -> 1`, `translateY(var(--weni-component-pop-offset, 6px)) -> 0`), `weni-component-grow-in` (`opacity: 0 -> 1`, `scale(var(--weni-component-grow-scale, 0.94)) -> 1`), and `weni-skeleton-shimmer` (`translateX(-100%) -> translateX(100%)`) in `src/styles/animations.scss`; consume BD-005 fallback defaults (`--weni-component-enter-easing: cubic-bezier(0.2, 0.8, 0.2, 1)`, `--weni-skeleton-shimmer-duration: 1.2s`, `--weni-component-state-transition: 150ms`) via `var(--weni-..., <default>)` in `ComponentSkeleton.scss` and component SCSS files
- [X] T002 [P] Add English source keys under `streaming_components` in alphabetical order (`cta_available: "{{label}} link available"`, `list_available: "List of options available"`, `list_available_with_count: "List with {{count}} options available"`, `quick_replies_available: "{{count}} options available"`) in `src/i18n/locales/en.json` (do NOT edit `pt.json`, `es.json`, or `ro.json`)
- [X] T003 [P] Extend `WeniWebchatService` mock with helpers to emit live streaming message updates (`streamPhase`, `componentHints`, `list_message`, `cta_message`, `quick_replies`), history messages, and WebSocket disconnect cleanup in `test/__mocks__/@weni/webchat-service.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, constants, pure stagger/validation utilities, reduced-motion hook, streaming buffer refinement, and the per-message lifecycle state machine that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create `src/utils/componentStreaming.ts` exporting:
  - Types `ComponentType = 'list_message' | 'cta_message' | 'quick_replies'`, `StreamPhase = 'streaming_text' | 'awaiting_components' | 'completed'`, `ComponentHint` (`{ componentType: ComponentType; labels?: string[]; count?: number; itemCount?: number }`), `QuickReplyItem`, `NormalizedQuickReply`, `ListItem`, `ListMessagePayload` (with optional positive integer `item_count`), `CtaMessagePayload`, `StreamedMessage`, `ComponentLifecyclePhase = 'skeleton' | 'entering' | 'ready'`, `ComponentSchedule`, `AnnouncementItem`, and `ComponentStreamingWarningContext`
  - Binding constants `COMPONENT_DISPLAY_ORDER = ['list_message', 'cta_message', 'quick_replies'] as const`, `COMPONENT_ENTER_DURATION_MS = 180`, `COMPONENT_MAX_SEQUENCE_MS = 300`, `COMPONENT_MAX_STAGGER_MS = 70`, `LIST_ITEM_MAX_STAGGER_MS = 40`, `COMPONENT_WAIT_TIMEOUT_MS = 10_000`, `SKELETON_DEFAULT_WIDTH_PX = 120`, `SKELETON_CTA_DEFAULT_WIDTH_PX = 210`
  - Pure functions `computeComponentStaggerMs(count)` (`count > 1 ? Math.min(70, (300 - 180) / (count - 1)) : 0`), `computeListItemStaggerMs(count)` (`count > 1 ? Math.min(40, (300 - 180) / (count - 1)) : 0`), `computeSequenceDurationMs(count, staggerMs)`, `isValidCtaUrl(url)` (`/^https?:\/\/.+/i`), `normalizeQuickReplies(items)`, `sanitizeComponentHints(hints, logContext)` (validating `componentType`, filtering empty `labels`, enforcing positive integer `count`/`itemCount`, ignoring `itemCount` on non-list types, deduplicating by `componentType` keeping latest, emitting PII-free `console.warn('[WebChat:ComponentStreaming] ...', { channelUuid, sessionId, messageId, componentType, reason: 'invalid_hint' })` without `text`/`labels`/`url`), `buildComponentSchedule(message, reducedMotion)`, and `buildActivationAnnouncements(message, t)` (using object map dispatch, never `switch`, never including CTA `url`)
- [X] T005 [P] Create colocated unit tests verifying all stagger formulas (`n = 0, 1, 2, 3, 6, 9, 20`), `<= 300ms` cap, `isValidCtaUrl` (`http://`, `https://`, `javascript:`, `data:`, empty/partial), `sanitizeComponentHints` invalid-payload warning without PII, `normalizeQuickReplies`, `buildComponentSchedule` offsets in fixed display order, and `buildActivationAnnouncements` in `src/utils/componentStreaming.test.ts`
- [X] T006 [P] Create `src/hooks/usePrefersReducedMotion.ts` subscribing to `window.matchMedia('(prefers-reduced-motion: reduce)')` with `change` listener cleanup and safe `false` fallback when `matchMedia` is unavailable
- [X] T007 [P] Create colocated unit tests for `usePrefersReducedMotion` (initial true/false, live `change` event toggle, cleanup on unmount, missing `matchMedia` fallback) in `src/hooks/usePrefersReducedMotion.test.ts`
- [X] T008 Update `src/hooks/useStreamingBuffer.js` so that when `text` is empty (`""`) and `isStreaming` becomes `false` (e.g., `streamPhase === 'awaiting_components'` on a textless response or completed empty stream), `isBuffering` settles to `false` cleanly without a lingering caret, preserving existing ~70ms word-reveal behavior
- [X] T009 Update `test/hooks/useStreamingBuffer.test.js` with cases for empty-text streaming completion and `isStreaming` dropping to `false` while words remain buffered (`awaiting_components` transition)
- [X] T010 Create `src/hooks/useComponentStreamLifecycle.ts` implementing the per-message state machine (`'skeleton' | 'entering' | 'ready'`):
  - Mounts directly in `'ready'` (`shouldAnimate = false`, no skeleton, no announcement) when `message.status !== 'streaming'` (`BD-007`, `FR-029`, `FR-030`)
  - Tracks `wasObservedStreamingRef` when `message.status === 'streaming'`
  - Keeps phase `'skeleton'` while `isBuffering || isTextStreaming` or while any non-timed-out hinted component lacks its complete authoritative payload (`isValidCtaUrl` required for `cta_message`; emits a single PII-free `console.warn('[WebChat:ComponentStreaming] ...', { channelUuid, sessionId, messageId, componentType: 'cta_message', reason: 'invalid_cta_url' })` once per message when a delivered `cta_message` fails `isValidCtaUrl`)
  - Reads correlation context (`channelUuid = service?.config?.channelUuid`, `sessionId = service?.getSession?.()?.sessionId`, `messageId = message.id`) passed in by `StreamedMessageItem`
  - Runs bounded `10_000ms` (`COMPONENT_WAIT_TIMEOUT_MS`) timer whenever a pending hinted component exists AND either `(!isBuffering && !isTextStreaming)` OR `message.text === ''` (for textless responses, starts immediately on hint arrival even while `streamPhase === 'streaming_text'`, cancelling and resetting if text deltas arrive later before restarting once text finishes); on expiry adds unresolved types to `timedOutTypes`, emits PII-free `console.warn('[WebChat:ComponentStreaming] ...', { channelUuid, sessionId, messageId, componentTypes, reason: 'component_timeout' })`, drops missing skeletons silently, and transitions complete sibling components to `'entering'` (`FR-011`, `FR-026`)
  - Drops skeletons immediately with no error UI when `streamPhase === 'completed'` or disconnect clears `componentHints` without delivering components (`FR-012`)
  - Transitions `'skeleton'` -> `'entering'` (disabled, timer = `totalSequenceMs <= 300ms`, or `0ms` directly to `'ready'` under `prefersReducedMotion`) -> `'ready'` (calling `onActivate` once when `isLastMessage` is still true; never activating when `!isLastMessage`)
  - Supports no-hint streamed responses (`BD-008`, `FR-027`) with zero skeletons and staggered entrance upon text completion
- [X] T011 Create colocated unit tests covering every `useComponentStreamLifecycle` state transition, fake-timer `<= 300ms` entrance, `10_000ms` timeout (with text, textless, textless-then-delta reset, partial multi-component timeout), disconnect cleanup, no-hint fallback, reduced motion `0ms`, mid-stream shopper interruption (`isLastMessage` becomes `false`), and mount-already-completed continuity in `src/hooks/useComponentStreamLifecycle.test.ts`
- [X] T012 [P] Create `src/components/Messages/TextComponents/ComponentSkeleton.tsx` and `src/components/Messages/TextComponents/ComponentSkeleton.scss` rendering `aria-hidden="true"` non-focusable `<span>` shimmer boxes (`.weni-component-skeleton`, `.weni-component-skeleton__item--quick-reply | --list | --cta | --fallback`, `.weni-component-skeleton__sizer` with `visibility: hidden` label text + matching `Icon` slot for `list_message`/`cta_message` so single-line and wrapped multi-line sizes match real buttons natively; `120px` / `210px` fallback width when `labels` omitted; `$fs-color-main-0` fill, `$fs-border-color` 1px border, `weni-skeleton-shimmer` 1.2s sweep suppressed under `@media (prefers-reduced-motion: reduce)`)
- [X] T013 [P] Create colocated unit tests verifying `aria-hidden="true"`, non-focusable `<span>` markup (no `<button>`), exact count from `labels` vs `count` fallback, `120px` (`quick_replies`/`list_message`) and `210px` (`cta_message`) fallback widths when labels are absent, and multi-line label sizer rendering in `src/components/Messages/TextComponents/ComponentSkeleton.test.tsx`

**Checkpoint**: Foundation ready — all core timing math, validation, reduced-motion hook, skeletons, and lifecycle state machine are built and unit-tested.

---

## Phase 3: User Story 1 - Quick Reply Streaming (Priority: P1) 🎯 MVP

**Goal**: Deliver text-first streaming for quick replies with exact-sized skeletons on hint arrival, staggered `<= 300ms` pop-in entrance while disabled, activation strictly on the last message, and immediate disable on click (`FR-001`..`FR-008`, `FR-013`..`FR-015`, `FR-021`..`FR-023`).

**Independent Test**: Simulate a streamed response with 3 (and 6, and 2) quick replies — verify skeletons appear while text buffers with caret, real buttons are absent until text ends, buttons enter disabled in `<= 300ms`, activate after entrance, and clicking one sends the label once and disables all buttons on the message.

### Implementation & Tests for User Story 1

- [X] T014 [US1] Update `src/components/Messages/TextComponents/QuickReplies.jsx` and `src/components/Messages/TextComponents/QuickReplies.scss` to accept optional `animate`, `staggerOffset`, `staggerMs`, and `durationMs` props, normalize string and `{ title, payload }` entries via `normalizeQuickReplies` with index-safe keys (supporting duplicate labels per `FR-020`) and send `item.label` (`sendMessage(item.label)` per `FR-023`), apply `.weni-component-enter--pop` with inline `--weni-enter-duration` / `--weni-enter-delay` and `@media (prefers-reduced-motion: reduce)` override, add `150ms` state transition, and add local `hasClicked` state locking all buttons immediately on first click (`FR-023`, Constitution XV)
- [X] T015 [P] [US1] Create colocated unit tests for `QuickReplies` (rendering string and object entries, duplicate labels, animation CSS variables & stagger offsets, disabled state ignoring clicks, single-submission lock on rapid double-click) in `src/components/Messages/TextComponents/QuickReplies.test.jsx`
- [X] T016 [US1] Update `src/components/Messages/MessageText.jsx` to accept optional `displayedText`, `isBuffering`, `renderListSlot`, and `renderCtaSlot` props (retaining internal `useStreamingBuffer` fallback when rendered standalone), extend `prop-types` for `streamPhase`, `componentHints`, and `list_message.item_count`, and omit `.weni-message-text` markup when `!html` on component-only messages (`FR-028`)
- [X] T017 [US1] Create `src/components/Messages/StreamedMessageItem.tsx` coordinating `useStreamingBuffer` (`isTextStreaming = message.status === 'streaming' && (message.streamPhase === undefined || message.streamPhase === 'streaming_text')`) and `useComponentStreamLifecycle` (passing `{ channelUuid: service?.config?.channelUuid, sessionId: service?.getSession?.()?.sessionId, messageId: message.id }` from `useWeniChat()`) across `<MessageContainer><MessageText ... /></MessageContainer>` and the sibling `<MessageContainer className="... weni-messages-list__message--quick-replies">` for `QuickReplies` / `ComponentSkeleton` (omitting empty text bubble when a message has no text, is not buffering, and has only quick replies)
- [X] T018 [US1] Update `src/components/Messages/MessagesList.jsx` to tighten `enableComponents` to strictly check `lastMessage?.id === message.id && message.direction === 'incoming'` (`FR-022`, `BD-003`) and delegate `text` / `message` (and default) rows to `StreamedMessageItem`
- [X] T019 [P] [US1] Update `src/components/Messages/MessageText.test.jsx` covering external `displayedText`/`isBuffering`, custom `renderListSlot`/`renderCtaSlot`, and empty-text omission
- [X] T020 [US1] Create `src/components/Messages/StreamedMessageItem.test.tsx` covering US1 flows (3 options `60ms`/`300ms`, 6 options `24ms`/`300ms`, 2 options `70ms`/`250ms`, text-only with zero skeletons, clicks ignored while typing and entering, click sends once and disables, earlier message disabled when a second assistant message starts)

**Checkpoint**: User Story 1 (MVP) is fully functional and independently verifiable.

---

## Phase 4: User Story 2 - List Message Streaming & Staggered List View (Priority: P1)

**Goal**: Deliver text-first streaming for list messages with trigger skeleton, known vs. unknown `item_count` handling, staggered trigger entrance, staggered `<= 300ms` item entrance inside `views/ListMessage`, and trigger disable after submitting an item (`FR-016`, `FR-017`, `FR-019`, `FR-024`).

**Independent Test**: Simulate a streamed list message with 9 offers (`item_count: 9`) and another with 5 recipes (`item_count` omitted) — verify single trigger skeleton, trigger button enters disabled then activates, opening the list animates items (`15ms` interval, `300ms` total for 9 items; `180ms` for 1 item; `0ms` under reduced motion), and sending an item closes the list and disables the trigger.

### Implementation & Tests for User Story 2

- [X] T021 [US2] Update `src/components/Messages/TextComponents/ListMessage.jsx` and `src/components/Messages/TextComponents/ListMessage.scss` to accept optional `animate`, `staggerOffset`, `staggerMs`, and `durationMs` props, apply `.weni-component-enter--pop` with inline `--weni-enter-duration` / `--weni-enter-delay` and `@media (prefers-reduced-motion: reduce)` override, and pass `animateEntrance: true` in `setCurrentPage({ view: 'list-message', title: buttonText, props: { options, animateEntrance: true } })`
- [X] T022 [P] [US2] Update `src/views/ListMessage.jsx` and `src/views/ListMessage.scss` to accept optional `animateEntrance` prop (default `false`), read `usePrefersReducedMotion()`, compute item stagger via `computeListItemStaggerMs(options.length)` (`180ms` duration, `min(40, 120 / (n - 1))` ms interval, `<= 300ms` total; disabled when `!animateEntrance || prefersReducedMotion`), apply `.weni-component-enter--pop` to each option `<Button>`, and guard the Send button against double-submit (`FR-017`, `FR-024`, Constitution XV)
- [X] T023 [US2] Wire `list_message` skeleton (`ComponentSkeleton` variant `'list_message'`) and real `<ListMessage>` slot with unified stagger offset inside `src/components/Messages/StreamedMessageItem.tsx`
- [X] T024 [P] [US2] Create colocated unit tests for `TextComponents/ListMessage` (trigger animation props, disabled click blocked from opening list view, `animateEntrance: true` passed to `setCurrentPage`) in `src/components/Messages/TextComponents/ListMessage.test.jsx`
- [X] T025 [P] [US2] Create colocated unit tests for `views/ListMessage` (stagger timing for 1 item `180ms` and 9 items `15ms`/`300ms`, reduced motion `0ms`, `animateEntrance: false` no animation, select + Send calls `sendMessage` once and `goBack()`, rapid double-click guarded) in `src/views/ListMessage.test.jsx`
- [X] T026 [US2] Extend `src/components/Messages/StreamedMessageItem.test.tsx` with US2 flows (list skeleton during text, known vs. unknown `item_count`, disabled trigger during entrance, activation after `180ms`)

**Checkpoint**: User Stories 1 and 2 work independently and together.

---

## Phase 5: User Story 3 - CTA Streaming With Complete URL Gate & 10s Timeout (Priority: P1)

**Goal**: Deliver text-first CTA streaming where the skeleton waits while `streamPhase === 'awaiting_components'` until a complete `http(s)` URL arrives, CTA enters with `180ms` grow-in (`scale(0.94) -> 1`) disabled then activates to open in a new tab, partial/invalid URLs are never rendered, and a `10_000ms` timeout removes the skeleton silently (`BD-004`, `FR-009`, `FR-011`, `FR-018`, `FR-025`).

**Independent Test**: Simulate a CTA with ready URL and another with `streamPhase: 'awaiting_components'` delaying URL by `1.5s` (and a third where URL never arrives within `10s`) — verify caret disappears when text finishes while skeleton continues shimmering, no URL/href exists in DOM before activation, grow-in completes in `180ms`, active CTA has `target="_blank" rel="noopener noreferrer"`, and 10s timeout removes skeleton without error UI.

### Implementation & Tests for User Story 3

- [X] T027 [US3] Update `src/components/Messages/TextComponents/CallToAction.jsx` and `src/components/Messages/TextComponents/CallToAction.scss` to accept optional `animate`, `staggerOffset`, `staggerMs`, and `durationMs` props, keep a silent render guard `isValidCtaUrl(url)` (returning `null` if invalid; structured `invalid_cta_url` warning is logged once with full correlation context in `useComponentStreamLifecycle`), and apply `.weni-component-enter--grow` (`scale(0.94) -> 1`, `opacity: 0 -> 1`) with inline `--weni-enter-duration` / `--weni-enter-delay` and `@media (prefers-reduced-motion: reduce)` override
- [X] T028 [US3] Wire `cta_message` skeleton (`ComponentSkeleton` variant `'cta_message'`) and real `<CallToAction>` slot (gated on `isValidCtaUrl(message.cta_message?.url)`) with unified stagger offset inside `src/components/Messages/StreamedMessageItem.tsx`
- [X] T029 [P] [US3] Create colocated unit tests for `CallToAction` (grow-in animation CSS variables, disabled omits `href` via `Button`'s `NativeAnchor` and blocks click, active renders `href` + `target="_blank" rel="noopener noreferrer"`, invalid/partial/`javascript:` URLs render `null` without exposing URL) in `src/components/Messages/TextComponents/CallToAction.test.jsx`
- [X] T030 [US3] Extend `src/components/Messages/StreamedMessageItem.test.tsx` with US3 flows (CTA ready URL `180ms` grow-in, CTA delayed URL `1.5s` hiding caret at `awaiting_components` while keeping skeleton shimmering with zero URL in DOM, invalid/partial CTA URL logged once with correlation IDs and zero URL PII, `10_000ms` timeout removing skeleton silently with PII-free `console.warn`)

**Checkpoint**: All three P1 component streaming stories (Quick Reply, List Message, CTA) are complete and independently verified.

---

## Phase 6: User Story 4 - Late Hint, Labelless Hint, No-Hint Fallback, Disconnect & Textless Responses (Priority: P2)

**Goal**: Ensure graceful degradation for every delivery edge case: mid-stream hints (60% text), labelless hints (`120px` / `210px`), no-hint fallback (`BD-008`), stream end or disconnect without component (`FR-012`), real payload differing from hint (`FR-020`), and component-only responses with empty text (`FR-028`).

**Independent Test**: Exercise each degradation scenario in `StreamedMessageItem.test.tsx` with fake timers and verify skeletons appear/disappear cleanly, real payloads override hints, no error UI appears, and no-hint streams animate cleanly upon text completion.

### Implementation & Tests for User Story 4

- [X] T031 [US4] Refine `src/components/Messages/StreamedMessageItem.tsx` and `src/hooks/useComponentStreamLifecycle.ts` to verify all edge cases: late hint insertion mid-text without interrupting `useStreamingBuffer`, labelless hint fallback dimensions (`120px` / `210px`), real component count/label override over hints (`FR-020`), textless component-only bubble suppression (`FR-028`), immediate skeleton removal on disconnect/`stream_end` with no component (`FR-012`), and no-hint staggered entrance (`BD-008`, `FR-027`)
- [X] T032 [US4] Add US4 flow tests to `src/components/Messages/StreamedMessageItem.test.tsx` covering mid-stream hint at 60% text, labelless hint (`120px` / `210px`), no-hint fallback (`BD-008`), disconnect/stream-end cleanup without error UI, skeleton-of-3 replaced by 2 real quick replies (`FR-020`), and textless response with 10s timeout starting at hint arrival (`FR-011`, `FR-028`)

**Checkpoint**: All degradation and transport edge cases are covered and verified.

---

## Phase 7: User Story 5 - Multi-Component Responses (Priority: P2)

**Goal**: Support responses containing multiple component types simultaneously (`list_message`, `cta_message`, `quick_replies`) in fixed display order, waiting until all are complete (or a timed-out component drops), and entering all buttons in one unified `<= 300ms` sequence (`BD-006`, `FR-026`).

**Independent Test**: Simulate a response with `list_message` + `cta_message` (and another with `list_message` + `cta_message` + 3 `quick_replies`) where the CTA URL is delayed — verify fixed skeleton order, no component enters while CTA is pending, all enter together in one `<= 300ms` sequence once CTA arrives, and if CTA times out at 10s, the remaining complete components enter together immediately.

### Implementation & Tests for User Story 5

- [X] T033 [US5] Verify and refine unified multi-component coordination in `src/components/Messages/StreamedMessageItem.tsx` so `list_message`, `cta_message`, and `quick_replies` render skeletons in `COMPONENT_DISPLAY_ORDER`, hold all buttons until every non-timed-out hinted component is ready, compute a single `ComponentSchedule` across total button count `n`, and release already-complete siblings immediately if one component expires at `10_000ms` (`FR-026`)
- [X] T034 [US5] Add US5 multi-component flow tests to `src/components/Messages/StreamedMessageItem.test.tsx` (list + CTA fixed order, delayed CTA holding ready list, unified stagger offsets `0, 1, 2..4` staying `<= 300ms`, CTA 10s timeout dropping CTA skeleton while list + quick replies enter together)

**Checkpoint**: Single and multi-component responses obey one unified timing contract.

---

## Phase 8: User Story 6 - Continuity, Interruptions, Scroll & Focus Stability (Priority: P2)

**Goal**: Guarantee zero replayed skeletons/animations on reload, reconnect, "Use here", history, closed-chat completion, or sub-view return; continue in-progress streams smoothly; never close active sub-views; disable components if shopper sends a message mid-stream; preserve scroll position when scrolled up; never alter keyboard focus or input draft (`BD-007`, `FR-029`..`FR-036`).

**Independent Test**: Verify in `MessagesList.test.jsx` and `StreamedMessageItem.test.tsx` that history/completed-on-mount messages render immediately without animation, unmounting/remounting mid-stream resumes skeleton, scrolling up prevents auto-scroll during streaming deltas and swaps, shopper mid-stream message keeps incoming components disabled, and active `<textarea>` focus/selection stays unchanged.

### Implementation & Tests for User Story 6

- [X] T035 [US6] Update `src/components/Messages/MessagesList.jsx` so the `messageGroups` auto-scroll `useEffect` only calls `scrollToBottom()` when `isNearBottomRef.current` is `true` (or when the latest appended message is a new outgoing message), while always invoking `requestAnimationFrame(() => syncScrollState())` so `GoToBottomButton` stays accurate (`FR-036`)
- [X] T036 [P] [US6] Update `src/components/Messages/MessagesList.test.jsx` to test strict last-message activation across two incoming messages in the same group (`FR-022`), scroll preservation when scrolled away from bottom during streaming `messageGroups` updates (`FR-036`), and history/pre-launch messages rendering without skeletons or animations (`FR-029`, `FR-034`)
- [X] T037 [US6] Add US6 continuity, interruption, and focus-stability tests to `src/components/Messages/StreamedMessageItem.test.tsx` covering mount-already-completed (`streamPhase: undefined` and `streamPhase: 'completed'` after closed chat / sub-view return), remount mid-stream resuming skeleton (`FR-030`), shopper sending message mid-stream (`isLastMessage` turning `false` before entrance ends — components enter disabled and stay disabled, `FR-031`), human handoff completion (`FR-032`), and keyboard focus/selection on an input remaining untouched through skeleton -> entrance -> activation (`FR-035`)

**Checkpoint**: Continuity, scroll, focus, and sub-view isolation invariants are verified.

---

## Phase 9: User Story 7 - Accessibility: Screen-Reader Announcements & Reduced Motion (Priority: P2)

**Goal**: Announce component activation politely via `aria-live="polite"` in display order without moving focus (in `en` source keys, with `ro` falling back to `en` and Crowdin handling `pt`/`es` post-merge), never announce skeletons or CTA URLs, and respect `prefers-reduced-motion: reduce` in both CSS and JS while keeping text-then-components order (`FR-010`, `FR-035`, `FR-037`..`FR-039`, `NFR-005`).

**Independent Test**: Render `MessagesList` with `ComponentAnnouncementRegion` — verify live region stays empty during skeleton and disabled entrance, emits exact localized announcement(s) sequentially upon activation (`quick_replies`, `list` with and without `item_count`, `cta` with label only and never URL), emits nothing for `ro` fallback -> English strings, never moves focus, and with `prefers-reduced-motion: reduce` activates at `0ms` after text end with no animation.

### Implementation & Tests for User Story 7

- [X] T038 [P] [US7] Create `src/components/Messages/ComponentAnnouncementRegion.tsx` and `src/components/Messages/ComponentAnnouncementRegion.scss` rendering a single visually hidden `.weni-sr-only` live region (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) with a sequential queue dispatching one announcement per component in display order without moving focus
- [X] T039 [P] [US7] Create colocated unit tests for `ComponentAnnouncementRegion` verifying `aria-live="polite"`, sequential multi-component dispatch order, cleanup on unmount, and zero focus changes in `src/components/Messages/ComponentAnnouncementRegion.test.tsx`
- [X] T040 [US7] Mount `ComponentAnnouncementRegion` in `src/components/Messages/MessagesList.jsx` and wire `StreamedMessageItem`'s `onAnnounce` callback to enqueue localized activation announcements via `buildActivationAnnouncements(message, t)` only when a live streamed message reaches `'ready'` while `isLastMessage` is true (never on mount-completed history, never during skeleton/entering, never when `!isLastMessage`)
- [X] T041 [US7] Add US7 accessibility and reduced-motion tests to `src/components/Messages/MessagesList.test.jsx` and `src/components/Messages/StreamedMessageItem.test.tsx` verifying: skeletons never announced (`aria-hidden="true"`), no announcement while entering, exact announcements for quick replies / list with `item_count` / list without `item_count` / CTA label (never URL), ordered multi-component announcements, `ro` -> `en` fallback via `i18next`, no focus shift, and `prefers-reduced-motion: reduce` activating immediately (`0ms`) after text ends

**Checkpoint**: All 7 inherited user stories (`US1`–`US7`) are implemented and independently verified.

---

## Phase 10: Polish, Dev Simulation Harness & Quality Gate

**Purpose**: Add development-only socket streaming debug buttons in `src/index.jsx`, align peer dependency, and run full local quality gate + production bundle verification

- [X] T042 Create development-only `src/dev/simulateComponentStreams.ts` exporting `COMPONENT_STREAM_SCENARIOS` and `runComponentStreamScenario(scenarioId, webChat, service?)` replaying timed `contracts/messages/socket-stream-frames.schema.json` frames (`typing_start`, `stream_start`, `stream_component_hint`, `{ v, seq }`, `stream_text_end`, `stream_component`, `stream_end`) through `window.WebChat.simulateMessageReceived(...)` with automatic `AD-005` `state:changed` fallback when running against `@weni/webchat-service` `1.21.0`, covering: Quick Replies (3 options, 6 options wrap), List Message (known `item_count: 9`, unknown count), CTA (ready URL, 1.5s delayed URL), Multi-component (`list_message` + `cta_message` + `quick_replies`), Mid-stream hint (~60% text), Labelless hint, No-hint fallback (`BD-008`), and Undelivered component timeout
- [X] T043 [P] Create colocated unit tests for `src/dev/simulateComponentStreams.ts` verifying frame ordering, timing delays, native `simulateMessageReceived` dispatch, and `1.21.0` fallback behavior (preserving Jest's 80% coverage gate) in `src/dev/simulateComponentStreams.test.ts`
- [X] T044 Add development-only debug buttons inside `#actions` (alongside `simulate-whatsapp-coupon-opt-in` and `simulate-streamed-rationale`) wired to `COMPONENT_STREAM_SCENARIOS` and `runComponentStreamScenario` in `src/index.jsx` (never imported by `src/index.js` or `src/standalone.jsx`)
- [ ] T045 Update `@weni/webchat-service` peer dependency in `package.json` when the `AD-005`/`AD-006` MINOR release (`1.22.0`) is available (if implementing in parallel before `1.22.0` publishes, keep `1.21.0` during local dev and bump in the release-prep commit before merge)
- [X] T046 Run the full Constitution local quality gate and `specs/015-components-streaming/quickstart.md` verification:
  1. `npx prettier --write` on changed files
  2. `npm run lint -- --fix && npm run lint` (zero errors)
  3. `npm run typecheck` (zero TypeScript errors)
  4. `npm test -- --coverage` (>=80% statements, branches, functions, lines)
  5. `npm run build:all` and confirm `dist/` and `dist-standalone/` exclude `simulateComponentStreams` and `src/index.jsx` dev buttons, and verify `git status` shows NO edits to `pt.json`, `es.json`, or `ro.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately (`T001`–`T003`, with `T002` and `T003` parallel).
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all User Stories (`US1`–`US7`)**. Within Phase 2: `T004` -> `T005`, `T010` -> `T011`; `T006`/`T007`, `T008`/`T009`, and `T012`/`T013` can run in parallel with `T004`/`T005`.
- **Phase 3 (`US1` — P1 MVP)**: Depends on Phase 2. Establishes `StreamedMessageItem.tsx`, `MessageText.jsx` slots, and `MessagesList.jsx` wiring.
- **Phase 4 (`US2` — P1)** and **Phase 5 (`US3` — P1)**: Depend on Phase 2 and `T017` (`StreamedMessageItem.tsx`). Component-level edits (`T021`/`T022`/`T024`/`T025` for US2 and `T027`/`T029` for US3) can proceed in parallel.
- **Phase 6 (`US4` — P2)** and **Phase 7 (`US5` — P2)**: Depend on Phases 3–5 (`US1`–`US3`) because edge cases and multi-component coordination exercise all three component types.
- **Phase 8 (`US6` — P2)** and **Phase 9 (`US7` — P2)**: Depend on Phase 3 (`T017`/`T018`) and can run largely in parallel with each other (`ComponentAnnouncementRegion` `T038`/`T039` has zero overlap with `MessagesList` scroll fix `T035`).
- **Phase 10 (Polish, Dev Harness & Quality Gate)**: `T042`/`T043`/`T044` can be developed as soon as Phase 3–5 are wired; `T046` runs last after all tasks complete.

### User Story Dependencies

- **US1 (P1 — MVP)**: Independent after Phase 2.
- **US2 (P1)**: Independent component work (`ListMessage`, `views/ListMessage`) after Phase 2; wires into `StreamedMessageItem.tsx` from `T017`.
- **US3 (P1)**: Independent component work (`CallToAction`) after Phase 2; wires into `StreamedMessageItem.tsx` from `T017`.
- **US4 (P2)**: Integrates across `US1`–`US3` edge cases.
- **US5 (P2)**: Integrates across `US1`–`US3` multi-component combinations.
- **US6 (P2)**: Independent scroll/continuity/interruption verification building on `MessagesList.jsx` + `StreamedMessageItem.tsx`.
- **US7 (P2)**: Independent live-region component (`ComponentAnnouncementRegion.tsx`) wired into `MessagesList.jsx` + `StreamedMessageItem.tsx`.

---

## Parallel Opportunities

### Phase 2 (Foundational)

```bash
# Run independent foundational modules in parallel:
Task: "T004 Create src/utils/componentStreaming.ts"
Task: "T006 Create src/hooks/usePrefersReducedMotion.ts"
Task: "T008 Update src/hooks/useStreamingBuffer.js"
Task: "T012 Create ComponentSkeleton.tsx and ComponentSkeleton.scss"
```

### P1 Component Updates (after `T017`)

```bash
# Develop ListMessage (US2) and CallToAction (US3) in parallel:
Task: "T021 Update src/components/Messages/TextComponents/ListMessage.jsx & .scss"
Task: "T022 Update src/views/ListMessage.jsx & .scss"
Task: "T027 Update src/components/Messages/TextComponents/CallToAction.jsx & .scss"
```

### P2 Independent Tracks (after `US1`–`US3`)

```bash
# Develop Accessibility live region (US7) and Dev Simulation Harness in parallel:
Task: "T038 Create ComponentAnnouncementRegion.tsx & .scss"
Task: "T042 Create src/dev/simulateComponentStreams.ts"
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2 + Phase 3 / US1)

1. Complete Phase 1 (Setup: animations, `en.json` keys, service mock)
2. Complete Phase 2 (Foundational: `componentStreaming.ts`, `usePrefersReducedMotion.ts`, `useStreamingBuffer.js`, `useComponentStreamLifecycle.ts`, `ComponentSkeleton.tsx`)
3. Complete Phase 3 (`US1` — Quick Reply streaming end-to-end)
4. **STOP & VALIDATE**: Run Jest on `US1` suites to confirm text-first quick reply streaming, exact-sized skeletons, `<= 300ms` stagger, and strict last-message disable behavior.

### Incremental Delivery

1. Setup + Foundational -> Core streaming engine & skeleton primitives ready
2. Add `US1` (Quick Replies) -> MVP complete
3. Add `US2` (List Message + staggered `views/ListMessage`) & `US3` (CTA + complete URL gate + 10s timeout) -> All three P1 components complete
4. Add `US4` (Degradation/Edge Cases) & `US5` (Multi-Component Responses) -> Full protocol resilience
5. Add `US6` (Continuity/Scroll/Focus) & `US7` (Polite Live Announcements + Reduced Motion) -> Full accessibility & UX polish
6. Add Phase 10 (Dev Simulation Harness in `src/index.jsx` + peer bump + full quality gate) -> PR-ready for review and Crowdin translation pipeline

---

## Notes

- `[P]` tasks operate on distinct files with no unfinished dependencies.
- Never modify `src/i18n/locales/pt.json`, `es.json`, or `ro.json`; `.githooks/pre-commit` enforces the localization lock.
- Never log `text`, `labels`, `button_text`, `list_items`, `display_text`, or `url` in any `console.warn` statement; never use `console.log` in production files.
- Commit atomically using Conventional Commits (`feat: ...`, `test: ...`, `chore: ...`, max 50-char imperative description) per Constitution VI.
