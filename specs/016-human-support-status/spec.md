# Engineering Specification: Visible Human Support Status in Shopping Assistant

**Repository**: `webchat-react` — frontend

**Feature Branch**: `016-human-support-status`

**Created**: 2026-11-25

**Status**: Draft

## Inheritance from Product Spec

- Product Spec: Atendimento humano visível no Shopping Assistant (tag, marcos, horário, status de leitura e nome do atendente) — https://github.com/weni-ai/vtex-cx-experience-specs/blob/5dbf6b398115c695326e59d65ce7113a8acaa97d/specs/009-sa-human-support-status/spec.md
- Pinned version: commit `5dbf6b398115c695326e59d65ce7113a8acaa97d` (2026-11-24 amendment for Live Desk read confirmation; no tag exists yet on `vtex-cx-experience-specs`, pinned to exact commit SHA per Gate 0)
- Architecture doc: https://github.com/weni-ai/vtex-cx-experience-specs/blob/4f2c4b4906e7a53c53bdbb89dd75a0cedb492b27/specs/009-sa-human-support-status/architecture.md (commit `4f2c4b4906e7a53c53bdbb89dd75a0cedb492b27`; tag `009-sa-human-support-status/arch-v1` pending approval)
- Inherited binding decisions: `BD-001`, `BD-002`, `BD-003`, `BD-004`, `BD-005`, `BD-006`, `BD-007`, `BD-008`, `BD-009`, plus Architecture Decisions `AD-001`, `AD-002`, `AD-003`, `AD-004`, `AD-005`, `AD-006`, `AD-007`, `AD-009` (`binding`) and `AD-008` (`guidance`)
- Scope of this spec: Shopping Assistant widget UI (`@weni/webchat-template-react`) — rendering the header `"Human support"` tag across all chat views, centered start/end milestone badges, localized timestamps on all post-launch bubble/card messages with author-and-minute grouping, shopper delivery/read status icons (`pending`, `sent`, `delivered`, `read`, `error`), Live Desk agent first name on the first message of consecutive sequences, human agent typing indicator (`"{{name}} is typing"` / `"Agent is typing"`) with AI thinking-indicator suppression during human support, polite screen-reader announcements without focus movement, scroll/focus/sub-view stability, and English source i18n keys, gated behind `state.features.humanSupportStatus === true`
- Divergences: none

## Scope in This Repository

**This repository implements**:

- Consumption of the additive `@weni/webchat-service` state and `Message` contract (`contracts/messages/webchat-service-message.schema.json`):
  - `state.features.humanSupportStatus` (gates all UI elements together per `BD-006`, `AD-008`).
  - `state.humanSupport.active` (drives the header tag and suppresses `ThinkingIndicator` during human support).
  - `state.typingAuthor` (`{ type: 'human_agent', name?: string } | null`, drives the human agent typing label).
  - `Message.author` (`{ type: 'contact' | 'ai_agent' | 'human_agent', name?: string, id?: string }`), `Message.orderKey`, `Message.status` (`'pending' | 'sent' | 'delivered' | 'read' | 'error' | 'streaming'`), and `Message.type === 'human_support_event'` with `Message.humanSupportEvent` (`{ eventId, event: 'started' | 'ended', occurredAt }`).
- Preserving server-defined message and milestone ordering from `@weni/webchat-service` (`AD-002` item 4) in `useWeniChat.js` instead of re-sorting by client `timestamp` when `features.humanSupportStatus` is enabled.
- Header `"Human support"` green tag in `Header.jsx` / `Header.scss`, reusing `.weni-chat-header__tag` green styling (`$sl-color-green-3` / `$fs-fg-base`), visible across all chat views and sub-views (`Cart`, `ProductCatalog`, `ProductDetails`, `ListMessage`, `BackInStockNotify`, `WhatsappOffersOptIn`) while `humanSupport.active` is true, and suppressed whenever `config.showMode` is true (`Live` onboarding test or `Preview`, `FR-004`).
- Centered start (`success` green) and end (`neutral` gray) milestone badges reusing `FSBadge` (extended with a `neutral` variant), rendering `humanSupportEvent.occurredAt` formatted per locale, never collapsed with cart `conversation_status` notices or with each other (`FR-005`..`FR-009`), and excluded from closed-chat unread count and tooltip preview (`FR-036`, `BD-008`).
- Localized timestamp formatting in the shopper's device timezone (`en`: 12h `"2:32 PM"` / other day `"11/02 · 2:32 PM"`; `pt` and `es`: 24h `"14:32"` / other day `"02/11 · 14:32"`), shown below all post-launch bubble and card messages (`message.author` present) across AI mode, human support, onboarding `"Live"` test, and `"Preview"`, omitted on pre-launch messages (`author` absent), cart notices (`conversation_status`), and actively streaming/buffering AI responses (`FR-010`..`FR-016`, `AD-008`).
- Author-and-minute grouping in `useWeniChat.js` / `MessagesList.jsx` using `author.type` and opaque `author.id` (never rendered, `AD-005` item 5), showing timestamp (and status on the last outgoing message) only on the final message of each same-author, same-minute run, with `4px` (`$spacing-1`) vertical spacing within the same author turn and `16px` (`$spacing-4`) between different authors or milestones, matching the Stage 3 Figma designs (`hvsCX4Bx1R5OoiWFLASdjU`, nodes `10:3888`, `11:2482`, `12:4506`, `14:6002`, `14:7139`).
- Shopper message status icon row (`MessageMeta.tsx`) registering Material Symbols `check` and `done_all` alongside existing `schedule` and `error` in `src/utils/icons.js`, rendering `16px` high-contrast icons (`>= 3:1`, `NFR-003`) strictly driven by `message.status` (`AD-003` item 7) with accessible labels referencing the message's sent time (never the read time, `BD-003`).
- Live Desk agent first name header (`MessageAuthorName`) rendered at the top of the first message bubble/card of each consecutive run by the same `author.id`, truncated to a single line with ellipsis (`FR-025`..`FR-028`), never shown on AI agent messages, Live Desk system messages (`human_agent` without `name`), or closed-chat `Notification` previews (`FR-029`, `FR-030`, `FR-036`).
- Human agent typing indicator extending `TypingIndicator` into a horizontal row (`3-dots bubble` + `"{{name}} is typing"` / `"Agent is typing"` per Figma `SA/Typing` `8:168`), while suppressing `ThinkingIndicator` during active human support (`FR-031`..`FR-033`).
- Polite `aria-live="polite"` screen-reader announcements via the existing `ComponentAnnouncementRegion` for live start/end milestones and human agent typing transitions, without moving focus (`NFR-004`, `FR-038`).
- In-place status updates without triggering `scrollToBottom()` in `MessagesList.jsx` (`FR-039`), preserving composer focus, `inputDraft`, scroll position, and open sub-views (`FR-037`..`FR-039`).
- English source strings in `src/i18n/locales/en.json` only (Crowdin-managed `pt.json`, `es.json`, `ro.json` untouched per Constitution `Internationalization`).
- Updating `@weni/webchat-service` peer dependency in `package.json` to the MINOR release implementing `webchat-service-message.schema.json` and updating `test/__mocks__/@weni/webchat-service.js`.
- Development-only visual debug buttons in the local Vite harness (`src/index.jsx`, rendered inside `#actions` via `HUMAN_SUPPORT_SCENARIOS.map(...)` alongside `COMPONENT_STREAM_SCENARIOS`) backed by `src/dev/simulateHumanSupport.ts` that replay timed human support scenarios (transfer, queue delivery, bulk read, read-confirmation OFF, send failure, named/unnamed agent typing and handoff, other-day/same-minute grouping with cart notice and streaming, offline reconnect after close, and feature-OFF / pre-launch messages) for local manual and visual QA without a live backend. Strictly dev-environment only — never imported by `src/index.js` (library build) or `src/standalone.jsx` (UMD bundle).

