# Research: Shopping Assistant Components Streaming (`webchat-react`)

**Feature**: `015-components-streaming`  
**Date**: 2026-11-24  
**Spec**: [specs/015-components-streaming/spec.md](./spec.md)

## 1. Exact-Sized Skeletons Without Layout Shift (`BD-002`, `FR-004`..`FR-007`, `NFR-003`, `SC-003`)

- **Decision**: Render `ComponentSkeleton` in-flow inside each real component's exact container slot (`.weni-list-message`, `.weni-call-to-action`, `.weni-messages-list__message--quick-replies` -> `.weni-quick-replies`) using the identical CSS box model (padding, font, line-height, border, border-radius, gap, icon box dimensions) as `FSButton` (quick replies) and `Button` + `Icon` (list trigger and CTA). When `componentHint.labels` are present, place the label text inside an `aria-hidden="true"`, `visibility: hidden`, non-selectable `<span>` inside the shimmer element so the browser natively lays out both single-line width and multi-line wrapped height. When `labels` are omitted, render an empty placeholder with `width: 120px` (quick reply / list) or `width: 210px` (CTA) and single-line button height.
- **Rationale**:
  - An offscreen DOM probe (`left: -9999px` + `getBoundingClientRect()`, as used in the HTML prototype) lacks the live container's width constraint, so long labels that wrap onto 2 lines inside narrow floating/mobile bubbles are mismeasured as single-line boxes, causing vertical layout shift on swap (`SC-003`, User Journey 1 scenario 10).
  - In-flow hidden-label sizing executes zero forced synchronous reflows, adapts automatically to floating, fullscreen, mobile, and embedded layouts as well as viewport resizes, never uses `<button>` (so skeletons are never keyboard-focusable per `FR-035`), and keeps `aria-hidden="true"` so screen readers ignore skeletons (`FR-010`).
  - Existing visual button styles (`FSButton` / `Button`) remain unchanged (`BD-009`, `FR-040`).
- **Alternatives considered**:
  - *Offscreen DOM measurement probe (`getBoundingClientRect`)* — rejected due to multi-line wrap mismatch in constrained mobile/floating containers and forced layout reflows during streaming.
  - *Fixed-width generic pills regardless of labels* — rejected because it violates `BD-002`, `FR-006`, and `SC-003` (0px shift when labels are present in the hint).

## 2. Per-Message Lifecycle Coordination & `useStreamingBuffer` Integration (`BD-001`, `BD-006`, `FR-001`, `FR-026`, `FR-028`)

- **Decision**: Introduce a TypeScript row coordinator `src/components/Messages/StreamedMessageItem.tsx` and hook `src/hooks/useComponentStreamLifecycle.ts`. `StreamedMessageItem` invokes `useStreamingBuffer` with `isTextStreaming = message.status === 'streaming' && (message.streamPhase === undefined || message.streamPhase === 'streaming_text')`, passes `displayedText` and `isBuffering` down to `MessageText`, and coordinates `ListMessage`, `CallToAction`, and sibling `QuickReplies` (plus their `ComponentSkeleton` placeholders) from one lifecycle instance. Update `useStreamingBuffer.js` so empty text transitions cleanly out of buffering without a lingering caret when `isStreaming` becomes `false` (and when a component-only response arrives with `text === ''`).
- **Rationale**:
  - Today `useStreamingBuffer` lives inside `MessageText.jsx` (which renders `ListMessage` and `CallToAction`), while `QuickReplies` renders as a sibling inside `MessagesList.jsx`. Coordinating all three components at the message row level guarantees that `QuickReplies` never enters before `isBuffering` finishes (`BD-001`), that multi-component responses share one unified stagger count `n` and stay `<= 300ms` (`BD-006`, `FR-026`), and that `MessagesList.jsx` (already 432 lines) does not grow further (Constitution IX).
  - Checking `streamPhase !== 'awaiting_components' && streamPhase !== 'completed'` fixes the caret lifecycle when text ends before a delayed CTA URL arrives (`FR-009`, `FR-018`): `message.status` stays `'streaming'` during `awaiting_components`, so `isTextStreaming` must become `false` to flush buffered words, hide the caret, and start the `10_000ms` component wait timer.
- **Alternatives considered**:
  - *Keeping `useStreamingBuffer` in `MessageText` and syncing `QuickReplies` via `ChatContext`* — rejected because it duplicates transient UI state into context (violating Constitution XIV) and fragments one message's lifecycle across two components.
  - *Moving `QuickReplies` inside `MessageText` bubble* — rejected because `QuickReplies` intentionally renders outside the assistant text bubble in `.weni-messages-list__message--quick-replies` (`BD-009`, `FR-004`).

## 3. Unified Stagger Math, Fixed Display Order, and 10-Second Timeout (`BD-004`, `BD-005`, `BD-006`, `FR-011`, `FR-014`, `FR-017`)

