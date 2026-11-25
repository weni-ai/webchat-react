# Engineering Specification: Shopping Assistant Components Streaming

**Repository**: `webchat-react` — frontend

**Feature Branch**: `015-components-streaming`

**Created**: 2026-11-24

**Status**: Draft

## Inheritance from Product Spec

- Product Spec: Streaming de componentes no Shopping Assistant (quick reply, lista e CTA) — https://github.com/weni-ai/vtex-cx-experience-specs/blob/e0f8e7ec9b5645681534645dc182a070b2d38e15/specs/019-sa-components-streaming/spec.md
- Pinned version: `019-sa-components-streaming-v1` (commit `e0f8e7ec9b5645681534645dc182a070b2d38e15`)
- Architecture doc: https://github.com/weni-ai/vtex-cx-experience-specs/blob/fe00c1ce98126044f7b5770fb75d54aadc88d34d/specs/019-sa-components-streaming/architecture.md (commit `fe00c1ce98126044f7b5770fb75d54aadc88d34d`)
- Inherited binding decisions: `BD-001`, `BD-002`, `BD-003`, `BD-004`, `BD-005`, `BD-006`, `BD-007`, `BD-008`, `BD-009`, `BD-010`, `BD-011`, plus Architecture Contract Decisions `AD-005` and `AD-006`
- Scope of this spec: Shopping Assistant widget UI (`@weni/webchat-template-react`) — per-message streaming component lifecycle coordination, layout-preserving skeletons, unified staggered entrance (<=300ms) for quick replies, list trigger, list view items, and CTA, disabled-until-complete gating restricted to the last message, 10-second component timeout, `prefers-reduced-motion` handling, scroll/focus/sub-view stability, and English source `aria-live="polite"` announcement keys
- Divergences: none

## Scope in This Repository

**This repository implements**:

- Consumption of the additive `@weni/webchat-service` `Message` fields `componentHints` and `streamPhase` (`streaming_text` | `awaiting_components` | `completed`), alongside `quick_replies`, `list_message` (including optional `item_count`), and `cta_message`.
- Updating text-streaming detection so `useStreamingBuffer` stops buffering (and hides the caret) when `streamPhase` transitions to `awaiting_components` or `completed` instead of waiting solely on `message.status !== 'streaming'`.
- Per-message coordination across `MessageText`, `ListMessage`, `CallToAction`, and `QuickReplies` so skeletons render immediately on hint arrival, real components never appear before text reveal finishes and all hinted components are complete (with a 10-second timeout per FR-011), and multiple component types enter in one unified <=300ms stagger sequence in fixed order (`list_message`, `cta_message`, `quick_replies`).
- Layout-preserving `ComponentSkeleton` placeholders matching the rendered box model of existing buttons (`FSButton` / `Button`) when labels are provided, falling back to `120px` (`210px` for CTA) when labels are omitted, with shimmer sweep (suppressed under `prefers-reduced-motion`) and `aria-hidden="true"`.
- Entrance animations (`pop-in` for quick replies, list trigger, and list view items; `grow-in` for CTA) using the binding timing formulas (`180ms` duration; `min(70, 120 / (n - 1))` ms stagger for message buttons; `min(40, 120 / (n - 1))` ms stagger for list view items; `<= 300ms` total cap; `0ms` under `prefers-reduced-motion`).
- Strict last-message activation (`isLastMessage`) combined with entrance completion and immediate click-disable guards on `QuickReplies` and `views/ListMessage`.
- A polite `aria-live="polite"` screen-reader announcement region announcing component activation in display order without moving focus, backed by new English source keys in `src/i18n/locales/en.json` (`ro` falls back to `en` via existing `i18next` config; `pt`/`es` delivered post-merge by Crowdin).
- Scroll-position preservation in `MessagesList` so updates during streaming (hints, deltas, skeleton-to-button swaps) never auto-scroll when the shopper has scrolled away from the bottom.
- Continuity handling so history, reload, reconnect, "Use here", and responses completed while the chat was closed or on a sub-view render immediately in final state with no skeleton and no animation.
- Updating `@weni/webchat-service` peer dependency in `package.json` to the MINOR release implementing `AD-005` / `AD-006`, and extending `test/__mocks__/@weni/webchat-service.js` to drive streaming phases and hints in unit tests.
- Development-only debug buttons in the local Vite harness (`src/index.jsx`, placed alongside existing simulation controls such as `simulate-whatsapp-coupon-opt-in` and `simulate-streamed-rationale`) that replay WebSocket streaming component frames (`stream_start`, `stream_component_hint`, `{ v, seq }`, `stream_text_end`, `stream_component`, `stream_end`) through `window.WebChat.simulateMessageReceived(...)` for local manual testing and QA without a live backend. Excluded from production library and standalone UMD builds.

**Out of scope here**:

- `nexus-ai` (owned by Nexus): gRPC emission of `component_hint`, `component`, `text_end`, `completed` (`metadata["components"]`), removal of the 1024-char split on the Shopping Assistant stream path, and `POST /api/v2/internals/messages/stream` calls.
- `flows` (owned by Engine/Flows): `MsgStreamSerializer` component validation and `Idempotency-Key` support in `POST /api/v2/internals/messages/stream`.
- `weni-webchat-socket` (owned by Experience): gRPC ingestion/validation of streaming component events, Redis Pub/Sub and WebSocket frame forwarding (`stream_component_hint`, `stream_component`, `stream_text_end`, extended `stream_end`), and single atomic MongoDB `Save` on `completed`.
- `@weni/webchat-service` (owned by Experience): normalizing WebSocket frames to `componentHints` / `streamPhase`, emitting component-only messages on hint arrival (FR-028), clearing `componentHints` on `stream_end` or disconnect (FR-012), omitting transient streaming fields from storage/history (BD-007), and restoring `cta_message` in `HistoryManager.processHistory` (FR-029).
- Localization of `src/i18n/locales/pt.json` and `src/i18n/locales/es.json` (owned by Localization team via Crowdin post-merge, per Constitution `Internationalization`).
- Visual confirmation of BD-005 design-reference parameters (easing curve, shimmer 1.2s cycle, 6px offset, 0.94 scale, 150ms color transition, skeleton fill color — owned by Design in Stage 3).
- Out-of-scope product surfaces per BD-009: WhatsApp, `ShowItems` (product list), `ProductCarousel`, media messages, `MessageOrder`, `ThinkingIndicator`, `InputBox`, `VoiceMode`, `Launcher`, unread count/tooltip preview, and message timestamps/read ticks (spec 009).