**Out of scope here**:

- `chats-engine` & Live Desk front-end (owned by Engage): emitting `typing.start` heartbeat, `msg.read`, `room.update` on all close paths, and implementing the project-level read-confirmation setting (default ON, Moderador/Suporte only, eligibility tracking per `AD-009`, `FR-047`..`FR-053`).
- `mailroom` (owned by Engine): emitting `human_support_event` (`started`/`ended`), `message_status` (`delivered`/`read`), `typing_indicator` with `author`, and computing `author` (`first_name` + HMAC `ha_*` ID per `AD-005`).
- `courier` (owned by Experience): handling `human_support_event` and `message_status` actions for WWC, forwarding `author`, and storing shopper `message.id` as `external_id`.
- `weni-webchat-socket` (owned by Experience): validating/persisting `author`, `status`, milestones, and `order_key` in MongoDB, emitting `message_saved` and `human_support_enabled`, handling `get_human_support_state` (2s Flows timeout), and managing the channel rollout list (`AD-007`).
- `@weni/webchat-service` (owned by Experience): generating shopper `message.id`, ordering messages/milestones by `orderKey`, monotonic status transitions, `typingAuthor` 10-second expiration timer, `get_human_support_state` confirmation, `human_support:changed` event, and sending fixed `register.data.features.humanSupportStatus = true` (`AD-008`).
- `flows` (owned by Engine): serving `contact_has_open_ticket` for `get_human_support_state` (no code change, volume tracked externally).
- `nexus-ai` (owned by Nexus): AI handoff announcement message (unchanged per `BD-008`).
- Localization of `pt.json`, `es.json`, and `ro.json` (owned by Localization team via Crowdin post-merge).
- Unchanged widget surfaces per `BD-001` and `BD-008`: WhatsApp, composer placeholder text (`InputBox`), `VoiceMode` screen, floating `Launcher` button, closed-chat `Notification` preview copy/layout, unread counter badge, and send-failure UI (no `"Not sent · Try again"` text or retry action per `FR-023`).

**Depends on**:

- `@weni/webchat-service` MINOR release conforming to [`contracts/messages/webchat-service-message.schema.json`](https://github.com/weni-ai/vtex-cx-experience-specs/blob/4f2c4b4906e7a53c53bdbb89dd75a0cedb492b27/specs/009-sa-human-support-status/contracts/messages/webchat-service-message.schema.json):
  - Exposes `state.features.humanSupportStatus` (boolean), `state.humanSupport` (`{ active: boolean }`), and `state.typingAuthor` (`{ type: 'human_agent', name?: string } | null`).
  - Normalizes `Message.author`, `Message.orderKey`, `Message.status` (monotonic `sent < delivered < read`; `pending`/`error` local; server `status` present iff message belongs to human support per `AD-003` item 7), and `Message.type === 'human_support_event'` + `Message.humanSupportEvent`.
  - Maintains canonical item ordering in `state.messages` by `orderKey` (tie-broken by `_id`, legacy items by `timestamp`, local pending/error at the end).
  - Clears `isTyping` / `typingAuthor` after 10 seconds without a `typing_start` heartbeat or on incoming message from the agent (`AD-004`).
- Crowdin Localization PR delivering `pt.json` and `es.json` translations for the new `en.json` keys before QA validation (`SC-001`, `SC-002`) and general rollout (`BD-006`).
- Full backend and Live Desk readiness (`chats-engine` read-confirmation setting included) before enabling any channel in `weni-webchat-socket`'s allowlist (`BD-006`, `FR-053`).

## Current State

- `src/contexts/ChatContext.jsx` (880 lines) — subscribes to `service.on('state:changed', ...)` as single source of truth for `messages`, `connection`, `isTyping`, `isThinking`, `thinkingText`, `error`. Does not expose `state.features`, `state.humanSupport`, or `state.typingAuthor`. Its `handleMessageReceived` listener increments `unreadCount` and sets `tooltipMessage` for every `message:received` event while `!isChatOpen` without filtering out non-preview events like `human_support_event`.
- `src/hooks/useWeniChat.js` (81 lines) — re-sorts `context.messages` via `[...context.messages].sort((a, b) => a.timestamp - b.timestamp)` (which would break `AD-002` item 4 `orderKey` ordering) and groups consecutive messages solely by `direction` (`incoming` vs `outgoing`), so AI messages, different human agents, and milestones would be merged into the same group.
- `src/components/Header/Header.jsx` (135 lines) & `Header.scss` — renders back button (when `currentPage` is active), `ModeTag` (`weni-chat-header__tag--live` with `$sl-color-green-3: #AFF79E`, `weni-chat-header__tag--preview` with `$sl-color-orange-3`), cart button, fullscreen toggle, and close button. Rendered above `<ChatContent />` in `src/components/Chat/Chat.jsx`, so any header tag naturally persists across all sub-views.
- `src/components/Messages/MessagesList.jsx` (507 lines) & `MessagesList.scss` —
  - Renders `messageGroups`, collapsing runs of 2+ `conversation_status` messages into `"{{count}} items were added to cart"` via `FSBadge`. Has no handling for `human_support_event`.
  - Renders `<ThinkingIndicator>` whenever `isThinking` is true (taking precedence over `<TypingIndicator>`), with no suppression during human support.
  - Renders `<Icon name="error" size="small" color="fg-critical" />` inline inside `MessageContainer` for failed messages, and styles `status === 'pending'` text with `$semantic-colors-light-fg` via `.weni-messages-list__message--pending`.
  - Runs `scrollToBottom()` on every `messageGroups` reference change whenever `isNearBottomRef.current` is true (within `100px`), which would shift scroll on an in-place message status update.
  - Already mounts `<ComponentAnnouncementRegion announcements={announcements} />` (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) with sequential queuing and zero focus movement.
- `src/components/Messages/StreamedMessageItem.tsx` (201 lines) — coordinates `useStreamingBuffer` (`isBuffering`, `displayedText`), `MessageContainer`, `MessageText`, and `QuickReplies` for text/message rows. Currently does not render an agent author name or message metadata footer (timestamp + status).
- `src/components/Messages/MessageContainer.jsx` (34 lines) & `MessageContainer.scss` — renders `<section className="weni-message weni-message--{direction} weni-message--{type} ...">` around bubble content. `type` PropTypes does not yet need `human_support_event` if milestones render outside `MessageContainer` via `FSBadge`.
- `src/components/Messages/TypingIndicator.jsx` (20 lines) & `TypingIndicator.scss` — renders 3 animated dots without a bubble frame or text label.
- `src/components/common/FSBadge.jsx` (21 lines) & `FSBadge.scss` — supports only `type="success"` (`$fs-color-success-bkg: #E6F9EC`).
- `src/components/Notification/Notification.jsx` (45 lines) — renders closed-chat preview using `<Message message={message} componentsEnabled={true} />` directly (outside `MessageContainer`), which makes opt-in agent name rendering in `MessageContainer` naturally safe against leaking agent names into the closed-chat preview (`FR-036`).
- `src/utils/icons.js` (242 lines) — imports SVGs from `@material-symbols/svg-400/rounded/*`; already includes `schedule` and `error`, while `check.svg` and `done_all.svg` are present in `node_modules/@material-symbols/svg-400/rounded/` and not yet registered.
- `src/styles/variables.scss` — already defines `$sl-color-green-3: #AFF79E`, `$sl-color-blue-10: #0366DD` (`--sl-color-blue-10`), `$fg-base-soft: #707070` (`--fg-base-soft`), `$fg-critical: $red-500` (`--fg-critical`), `$sl-color-gray-1: #F5F5F5`, `$fs-fg-base: #1F1F1F`, `$fs-color-text: #171a1c`, `$fs-text-size-0: 12px`, `$fs-text-weight-semibold: 600`, `$spacing-1: 4px`, `$spacing-2: 8px`, `$spacing-3: 12px`, `$spacing-4: 16px`.
- `src/i18n/index.js` & `src/i18n/locales/en.json` — `i18next` initialized with `en`, `pt`, `es`, `ro` and `fallbackLng: 'en'`.
- `src/index.jsx` (487 lines) — local Vite development playground (`npm run dev`; not an entry point in `vite.config.js` library build or `vite.config.standalone.js` UMD build). Renders `#actions` debug buttons including `COMPONENT_STREAM_SCENARIOS.map(...)` (defined in `src/dev/simulateComponentStreams.ts` with `runComponentStreamScenario`), which drives timed scenario replays through `window.WebChat` and `service` with a dev-only state projection fallback when running ahead of a published `@weni/webchat-service` MINOR.
- `package.json` — pins `@weni/webchat-service` to `1.22.0`; strict TypeScript (`tsconfig.json`), `npm run typecheck`, `npm run lint`, and Jest (`>= 80%` coverage gate) are configured.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/utils/humanSupportStatus.ts` | new | Centralizes TypeScript types (`MessageAuthor`, `HumanSupportEvent`, `HumanSupportState`, `TypingAuthor`, `HumanSupportMessage`), payload validation with structured PII-free `console.warn`, author-key derivation (`getAuthorKey`), local minute-bucket grouping (`computeMessageDisplayMetadata` — determines `showAuthorName`, `showTimestamp`, `visibleStatus`), deterministic locale date/time formatter (`formatMessageTimestamp`: `en` 12h + `MM/DD`, `pt`/`es` 24h + `DD/MM`, device timezone), and status icon/aria-label object map (`STATUS_META_MAP`). |
| `src/components/Messages/MessageMeta.tsx` & `MessageMeta.scss` | new | Renders the below-bubble metadata row (timestamp + optional `16px` status icon with accessible `aria-label` using the message's sent time), left-aligned (`padding-left: 4px`) for incoming messages and right-aligned (`padding-right: 4px`) for outgoing messages, matching Figma `SA/Message` and `SA/Status` contrast (`>= 3:1`, `NFR-003`). |
| `src/components/Messages/HumanSupportMilestone.tsx` & `HumanSupportMilestone.scss` | new | Renders a centered start (`FSBadge type="success"`) or end (`FSBadge type="neutral"`) milestone pill with localized label and formatted `occurredAt` time (`FR-005`..`FR-009`), never collapsing with cart notices or adjacent milestones. |
| `src/components/common/FSBadge.jsx` & `FSBadge.scss` | modified | Extends `type` prop from `['success']` to `['success', 'neutral']` with `.weni-fs-badge--neutral` (`background-color: $sl-color-gray-1`, `color: $fs-color-text`, `border: 2px solid $white`, `padding: 5px 12px`, `min-height: 26px`) matching Figma `Badge` (`8:26` / `8:29`). |
| `src/utils/icons.js` | modified | Registers `check` (`@material-symbols/svg-400/rounded/check.svg?react` + filled) and `done_all` (`@material-symbols/svg-400/rounded/done_all.svg?react` + filled) for `sent`, `delivered`, and `read` status icons. |
| `src/contexts/ChatContext.jsx` | modified | Exposes `isHumanSupportFeatureEnabled` (`Boolean(state.features?.humanSupportStatus)`), `isHumanSupportActive` (`Boolean(state.humanSupport?.active)`), and `typingAuthor` (`state.typingAuthor ?? null`) directly from service `state` (no duplicated local state, Constitution XIV). Ignores `message?.type === 'human_support_event'` in `handleMessageReceived` so milestones never increment `unreadCount` or trigger closed-chat `tooltipMessage` (`FR-036`, `BD-008`). |
| `src/hooks/useWeniChat.js` | modified | When `isHumanSupportFeatureEnabled` is true: (1) preserves the canonical message order emitted by `@weni/webchat-service` (`AD-002` item 4, never re-sorting by browser `timestamp`), (2) groups consecutive items by author identity (`getAuthorKey`) while keeping each `human_support_event` milestone and `conversation_status` notice outside author message groups, and (3) computes per-message display metadata (`showAuthorName`, `authorName`, `showTimestamp`, `visibleStatus`) via `computeMessageDisplayMetadata`. Preserves existing behavior identically when `isHumanSupportFeatureEnabled` is false. |
| `src/components/Header/Header.jsx` & `Header.scss` | modified | Renders the green `"Human support"` tag (`<span className="weni-chat-header__tag weni-chat-header__tag--human-support">`) when `isHumanSupportFeatureEnabled && isHumanSupportActive && !config.showMode && !isBackInStockOnlyMode && !isConnectionClosed`, reusing `.weni-chat-header__tag` green tokens (`$sl-color-green-3`, `$fs-fg-base`). Never shown alongside `ModeTag` (`Live`/`Preview`, `FR-004`) or on an inactive superseded session (`AlreadyInUse`). |
| `src/components/Messages/MessageContainer.jsx` & `MessageContainer.scss` | modified | Adds optional `authorName` prop; when provided, renders `<span className="weni-message__author-name">{authorName}</span>` at the top of the bubble (`12px` SemiBold, `line-height: 16px`, single-line ellipsis, `margin-bottom: $spacing-1`). Because `Notification.jsx` does not use `MessageContainer`, closed-chat previews can never show an agent name (`FR-036`). |
| `src/components/Messages/StreamedMessageItem.tsx` | modified | Accepts optional `displayMeta?: MessageDisplayMetadata`, `isHumanSupportFeatureEnabled?: boolean`, and `hasTrailingCard?: boolean` from `MessagesList`. Passes `displayMeta.authorName` to the first rendered `MessageContainer`, hides `<MessageMeta>` while `isTextStreaming || isBuffering` (`FR-015`), and renders `<MessageMeta>` (using `displayMeta.visibleStatus`) beneath the bubble (or beneath `quick_replies` when present as part of the same turn, unless `hasTrailingCard` is true because `product_list`/`product_carousel` follows in `MessagesList`). Moves the `error` icon into `<MessageMeta>` when `isHumanSupportFeatureEnabled && message.author` is active (preserving legacy inline error icon otherwise). |
| `src/components/Messages/MessagesList.jsx` & `MessagesList.scss` | modified | Renders `human_support_event` groups via `<HumanSupportMilestone>`, applies `$spacing-1` (`4px`) intra-group spacing for grouped author turns when the feature is active, passes `displayMeta` to `StreamedMessageItem` and non-streamed message rows (including `product_list` and `product_carousel` cards so the meta row sits below the last card of that message), suppresses `ThinkingIndicator` when `isHumanSupportFeatureEnabled && isHumanSupportActive` (`FR-033`), passes `typingAuthor` label to `TypingIndicator`, enqueues live milestone and typing-start announcements into `ComponentAnnouncementRegion` without moving focus (`NFR-004`), and guards the auto-scroll `useEffect` so in-place message status changes never invoke `scrollToBottom()` (`FR-039`). |
| `src/components/Messages/TypingIndicator.jsx` & `TypingIndicator.scss` | modified | Accepts optional `label` prop (string). When provided, renders the horizontal `SA/Typing` layout (`gap: $spacing-2`, incoming bubble with 3 animated dots + `<span className="weni-typing-indicator__label">{label}</span>` in `12px` Regular `$fg-base-soft`). When omitted (AI mode / feature OFF), renders the existing 3-dot indicator unchanged. |
| `src/types/ambient.d.ts` | modified | Adds ambient TypeScript declarations for `FSBadge` (`children`, `type`, `className`), `IconProps['aria-hidden']`, `TypingIndicator`, `useWeniChat` additions, `MessageContainer` (`authorName`), and `<footer` / `<time` HTML elements. |
| `src/i18n/locales/en.json` | modified | Adds the `human_support` namespace with 10 English source keys (`header_tag`, `milestone_started`, `milestone_ended`, `typing_with_name`, `typing_anonymous`, `status_sending`, `status_sent`, `status_delivered`, `status_read`, `status_error`). `pt.json`, `es.json`, and `ro.json` are not modified. |
| `package.json` | modified | Bumps `@weni/webchat-service` peer dependency from `1.22.0` to the new MINOR version implementing `webchat-service-message.schema.json`. |
| `src/dev/simulateHumanSupport.ts` | new | Development-only `HUMAN_SUPPORT_SCENARIOS` array (`{ id, buttonId, label, steps }`) and `runHumanSupportScenario` runner mirroring `src/dev/simulateComponentStreams.ts`, replaying timed `humanSupportStatus` scenarios through `window.WebChat` / `service` (including a dev-only state projection fallback for local testing before `@weni/webchat-service` MINOR is installed). Never imported by `src/index.js` or `src/standalone.jsx`. |
| `src/index.jsx` | modified | Maps `HUMAN_SUPPORT_SCENARIOS` into visual debug buttons inside `#actions` (directly alongside `COMPONENT_STREAM_SCENARIOS.map(...)`), strictly in the Vite dev environment (`npm run dev`). |
| `test/__mocks__/@weni/webchat-service.js` | modified | Adds `features`, `humanSupport`, `typingAuthor` to mock state plus helpers to emit milestones, status transitions, typing author updates, and history loads in unit/flow tests. |

### Flow

#### 1. Connection, Feature Gate, and History Continuity (`AD-002`, `AD-007`, `AD-008`, `FR-034`, `FR-035`, `FR-046`)

1. `@weni/webchat-service` connects with `register.data.features.humanSupportStatus = true` and updates `state` via `state:changed` once `ready_for_message` arrives (`state.features.humanSupportStatus`, `state.messages`, `state.humanSupport.active` deduced from history) and again when `human_support_state` confirms `active` from Flows.
2. `ChatContext` reads `state.features?.humanSupportStatus`, `state.humanSupport?.active`, and `state.typingAuthor` directly from `state`.
3. If `isHumanSupportFeatureEnabled` is `false`, `webchat-react` renders zero new UI elements: no header tag, no milestones, no timestamps, no status ticks, no agent names, no human typing label, and `ThinkingIndicator` / timestamp sorting remain identical to today (`BD-006`).
4. When `isHumanSupportFeatureEnabled` is `true`:
   - `MessagesList` records the set of `human_support_event` `eventId`s already present on initial mount (and on `history:loaded`) in a `seenMilestoneIdsRef` so historical milestones rendered on reload, reopen, "Use here", or sub-view return render silently without re-announcing via `aria-live` (`FR-034`, `NFR-004`).
   - Messages without `message.author` (pre-launch messages per `AD-008` item 4) render without timestamp, name, or status (`FR-010`).
   - Open tickets active at launch without a start milestone (`FR-046`) show the green header tag immediately once `state.humanSupport.active` becomes `true`, and new shopper messages display status icons as soon as `message_saved` attaches `status: 'sent'`.

#### 2. Transfer, Queued Delivery, Bulk Read, and Read-Confirmation OFF (`FR-001`..`FR-024`, `FR-047`..`FR-051`)

1. `@weni/webchat-service` appends a `human_support_event` (`event: 'started'`, `occurredAt`) and sets `state.humanSupport.active = true`.
2. `Header` immediately displays the green `"Human support"` pill (`!config.showMode`), persisting across all sub-views (`FR-001`, `FR-002`).
3. `useWeniChat` keeps the milestone in its own standalone group at the exact server `orderKey` position (after the AI transfer message, never merged with cart notices). `MessagesList` renders `<HumanSupportMilestone>` (`FSBadge type="success"`, `"Forwarded to human agent · {{time}}"`) and enqueues its localized text into `ComponentAnnouncementRegion` (`aria-live="polite"`, no focus movement, `NFR-004`).
4. When the shopper sends messages:
   - While `status === 'pending'`, `MessageMeta` renders the formatted message time alongside the `schedule` clock icon (`#707070`, `aria-label="Sending"`), and bubble text uses `$semantic-colors-light-fg`.
   - When `message_saved` attaches `status: 'sent'`, `MessageMeta` updates in place to single `check` (`#707070`, `aria-label="Sent at {{time}}"`).
   - When `message_status` (`delivered`) arrives (including while queued), `MessageMeta` updates in place to `done_all` (`#707070`, `aria-label="Delivered · sent at {{time}}"`).
   - When the project's Live Desk read confirmation is enabled (`AD-009`) and `message_status` (`read`) arrives for one or a batch of messages, `MessageMeta` updates each affected message in place to blue `done_all` (`#0366DD`, `aria-label="Read · sent at {{time}}"`). When read confirmation is disabled, `read` never arrives and messages remain `delivered` with zero extra UI or notice (`FR-048`, `FR-051`).
   - When `status === 'error'`, `MessageMeta` renders the red `error` icon (`#E53E3E`) alongside the timestamp, with no error text and no retry button (`FR-023`).
   - Because in-place `status` updates do not change the list's item count or trailing item ID, `MessagesList` does not invoke `scrollToBottom()` (`FR-039`), and `InputBox` focus and `inputDraft` remain untouched (`FR-038`).

#### 3. Agent Typing, Agent Name, Grouping, and Closing (`FR-010`..`FR-016`, `FR-025`..`FR-033`)

1. While `isHumanSupportActive` is true, `MessagesList` suppresses `ThinkingIndicator` (`FR-033`).
2. When `isTyping` is true and `typingAuthor?.type === 'human_agent'`, `MessagesList` renders `<TypingIndicator label={...} />` (`"{{name}} is typing"` when `typingAuthor.name` is non-empty, `"Agent is typing"` otherwise, `FR-031`). On the hidden-to-visible transition (or when the agent name changes), `MessagesList` enqueues the label into `ComponentAnnouncementRegion` without moving focus (`NFR-004`). Subsequent 5-second heartbeats for the same agent do not re-announce.
3. When the agent sends messages (`author: { type: 'human_agent', name, id }`):
   - `useWeniChat` groups consecutive messages with the same `getAuthorKey(author)` into one author group (`4px` gap between bubbles).
   - `computeMessageDisplayMetadata` sets `showAuthorName = true` ONLY on the first message of each consecutive sequence from the same `author.id` (when `author.name` is non-empty), and `showTimestamp = true` ONLY on the last message of each consecutive same-author, same-local-minute sub-run (`FR-014`, `FR-026`).
   - If another agent takes over (different `author.id`, even with the same first name), a new author group begins (`16px` gap) and displays the new agent's first name (`FR-026`, `AD-005` item 5).
   - If the agent has no configured name or it is a Live Desk system message (`author: { type: 'human_agent' }` without `name`), no name header renders (`FR-027`, `AD-005` item 3).
   - If the chat is closed when the agent responds, `Notification` renders `<Message>` without `MessageContainer` / `authorName`, so the closed-chat preview and unread counter stay unchanged and omit the agent's name (`FR-036`, `BD-008`).
4. When the Live Desk closes the room (or closes it in queue):
   - `@weni/webchat-service` appends `human_support_event` (`event: 'ended'`, `occurredAt`) and sets `state.humanSupport.active = false`.
   - `Header` removes the `"Human support"` tag immediately (including while the shopper is on a sub-view, `FR-003`, `FR-037`).
   - `MessagesList` renders `<HumanSupportMilestone>` (`FSBadge type="neutral"`, `"Human support ended · {{time}}"`) and announces it politely (`NFR-004`).
   - All messages sent during the ended session retain their last reached `status` (`FR-021`). Subsequent shopper messages in AI mode have no server `status`, so they display only the timestamp (plus the clock while locally pending and red error icon on failure, `FR-022`, `FR-023`).

#### 4. Development-Only Visual Debug Scenarios (`HUMAN_SUPPORT_SCENARIOS` in `src/index.jsx`)

- Located strictly in the Vite dev playground (`src/index.jsx` + `src/dev/simulateHumanSupport.ts`) and never imported by `src/index.js` (library build) or `src/standalone.jsx` (standalone UMD bundle), keeping production bundles completely clean (`BD-005`, `BD-008`).
- Mirrors `COMPONENT_STREAM_SCENARIOS` / `runComponentStreamScenario` (`src/dev/simulateComponentStreams.ts`): exports a typed `HUMAN_SUPPORT_SCENARIOS` list (`{ id, buttonId, label, steps }`) rendered via `HUMAN_SUPPORT_SCENARIOS.map(...)` inside `#actions` in `src/index.jsx`.
- Opens the chat (`window.WebChat.open()`) and replays timed state/frame steps matching `contracts/messages/webchat-service-message.schema.json` (with a dev-only `state:changed` projection fallback so every visual state can be verified in `npm run dev` even before the matching `@weni/webchat-service` MINOR is published).
- Visual debug buttons cover all five Figma user journeys:
  - **Transfer & close lifecycle (US 1)**: AI mode with timestamps -> AI handoff -> green `"Human support"` header tag + start milestone -> agent reply (`Julia`) -> shopper reply (`read`) -> end milestone + header tag removed -> return to AI mode (`FR-001`..`FR-008`).
  - **Queue delivery & bulk read (US 2)**: Start milestone -> 3 shopper messages stepping `pending` -> `sent` -> `delivered` in queue -> bulk `read` transition updating all 3 in place without scroll jump (`FR-017`..`FR-021`, `FR-039`).
  - **Read confirmation OFF (US 2)**: Active human support -> shopper messages cap at `delivered` while agent replies, with zero notice or indicator of the Live Desk setting (`FR-048`, `FR-051`).
  - **Send failure during human support (US 2)**: Active human support -> shopper message failing (`status: 'error'`) with red error icon next to timestamp and no retry text/action (`FR-023`).
  - **Named agent typing, grouped messages & handoff (US 3)**: `"Julia is typing"` (with `ThinkingIndicator` suppressed) -> 2 consecutive same-minute `Julia` messages (name on 1st only, timestamp on 2nd only) -> transfer to second agent (distinct `author.id`, no new milestone) -> long first-name ellipsis truncation (`FR-025`..`FR-033`).
  - **Unnamed agent & Live Desk system message (US 3)**: `"Agent is typing"` fallback + `human_agent` message without `name` (`FR-027`, `FR-031`, `AD-005`).
  - **Other-day history, grouping, cart notice & streaming (US 4)**: Yesterday timestamps (`MM/DD · h:mm A` / `DD/MM · HH:mm`), consecutive same-minute shopper/AI groups, cart `conversation_status` badge (no timestamp, never collapsed with milestones), and streaming AI message revealing timestamp only on completion (`FR-009`..`FR-016`).
  - **Offline pending & reconnect after close (US 5)**: `ConnectionStatusBanner` (`reconnecting`) + offline shopper message in `pending` (muted text + clock) -> reconnect clears banner, updates status to `delivered`, removes header tag, and appends end milestone with original `occurredAt` (`FR-035`).
  - **Feature OFF / pre-launch messages**: Disables `features.humanSupportStatus` and renders pre-launch messages without `author` to visually confirm legacy fallback (`FR-010`, `AD-008`).

### Rejected Alternatives

- **Keeping `useWeniChat.js`'s `.sort((a, b) => a.timestamp - b.timestamp)`**: Rejected because `AD-002` item 4 requires server-defined `orderKey` ordering so live and reloaded positions match (`FR-024`, `FR-034`) and milestones (`occurredAt` from ticket) never jump ahead of the AI transfer announcement (`FR-005`).
- **Deriving shopper status visibility in `webchat-react` from milestone positions**: Rejected by `AD-003` item 7 — paginated history windows and launch-open tickets (`FR-046`) may lack a preceding `started` milestone; presence of a server `status` (`sent` | `delivered` | `read`) is the authoritative contract.
- **Using `Date.prototype.toLocaleTimeString` / `toLocaleDateString` directly for `FR-012` / `FR-013`**: Rejected because ICU output varies across browsers and Node/jsdom builds (e.g., `"2:32 pm"` vs `"2:32 PM"`, `"02/11"` vs `"2/11"`). A dedicated pure formatter using local `Date` getters guarantees exact format compliance (`"2:32 PM"`, `"14:32"`, `"11/02 · 2:32 PM"`, `"02/11 · 14:32"`) in every browser and test environment.
- **Rendering the agent's first name inside `MessageText.jsx` directly**: Rejected because `Notification.jsx` reuses `Message` -> `MessageText` for closed-chat previews, which would violate `FR-036`, `BD-008`, and `Privacy & Data Protection` by leaking the agent name into the closed-chat preview, and would also omit agent names on media/order/product messages. Passing `authorName` explicitly to `MessageContainer` covers every message type in the list while excluding `Notification` by construction.
- **Duplicating `humanSupport` or `typingAuthor` into local `ChatContext` state via `human_support:changed` listener**: Rejected by Constitution XIV (`ChatContext` already receives `state:changed` from `@weni/webchat-service` as the single source of truth).
- **Adding a separate `aria-live` region for milestones/typing**: Rejected because `MessagesList` already mounts `ComponentAnnouncementRegion` (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) with sequential non-dropping queuing; reusing it avoids competing live regions.
- **Editing `pt.json` and `es.json` in this PR**: Rejected by Constitution `Internationalization` and `.githooks/pre-commit` (`scripts/localization-lock.js`); Crowdin owns all non-English locale files.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `@weni/webchat-service` peer dependency (`package.json`) | bumped from `1.22.0` to new MINOR (`1.23.0` once published per `webchat-service-message.schema.json`) | minor | yes — additive `Message` fields (`author`, `orderKey`, `humanSupportEvent`, `type: 'human_support_event'`), additive `state` fields (`features.humanSupportStatus`, `humanSupport`, `typingAuthor`), and `human_support:changed` event |
| `@weni/webchat-template-react` package exports & standalone UMD bundle | new human support UI (tag, milestones, timestamps, status icons, agent name, agent typing indicator) gated by `state.features.humanSupportStatus` | minor | yes — inert when `features.humanSupportStatus` is absent/false; no export signature changes |
| `FSBadge` component prop `type` | extended from `'success'` to `'success' \| 'neutral'` | minor | yes — existing `'success'` usage unchanged |
| `MessageContainer` component prop `authorName` | added optional `authorName?: string` | minor | yes — omitted renders identically to today |
| `TypingIndicator` component prop `label` | added optional `label?: string` | minor | yes — omitted renders existing 3-dot indicator |
| `weni-` CSS classes (`.weni-chat-header__tag--human-support`, `.weni-fs-badge--neutral`, `.weni-message__author-name`, `.weni-message-meta`, `.weni-human-support-milestone`, `.weni-typing-indicator__bubble`, `.weni-typing-indicator__label`) | added (scoped under `.weni-widget` by `postcss-prefix-selector`) | minor | yes — existing `weni-` classes and CSS custom properties are unchanged |
| `src/i18n/locales/en.json` (`human_support.*`) | added 10 English source keys | minor | yes — `i18next` falls back to `en` until Crowdin merges `pt.json`/`es.json`, and for `ro` |
| `window.WebChat` API & `init` options | unchanged (`BD-005`, `BD-008`; dev simulation controls live only in `src/index.jsx` and are excluded from production builds) | none | yes |

**Consumers affected**: Storefronts loading `v3/webchat-latest.umd.js` or importing `@weni/webchat-template-react` receive the human support UI automatically once upgraded alongside the matching `@weni/webchat-service` MINOR and once their channel is enabled in `weni-webchat-socket`'s allowlist (`AD-007`). Because `CHANGELOG.md` does not exist yet (`TODO(CHANGELOG)`), the peer dependency bump and additive UI behavior are documented in the GitHub release notes under "Added" and "Changed".

## Non-Functional Requirements

### Peak Load

Per the Architecture Document *Binding Non-Functional Requirements* (production baseline measured 2026-11-23, 30-day Mimir / 24-hour Loki windows, ≈ 29,900 concurrent socket connections peak; up to ≈ 700/min new actions across all WWC channels: ≈ 20/min start/end milestones, ≈ 135/min `sent`/`delivered`/`read` updates with up to 200 IDs per batch read, ≈ 370/min typing heartbeats):

- `webchat-react` executes strictly in the shopper's browser for their single conversation, making zero additional HTTP or WebSocket calls.
- Per-conversation worst-case burst is a bulk `read` update marking up to 200 queued messages at once (`FR-019`, `NFR-001`) plus at most 1 typing heartbeat every 5 seconds (`AD-004`).
- `useMemo` in `useWeniChat.js` computes grouping and `computeMessageDisplayMetadata` in `O(n)` over loaded messages without DOM measurement or forced reflows, keeping UI render time well within the `<= 0.5s` socket-to-widget budget of `NFR-001` (`P95 <= 2s` end-to-end).

### Observability

- Structured, privacy-safe warnings via `console.warn` using the stable searchable prefix `[WebChat:HumanSupportStatus]`:
  - Malformed `human_support_event` payload discarded: `{ channelUuid, sessionId, messageId, eventId, reason: 'invalid_milestone' }`
  - Malformed `author` payload ignored (fallback to rendering without author name/timestamp): `{ channelUuid, sessionId, messageId, reason: 'invalid_author' }`
  - Unexpected `status` value ignored: `{ channelUuid, sessionId, messageId, status, reason: 'invalid_status' }`
- **Correlation identifiers**: `messageId` (shopper `message.id` or incoming message ID), `eventId` (deterministic milestone UUID from `mailroom`), plus `channelUuid` and `sessionId` from `service` session context when available (Constitution III, Architecture Document *Cross-Cutting Conventions*).
- **Strict PII exclusion**: Logs MUST NEVER contain message text, agent first name (`author.name`), `typingAuthor.name`, email, last name, or phone/order data (`BD-003`, Constitution III). No `console.log` ships in production.

### Failure Handling

This repository performs no direct network or WebSocket calls (`@weni/webchat-service` owns transport, reconnect, and `get_human_support_state` / 2s Flows timeout). Boundary failure modes handled in `webchat-react`:

- **Malformed milestone (`human_support_event` missing valid `event` or finite `occurredAt`)**: Ignored silently in the UI (never throws or shows an error banner, `FR-045`) and logged via `[WebChat:HumanSupportStatus]` `console.warn`.
- **Malformed or missing `author` / `timestamp`**: Messages without `author` render in pre-launch mode without timestamp, name, or status (`FR-010`). Invalid `timestamp` (non-finite or `<= 0`) omits the timestamp gracefully without rendering `"NaN"` or `"Invalid Date"`.
- **Live Desk unavailable / missing `delivered`, `read`, `typing.start`, or `ended` events**: Widget displays the last confirmed state (last confirmed status icon, no typing indicator, header tag kept until `humanSupport.active` turns false) with zero new error UI (`FR-045`). Missing `typing.start` heartbeats expire cleanly after `10s` in `@weni/webchat-service` (`NFR-002`, `AD-004`), so the typing indicator never gets stuck.
- **Idempotency & out-of-order updates**: Duplicate milestones sharing the same `eventId` are never re-announced (`seenMilestoneIdsRef`), and duplicate or out-of-order status values (`sent` < `delivered` < `read`) never regress visually or re-trigger scroll (`FR-020`, `FR-039`).
- **Offline / reconnect**: Existing `ConnectionStatusBanner` displays unchanged; offline outgoing messages remain `pending` (clock icon + `$semantic-colors-light-fg` text) until reconnect updates them to their real status and delivers any missed `ended` milestone with its original `occurredAt` (`FR-035`).
- **Send failure (`status === 'error'`)**: Renders the existing red `error` icon with zero visible error text and no retry action (`FR-023`).
- **Retry policy & timeouts**: Not applicable for outbound writes in `webchat-react` (no direct HTTP/WebSocket calls; bounded retries live in `chats-engine` -> `mailroom`, `courier` -> socket, and WebSocket reconnect in `@weni/webchat-service`, while `get_human_support_state` enforces a `2s` Flows timeout in `weni-webchat-socket`).

### Security and Authorization

- **Trust boundary**: Incoming `Message`, `humanSupport`, `typingAuthor`, and `features` objects cross the boundary from `@weni/webchat-service` over the shopper's WebSocket session.
- **Boundary validation & PII protection in `webchat-react`**:
  - `author.name` and `typingAuthor.name` are validated as non-empty strings (trimmed, `<= 80` chars) and rendered strictly as React text nodes (never via `dangerouslySetInnerHTML`, preventing XSS, Constitution II).
  - Message markdown continues to be sanitized via `src/utils/sanitizeHtml.js` (DOMPurify).
  - `author.id` (opaque HMAC key) is used strictly as an internal grouping key and is NEVER rendered in DOM text, `aria-label`, `title`, `data-*` attributes, or URLs (`BD-003`, `AD-005`).
  - Read timestamp never exists on the wire and is never shown; status `aria-label` always interpolates the message's own sent time (`BD-003`).
  - Agent name is never rendered inside closed-chat `Notification` previews or `Launcher` (`FR-036`, `BD-008`).
  - The Live Desk read-confirmation setting never reaches `webchat-react`, and no UI references or exposes it (`FR-051`, `AD-009`).
- **Authorization & secrets**: No secrets exist in this frontend bundle. Conversation/session isolation (`channel_uuid` / URN) is enforced server-side by `weni-webchat-socket` and `flows`. Live Desk read-confirmation authorization (Moderador and Suporte only, `FR-052`) is enforced server-side by `chats-engine` (`AD-009`).

## Test Strategy

The inherited Product Spec defines two QA-validated success criteria (`SC-001` and `SC-002`). Unit and integration tests in `webchat-react` prove every client-side invariant that underpins them:

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| `SC-001`: Em 100% dos atendimentos humanos de uma amostra de QA, a tag, os marcos de início e de fim e os horários mostrados ao shopper batem com o que aconteceu no Live Desk (`FR-001`..`FR-013`, `FR-034`, `NFR-001`) | `Header.test.jsx`, `HumanSupportMilestone.test.tsx`, `humanSupportStatus.test.ts`, `useWeniChat.test.jsx`, and `MessagesList.test.jsx`: verify that when `features.humanSupportStatus` is true, `humanSupport.active` toggles the green `"Human support"` tag across chat and sub-views (and never in `showMode` `Live`/`Preview`); start/end milestones render with exact `occurredAt` formatted in `en` (12h, `MM/DD · h:mm A`) and `pt`/`es` (24h, `DD/MM · HH:mm`) in device timezone; server `orderKey` order is preserved on live frames and history reload; all bubble/card message types display accurate timestamps grouped by author and minute; and pre-launch messages without `author` omit timestamps/names/status. |
| `SC-002`: Em 100% das conversas de uma amostra de QA com a confirmação de leitura desativada, nenhuma mensagem do shopper aparece como Lida, e todas ficam Entregue ou no último status alcançado antes da desativação. Com a configuração ativada, vale o comportamento da FR-019 (`FR-047`..`FR-051`, `NFR-005`) | `MessageMeta.test.tsx` and `MessagesList.test.jsx`: verify that shopper status icons render `pending` -> `sent` -> `delivered` -> `read` strictly from server-provided `message.status` (never inferring `read` locally), that messages remaining at `delivered` stay `delivered` with zero notice/explanation when no `read` update arrives (read confirmation disabled) and after session end (`FR-021`), that bulk `read` updates all delivered messages in place when confirmation arrives (`FR-019`), and that AI-mode messages never render `✓` or `✓✓` (`FR-022`). End-to-end project toggle enforcement (`FR-047`..`FR-053`) is validated in `chats-engine` and QA. |

**Flow coverage**:

- Complete human support lifecycle: AI mode with timestamps -> transfer (`human_support_event: started` + green header tag + polite `aria-live` announcement) -> shopper sends messages in queue (`pending` -> `sent` -> `delivered`) -> bulk `read` transition in place without scrolling -> named agent typing (`"Julia is typing"` + polite announcement, `ThinkingIndicator` suppressed) -> consecutive agent messages (first name only on first bubble, ellipsis truncation for long names, timestamp only on last message of same minute) -> agent handoff to second agent (even with same first name via distinct `author.id`, no new milestone, name re-appears) -> closing (`human_support_event: ended` gray badge + header tag removed + polite announcement) -> return to AI mode (new shopper messages show timestamp without ticks; ended session messages retain last status).
- Multiple human support sessions in the same conversation: each session renders its own start and end milestones in `orderKey` order, never collapsed with each other or with adjacent `conversation_status` cart notices (`FR-008`, `FR-009`).
- Unnamed agent & Live Desk system message: messages render without name header, and typing shows `"Agent is typing"` (`FR-027`, `FR-031`, `AD-005`).
- All message types & streaming: timestamps render on text, image, video, audio, document, order, `list_message`, `cta_message`, `quick_replies`, `product_list`, `product_carousel`; hidden while AI response is streaming/buffering and revealed once complete (`FR-010`, `FR-015`); absent on `conversation_status` (`FR-016`) and pre-launch messages without `author` (`FR-010`).
- Continuity, sub-views, and closed chat: reload/history load restores milestones, names, statuses, and timestamps without re-announcing historical milestones; sub-view stays open on incoming events while header tag removes immediately on close (`FR-037`); closed-chat `Notification` preview and unread count exclude milestones and omit agent name (`FR-036`); composer focus and `inputDraft` remain untouched (`FR-038`); in-place status update never alters scroll position (`FR-039`).
- Feature gate OFF (`features.humanSupportStatus: false`) and onboarding `"Live"` / `"Preview"` (`showMode: true`): feature OFF renders zero new elements; `showMode: true` never renders `"Human support"` tag while still showing timestamps on post-launch messages (`FR-004`).

**Failure paths covered**:

- Send failure (`status: 'error'`) during human support and AI mode renders red `error` icon without visible text or retry action (`FR-023`), and is never hidden by same-minute grouping.
- Offline sending during human support keeps `pending` clock icon and muted text until reconnect delivers real status and missed `ended` milestone with original `occurredAt` (`FR-035`).
- Malformed `human_support_event`, invalid `author`, or invalid `timestamp` is discarded/ignored safely with structured PII-free `[WebChat:HumanSupportStatus]` `console.warn` and zero shopper-facing error UI (`FR-045`).
- Live Desk unavailable (no `delivered`/`read`/`typing` events): stays at last confirmed status without error UI (`FR-045`).
- Dev simulation helper (`src/dev/simulateHumanSupport.ts`) has colocated unit tests (`src/dev/simulateHumanSupport.test.ts`) verifying every `HUMAN_SUPPORT_SCENARIOS` entry and `runHumanSupportScenario` replay sequence so Jest's `>= 80%` coverage gate remains green across all metrics.

**Stubbed at the boundary**:

- `@weni/webchat-service` via `test/__mocks__/@weni/webchat-service.js` (driving `features`, `humanSupport`, `typingAuthor`, milestones, status updates, and history loads).
- `react-i18next` via `test/__mocks__/react-i18next.js` (resolving `src/i18n/locales/en.json`), plus inline `jest.mock('react-i18next', ...)` / language overrides to verify `en` (12h, `MM/DD`) vs `pt` / `es` (24h, `DD/MM`) formatting.
- System clock (`jest.useFakeTimers().setSystemTime(...)`) to test same-day vs other-day formatting and same-minute vs cross-minute grouping deterministically. No real network or WebSocket calls.

## Rollout and Rollback

Following the Architecture Document *Delivery Sequence*:

1. **Prerequisites**: `weni-webchat-socket` (with empty channel allowlist), `courier`, `mailroom`, `chats-engine` + Live Desk front-end (including the project read-confirmation setting enabled by default per `BD-006`/`FR-053`), and `@weni/webchat-service` MINOR release deploy first.
2. **Release & Crowdin window**: Merge this feature PR into `main` (updating `@weni/webchat-service` peer dependency and adding `human_support.*` keys to `src/i18n/locales/en.json` only). Wait for the automated Crowdin PR to deliver `pt.json` and `es.json` translations, then publish the MINOR release of `@weni/webchat-template-react` and the standalone UMD bundle. Wait for CDN cache expiration before enabling channels so shoppers do not mix old and new bundles (`Architecture Document` risk mitigation).
3. **Staging / Test-project QA (`SC-001`, `SC-002`)**: Add VTEX test project channels to `weni-webchat-socket`'s allowlist (`AD-007`) and validate `SC-001` and `SC-002` (toggling read confirmation on/off) across floating, fullscreen, mobile, and embedded layouts in `pt`, `en`, and `es`.
4. **General release**: Set `weni-webchat-socket`'s channel allowlist to `*` (`AD-007`, `BD-005`).

**Rollback**:

- **Instant server-side kill switch (`AD-007`)**: Clearing `weni-webchat-socket`'s allowlist immediately stops sending `human_support_enabled: true`, returning all widgets to legacy behavior without requiring a frontend rollback.
- **Independent frontend rollback**: Rolling back `@weni/webchat-template-react` / UMD bundle to the previous MINOR is safe because `@weni/webchat-service` and socket changes are additive and backward compatible, and `webchat-react` persists no client-side schema.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| I. Version Control and Review | Delivered via PR to `main` passing Prettier, `npm run lint`, `npm run typecheck`, Jest `>= 80%` coverage gate across all four metrics, and code-owner review. | none |
| II. Security and Secrets | Markdown remains sanitized via `src/utils/sanitizeHtml.js`; agent first name and milestone labels render strictly as React text nodes; `author.id` is never rendered; zero secrets or new npm dependencies added. | none |
| III. Observability | Structured `console.warn` under `[WebChat:HumanSupportStatus]` with `channelUuid`, `sessionId`, `messageId`, `eventId`, and `reason`; zero PII (`author.name`, text, email never logged); no `console.log`. | none |
| IV. Versioned Contracts | MINOR release of `@weni/webchat-template-react` and explicit peer bump of `@weni/webchat-service`; all new props, `weni-` CSS classes, and `en.json` keys are additive and backward compatible. | `CHANGELOG.md` does not exist yet (`TODO(CHANGELOG)`), so release changes and the peer dependency bump are documented in GitHub release notes. |
| V. Specification Traceability & No Silent Divergence | Opens with `## Inheritance from Product Spec` pinning `spec.md` commit `5dbf6b398115c695326e59d65ce7113a8acaa97d` and `architecture.md` commit `4f2c4b4906e7a53c53bdbb89dd75a0cedb492b27`; `Divergences: none`. | Neither the Product Spec nor the Architecture Document has been tagged yet in `vtex-cx-experience-specs`; per Gate 0, both are pinned to their exact immutable commit SHAs and will be updated to tags once the Product Spec tag and `009-sa-human-support-status/arch-v1` are created. |
| VII. Code as Documentation | All new code, types, comments, and spec text are in English; concise comments explain invariants (e.g., why `orderKey` order is preserved over `timestamp`, why `authorName` lives in `MessageContainer` rather than `MessageText`, and why in-place status updates skip auto-scroll). | none |
| VIII. Type Safety | All new modules (`humanSupportStatus.ts`, `MessageMeta.tsx`, `HumanSupportMilestone.tsx`, `src/dev/simulateHumanSupport.ts`) use strict TypeScript with explicit types and zero `any`. Modified `.js`/`.jsx` files receive minimal targeted updates and maintain accurate `prop-types`. | none |
| IX. Single Responsibility | Formatting/grouping/validation utilities, metadata row, milestone pill, and dev simulator are split into focused modules well under 350 lines. | `ChatContext.jsx` (880 lines), `MessagesList.jsx` (507 lines), and `src/index.jsx` (487 lines) already exceed 350 lines. Extracting `humanSupportStatus.ts`, `MessageMeta.tsx`, `HumanSupportMilestone.tsx`, and `simulateHumanSupport.ts` keeps edits to those existing files small; full refactor/TS migration of those legacy files is out of scope. |
| X. Code Style & Formatting | Formatted with Prettier and linted with `npm run lint`; object maps replace `switch` statements in all new status/event dispatch logic (`STATUS_META_MAP`, milestone variant map). | none |
| XI. Naming Conventions | `PascalCase` for React components (`MessageMeta.tsx`, `HumanSupportMilestone.tsx`) and `camelCase` for utility/dev modules (`humanSupportStatus.ts`, `simulateHumanSupport.ts`). | none |
| XII. Component Architecture | Reuses `FSBadge`, `Icon`, `MessageContainer`, `TypingIndicator`, and `ComponentAnnouncementRegion`, extending them via props and BEM modifiers rather than recreating raw elements. | none |
| XIII. Styling, BEM & Design Tokens | Uses `weni-` BEM classes scoped under `.weni-widget` and existing tokens from `src/styles/variables.scss` (`$sl-color-green-3`, `$sl-color-blue-10`, `$sl-color-gray-1`, `$fg-base-soft`, `$fg-critical`, `$fs-fg-base`, `$fs-color-text`, `$fs-text-size-0`, `$spacing-1`..`$spacing-4`). Zero inline styles for static properties. | Decorative `2px` white border on milestone `FSBadge` matches Figma `Badge` (`8:26`/`8:29`) and falls under the Principle XIII decorative-border exception. |
| XIV. State Management | `features.humanSupportStatus`, `humanSupport`, `typingAuthor`, and `messages` remain owned exclusively by `@weni/webchat-service` through `ChatContext`/`useWeniChat` with zero mirrored state. | none |
| XV. Async State Correctness | Monotonic status progression (`pending` -> `sent` -> `delivered` -> `read`) and explicit `error` / offline `pending` states prevent contradictory visuals; malformed inputs degrade gracefully without unhandled errors. | none |
| Testing | Colocated `<name>.test.ts(x)` / `<name>.test.js(x)` tests for all new and modified modules, verifying user-visible outcomes via `@testing-library/react` with `>= 80%` coverage across statements, branches, functions, and lines. | none |
| Accessibility & Semantic HTML | Status icons carry localized `aria-label`s with the message's sent time (distinguishing `Delivered` vs `Read` beyond color); milestones and typing indicator announce via `aria-live="polite"` without moving focus (`NFR-004`); all icons and badges exceed `3:1` contrast (`NFR-003`: `#707070` = 4.95:1, `#0366DD` = 5.36:1, `#E53E3E` = 4.13:1, badges > 16:1); human support header tag uses semantic `<span>` instead of skipping heading levels. | none |
| Performance | Zero new npm dependencies; SVG icons imported via `vite-plugin-svgr` from existing `@material-symbols/svg-400`; `O(n)` memoized grouping and formatting; zero forced layout reflows. | none |
| Internationalization | Only `src/i18n/locales/en.json` is edited; `pt.json`, `es.json`, and `ro.json` are untouched (Crowdin delivers translations post-merge). Time/date formats adapt to active widget locale (`en` vs `pt`/`es`). | Covered by the constitution's documented project exception for Crowdin-managed translations. |
| Maintainability | All author-key, grouping, timestamp formatting, status icon mapping, and validation rules live in one source of truth (`src/utils/humanSupportStatus.ts`). | none |

## Implementation Decisions

- **Stage 3 Figma copy for start milestone (`"Forwarded to human agent · {{time}}"`)**: The Product Spec *Content* table lists `"Transferred to an agent · 2:34 PM"` as the initial PM baseline and explicitly delegates final Stage 3 wording to Design (`hvsCX4Bx1R5OoiWFLASdjU`, nodes `10:5314`, `11:2832`, `12:4856`, `14:7489`), which finalized the English string as `"Forwarded to human agent · 2:34 PM"`. `en.json` adopts this finalized Figma copy; the PM should record the Stage 3 wording update in the Product Spec Decision Log.
- **Stage 3 Figma horizontal typing indicator layout**: Figma `SA/Typing` (`8:168`, frames `12:4856` and `12:5968`) places the 3-dot incoming bubble (`60×32`) and the `12px` `#707070` label (`"Julia is typing"` / `"Agent is typing"`) side by side (`gap: 8px`, `align-items: center`). `TypingIndicator` implements this finalized layout when `label` is provided while keeping the existing dot-only layout in AI mode.
- **High-contrast status icon palette (`NFR-003`)**: Instead of the early prototype's `#adadad` (~2.2:1 on white), `MessageMeta` uses existing tokens `$fg-base-soft` (`#707070`, 4.95:1) for `pending`/`sent`/`delivered`, `$sl-color-blue-10` (`#0366DD`, 5.36:1) for `read`, and `$fg-critical` (`#E53E3E`, 4.13:1) for `error`, matching the Stage 3 Figma colors and exceeding WCAG 3:1 non-text contrast.
- **Preserving `error` visibility inside same-minute shopper groups**: Per `FR-014`, same-author same-minute messages show timestamp/status only on the last message of the run; however, if an earlier shopper message in the same minute has `status: 'error'`, its red `error` icon and timestamp remain visible so send failures are never silently hidden (Constitution XV, `FR-023`).
- **Rendering `authorName` in `MessageContainer` rather than `MessageText`**: Guarantees every incoming agent message type (text, media, document, order, product list/carousel) displays the first name uniformly on the first message of a sequence while keeping `Notification.jsx` (closed-chat preview) structurally unable to render the agent name (`FR-036`, `BD-008`).
- **Guarding `MessagesList` auto-scroll against in-place status updates (`FR-039`)**: The auto-scroll `useEffect` tracks the list signature (item count + last item ID + streaming/typing/thinking flags) rather than raw `messageGroups` object identity, so `sent` -> `delivered` -> `read` updates mutate icons in place without ever calling `scrollToBottom()`.
- **Timestamp placement on composite messages (`text` + `quick_replies` / `product_list` / `product_carousel`)**: Each logical message renders at most one `<MessageMeta>` row placed beneath its last rendered bubble/card container (aligned left for incoming, right for outgoing) once text streaming/buffering completes (`FR-010`, `FR-011`, `FR-015`).
- **Non-re-announcing historical milestones and typing heartbeats (`NFR-004`)**: `MessagesList` tracks already-seen milestone `eventId`s (seeded from initial mount and `history:loaded`) and the last announced typing label (`null` when hidden), so only newly arriving live milestones and typing-start transitions (or agent name changes) enter `ComponentAnnouncementRegion`.
- **Merchant onboarding `"Live"` test and `"Preview"` (`FR-004`, `BD-004`)**: `Header` suppresses the `"Human support"` tag whenever `config.showMode` is true so it can never appear alongside `"Live"` or `"Preview"`. Message timestamps render in those modes whenever `features.humanSupportStatus` is true and `message.author` is present.

## Divergences

none