- **Decision**: Centralize all binding constants and pure functions in `src/utils/componentStreaming.ts`:
  - `COMPONENT_DISPLAY_ORDER = ['list_message', 'cta_message', 'quick_replies'] as const`
  - `COMPONENT_ENTER_DURATION_MS = 180`
  - `COMPONENT_MAX_SEQUENCE_MS = 300`
  - `COMPONENT_MAX_STAGGER_MS = 70`
  - `LIST_ITEM_MAX_STAGGER_MS = 40`
  - `COMPONENT_WAIT_TIMEOUT_MS = 10_000`
  - `SKELETON_DEFAULT_WIDTH_PX = 120`, `SKELETON_CTA_DEFAULT_WIDTH_PX = 210`
  - `computeComponentStaggerMs(n) = n > 1 ? Math.min(70, (300 - 180) / (n - 1)) : 0`
  - `computeListItemStaggerMs(n) = n > 1 ? Math.min(40, (300 - 180) / (n - 1)) : 0`
  - `computeSequenceDurationMs(n, staggerMs) = n > 0 ? 180 + staggerMs * (n - 1) : 0`
  - When `text === ''` and a hint arrives (`FR-028`), start the `10_000ms` wait timer immediately; if text deltas later arrive, cancel the timer and restart it only after text reveal finishes (`!isBuffering && !isTextStreaming`). On expiration, add unresolved hinted types to `timedOutTypes`, log a PII-free `console.warn`, drop their skeletons silently, and immediately trigger entrance for any already-complete sibling components (`FR-026`).
- **Rationale**: Single source of truth (Constitution `Maintainability`) ensures identical math across `StreamedMessageItem`, `views/ListMessage`, and unit tests. The textless-reset rule satisfies both pure component-only responses (`FR-011`, `FR-028`) and slow-first-delta streams without premature timeout.
- **Alternatives considered**:
  - *Per-component independent 10s timers and independent stagger animations* — rejected because `BD-006` / `FR-026` require all components of a response to enter together in a single `<= 300ms` sequence once all are ready (or once timed-out components drop).

## 4. Continuity & No-Replay Behavior (`BD-007`, `FR-029`, `FR-030`, `FR-033`, `FR-034`)

- **Decision**: Determine initial lifecycle state at mount inside `useComponentStreamLifecycle`:
  - If `message.status !== 'streaming'` at mount (covers history `streamPhase === undefined`, pre-launch messages, reload, reconnect, "Use here", and messages that finished while chat was closed or shopper was on a sub-view because `Chat.jsx` unmounts `MessagesList` when `!isChatOpen` or `currentPage !== null`), initialize in `phase = 'ready'`, `shouldAnimate = false`, and emit no announcement.
  - If `message.status === 'streaming'` at mount (live message or shopper returned mid-stream from closed chat / sub-view), initialize in `phase = 'skeleton'` (with `wasObservedStreamingRef.current = true`), resuming smoothly from current `message.text` and `message.componentHints`.
  - Keep `ChatContext.pageHistory` completely decoupled from incoming message updates so sub-views (`Cart`, `ProductCatalog`, `ProductDetails`, `ListMessage`) are never closed or interrupted (`FR-033`).
- **Rationale**: Directly matches `Chat.jsx`'s existing mount/unmount behavior and `@weni/webchat-service`'s `AD-005` guarantee that `streamPhase` and `componentHints` are never persisted in storage or returned by `HistoryManager`.
- **Alternatives considered**:
  - *Persisting animated message IDs in `sessionStorage`* — rejected because `BD-007` explicitly forbids persisting streaming animation state and the mount-status check handles all continuity scenarios statelessly.

## 5. Scroll Preservation & Strict Last-Message Activation (`FR-022`, `FR-031`, `FR-036`, `BD-003`)

- **Decision**:
  - In `MessagesList.jsx`, tighten `enableComponents(message)` from checking `messageGroups.at(-1)?.messages.some(...)` to strictly `lastMessage?.id === message.id && message.direction === 'incoming'` (where `lastMessage = messageGroups.at(-1)?.messages.at(-1)`).
  - In `MessagesList.jsx`, guard the `messageGroups` auto-scroll `useEffect` (lines 143-153) with `if (isNearBottomRef.current) scrollToBottom()` (while continuing to scroll when the shopper sends a new outgoing message or opens the chat, and always calling `syncScrollState()` inside `requestAnimationFrame` so the "Go to bottom" button stays accurate).
- **Rationale**:
  - Checking `inLastGroup` would leave an earlier assistant message's components enabled when a second assistant message starts in the same incoming direction group, violating `FR-022`.
  - Unconditional `scrollToBottom()` on every `messageGroups` mutation would yank a scrolled-up shopper to the bottom on every streaming delta, hint, or skeleton swap, violating `FR-036`.
- **Alternatives considered**:
  - *Adding a separate `scrollToBottomOnComponentSwap` callback* — unnecessary once the `messageGroups` effect respects `isNearBottomRef.current` and `onWordRevealed` continues to follow the bottom when near bottom.