**Depends on**:

- `@weni/webchat-service` MINOR release conforming to [`contracts/messages/webchat-service-message.schema.json`](https://github.com/weni-ai/vtex-cx-experience-specs/blob/fe00c1ce98126044f7b5770fb75d54aadc88d34d/specs/019-sa-components-streaming/contracts/messages/webchat-service-message.schema.json) (`AD-005`, `AD-006`):
  - Emits `streamPhase: 'streaming_text' | 'awaiting_components' | 'completed'` on live streamed messages and omits `streamPhase` on history/persisted messages.
  - Emits `componentHints?: ComponentHint[]` (`{ componentType, labels?, count?, itemCount? }`, never containing CTA URLs) while active and clears `componentHints` with `status: 'delivered'`, `streamPhase: 'completed'` on `stream_end` or WebSocket disconnect/close.
  - Emits `list_message.item_count` (optional positive integer) and restores `cta_message` in `HistoryManager`.
- Crowdin Localization PR merging `pt.json` and `es.json` translations for the new `en.json` keys before QA sign-off and `nexus-ai` cutover (NFR-005).

## Current State

- `src/hooks/useStreamingBuffer.js` — reveals `text` word by word (~70ms +/- 20ms jitter), triggers `useMessagesScroll()` (`onWordRevealed`) per word, and stops buffering only when all words are shown AND `isStreaming` becomes `false`. Does not accept an `onBufferingComplete` signal or distinguish `streamPhase === 'awaiting_components'` from active text streaming.
- `src/components/Messages/MessageText.jsx` — calls `useStreamingBuffer({ text: message.text, isStreaming: message.status === 'streaming' })`, renders `<section className="weni-message-text">`, and immediately renders `<ListMessage>` and `<CallToAction>` inside `<MessageContainer>` whenever `message.list_message` / `message.cta_message` exist, with no skeleton, no waiting for text completion, and no entrance animation.
- `src/components/Messages/MessagesList.jsx` (432 lines) —
  - `enableComponents(message)` checks `messageGroups.at(-1)?.messages.some((m) => m.id === message.id)`, which enables components on *all* messages in the last incoming group rather than strictly the last message.
  - `renderMessage` renders `<MessageContainer><Message /></MessageContainer>` (containing `MessageText`, `ListMessage`, `CallToAction`), followed by a sibling `<MessageContainer className="... weni-messages-list__message--quick-replies"><QuickReplies /></MessageContainer>`. Because `useStreamingBuffer` lives inside `MessageText`, `QuickReplies` cannot coordinate with text completion or share a stagger sequence with `ListMessage` and `CallToAction`.
  - Lines 143-153 run `scrollToBottom()` unconditionally on every `messageGroups` change, even when `isNearBottomRef.current` is `false`.
  - Has no `aria-live="polite"` announcement region for component activation.
- `src/components/Messages/TextComponents/QuickReplies.jsx` & `QuickReplies.scss` — renders `<FSButton variant="tertiary" className="weni-quick-replies__button">` in a flex-wrap `.weni-quick-replies` container. Uses raw `reply` as React key and string argument to `sendMessage(reply)` without a local double-submit guard or entrance animation props.
- `src/components/Messages/TextComponents/ListMessage.jsx` & `ListMessage.scss` — renders `<Button variant="secondary">` with `<Icon name="list" size="medium" />` inside `.weni-list-message` (`display: grid; margin-top: $spacing-2`). Calls `setCurrentPage({ view: 'list-message', title: buttonText, props: { options: items.map((item) => item.title) } })`. Does not support entrance animation props or pass an animation flag to `views/ListMessage`.
- `src/components/Messages/TextComponents/CallToAction.jsx` & `CallToAction.scss` — renders `<Button variant="secondary" href={url} target="_blank" rel="noopener noreferrer">` with `<Icon name="open_in_new" size="medium" />` inside `.weni-call-to-action`. `Button.jsx`'s `NativeAnchor` already omits `href` and sets `aria-disabled={true}` when `disabled` is true, preventing focus and navigation while disabled.
- `src/views/ListMessage.jsx` & `ListMessage.scss` — renders each option immediately as `<Button variant="secondary" alignContent="start">` with no staggered entrance animation and no double-submit guard on the Send button.
- `src/components/Chat/Chat.jsx` — unmounts `<MessagesList />` when `isChatOpen` is `false` (after 250ms close animation) or when `currentPage` is set to a sub-view (`list-message`, `product-catalog`, `product-details`, `cart`, `back-in-stock-notify`, `whatsapp-offers-opt-in`). Sub-views are driven exclusively by `pageHistory` in `ChatContext` and are never closed by incoming messages.
- `src/i18n/index.js` & `src/i18n/locales/en.json` — `i18next` initializes with `en`, `pt`, `es`, `ro` and `fallbackLng: 'en'`. No screen-reader announcement keys exist for streaming components yet.
- `src/index.jsx` (466 lines) — local Vite development playground (`npm run dev`; not an entry point in `vite.config.js` library build or `vite.config.standalone.js` UMD build). Exposes `#actions` debug buttons such as `simulate-whatsapp-coupon-opt-in` and `simulate-streamed-rationale`, the latter replaying timed WebSocket frames (`typing_start`, `stream_start`, `stream_rationale`, `{ v, seq }`, `stream_end`) via `window.WebChat.simulateMessageReceived`.
- `package.json` — pins `@weni/webchat-service` to `1.21.0`. TypeScript 5.6 strict mode (`tsconfig.json`), `npm run typecheck`, `npm run lint` (`.js,.jsx,.ts,.tsx`), and Jest (`moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json']`) are already configured.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/utils/componentStreaming.ts` | new | Centralizes binding timing constants (`180ms`, `300ms`, `70ms`, `40ms`, `10_000ms`), fallback skeleton widths (`120px`, `210px`), fixed display order (`['list_message', 'cta_message', 'quick_replies']`), pure stagger/duration calculators, `ComponentHint`/`StreamPhase` TypeScript types, strict CTA URL guard (`^https?://.+`), hint normalization/validation (discarding malformed payloads with structured warning), and screen-reader announcement builders. |
| `src/hooks/usePrefersReducedMotion.ts` | new | Subscribes to `window.matchMedia('(prefers-reduced-motion: reduce)')` with safe fallback when `matchMedia` is absent (jsdom/older environments) so JS animation timers collapse to `0ms` in lockstep with CSS `@media (prefers-reduced-motion: reduce)`. |
| `src/hooks/useComponentStreamLifecycle.ts` | new | Per-message state machine driving `'ready' | 'skeleton' | 'entering'` phases, 10-second timeout after text completion (or after hint arrival for textless responses), multi-component readiness gate, unified stagger schedule across all present component types, no-replay continuity when mounted already completed, and activation announcement emission. |
| `src/hooks/useStreamingBuffer.js` | modified | Keeps existing word-reveal behavior and adds handling for empty text transitioning straight out of streaming (no lingering caret when `text === ''` and `isStreaming === false`). |
| `src/components/Messages/TextComponents/ComponentSkeleton.tsx` & `ComponentSkeleton.scss` | new | Renders `aria-hidden="true"` non-focusable (`<span>`) shimmer placeholders matching the exact CSS box model, padding, font, icon slot, border-radius, and multi-line wrapping of `QuickReplies` (`FSButton`), `ListMessage` (`Button` + `list` icon), and `CallToAction` (`Button` + `open_in_new` icon) via hidden in-flow label text (`visibility: hidden`), falling back to `120px` / `210px` when labels are absent. |
| `src/components/Messages/StreamedMessageItem.tsx` | new | Coordinates `useStreamingBuffer` and `useComponentStreamLifecycle` for a single text/message row, rendering the text bubble (`MessageText` with `ListMessage`/`CallToAction` or their skeletons) and the sibling `QuickReplies` container (or its skeletons) with unified stagger indices, disabled state, and activation callback. Keeps `MessagesList.jsx` from growing past its current line count. |
| `src/components/Messages/ComponentAnnouncementRegion.tsx` & `ComponentAnnouncementRegion.scss` | new | Visually hidden (`.weni-sr-only`) polite live region (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) with a sequential announcement queue so multi-component responses emit one announcement per component in display order without dropping earlier announcements or moving keyboard focus. |
| `src/components/Messages/MessageText.jsx` | modified | Accepts optional pre-computed `displayedText`, `isBuffering`, and component render slots/props from `StreamedMessageItem` (retaining standalone fallback to `useStreamingBuffer` when rendered directly in existing unit tests or unknown message paths). Omits empty `.weni-message-text` markup when a component-only response has no text and is not buffering text. |
| `src/components/Messages/MessagesList.jsx` | modified | Tightens `enableComponents` to check strictly the last message (`lastMessage?.id === message.id`), delegates `text`/`message` rows to `StreamedMessageItem`, mounts `ComponentAnnouncementRegion`, and guards the `messageGroups` scroll `useEffect` with `isNearBottomRef.current` (preserving scroll on new outgoing messages or `isChatOpen`). |
| `src/components/Messages/TextComponents/QuickReplies.jsx` & `QuickReplies.scss` | modified | Adds optional entrance animation props (`animate`, `staggerOffset`, `staggerMs`, `durationMs`), immediate click-lock state (`hasClicked`) to prevent double submission before `StateManager` appends the outgoing message, support for both string and `{ title, payload }` entries with collision-safe keys, and `pop-in` CSS animation + `prefers-reduced-motion` override. |
| `src/components/Messages/TextComponents/ListMessage.jsx` & `ListMessage.scss` | modified | Adds optional entrance animation props (`animate`, `staggerOffset`, `staggerMs`, `durationMs`), passes `animateEntrance: true` to `views/ListMessage` in `setCurrentPage`, and applies `pop-in` CSS animation + `prefers-reduced-motion` override. |
| `src/components/Messages/TextComponents/CallToAction.jsx` & `CallToAction.scss` | modified | Adds optional entrance animation props (`animate`, `staggerOffset`, `staggerMs`, `durationMs`), enforces `isValidCtaUrl(url)` guard, and applies `grow-in` (`scale(0.94) -> 1`, `opacity: 0 -> 1`) CSS animation + `prefers-reduced-motion` override. |
| `src/views/ListMessage.jsx` & `ListMessage.scss` | modified | Accepts optional `animateEntrance` prop, computes list-item stagger via `computeListItemStaggerMs(options.length)` (`180ms` each, `min(40, 120 / (n - 1))` ms interval, `<= 300ms` total; `0ms` under reduced motion), applies `pop-in` to option items, and guards the Send button against double-submit. |
| `src/styles/animations.scss` | modified | Adds reusable keyframes `weni-component-pop-in` (`translateY(6px) -> 0`, `opacity: 0 -> 1`), `weni-component-grow-in` (`scale(0.94) -> 1`, `opacity: 0 -> 1`), and `weni-skeleton-shimmer` (`translateX(-100%) -> translateX(100%)`), scoped under `.weni-widget` by `postcss-prefix-selector`. |
| `src/i18n/locales/en.json` | modified | Adds `streaming_components` English source keys only (`cta_available`, `list_available`, `list_available_with_count`, `quick_replies_available`). Crowdin-managed locale files (`pt.json`, `es.json`, `ro.json`) remain untouched. |
| `package.json` | modified | Bumps `@weni/webchat-service` peer dependency from `1.21.0` to the new MINOR version exposing `componentHints`, `streamPhase`, and `cta_message` history parity (`AD-005`). |
| `src/dev/simulateComponentStreams.ts` | new | Development-only scenario definitions and timed frame-replay runner emitting `socket-stream-frames.schema.json` sequences (`typing_start`, `stream_start`, `stream_component_hint`, `{ v, seq }`, `stream_text_end`, `stream_component`, `stream_end`) via `window.WebChat.simulateMessageReceived` so `src/index.jsx` stays concise. Never imported by `src/index.js` or `src/standalone.jsx`. |
| `src/index.jsx` | modified | Adds development-only debug buttons inside `#actions` (alongside `simulate-whatsapp-coupon-opt-in` and `simulate-streamed-rationale`) wired to `src/dev/simulateComponentStreams.ts` to manually exercise streaming component scenarios in `npm run dev`. |
| `test/__mocks__/@weni/webchat-service.js` | modified | Adds helpers to emit streaming message updates (`streamPhase`, `componentHints`, `list_message`, `cta_message`, `quick_replies`) and simulate disconnect completion for flow tests. |

### Flow

#### 1. Main Flow (Streamed Response With Early Hint)

1. `@weni/webchat-service` emits `message:received` / `message:updated` with `status: 'streaming'`, `streamPhase: 'streaming_text'`, and `componentHints: [...]` (validated at the boundary in `componentStreaming.ts`; malformed hints are discarded with a PII-free `console.warn`).
2. `MessagesList` renders the row through `StreamedMessageItem` with `isLastMessage = (lastMessage?.id === message.id)`.
3. `StreamedMessageItem` computes `isTextStreaming = message.status === 'streaming' && (message.streamPhase === undefined || message.streamPhase === 'streaming_text')` and passes `{ text: message.text || '', isStreaming: isTextStreaming }` to `useStreamingBuffer`.
4. `useComponentStreamLifecycle` records `wasObservedStreamingRef.current = true` on mount/update while `status === 'streaming'`. Because `isBuffering || isTextStreaming` is true (or hinted components are not yet complete), the lifecycle phase is `'skeleton'`:
   - `ComponentSkeleton` renders in fixed order (`list_message`, `cta_message`, `quick_replies`) inside the exact slot of each real component (`.weni-list-message`, `.weni-call-to-action`, `.weni-messages-list__message--quick-replies`).
   - Real components are NOT mounted while `isBuffering || isTextStreaming` is true (BD-001).
   - If the shopper is near the bottom (`isNearBottomRef.current === true`), `onWordRevealed` keeps the list scrolled to the bottom; if the shopper scrolled up, scroll position is untouched (FR-036).
5. When `stream_text_end` (`streamPhase: 'awaiting_components'`) or `stream_end` (`status: 'delivered'`, `streamPhase: 'completed'`) arrives, `isTextStreaming` becomes `false`. `useStreamingBuffer` finishes revealing any queued words and sets `isBuffering = false` (caret disappears).
6. **Readiness gate & 10-second timeout**:
   - A hinted component is **ready** when its authoritative payload exists on `message` (`list_message` with non-empty `list_items` and `button_text`; `cta_message` with `display_text` and `isValidCtaUrl(url)`; `quick_replies` with non-empty array).
   - If all hinted components are ready (or `streamPhase === 'completed'` and at least one real component exists — including the no-hint fallback BD-008), the lifecycle transitions immediately from `'skeleton'` to `'entering'`.
   - If text has finished (`!isBuffering && !isTextStreaming`) and at least one hinted component is still pending (e.g., CTA URL delayed 1.5s, or textless response after hint arrival per FR-028), skeletons remain visible and a single `10_000ms` timer starts (cancelled if text deltas subsequently arrive on a previously textless message, then restarted once text ends).
   - When the `10_000ms` timer expires, unresolved hinted types are added to `timedOutTypes`, their skeletons disappear silently (no UI error, structured `console.warn`), and any already-complete sibling components in the same message transition together to `'entering'` (FR-011, FR-026).
   - If `stream_end` or WebSocket disconnect clears `componentHints` with no delivered components (FR-012), skeletons unmount immediately and the revealed text stays intact with no error UI.
7. **Unified staggered entrance (`'entering'` -> `'ready'`)**:
   - The hook builds the ordered button list from the **authoritative** delivered components (`list_message`, `cta_message`, `quick_replies` — real payloads always override hints per FR-020), computing total count `n`, `staggerMs = computeComponentStaggerMs(n)`, and `totalMs = prefersReducedMotion ? 0 : computeSequenceDurationMs(n, staggerMs)` (strictly `<= 300ms`).
   - Skeletons unmount and real components mount in the same slots with `disabled={true}` (non-clickable, non-focusable) and inline CSS animation variables (`--weni-enter-duration`, `--weni-enter-delay`) — the only runtime inline styles, permitted by Constitution XIII.
   - After `totalMs` (immediate `0ms` when `prefersReducedMotion` is true), the lifecycle transitions to `'ready'`.
8. **Activation & polite announcement**:
   - Interactive state is `isInteractive = phase === 'ready' && isLastMessage && !hasUserSubmitted`.
   - If `isInteractive` becomes true upon reaching `'ready'`, `StreamedMessageItem` enqueues one localized announcement per delivered component in display order (`list_message` -> `cta_message` -> `quick_replies`) into `ComponentAnnouncementRegion` (`aria-live="polite"`), without calling `.focus()`.
   - For `list_message`, `item_count` (when present as a positive integer) selects `streaming_components.list_available_with_count`; when absent, it selects `streaming_components.list_available` (AD-006, FR-019, FR-038).
   - For `cta_message`, `streaming_components.cta_available` interpolates `display_text` only — never `url`.
   - If the shopper sent a message or a new assistant response started before `'ready'` (FR-031, FR-032), `isLastMessage` is `false`, so components stay disabled and no activation announcement is emitted.

#### 2. Continuity, Sub-Views, and History Flow (BD-007, FR-029..FR-034)

- **History / reload / reconnect / "Use here" / completed while chat closed or on a sub-view**: When `StreamedMessageItem` mounts and `message.status !== 'streaming'` (either `streamPhase === undefined` or `streamPhase === 'completed'`), `useComponentStreamLifecycle` initializes directly in `phase = 'ready'` with `animate = false` and skips announcement. No skeleton and no entrance animation run; components are immediately active if `isLastMessage` is true.
- **In-progress stream when reopening chat or returning from a sub-view**: Because `Chat.jsx` unmounts `MessagesList` while closed or on a sub-view, returning remounts `StreamedMessageItem` while `message.status === 'streaming'` is still live in `ChatContext`. The hook initializes in `'skeleton'` (resuming from current `message.text` and `message.componentHints`) and completes normally when text and components finish.
- **Sub-view isolation**: Incoming `componentHints`, `streamPhase`, and component updates only mutate `StateManager.messages`; `ChatContext.pageHistory` is never modified, so active sub-views (`Cart`, `ProductCatalog`, `ProductDetails`, `ListMessage`) are never interrupted or closed (FR-033).
- **Opening `views/ListMessage`**: Clicking an active `ListMessage` button calls `setCurrentPage({ view: 'list-message', title: buttonText, props: { options, animateEntrance: true } })`. `views/ListMessage` renders options with `computeListItemStaggerMs(options.length)` (`180ms` each, `min(40, 120 / (n - 1))` ms stagger, `<= 300ms` total; `0ms` under `prefers-reduced-motion`). Submitting sends the selected option, closes the list (`goBack()`), and the newly appended outgoing message disables the original `ListMessage` trigger button.

#### 3. Development-Only Socket Stream Simulation (`src/index.jsx`)

- Located strictly in the Vite dev harness (`src/index.jsx` + `src/dev/simulateComponentStreams.ts`), never imported by `src/index.js` (library build) or `src/standalone.jsx` (UMD bundle).
- Follows the exact `simulate-streamed-rationale` pattern: opens the chat (`window.WebChat.open()`), generates a unique `id`, and replays timed WebSocket wire frames matching `contracts/messages/socket-stream-frames.schema.json` through `window.WebChat.simulateMessageReceived(...)`.
- Debug buttons cover the key manual-testing scenarios:
  - **Streamed quick replies (3 options, early hint)** and **6 options (multi-line wrap)**
  - **Streamed list message (known `item_count`)** and **unknown `item_count`**
  - **Streamed CTA (ready URL)** and **delayed URL (`stream_text_end` -> 1.5s wait -> `stream_component` -> `stream_end`)**
  - **Streamed multi-component (`list_message` + `cta_message` + `quick_replies`)**
  - **Edge cases**: mid-stream hint (~60% text), hint without labels (`120px`/`210px`), no-hint fallback (`BD-008`), and undelivered component timeout (`stream_text_end` without `stream_component` to observe the 10s skeleton removal).

### Rejected Alternatives

- **Offscreen DOM measurement probe (`left: -9999px` + `getBoundingClientRect()`) as used in the HTML prototype**: Rejected because an offscreen probe detached from the message container's width constraint mismeasures wrapped 2-line labels on narrow/mobile viewports (violating SC-003 and User Journey 1 scenario 10) and forces synchronous layout reflows during streaming. In-flow `ComponentSkeleton` using `visibility: hidden` label text inside the exact button box model lets browser layout compute exact width and wrapped height natively across all 4 layouts (floating, fullscreen, mobile, embedded) and responsive resizes.
- **Replacing existing `FSButton` / `Button` styles with the prototype's custom blue pill buttons**: Rejected because it contradicts `BD-009` / `FR-040` ("o visual dos botões e da tela da lista MUST continuar como hoje").
- **Keeping `useStreamingBuffer` inside `MessageText.jsx` and trying to synchronize `QuickReplies` in `MessagesList.jsx` via sibling state/context**: Rejected because it splits one message's lifecycle across two components, complicates unified multi-component stagger counting (`BD-006`), and adds shared context churn. Extracting `StreamedMessageItem.tsx` gives each message one cohesive lifecycle owner while reducing complexity in `MessagesList.jsx`.
- **Adding new `ChatContext` state for streaming phases or component hints**: Rejected by Constitution XIV (chat/session state MUST come from `@weni/webchat-service` and MUST NOT be mirrored in context). Ephemeral UI animation state (`'skeleton' | 'entering' | 'ready'`, timeout flags) belongs strictly to the per-message hook.
- **Editing `pt.json` and `es.json` directly in the feature PR**: Rejected because it violates Constitution `Internationalization` and `.githooks/pre-commit` (`scripts/localization-lock.js`); Crowdin owns all non-English locale files.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `@weni/webchat-service` peer dependency (`package.json`) | bumped from `1.21.0` to new MINOR (`1.22.0` once published per `AD-005`) | minor | yes — additive fields (`componentHints`, `streamPhase`, `list_message.item_count`) and `cta_message` history fix |
| `@weni/webchat-template-react` package exports & standalone UMD bundle | new streaming component lifecycle UI behavior (skeletons, staggered entrance, polite announcements); no signature changes | minor | yes — purely additive UX; works gracefully when `componentHints` / `streamPhase` are omitted (`BD-008`) |
| `MessageText`, `QuickReplies`, `ListMessage`, `CallToAction`, `views/ListMessage` component props | additive optional animation/lifecycle props (`animate`, `staggerOffset`, `staggerMs`, `durationMs`, `animateEntrance`) | minor | yes — all new props are optional with non-animated defaults |
| `weni-` CSS classes (`.weni-component-skeleton`, `.weni-component-enter--pop`, `.weni-component-enter--grow`, `.weni-sr-only`) | added (scoped under `.weni-widget` by `postcss-prefix-selector`) | minor | yes — existing `weni-` classes and CSS custom properties are unchanged |
| `src/i18n/locales/en.json` (`streaming_components.*`) | added 4 source keys (`cta_available`, `list_available`, `list_available_with_count`, `quick_replies_available`) | minor | yes — `i18next` falls back to `en` until Crowdin merges `pt.json`/`es.json`, and permanently for `ro` |
| `window.WebChat` API & `init` options | unchanged (no merchant configuration per `BD-010`; dev simulation buttons live only in `src/index.jsx` and are excluded from production builds) | none | yes |

**Consumers affected**: Storefronts embedding `v3/webchat-latest.umd.js` or importing `@weni/webchat-template-react` receive the streaming behavior automatically once upgraded alongside the matching `@weni/webchat-service` MINOR. Because `CHANGELOG.md` does not exist yet (`TODO(CHANGELOG)`), the peer dependency bump and additive streaming behavior are documented in the GitHub release notes under "Added" and "Changed".

## Non-Functional Requirements

### Peak Load

Peak load occurs during seasonal retail campaign spikes (e.g., Black Friday shopping peak) across all Shopping Assistant storefronts simultaneously (`BD-010`). All skeleton rendering, stagger scheduling, reduced-motion checks, and `aria-live` announcements execute locally in the shopper's browser with zero additional network requests from `webchat-react`.

- Worst-case per-turn UI cost in this repository: 1 active `useComponentStreamLifecycle` timer (at most one `10_000ms` wait timer + one `<= 300ms` entrance timer per active streamed message), CSS-compositor-only entrance animations (`transform` + `opacity`) and shimmer (`transform`), and 0 forced layout reflows (`getBoundingClientRect` is never called).
- Memoized stagger/announcement derivations ensure frequent `delta` updates during long responses do not re-trigger entrance timers or recreate skeleton DOM nodes.

### Observability

- Structured, privacy-safe warnings via `console.warn` using the stable searchable prefix `[WebChat:ComponentStreaming]`:
  - Malformed `componentHints` entry discarded: `{ channelUuid, sessionId, messageId, componentType, reason: 'invalid_hint' }`
  - Incomplete or non-`http(s)` CTA URL blocked from rendering: `{ channelUuid, sessionId, messageId, componentType: 'cta_message', reason: 'invalid_cta_url' }`
  - 10-second component wait timeout expired: `{ channelUuid, sessionId, messageId, componentTypes, reason: 'component_timeout' }`
- **Correlation identifiers**: `messageId` (propagated from `nexus-ai` `msg_id` through `weni-webchat-socket` and `webchat-service`), plus `channelUuid` and `sessionId` read from `service` session context when available (Constitution III).
- **Strict PII exclusion**: Logs MUST NEVER include `message.text`, `labels`, `button_text`, `list_items`, `display_text`, or `cta_message.url` (Product Spec Privacy & Data Protection, Constitution III). No `console.log` statements ship in production. No new product telemetry or analytics events are created (`BD-011`).

### Failure Handling

This repository performs no direct HTTP or WebSocket calls (all transport is owned by `@weni/webchat-service`). External input failures cross the boundary via `StateManager` message updates:

- **Delayed component / CTA URL**: Bounded by an explicit `10_000ms` timeout (`COMPONENT_WAIT_TIMEOUT_MS`) starting when text finishes (`!isBuffering && !isTextStreaming`) or when a hint arrives on a textless response. On timeout, pending skeletons are removed silently, no error UI is shown, a structured `console.warn` is logged, and any already-complete sibling components enter immediately (`FR-011`, `FR-026`).
- **Stream ends or WebSocket disconnects without delivering hinted component**: `@weni/webchat-service` emits `status: 'delivered'`, `streamPhase: 'completed'`, `componentHints: undefined`. `useComponentStreamLifecycle` immediately unmounts skeletons, preserves revealed text, and shows no error UI (`FR-012`).
- **Malformed `componentHints` or partial/invalid CTA URL**: Validated at the `componentStreaming.ts` boundary; invalid entries are ignored with a structured `console.warn`, never throwing an unhandled render error and never exposing a partial CTA link (`FR-018`, `BD-004`).
- **Real components differ from hint (count or labels)**: Authoritative payloads on `message` replace the skeletons without error (`FR-020`).
- **Double click on QuickReply or ListMessage Send**: Guarded locally with immediate submission lock so duplicate outgoing messages cannot be sent before `StateManager` updates (`FR-023`, `FR-024`, Constitution XV).
- **Missing `window.matchMedia` (test/legacy environment)**: `usePrefersReducedMotion` defaults safely to `false` without throwing.
- **Retry policy**: Not applicable in `webchat-react` (no outbound propagation; retries live in `nexus-ai` -> `flows` and WebSocket reconnect lives in `@weni/webchat-service`).

### Security and Authorization

- **Trust boundary**: Incoming `Message` objects (`text`, `componentHints`, `quick_replies`, `list_message`, `cta_message`) arrive from `@weni/webchat-service` over the shopper's WebSocket session.
- **Boundary validation in `webchat-react`**:
  - Message markdown continues to be sanitized through `src/utils/sanitizeHtml.js` (DOMPurify) before `dangerouslySetInnerHTML` (Constitution II).
  - All component labels (`quick_replies`, `list_message.button_text`, `list_items[].title`, `cta_message.display_text`, `componentHints[].labels`) are rendered strictly as React text nodes (never via `dangerouslySetInnerHTML`).
  - `cta_message.url` is validated against `^https?://.+` (`isValidCtaUrl`) before mounting `CallToAction`, blocking `javascript:`/`data:` schemes and partial URLs (`BD-004`, `FR-018`). Links open with `target="_blank" rel="noopener noreferrer"`.
  - Screen-reader announcements interpolate `cta_message.display_text` only and never expose `cta_message.url` (Privacy & Data Protection).
- **Authorization & secrets**: No secrets exist in this frontend bundle. Session/conversation isolation (`client_id`/`channel_uuid`) is enforced server-side by `weni-webchat-socket` and `flows`. No new roles or permissions exist.

## Test Strategy

The inherited Product Spec defines four QA-validated success criteria (`SC-001` through `SC-004`, `BD-011`). Unit and integration tests in `webchat-react` prove every client-side invariant that underpins them:

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| `SC-001`: First content of a component response appears early during streaming without waiting for full component completion (`FR-001`..`FR-003`, `FR-008`) | `StreamedMessageItem.test.tsx` & `MessagesList.test.jsx`: with `status: 'streaming'`, `streamPhase: 'streaming_text'`, and `componentHints`, proves text renders word by word with caret and skeletons appear immediately on hint arrival (at 0% or mid-stream at 60%) while real components remain absent; text-only messages show zero skeletons. |
| `SC-002`: In 100% of cases, no component is clickable before the response is complete and the entrance animation finishes (`FR-001`, `FR-021`, `FR-022`, `NFR-002`) | `useComponentStreamLifecycle.test.ts` & `StreamedMessageItem.test.tsx`: fake-timer flow tests attempting `userEvent.click` during text buffering, during `awaiting_components` (delayed CTA URL), and during the `<= 300ms` `'entering'` window confirm buttons are `disabled`, click handlers never fire, CTA `<a>` omits `href` while disabled, and non-last messages stay disabled even after `'ready'` (including when shopper sends a message mid-stream per `FR-031` or another assistant message starts per `FR-022`). |
| `SC-003`: When hints include labels, swapping skeletons for real buttons preserves container structure, count, label sizing markup, and layout without shifting (`FR-004`..`FR-006`, `FR-020`, `NFR-003`) | `ComponentSkeleton.test.tsx` & `StreamedMessageItem.test.tsx`: proves each hinted item renders an in-flow `aria-hidden="true"` non-focusable skeleton inside the exact component container (`.weni-list-message`, `.weni-call-to-action`, `.weni-quick-replies`) containing the exact hidden sizing text (including multi-line labels), falls back to `120px` / `210px` when `labels` are omitted, and swaps 1:1 in place on entrance. Full cross-viewport pixel layout-shift verification (floating, fullscreen, mobile, embedded) is executed by QA per `BD-011`. |
| `SC-004`: When all content is received, components become clickable within `<= 300ms` after text ends (`FR-013`, `FR-014`, `NFR-001`, `NFR-002`) | `componentStreaming.test.ts`, `useComponentStreamLifecycle.test.ts`, & `src/views/ListMessage.test.jsx`: verifies exact math for `n = 1` (`180ms`), `n = 2` (`70ms` stagger, `250ms` total), `n = 3` (`60ms` stagger, `300ms` total), `n = 6` (`24ms` stagger, `300ms` total), `n = 20` (`<= 300ms` total), list items (`n = 1` -> `180ms`, `n = 9` -> `15ms` stagger, `300ms` total), and multi-component combined counts; verifies buttons transition from `disabled` to enabled at exact `totalMs` (`<= 300ms`) and immediately (`0ms`) under `prefers-reduced-motion`. |

**Flow coverage**:

- Quick reply base (3 options, 6 options, short text + 2 options), click sends message and immediately locks/disables all options (`FR-023`).
- List message with known `item_count` vs unknown `item_count`: trigger button entrance, opening `views/ListMessage` with staggered options (`FR-017`), selecting and sending closes view and disables trigger (`FR-024`), distinct screen-reader announcements (`FR-019`, `FR-038`).
- CTA with ready URL (`180ms` grow-in) vs delayed URL (`awaiting_components` hides caret while skeleton remains; enters when full `https://` URL arrives; `FR-009`, `FR-018`).
- Multi-component response (`list_message` + `cta_message` + `quick_replies`): fixed skeleton order, waits until all complete, unified stagger `<= 300ms`, sequential polite announcements in order (`FR-026`, `FR-038`).
- Degradation & edge flows: mid-stream hint (60%), hint without labels (`120px`/`210px`), no hint (`BD-008`/`FR-027`), textless component response (`FR-028`), real payload mismatch vs hint (`FR-020`), shopper message mid-stream (`FR-031`), human handoff completion (`FR-032`), scroll preservation when scrolled up (`FR-036`), keyboard focus and composer input draft untouched on activation (`FR-035`), reduced motion (`FR-037`), and continuity on mount for history/reload/closed-chat/sub-view return (`FR-029`, `FR-030`, `FR-033`, `FR-034`).

**Failure paths covered**:

- 10-second timeout after text end (and after hint on textless response) removes pending skeleton silently with structured `console.warn` (no PII) and lets complete sibling components enter (`FR-011`, `FR-026`).
- Stream ends or WebSocket disconnects mid-stream (`streamPhase: 'completed'`, `componentHints: undefined`): skeletons disappear immediately, partial text stays, no error UI (`FR-012`).
- Malformed `componentHints` payload or invalid/partial CTA URL (`javascript:alert(1)`, `https://`, missing scheme): discarded with structured `console.warn` without rendering a broken CTA or throwing.
- Double-click on `QuickReplies` and `views/ListMessage` Send button triggers `sendMessage` only once.
- Missing `window.matchMedia` falls back safely to reduced-motion off.
- Dev harness helper (`src/dev/simulateComponentStreams.ts`) has a colocated unit test verifying emitted frame sequences so Jest's `src/**/*.{ts,tsx}` 80% coverage gate remains satisfied without excluding paths.

**Stubbed at the boundary**:

- `@weni/webchat-service` via `test/__mocks__/@weni/webchat-service.js` (emitting live streaming state transitions and history messages).
- `react-i18next` via `test/__mocks__/react-i18next.js` (resolving keys from `src/i18n/locales/en.json`), plus inline mock where verifying `ro` -> `en` fallback.
- `window.matchMedia` stubbed per test to toggle `prefers-reduced-motion: reduce`.
- Jest fake timers (`jest.useFakeTimers()`) for word reveal, stagger completion, and `10_000ms` timeout verification. No real network or WebSocket connections.

## Rollout and Rollback

Following the Architecture Document *Delivery Sequence*:

1. **Prerequisite**: `flows` and `weni-webchat-socket` deploy additive changes first, and `@weni/webchat-service` publishes its MINOR release (`AD-005`, `AD-006`).
2. **Release & Crowdin window**: Merge this feature PR into `main` (updating `@weni/webchat-service` peer dependency and adding `streaming_components.*` keys to `src/i18n/locales/en.json` only). Wait for the automated Crowdin PR to deliver `pt.json` and `es.json` translations (`NFR-005`), then publish the MINOR release of `@weni/webchat-template-react` and the standalone UMD bundle.
3. **Pre-cutover QA**: QA runs baseline and post-change validation of `SC-001` through `SC-004` in staging across floating, fullscreen, mobile, and embedded layouts in `pt`, `en`, and `es` (`BD-011`).
4. **Activation**: `nexus-ai` enables gRPC streaming for `use_components=True` Shopping Assistant channels globally (no merchant configuration per `BD-010`).

**Rollback**:

- `webchat-react` can be rolled back independently to the previous MINOR bundle at any time: nothing is persisted by this change (`BD-007`), and the new `@weni/webchat-service` payload fields (`componentHints`, `streamPhase`) are additive and safely ignored by the previous widget version.
- If `nexus-ai` rolls back its `use_components=True` gRPC gate, the new `webchat-react` continues working without errors under the no-hint path (`BD-008`).

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| I. Version Control and Review | Delivered via PR to `main` passing `npm run lint`, `npm run typecheck`, Jest 80% coverage gate, and code-owner review. | none |
| II. Security and Secrets | Markdown remains sanitized via `src/utils/sanitizeHtml.js`; component labels render as React text; CTA URLs validated with `^https?://.+`; no secrets or new dependencies added. | none |
| III. Observability | Structured `console.warn` under `[WebChat:ComponentStreaming]` with `channelUuid`, `sessionId`, `messageId`, `componentType`, and `reason`; zero PII (`text`, `labels`, `url` never logged); no `console.log`. | none |
| IV. Versioned Contracts | MINOR release of `@weni/webchat-template-react` and explicit peer bump of `@weni/webchat-service`; all new props/classes/i18n keys are additive and backward compatible. | `CHANGELOG.md` does not exist yet (`TODO(CHANGELOG)`), so release changes and peer bump are recorded in the GitHub release notes. |
| V. Specification Traceability & No Silent Divergence | Opens with `## Inheritance from Product Spec` pinning `019-sa-components-streaming-v1` and `architecture.md` commit `fe00c1ce98126044f7b5770fb75d54aadc88d34d`; `Divergences: none`. | none |
| VII. Code as Documentation | All new code, types, comments, and spec documentation are in English; comments explain non-trivial invariants (e.g., why `isTextStreaming` excludes `awaiting_components` and why skeletons use hidden in-flow labels). | none |
| VIII. Type Safety | All new files (`componentStreaming.ts`, `usePrefersReducedMotion.ts`, `useComponentStreamLifecycle.ts`, `ComponentSkeleton.tsx`, `StreamedMessageItem.tsx`, `ComponentAnnouncementRegion.tsx`, `src/dev/simulateComponentStreams.ts`) are strict TypeScript with explicit types and zero `any`. Existing `.js`/`.jsx` files receive small targeted updates and keep updated `prop-types`. | none |
| IX. Single Responsibility | Lifecycle state machine, reduced-motion hook, pure timing/validation utils, skeleton component, announcement region, row coordinator, and dev stream scenarios are split into focused modules well under 350 lines. | `MessagesList.jsx` (432 lines) and dev harness `src/index.jsx` (466 lines) already exceed 350 lines. Extracting `StreamedMessageItem.tsx` and `src/dev/simulateComponentStreams.ts` keeps edits minimal; full refactor/TS migration of those files is out of scope. |
| X. Code Style & Formatting | Formatted with Prettier and verified with `npm run lint`; object maps replace `switch` statements in all new dispatch logic (e.g., announcement builders and skeleton variants). | none |
| XI. Naming Conventions | PascalCase for React component files/folders (`ComponentSkeleton.tsx`, `StreamedMessageItem.tsx`, `ComponentAnnouncementRegion.tsx`) and camelCase for hooks/utils (`useComponentStreamLifecycle.ts`, `usePrefersReducedMotion.ts`, `componentStreaming.ts`). | none |
| XII. Component Architecture | Reuses existing `FSButton`, `Button`, and `Icon` for all interactive components; extends styling via BEM classes/SCSS overrides rather than replacing shared components. | none |
| XIII. Styling, BEM & Design Tokens | Uses `weni-` BEM classes scoped under `.weni-widget` and existing tokens from `src/styles/variables.scss` (`$fs-color-main-0`, `$fs-border-color`, `$spacing-2`, `$fs-spacing-1`, `$fs-border-radius-pill`, `$border-radius-2`). Inline styles are restricted strictly to runtime-computed animation timing CSS variables (`--weni-enter-duration`, `--weni-enter-delay`). | Decorative animation offsets (`6px` translateY, `0.94` scale) and product-mandated fallback widths (`120px`, `210px`) have no spacing token and are documented as named constants/variables per Principle XIII. |
| XIV. State Management | Message, `componentHints`, and `streamPhase` remain owned exclusively by `@weni/webchat-service` via `ChatContext`/`useWeniChat`; only transient per-message animation state lives in local hook state. | none |
| XV. Async State Correctness | Explicit lifecycle states (`skeleton` -> `entering` -> `ready`), bounded `10_000ms` timeout, disconnect cleanup, and immediate double-click locks prevent contradictory states and duplicate sends. | none |
| Testing | Colocated `<name>.test.ts(x)` tests for all new modules and updated colocated tests for modified components, covering happy paths, edge cases, and failure paths with >=80% coverage across all four metrics. | Existing legacy `test/hooks/useStreamingBuffer.test.js` is updated in place per the constitution rule allowing maintenance of existing legacy tests. |
| Accessibility & Semantic HTML | `aria-hidden="true"` on skeletons, non-focusable `<span>` skeleton markup, disabled buttons excluded from Tab order, polite `aria-live="polite"` region without focus movement, and full `prefers-reduced-motion` support. | none |
| Performance | Compositor-only animations (`transform`, `opacity`), zero new npm dependencies, zero forced layout reflows, and memoized derivations during token streaming. | none |
| Internationalization | Only `src/i18n/locales/en.json` is modified; `pt.json`, `es.json`, and `ro.json` are untouched (Crowdin delivers `pt`/`es` post-merge; `ro` uses `en` fallback). | Covered by the constitution's documented project exception for Crowdin-managed translations. |
| Maintainability | All binding timing formulas, timeout limits, fallback widths, and component display order live in one source of truth (`src/utils/componentStreaming.ts`). | none |

## Implementation Decisions

- **In-flow hidden-label skeletons instead of offscreen DOM measurement**: `ComponentSkeleton` renders the hint label with `visibility: hidden` inside the exact CSS box model of the target button (`FSButton` for quick replies, `Button` with icon box for list trigger and CTA). This guarantees zero horizontal or vertical layout shift for both single-line and multi-line wrapped labels across all viewport sizes (including mobile) without `getBoundingClientRect()` reflows, while remaining invisible to screen readers (`aria-hidden="true"`) and non-focusable (`<span>`).
- **Per-message lifecycle coordinator (`StreamedMessageItem.tsx`)**: Lifting `useStreamingBuffer` and `useComponentStreamLifecycle` to a per-message wrapper lets `MessageText` (`ListMessage`, `CallToAction`) and the sibling `QuickReplies` container share the exact text-completion instant, the 10-second timeout, the unified `<= 300ms` stagger offset calculation, and the ordered activation announcements without duplicating state into `ChatContext`.
- **Guarding `MessagesList` auto-scroll on `messageGroups` updates**: Today `MessagesList.jsx` calls `scrollToBottom()` unconditionally whenever `messageGroups` changes, which would pull a scrolled-up shopper back to the bottom on every streaming update. Gating that auto-scroll on `isNearBottomRef.current` (while still auto-scrolling when the shopper sends a new outgoing message or opens the chat) aligns streaming updates with `FR-036`.
- **Strict last-message check for component activation**: Tightening `enableComponents` in `MessagesList.jsx` from `inLastGroup` to `lastMessage?.id === message.id` ensures that if a second assistant message starts in the same incoming direction group, components on the earlier message immediately disable (`FR-022`, `BD-003`).
- **Textless response 10-second timeout reset on late first delta**: When a hint arrives with `text === ''`, the 10-second timer starts immediately (covering pure component-only responses per `FR-028` / `FR-011`). If text deltas subsequently arrive, the timer cancels and restarts only after text buffering completes, avoiding premature skeleton removal during long text responses.
- **Sequential `aria-live="polite"` announcement queue**: When a message activates multiple component types (`list_message`, `cta_message`, `quick_replies`), `ComponentAnnouncementRegion` dispatches each announcement sequentially through the polite live region rather than overwriting synchronously in a single render, ensuring screen readers speak every component announcement in display order without moving focus (`FR-038`).
- **Preserving BD-005 design-reference values as CSS variables**: Easing (`cubic-bezier(0.2, 0.8, 0.2, 1)`), shimmer duration (`1.2s`), pop-in offset (`6px`), grow-in scale (`0.94`), and disabled-to-active transition (`150ms`) are defined as SCSS/CSS variables in `ComponentSkeleton.scss` / `animations.scss` so Design can tune them in Stage 3 with a single-file CSS edit and zero logic changes.

## Divergences

none
