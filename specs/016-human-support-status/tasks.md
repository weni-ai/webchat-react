---
description: "Actionable, dependency-ordered task list for Visible Human Support Status in Shopping Assistant (webchat-react)"
---

# Tasks: Visible Human Support Status in Shopping Assistant

**Input**: Design documents from `/specs/016-human-support-status/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/human-support-status-ui.md`, `quickstart.md`

**Tests**: Required by Constitution `Quality Standards > Testing` (>= 80% statements, branches, functions, lines) and `spec.md > Test Strategy`. Every new module gets a colocated `<name>.test.ts(x)` file and modified components get updated colocated tests.

**Organization**: Tasks are grouped by inherited Product Spec User Story (`US1`–`US5`, ordered P1 -> P2 -> P3) so each story is an independently testable increment, followed by the dev-only `HUMAN_SUPPORT_SCENARIOS` visual debug buttons and final quality gate.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`US1`–`US5`) for user story phases only
- Every task includes exact repository-relative file paths and verbatim constraints from `data-model.md` and `contracts/human-support-status-ui.md`

## Path Conventions

- Single frontend package at repository root: `src/`, `test/`, `package.json`
- New modules MUST be strict TypeScript (`.ts`/`.tsx`) with zero `any` (Constitution VIII)
- ONLY `src/i18n/locales/en.json` may be edited for UI strings; never touch `pt.json`, `es.json`, or `ro.json` (Constitution `Internationalization`, `.githooks/pre-commit`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Register required Material Symbols SVG icons, add Crowdin-source English keys, extend service test mocks, and update ambient TypeScript declarations used across all stories

- [X] T001 Register Material Symbols `check` (`@material-symbols/svg-400/rounded/check.svg?react` + `check-fill.svg?react`) and `done_all` (`@material-symbols/svg-400/rounded/done_all.svg?react` + `done_all-fill.svg?react`) in `src/utils/icons.js` alongside existing `schedule` and `error`
- [X] T002 [P] Add 10 English source keys in alphabetical order under `human_support` (`header_tag: "Human support"`, `milestone_ended: "Human support ended · {{time}}"`, `milestone_started: "Forwarded to human agent · {{time}}"`, `status_delivered: "Delivered · sent at {{time}}"`, `status_error: "Failed to send"`, `status_read: "Read · sent at {{time}}"`, `status_sending: "Sending"`, `status_sent: "Sent at {{time}}"`, `typing_anonymous: "Agent is typing"`, `typing_with_name: "{{name}} is typing"`) in `src/i18n/locales/en.json` (do NOT edit `pt.json`, `es.json`, or `ro.json`)
- [X] T003 [P] Extend `WeniWebchatService` mock in `test/__mocks__/@weni/webchat-service.js` with initial state `features: { humanSupportStatus: false }`, `humanSupport: { active: false }`, `typingAuthor: null`, `MESSAGE_TYPES.HUMAN_SUPPORT_EVENT = 'human_support_event'`, and test helpers (`setHumanSupportFeature`, `setHumanSupportActive`, `setTypingAuthor`, `emitHumanSupportEvent`, `updateMessageStatus`)
- [X] T004 [P] Update ambient TypeScript declarations in `src/types/ambient.d.ts` for `FSBadge` (`children: ReactNode`, `type: 'success' | 'neutral'`, `className?: string`), `IconProps` (adding `'aria-hidden'?: boolean | 'true' | 'false'`), `MessageContainer` (`authorName?: string`), `TypingIndicator` (`label?: string`), `useWeniChat` (`isHumanSupportFeatureEnabled`, `isHumanSupportActive`, `typingAuthor`), and `<footer` / `<time` HTML intrinsic elements

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, validation, deterministic locale date/time formatter, author-identity grouping, context state exposure, and server `orderKey` preservation that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create `src/utils/humanSupportStatus.ts` exporting:
  - Types `AuthorType = 'contact' | 'ai_agent' | 'human_agent'`, `MessageAuthor`, `HumanSupportEventType = 'started' | 'ended'`, `HumanSupportEvent`, `ShopperMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'error'`, `HumanSupportFeatures`, `HumanSupportState`, `TypingAuthor`, `HumanSupportMessage`, `MessageGroupKind = 'messages' | 'milestone' | 'conversation_status'`, `MessageGroup`, `MessageDisplayMetadata`, `SupportedLocale = 'en' | 'pt' | 'es'`, `StatusMetaDescriptor`, and `HumanSupportWarningContext`
  - Object maps (no `switch`, Constitution X): `STATUS_META_MAP` (`pending` -> `schedule` / `fg-base-soft` / `human_support.status_sending` / `includesTime: false`; `sent` -> `check` / `fg-base-soft` / `human_support.status_sent` / `includesTime: true`; `delivered` -> `done_all` / `fg-base-soft` / `human_support.status_delivered` / `includesTime: true`; `read` -> `done_all` / `sl-color-blue-10` / `human_support.status_read` / `includesTime: true`; `error` -> `error` / `fg-critical` / `human_support.status_error` / `includesTime: false`) and `MILESTONE_CONFIG_MAP` (`started` -> `badgeType: 'success'`, `labelKey: 'human_support.milestone_started'`; `ended` -> `badgeType: 'neutral'`, `labelKey: 'human_support.milestone_ended'`)
  - Boundary validators `validateAuthor(author, logContext)` (enforcing `type` enum; `{ type: 'human_agent' }` with neither `id` nor `name` is valid as a Live Desk system message per `AD-005` item 3 and MUST NOT log `invalid_author`; when `id` is present on `human_agent`, it MUST match `/^ha_[0-9a-f]{32}$/` and optional `name` MUST be a trimmed `1..80` char string; `name` without `id` on `human_agent` is invalid), `validateHumanSupportEvent(event, logContext)` (enforcing UUID `eventId`, `'started' | 'ended'`, finite positive `occurredAt`), and `validateShopperStatus(status, logContext)` — logging invalid payloads via PII-free `console.warn('[WebChat:HumanSupportStatus] ...', { channelUuid, sessionId, messageId, eventId, status, reason })` (never logging `text`, `author.name`, `typingAuthor.name`, or email)
  - Pure helpers `normalizeLocale(language)` (`'pt' | 'es' | 'en'`, defaulting to `'en'`), `formatMessageTimestamp(timestamp, language, now?)` (device local timezone; same day: `en` `"h:mm AM/PM"`, `pt`/`es` `"HH:mm"`; other day: `en` `"MM/DD · h:mm AM/PM"`, `pt`/`es` `"DD/MM · HH:mm"`; returns `''` on invalid/non-finite/`<= 0` timestamp), `getAuthorKey(author, direction)` (`'contact'`, `'ai_agent'`, `'human_agent:' + author.id`, `'human_agent:system'`, or `'legacy:' + direction`), `getLocalMinuteKey(timestamp)`, `groupMessagesByAuthor(messages)`, and `computeMessageDisplayMetadata(groupMessages)` (`showAuthorName` on index `0` of `human_agent:<id>` with non-empty `name`; `showTimestamp` on last item of each consecutive same-local-minute non-streaming sub-run OR any outgoing `status === 'error'` message; `visibleStatus` only on outgoing messages with `author` present and valid `ShopperMessageStatus`)
- [X] T006 Create colocated unit tests in `src/utils/humanSupportStatus.test.ts` verifying `formatMessageTimestamp` (`en` 12h midnight/noon/PM, `pt`/`es` 24h, same day vs other day `MM/DD` / `DD/MM`, `ro`/unknown fallback to `en`, invalid timestamps), `getAuthorKey` (contact, ai_agent, two agents named `"Julia"` with distinct `ha_*` IDs, Live Desk system message without ID, legacy absent author), `computeMessageDisplayMetadata` (same-minute collapsing, cross-minute split, streaming suppression, `error` preserved inside same-minute run), and PII-free `console.warn` validation for malformed `author` (confirming `{ type: 'human_agent' }` system message emits no warning), `humanSupportEvent`, and `status`
- [X] T007 Update `src/contexts/ChatContext.jsx` to expose `isHumanSupportFeatureEnabled: Boolean(state.features?.humanSupportStatus)`, `isHumanSupportActive: Boolean(state.humanSupport?.active)`, and `typingAuthor: state.typingAuthor ?? null` directly from `state` (single source of truth, Constitution XIV), and update `handleMessageReceived` to ignore `message?.type === 'human_support_event'` so milestones never increment `unreadCount` or set `tooltipMessage` (`FR-036`, `BD-008`)
- [X] T008 Create colocated unit tests in `src/contexts/ChatContext.test.jsx` verifying exposure of `isHumanSupportFeatureEnabled`, `isHumanSupportActive`, and `typingAuthor` from service `state:changed` updates, and confirming `human_support_event` messages while chat is closed do not increment `unreadCount` or set `tooltipMessage`
- [X] T009 Update `src/hooks/useWeniChat.js` so that when `context.isHumanSupportFeatureEnabled` is `true`, `sortedMessages` preserves the exact canonical `context.messages` order from `@weni/webchat-service` (`AD-002` item 4, never re-sorting by browser `timestamp`), and `messageGroups` uses `groupMessagesByAuthor` + `computeMessageDisplayMetadata` (producing `{ kind, direction, authorKey, messages, displayMeta }`); when `isHumanSupportFeatureEnabled` is `false`, preserve existing timestamp sort and direction-only grouping identically
- [X] T010 Create colocated unit tests in `src/hooks/useWeniChat.test.jsx` covering `orderKey` preservation when feature ON (start milestone with earlier `occurredAt` stays after AI transfer message; pending outgoing message stays at end) vs legacy timestamp sort when feature OFF, author-identity grouping (separating AI, Agent A, Agent B with same first name, Live Desk system message, milestones, and cart notices), and `displayMeta` flags

**Checkpoint**: Foundation ready — core formatting, validation, grouping, context exposure, and server ordering are built and unit-tested.

---

## Phase 3: User Story 1 - See Human Support Header Tag and Start/End Milestones (Priority: P1) 🎯 MVP

**Goal**: Show shoppers clearly when a conversation is transferred to human support (green `"Human support"` header tag across all chat views + green start milestone with `occurredAt`) and when it ends (header tag removed + gray end milestone with `occurredAt`), without collapsing milestones with cart notices or showing the tag in onboarding `"Live"` / `"Preview"` modes (`SC-001`, `FR-001`..`FR-009`, `FR-037`, `NFR-003`, `NFR-004`).

**Independent Test**: Enable `features.humanSupportStatus`, emit `human_support_event: started` (`active: true`), verify green `"Human support"` tag appears in `Header` across chat and sub-views (never when `showMode: true` or `isConnectionClosed: true`), green `"Forwarded to human agent · <time>"` milestone renders after the AI transfer message and announces politely without moving focus, emit `human_support_event: ended` (`active: false`), and verify tag disappears and gray `"Human support ended · <time>"` milestone renders and announces politely.

### Implementation & Tests for User Story 1

- [X] T011 [P] [US1] Extend `src/components/common/FSBadge.jsx` and `src/components/common/FSBadge.scss` to accept `type: PropTypes.oneOf(['success', 'neutral']).isRequired`, adding `.weni-fs-badge--neutral` (`background-color: $sl-color-gray-1`, `color: $fs-color-text`, `border: 2px solid $white`, `padding: 5px $fs-spacing-2`, `min-height: 26px`) and matching `2px solid $white` border on `.weni-fs-badge--success` per Figma `Badge` (`8:26` / `8:29`)
- [X] T012 [US1] Create colocated unit tests in `src/components/common/FSBadge.test.jsx` verifying `'success'` and `'neutral'` classes and label rendering
- [X] T013 [P] [US1] Create `src/components/Messages/HumanSupportMilestone.tsx` and `src/components/Messages/HumanSupportMilestone.scss` validating `event` via `validateHumanSupportEvent`, formatting `event.occurredAt` via `formatMessageTimestamp(event.occurredAt, i18n.language)`, and rendering centered `<section className="weni-human-support-milestone"><FSBadge type={badgeType}>{t(labelKey, { time })}</FSBadge></section>` (returning `null` safely on invalid payload)
- [X] T014 [US1] Create colocated unit tests in `src/components/Messages/HumanSupportMilestone.test.tsx` verifying `started` green badge (`"Forwarded to human agent · 2:34 PM"`), `ended` gray badge (`"Human support ended · 2:41 PM"`), `pt`/`es` 24h & other-day formatting, and invalid payload returning `null` with PII-free `console.warn`
- [X] T015 [US1] Update `src/components/Header/Header.jsx` and `src/components/Header/Header.scss` to read `isHumanSupportFeatureEnabled`, `isHumanSupportActive`, and `isConnectionClosed` from `useWeniChat()`, render `<span className="weni-chat-header__tag weni-chat-header__tag--human-support">{t('human_support.header_tag')}</span>` (`background-color: $sl-color-green-3`, `color: $fs-fg-base`) when `isHumanSupportFeatureEnabled && isHumanSupportActive && !config.showMode && !isBackInStockOnlyMode && !isConnectionClosed`, persisting next to the back button on all sub-views and never appearing alongside `ModeTag` or on an inactive superseded session (`FR-001`..`FR-004`, `FR-037`)
- [X] T016 [US1] Update `src/components/Header/Header.test.jsx` covering green `"Human support"` tag visibility when feature ON + active, persistence when `currentPage` is set (Cart/Product Details), immediate removal when `isHumanSupportActive` turns `false`, suppression when `config.showMode` is `true` (`live` or `preview`), suppression when `isConnectionClosed` is `true` (`AlreadyInUse`), and suppression when `isHumanSupportFeatureEnabled` is `false`
- [X] T017 [US1] Update `src/components/Messages/MessagesList.jsx` and `src/components/Messages/MessagesList.scss` to render `group.kind === 'milestone'` items via `<HumanSupportMilestone>`, ensure `conversation_status` cart notices never collapse across or with milestones (`FR-009`), and track seen milestone `eventId`s (`seenMilestoneIdsRef`, seeded on initial mount) to enqueue only newly arriving live milestones into `<ComponentAnnouncementRegion>` (`aria-live="polite"`, no focus movement, `NFR-004`)
- [X] T018 [US1] Extend `src/components/Messages/MessagesList.test.jsx` with US1 flows: start & end milestones in order, multiple human support sessions in one conversation, adjacent cart `conversation_status` notices never merged with milestones, polite `aria-live` announcement on live start/end milestones without moving focus, and feature OFF rendering zero milestones

**Checkpoint**: User Story 1 (MVP) is fully functional and independently verifiable.

---

## Phase 4: User Story 2 - Know Whether Shopper Messages Arrived and Were Read (Priority: P1)

**Goal**: Display shopper message status icons (`pending` clock, `sent` single gray tick, `delivered` double gray ticks, `read` double blue ticks, `error` red icon without retry text/action) strictly driven by server-provided `message.status` with WCAG `>= 3:1` contrast, sent-time `aria-label`s, read-confirmation OFF capping at `delivered` with zero notice, AI-mode no ticks, frozen status after closing, and in-place status updates without scroll jumps (`SC-002`, `FR-017`..`FR-024`, `FR-039`, `FR-047`..`FR-051`, `NFR-003`).

**Independent Test**: During human support, send shopper messages and advance status `pending` -> `sent` -> `delivered` -> bulk `read` (and test read-confirmation OFF staying `delivered`, AI mode showing no ticks, `error` showing red icon with no retry action, and closing freezing statuses) — verify exact `16px` icons, colors, sent-time `aria-label`s, and zero `scrollIntoView` calls on in-place status updates.

### Implementation & Tests for User Story 2

- [X] T019 [P] [US2] Create `src/components/Messages/MessageMeta.tsx` and `src/components/Messages/MessageMeta.scss` rendering `<footer className="weni-message-meta weni-message-meta--{direction}">` (`12px/16px` Regular `$fg-base-soft`, `gap: $spacing-1`, `margin-top: $spacing-1`, `padding-left: $spacing-1` incoming / `padding-right: $spacing-1` outgoing) with `<time className="weni-message-meta__time">` formatted via `formatMessageTimestamp` and optional `<span className="weni-message-meta__status" role="img" aria-label={...}><Icon name={...} size="small" color={...} aria-hidden="true" /></span>` driven by `STATUS_META_MAP` (using message sent time in `aria-label`, never read time; zero visible text on `error`)
- [X] T020 [US2] Create colocated unit tests in `src/components/Messages/MessageMeta.test.tsx` verifying `pending` (`schedule`, `#707070`, `"Sending"`), `sent` (`check`, `#707070`, `"Sent at 2:32 PM"`), `delivered` (`done_all`, `#707070`, `"Delivered · sent at 2:32 PM"`), `read` (`done_all`, `#0366DD`, `"Read · sent at 2:32 PM"`), `error` (`error`, `#E53E3E`, no visible error text or retry button), AI mode omitting ticks, read-confirmation OFF remaining `delivered` with zero notice, and invalid timestamp graceful handling
- [X] T021 [US2] Update `src/components/Messages/StreamedMessageItem.tsx` (accepting standardized `displayMeta?: MessageDisplayMetadata`, `isHumanSupportFeatureEnabled?: boolean`, and `hasTrailingCard?: boolean`) and `src/components/Messages/MessagesList.jsx` to wire outgoing `<MessageMeta>` (rendering `<MessageMeta>` beneath outgoing bubbles when `isHumanSupportFeatureEnabled && displayMeta?.showTimestamp`, passing `displayMeta.visibleStatus`, moving the `error` icon into `<MessageMeta>` when `isHumanSupportFeatureEnabled && message.author` while keeping legacy inline `<Icon name="error">` otherwise) and decouple `MessagesList.jsx`'s auto-scroll `useEffect` from raw `messageGroups` identity (keying on `totalMessageCount`, `lastItemId`, `lastMessage?.direction`, `isTyping`, `effectiveIsThinking`, `voicePartialTranscript`) so in-place status transitions NEVER invoke `scrollToBottom()` (`FR-039`)
- [X] T022 [P] [US2] Extend `src/components/Messages/StreamedMessageItem.test.tsx` verifying outgoing `MessageMeta` rendering across `pending`, `sent`, `delivered`, `read`, `error`, and legacy fallback when `isHumanSupportFeatureEnabled` is `false`
- [X] T023 [US2] Extend `src/components/Messages/MessagesList.test.jsx` with US2 flows (`SC-002`): `pending` -> `sent` -> `delivered` -> 200-message bulk `read` transition with zero `scrollIntoView` invocations (`FR-039`), read-confirmation OFF keeping messages at `delivered` with zero notice (`FR-048`, `FR-051`), frozen status after `ended` milestone (`FR-021`), AI-mode shopper messages showing no ticks (`FR-022`), and `error` icon preserved even inside same-minute shopper runs (`FR-023`)

**Checkpoint**: User Stories 1 and 2 (both P1) work independently and together.

---

## Phase 5: User Story 3 - See Live Desk Agent First Name and Typing Indicator (Priority: P2)

**Goal**: Show the Live Desk agent's first name at the top of the first message in each consecutive same-agent sequence (with single-line ellipsis truncation, never showing surname/avatar/email/opaque `author.id`, never leaking into closed-chat `Notification` previews), display the Stage 3 Figma horizontal typing indicator (`"{{name}} is typing"` / `"Agent is typing"`) with heartbeat-deduplicated polite announcements, and suppress AI `ThinkingIndicator` during active human support (`FR-025`..`FR-033`, `FR-036`, `NFR-002`, `NFR-004`).

**Independent Test**: Trigger human agent typing with name `"Julia"` (and with no name) while `isThinking` is true — verify `ThinkingIndicator` is suppressed, horizontal 3-dots bubble + `"Julia is typing"` / `"Agent is typing"` renders and announces once across repeated heartbeats; send consecutive messages from `Julia`, then a second agent with distinct `author.id`, and an unnamed/system agent — verify first name appears only on the first bubble of each agent run, truncates with ellipsis, omits on unnamed/AI/system messages, and never appears in `Notification`.

### Implementation & Tests for User Story 3

- [X] T024 [P] [US3] Update `src/components/Messages/MessageContainer.jsx` and `src/components/Messages/MessageContainer.scss` to accept optional `authorName?: string` and render `<span className="weni-message__author-name">{authorName}</span>` at the top of `.weni-message` before `children` (`$fs-text-weight-semibold` `12px/16px`, `$fs-color-neutral-6`, `margin-bottom: $spacing-1`, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: block`)
- [X] T025 [US3] Create colocated unit tests in `src/components/Messages/MessageContainer.test.jsx` verifying `authorName` renders strictly as React text above children when provided, omits when undefined/empty, and carries `.weni-message__author-name`
- [X] T026 [P] [US3] Update `src/components/Messages/TypingIndicator.jsx` and `src/components/Messages/TypingIndicator.scss` to accept optional `label?: string`; when non-empty, render the Stage 3 Figma horizontal layout (`.weni-typing-indicator--with-label`: `display: flex; align-items: center; gap: $spacing-2`, incoming `.weni-typing-indicator__bubble` containing the 3 animated dots + `<span className="weni-typing-indicator__label">{label}</span>` in `12px/16px` Regular `$fg-base-soft`); when omitted, preserve legacy dot-only rendering
- [X] T027 [US3] Create colocated unit tests in `src/components/Messages/TypingIndicator.test.jsx` verifying dot-only AI rendering vs labeled `"Julia is typing"` / `"Agent is typing"` horizontal layout
- [X] T028 [US3] Update `src/components/Messages/StreamedMessageItem.tsx` and `src/components/Messages/MessagesList.jsx` to forward `displayMeta.authorName` to the first rendered `MessageContainer` of each message (covering text, media, document, order, and standalone `product_list`/`product_carousel` cards), suppress `ThinkingIndicator` via `effectiveIsThinking = isHumanSupportFeatureEnabled && isHumanSupportActive ? false : isThinking` (`FR-033`), pass `typingAuthor` label (`"{{name}} is typing"` or `"Agent is typing"`) to `<TypingIndicator>` when `isHumanSupportFeatureEnabled && isTyping && typingAuthor?.type === 'human_agent'`, and enqueue typing-start transitions (deduplicated across 5-second heartbeats via `lastAnnouncedTypingLabelRef`) into `<ComponentAnnouncementRegion>` (`NFR-004`)
- [X] T029 [P] [US3] Create colocated unit tests in `src/components/Notification/Notification.test.jsx` verifying closed-chat previews render incoming `human_agent` message text without ever rendering `author.name` or `author.id` (`FR-036`, `BD-003`, `BD-008`)
- [X] T030 [P] [US3] Extend `src/components/Messages/StreamedMessageItem.test.tsx` verifying `authorName` forwarding on first agent message and omission on follow-up, AI, unnamed, or feature-OFF messages
- [X] T031 [US3] Extend `src/components/Messages/MessagesList.test.jsx` with US3 flows: `"Julia is typing"` and `"Agent is typing"` with heartbeat-deduplicated polite announcements, `ThinkingIndicator` suppressed during human support and preserved in AI mode, consecutive `Julia` messages showing `"Julia"` only on the first bubble, handoff to a second `"Julia"` with distinct `author.id` starting a new group with name re-shown and zero new milestones, unnamed/Live Desk system messages showing no name, and opaque `author.id` absent from DOM text/attributes

**Checkpoint**: User Stories 1, 2, and 3 work independently and together.

---

## Phase 6: User Story 4 - See Timestamps on All Post-Launch Messages With Author & Minute Grouping (Priority: P2)

**Goal**: Show localized device-timezone timestamps below every post-launch bubble or card message (`text`, `image`, `video`, `audio`, `document`, `order`, `list_message`, `cta_message`, `quick_replies`, `product_list`, `product_carousel`) across AI mode, human support, and onboarding `"Live"`/`"Preview"` modes, grouped by author and minute (`4px` intra-group / `16px` inter-group spacing), deferred while AI text streams/buffers, and omitted on cart `conversation_status` notices and pre-launch messages without `author` (`SC-001`, `FR-004`, `FR-010`..`FR-016`, `BD-004`).

**Independent Test**: Render a mixed AI-mode and human-support conversation with text, image, video, audio, document, order, product list, product carousel, quick replies, cart notice, streaming AI response, pre-launch message (no `author`), yesterday messages, and consecutive same-minute messages — verify exact timestamp visibility, single footer per composite message, `en` 12h vs `pt`/`es` 24h formatting, and `4px`/`16px` grouping classes.

### Implementation & Tests for User Story 4

- [X] T032 [US4] Complete incoming and composite message `<MessageMeta>` placement in `src/components/Messages/StreamedMessageItem.tsx` (deferring `<MessageMeta>` until `!isTextStreaming && !isBuffering` per `FR-015`, placing it beneath `quick_replies` if present on the same message, and omitting it when `hasTrailingCard` indicates a sibling `product_list`/`product_carousel` owns the message footer) and in `src/components/Messages/MessagesList.jsx` & `MessagesList.scss` (attaching `<MessageMeta>` once beneath non-streamed media/order bubbles and trailing `product_list`/`product_carousel` cards when `isHumanSupportFeatureEnabled && displayMeta.showTimestamp`, and adding `.weni-messages-list__direction-group--grouped` with `gap: $spacing-1` `4px` while keeping `$spacing-4` `16px` between groups)
- [X] T033 [P] [US4] Extend `src/components/Messages/StreamedMessageItem.test.tsx` verifying incoming AI streamed response hides `<MessageMeta>` during `streaming_text` / word buffering and reveals the formatted timestamp once buffering finishes (`FR-015`), and renders only one `<MessageMeta>` when `quick_replies` or `list_message` / `cta_message` accompany text
- [X] T034 [US4] Extend `src/components/Messages/MessagesList.test.jsx` with US4 flows: timestamps below text, image, video, audio, document, order, `product_list`, `product_carousel`, and `quick_replies` (left-aligned incoming, right-aligned outgoing); same-author same-minute grouping across shopper, AI, and distinct agents; `en` 12h (`"2:32 PM"`, `"11/02 · 2:32 PM"`) vs `pt`/`es` 24h (`"14:32"`, `"02/11 · 14:32"`); omitted on `conversation_status` cart notices (`FR-016`) and pre-launch messages without `author` (`FR-010`); timestamps visible when `showMode` is `true` (`Live` / `Preview`)

**Checkpoint**: User Stories 1–4 are complete and independently verified.

---

## Phase 7: User Story 5 - Continuity, Offline Reconnect, Sub-Views & Resilience (Priority: P3)

**Goal**: Preserve identical milestones, agent names, statuses, and timestamps across reload, chat reopen, "Use here", offline reconnect (with original closing `occurredAt`), and sub-view navigation without re-announcing historical milestones, interrupting open sub-views, moving composer focus/`inputDraft`, or displaying new error UI when Live Desk is unavailable (`FR-034`..`FR-039`, `FR-045`, `FR-046`).

**Independent Test**: Load history containing milestones, names, and statuses (simulating reload / "Use here" / returning from sub-view), verify zero re-announcements and exact server `orderKey` order; simulate offline `pending` -> reconnect with missed `ended` milestone `occurredAt`; open a sub-view while events arrive and verify sub-view stays open while header tag removes immediately on close; inject malformed payloads and verify PII-free `console.warn` with zero shopper-facing error UI.

### Implementation & Tests for User Story 5

- [X] T035 [US5] Subscribe to `service.on('history:loaded', ...)` inside `src/components/Messages/MessagesList.jsx` (with cleanup on unmount) to seed `seenMilestoneIdsRef` with all loaded `human_support_event` `eventId`s so history reload, chat reopen, "Use here", and sub-view returns render all historical milestones without re-announcing them via `ComponentAnnouncementRegion` (`FR-034`, `NFR-004`)
- [X] T036 [P] [US5] Extend `src/components/Chat/Chat.test.jsx` verifying that incoming human support events (messages, status updates, milestones, closing) never close or interrupt open sub-views (`Cart`, `ProductDetails`, `ProductCatalog`, `ListMessage`) while `Header` removes the `"Human support"` tag immediately on session end (`FR-002`, `FR-003`, `FR-037`)
- [X] T037 [US5] Extend `src/components/Messages/MessagesList.test.jsx` with US5 flows: `history:loaded` restoring milestones, names, statuses, and timestamps in `orderKey` order with zero live-region re-announcements; launch-open ticket (`humanSupport.active: true` without retroactive start milestone, `FR-046`); offline `pending` -> reconnect `delivered` + `ended` milestone displaying original `occurredAt` (`FR-035`); focus and composer input remaining untouched on status/milestone/typing events (`FR-038`); and Live Desk unavailable / malformed payload degrading gracefully with zero shopper-facing error UI (`FR-045`)

**Checkpoint**: All 5 user stories (P1–P3) are complete and independently verified.

---

## Phase 8: Polish, Dev Visual Debug Buttons & Cross-Cutting Verification

**Purpose**: Add dev-only `HUMAN_SUPPORT_SCENARIOS` visual debug buttons in the local Vite playground (mirroring `COMPONENT_STREAM_SCENARIOS`), align peer dependency, and pass the full local quality gate and production bundle verification

- [X] T038 Create `src/dev/simulateHumanSupport.ts` exporting `HUMAN_SUPPORT_SCENARIOS` (9 typed scenarios matching `contracts/human-support-status-ui.md`: `hs-transfer-and-close`, `hs-queue-and-bulk-read`, `hs-read-confirmation-off`, `hs-send-failure`, `hs-agent-typing-and-handoff`, `hs-unnamed-agent`, `hs-timestamps-grouping-streaming`, `hs-offline-and-reconnect-close`, `hs-feature-off-prelaunch`) and `runHumanSupportScenario(scenarioId, webChat, getService?, delayFn?)` with a dev-only `state:changed` projection helper so all scenarios run cleanly in `npm run dev` against `@weni/webchat-service` `1.22.0` before `1.23.0` is published (strictly dev-only; MUST NOT be imported by `src/index.js` or `src/standalone.jsx`)
- [X] T039 Create colocated unit tests in `src/dev/simulateHumanSupport.test.ts` verifying all 9 entries in `HUMAN_SUPPORT_SCENARIOS` (unique `id`/`buttonId`/`label`), full replay execution via `runHumanSupportScenario`, state transitions (`features.humanSupportStatus`, `humanSupport.active`, `typingAuthor`, milestones, statuses), unknown scenario ID returning `null`, and missing service handle graceful no-op (keeping Jest coverage >= 80%)
- [X] T040 Wire `HUMAN_SUPPORT_SCENARIOS.map(...)` visual debug buttons into `#actions` in `src/index.jsx` directly alongside `COMPONENT_STREAM_SCENARIOS.map(...)` (strictly Vite `npm run dev` playground)
- [ ] T041 Update `@weni/webchat-service` peer dependency in `package.json` from `1.22.0` to the matching MINOR release implementing `webchat-service-message.schema.json` (`1.23.0` once published; coordinate with `webchat-service` release per Architecture Doc *Delivery Sequence*) — *deferred until `@weni/webchat-service@1.23.0` is published on npm (mirroring `e4ef41f` from `015-components-streaming`)*
- [X] T042 Run the full Constitution local quality gate in order: `npx prettier --write <changed files>`, `npm run typecheck`, `npm run lint`, and `npm test -- --coverage` (verifying `>= 80%` statements, branches, functions, and lines, zero console errors/PII leaks, and confirming `git status` shows ZERO modifications to `pt.json`, `es.json`, or `ro.json`)
- [X] T043 Run `npm run build:standalone` and verify `dist-standalone/` builds cleanly with zero references to `simulateHumanSupport` or `HUMAN_SUPPORT_SCENARIOS` (note: `npm run build` has a pre-existing unrelated unresolved `./theme/defaultTheme` import in untouched `src/index.js`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately (`T002`, `T003`, `T004` parallel with `T001`).
- **Foundational (Phase 2)**: Depends on Setup (`T001`–`T004`) — **BLOCKS** all user stories (`T005` -> `T007` & `T009`, with colocated test tasks `T006`, `T008`, `T010` parallel once their target module exists).
- **User Stories (Phases 3–7)**: All depend on Foundational (Phase 2):
  - **US1 (P1 — MVP)**: Can start immediately after Phase 2 (`T011`–`T014` parallel -> `T015`–`T018`).
  - **US2 (P1)**: `T019`–`T020` (`MessageMeta`) can run in parallel with US1; `T021`–`T023` integrate into `StreamedMessageItem` / `MessagesList` after `T017`.
  - **US3 (P2)**: `T024`–`T027` (`MessageContainer`, `TypingIndicator`) and `T029` (`Notification.test`) can run in parallel with US1/US2; `T028`, `T030`, `T031` wire into `StreamedMessageItem` / `MessagesList` after `T021`.
  - **US4 (P2)**: Depends on `MessageMeta` (`T019`) and `StreamedMessageItem` / `MessagesList` wiring (`T021`, `T028`).
  - **US5 (P3)**: Depends on `seenMilestoneIdsRef` in `MessagesList` (`T017`) and `Header` (`T015`).
- **Polish (Phase 8)**: `T038`–`T040` (`simulateHumanSupport.ts` + `src/index.jsx`) can start once US1–US5 UI components are wired; `T041`–`T043` run after all implementation tasks complete.

### Parallel Opportunities

- **Phase 1**: `T001`, `T002`, `T003`, `T004` touch 4 disjoint files and can all run in parallel.
- **Phase 2**: After `T005` (`humanSupportStatus.ts`), `T006`, `T007`, and `T009` can progress cleanly, followed by `T008` and `T010` in parallel.
- **Primitive Components Across US1–US3**: `FSBadge` (`T011`–`T012`), `HumanSupportMilestone` (`T013`–`T014`), `MessageMeta` (`T019`–`T020`), `MessageContainer` (`T024`–`T025`), `TypingIndicator` (`T026`–`T027`), and `Notification.test.jsx` (`T029`) all touch separate files and can be implemented in parallel right after Phase 2.

---

## Parallel Example: Foundational Primitives (Post-Phase 2)

```bash
# Launch independent presentational primitives and their colocated tests in parallel:
Task: "T011 [P] [US1] Extend FSBadge with neutral variant in src/components/common/FSBadge.jsx and FSBadge.scss"
Task: "T013 [P] [US1] Create HumanSupportMilestone in src/components/Messages/HumanSupportMilestone.tsx and .scss"
Task: "T019 [P] [US2] Create MessageMeta in src/components/Messages/MessageMeta.tsx and .scss"
Task: "T024 [P] [US3] Add optional authorName to MessageContainer in src/components/Messages/MessageContainer.jsx and .scss"
Task: "T026 [P] [US3] Add optional label horizontal layout to TypingIndicator in src/components/Messages/TypingIndicator.jsx and .scss"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001`–`T004`)
2. Complete Phase 2: Foundational (`T005`–`T010`)
3. Complete Phase 3: User Story 1 (`T011`–`T018`)
4. **STOP and VALIDATE**: Run targeted Jest suites for `FSBadge`, `HumanSupportMilestone`, `Header`, and `MessagesList` to confirm the header tag and start/end milestones work end-to-end.

### Full Release Delivery (Required by `BD-006`)

Per inherited `BD-006`, production rollout requires all 5 user stories (`US1`–`US5`) shipping together behind `state.features.humanSupportStatus`:

1. Setup + Foundational (`T001`–`T010`)
2. US1 Header Tag & Milestones (`T011`–`T018`) -> independently tested
3. US2 Shopper Delivery & Read Statuses (`T019`–`T023`) -> independently tested
4. US3 Agent Name & Typing Indicator (`T024`–`T031`) -> independently tested
5. US4 Universal Timestamps & Grouping (`T032`–`T034`) -> independently tested
6. US5 Continuity, Reconnect & Resilience (`T035`–`T037`) -> independently tested
7. Polish, Dev Visual Debug Buttons (`HUMAN_SUPPORT_SCENARIOS`), Peer Bump & Full Quality Gate (`T038`–`T043`)

---

## Notes

- `[P]` tasks touch distinct files with zero dependency on incomplete sibling tasks.
- Every task obeys Constitution VIII (strict TypeScript for all new files, zero `any`), Constitution X (object maps instead of `switch`, Prettier + ESLint), Constitution XIII (scoped `weni-` BEM + `variables.scss` tokens), and Constitution `Internationalization` (`en.json` ONLY).
- Commit atomically using Conventional Commits (`feat: ...`, `test: ...`, `chore: ...`, imperative, `<= 50` chars) per Constitution VI.