## 6. Accessibility, Reduced Motion & Crowdin-Locked Localization (`FR-010`, `FR-035`, `FR-037`..`FR-039`, `NFR-005`)

- **Decision**:
  - Create `src/hooks/usePrefersReducedMotion.ts` subscribing to `window.matchMedia('(prefers-reduced-motion: reduce)')` (safe fallback to `false` when `matchMedia` is absent) alongside CSS `@media (prefers-reduced-motion: reduce)` rules in `ComponentSkeleton.scss`, `QuickReplies.scss`, `ListMessage.scss`, `CallToAction.scss`, and `views/ListMessage.scss`.
  - Create `src/components/Messages/ComponentAnnouncementRegion.tsx` rendering a single visually hidden `.weni-sr-only` element with `role="status"`, `aria-live="polite"`, `aria-atomic="true"` and an internal sequential announcement queue (clearing and dispatching each announcement on `requestAnimationFrame` / short tick so multi-component activations announce each component in display order without dropping earlier items or moving keyboard focus).
  - Add 4 English source keys under `streaming_components` in `src/i18n/locales/en.json` ONLY (alphabetical order per VTEX Content Guide):
    - `cta_available`: `"{{label}} link available"`
    - `list_available`: `"List of options available"`
    - `list_available_with_count`: `"List with {{count}} options available"`
    - `quick_replies_available`: `"{{count}} options available"`
  - Do NOT touch `pt.json`, `es.json`, or `ro.json` (Crowdin delivers `pt`/`es` post-merge; `ro` automatically falls back to `en` via `fallbackLng: 'en'` in `src/i18n/index.js`).
  - Rely on native `<button disabled>` (`FSButton`, `Button`) and `Button.jsx`'s `NativeAnchor` (which already removes `href` and sets `aria-disabled="true"` when `disabled` is true) so disabled buttons and CTAs cannot receive Tab focus or activate (`FR-035`, `SC-002`).
- **Rationale**: Satisfies all WCAG/product accessibility requirements while strictly complying with `scripts/localization-lock.js` and Constitution `Internationalization`.
- **Alternatives considered**:
  - *Concatenating multi-component announcements into one sentence* — rejected because `FR-038` / Q22 explicitly specifies one announcement per component in display order using the exact Content table strings.

## 7. Development-Only Socket Stream Simulation (`src/index.jsx` + `src/dev/simulateComponentStreams.ts`)

- **Decision**: Create a typed, dev-only module `src/dev/simulateComponentStreams.ts` imported exclusively by `src/index.jsx` (the Vite `npm run dev` playground, never referenced by `src/index.js` library build or `src/standalone.jsx` UMD bundle). Wire debug buttons inside `#actions` in `src/index.jsx` alongside `simulate-whatsapp-coupon-opt-in` and `simulate-streamed-rationale`.
  - Each scenario replays the exact WebSocket wire frames defined in `contracts/messages/socket-stream-frames.schema.json` (`typing_start`, `stream_start`, `stream_component_hint`, `{ v, seq }`, `stream_text_end`, `stream_component`, `stream_end`) through `window.WebChat.simulateMessageReceived(...)`.
  - **Parallel-development resilience**: Because `@weni/webchat-service` `1.21.0` (currently installed) does not yet normalize the new `stream_component_hint` / `stream_component` / `stream_text_end` / extended `stream_end` frames until `1.22.0` is published, `simulateComponentStreams.ts` inspects whether `service.getState().messages` picked up the `stream_component_hint` frame; if running against `1.21.0`, it automatically applies the matching `AD-005` `Message` state transitions (`componentHints`, `streamPhase`, component payloads) via `service.emit('state:changed', ...)` (the same pattern `simulateConnectionStatus` uses in `src/standalone.jsx`). Once `@weni/webchat-service` `1.22.0` is installed, native `simulateMessageReceived` handles every frame end-to-end with zero simulator code changes.
  - Add colocated `src/dev/simulateComponentStreams.test.ts` so Jest's `src/**/*.{js,jsx,ts,tsx}` 80% coverage gate remains green without modifying `jest.config.js`.
- **Rationale**: Enables immediate visual/manual testing of all 10+ scenarios in `npm run dev` during parallel development against contract mocks (Architecture Doc *Delivery Sequence*) without shipping a single byte of dev code into `dist/` or `dist-standalone/`.
- **Alternatives considered**:
  - *Putting all scenario payloads inline in `src/index.jsx`* — rejected because `src/index.jsx` is already 466 lines; extracting scenario definitions into `src/dev/simulateComponentStreams.ts` keeps `src/index.jsx` readable and puts all new code in strict TypeScript (Constitution VIII & IX).
  - *Adding simulation methods to `window.WebChat` in `src/standalone.jsx`* — rejected because it would ship dev-only scenario fixtures inside the production UMD bundle (`dist-standalone/webchat.umd.js`) and alter the public `window.WebChat` contract unnecessarily.
