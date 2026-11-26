# Research: Visible Human Support Status in Shopping Assistant (`webchat-react`)

**Feature**: `016-human-support-status`  
**Date**: 2026-11-25  
**Spec**: [specs/016-human-support-status/spec.md](./spec.md)

## 1. Server Ordering (`AD-002` item 4) & Author-Identity Grouping (`AD-005` item 5, `FR-014`, `FR-026`)

- **Decision**: When `state.features?.humanSupportStatus === true`, `useWeniChat.js` preserves the canonical `context.messages` order emitted by `@weni/webchat-service` (instead of sorting by `a.timestamp - b.timestamp`) and builds typed `messageGroups` grouped by `getAuthorKey(message.author)` rather than bare `direction`:
  - `human_support_event` -> standalone group (`kind: 'milestone'`, 1 item, never merged with messages or `conversation_status` notices).
  - `conversation_status` -> standalone group (`kind: 'conversation_status'`, consecutive cart notices still collapse as today per `MessagesList.jsx`, but never merge with milestones per `FR-009`).
  - Regular messages (`text`, `image`, `video`, `audio`, `document`, `file`, `order`, etc.) -> grouped by `authorKey` (`'contact'`, `'ai_agent'`, `'human_agent:' + author.id`, `'human_agent:system'`, or `'legacy:' + direction` when `author` is absent).
  - Within each author group, `computeMessageDisplayMetadata` assigns:
    - `showAuthorName`: `true` only on the first message of a `human_agent:<id>` run when `author.name` is a non-empty string (`FR-025`..`FR-028`).
    - `showTimestamp`: `true` on the last message of each consecutive same-author, same-local-minute (`YYYY-MM-DD HH:MM`) sub-run, on any outgoing `status === 'error'` message (so failures are never hidden), and `false` on pre-launch messages (`author` absent) or actively streaming messages (`FR-010`, `FR-014`, `FR-015`).
  - When `features.humanSupportStatus` is `false`, `useWeniChat.js` keeps its existing timestamp sort and direction grouping unchanged.
- **Rationale**:
  - `AD-002` item 4 mandates ordering by server `orderKey` (tie-broken by MongoDB `_id`, with local `pending`/`error` outgoing messages kept at the end). Because `webchat-react` does not receive `_id`, preserving `@weni/webchat-service`'s already-sorted `state.messages` guarantees identical live and reloaded positions (`FR-024`, `FR-034`) and prevents start milestones (whose `occurredAt` can precede the queued AI transfer message) from jumping ahead (`FR-005`).
  - Grouping by `authorKey` separates AI messages, different Live Desk agents (even two agents sharing the first name `"Julia"`, distinguished by opaque HMAC `author.id`), and Live Desk system messages (`{ type: 'human_agent' }` without `id`), applying `4px` (`$spacing-1`) intra-group spacing and `16px` (`$spacing-4`) inter-author spacing matching Stage 3 Figma (`SA/Message` `8:149`).
- **Alternatives considered**:
  - *Re-sorting in `useWeniChat.js` by `orderKey ?? timestamp`* — rejected because tie-breaking requires MongoDB `_id` owned by `@weni/webchat-service`, and pending outgoing messages without `orderKey` must remain at the end rather than sorting by browser `timestamp`.
  - *Keeping direction-only grouping in `useWeniChat.js`* — rejected because `ai_agent` and `human_agent` (or Agent A and Agent B) share `direction: 'incoming'`, which would collapse inter-author `16px` gaps into `4px` and complicate milestone separation.

## 2. Deterministic Locale Date/Time Formatting (`FR-012`, `FR-013`, `BD-004`)

- **Decision**: Implement `formatMessageTimestamp(timestamp, language, now?)` in `src/utils/humanSupportStatus.ts` using local `Date` getters (device timezone) and normalized base language (`pt`, `es`, `en`; fallback `en`):
  - Time component:
    - `en` (and fallback): 12-hour clock without leading zero on hour: `h:mm AM/PM` (e.g. `"2:32 PM"`, `"12:05 AM"`).
    - `pt` and `es`: 24-hour clock with zero-padded hour and minute: `HH:mm` (e.g. `"14:32"`, `"09:05"`).
  - Same local calendar day (`year`, `month`, `date` match `now`): time only.
  - Different local calendar day: zero-padded date + ` · ` (U+00B7 middle dot with spaces) + time:
    - `en`: `MM/DD · h:mm A` (e.g. `"11/02 · 2:32 PM"`).
    - `pt` and `es`: `DD/MM · HH:mm` (e.g. `"02/11 · 14:32"`).
  - Invalid / non-finite / `<= 0` timestamps return `''` without throwing.
- **Rationale**: `Date.prototype.toLocaleTimeString` / `Intl.DateTimeFormat` vary across browser engines and Node/jsdom ICU tables (e.g., `"2:32 p.m."`, non-breaking spaces, or unpadded dates). Deterministic local `Date` formatting guarantees exact compliance with `FR-012`, `FR-013`, and Figma `14:6352` across every runtime.
- **Alternatives considered**:
  - *Reusing `src/utils/formatters.js`'s `formatTimestamp`* — rejected because it uses unconfigured `toLocaleTimeString([])` without `pt`/`es` vs `en` 24h/12h rules or the `MM/DD · ...` / `DD/MM · ...` other-day format.

## 3. Shopper Status Icons, Contrast & Accessibility (`FR-017`..`FR-024`, `NFR-003`, `AD-003`, `AD-009`)

- **Decision**:
  - Register `@material-symbols/svg-400/rounded/check.svg?react` (`check`) and `@material-symbols/svg-400/rounded/done_all.svg?react` (`done_all`) alongside existing `schedule` and `error` in `src/utils/icons.js`.
  - Render `<MessageMeta>` below each eligible message using a flat `STATUS_META_MAP` object map (no `switch`, Constitution X):
    - `pending`: `schedule`, color `fg-base-soft` (`#707070`, 4.95:1 on `#fff`), `aria-label` = `human_support.status_sending` (`"Sending"`).
    - `sent`: `check`, color `fg-base-soft` (`#707070`, 4.95:1), `aria-label` = `human_support.status_sent` (`"Sent at {{time}}"`).
    - `delivered`: `done_all`, color `fg-base-soft` (`#707070`, 4.95:1), `aria-label` = `human_support.status_delivered` (`"Delivered · sent at {{time}}"`).
    - `read`: `done_all`, color `sl-color-blue-10` (`#0366DD`, 5.36:1), `aria-label` = `human_support.status_read` (`"Read · sent at {{time}}"`).
    - `error`: `error`, color `fg-critical` (`#E53E3E`, 4.13:1), `aria-label` = `human_support.status_error` (`"Failed to send"`), zero visible text or retry action (`FR-023`).
  - Strictly obey `AD-003` item 7: render `sent`/`delivered`/`read` ticks iff `message.status` carries that server value (never derive from milestones). In AI mode (`!isHumanSupportActive`), outgoing messages never carry server status so only timestamp (plus `pending` clock while sending locally and `error` on failure) appears (`FR-022`).
  - When Live Desk read confirmation is disabled (`AD-009`), `read` never arrives from the service and messages remain at `delivered` with zero notice or UI difference (`FR-048`, `FR-051`).
- **Rationale**: All five icons already exist in the installed `@material-symbols/svg-400` package (zero new dependencies), exceed WCAG 3:1 contrast (`NFR-003`), distinguish `Delivered` vs `Read` for screen readers via distinct `aria-label`s referencing the message's sent time (`BD-003`), and keep `error` visible even inside same-minute shopper runs (Constitution XV).
- **Alternatives considered**:
  - *Using `#adadad` from the early prototype* — rejected because `#adadad` on white is ~2.2:1, failing `NFR-003` (`>= 3:1`).
  - *Rendering `error` inside `MessageContainer` when feature is enabled* — rejected because Figma `11:4555` places the red `error` icon inline next to the timestamp in the below-bubble meta row; legacy inline placement stays untouched when `features.humanSupportStatus` is false.

## 4. Agent First Name Placement & Closed-Chat Privacy (`FR-025`..`FR-030`, `FR-036`, `BD-003`, `BD-008`)

- **Decision**:
  - Add optional `authorName?: string` to `MessageContainer.jsx`. When provided, render `<span className="weni-message__author-name">{authorName}</span>` at the top of `.weni-message` before `children` (`12px` SemiBold, `line-height: 16px`, `$fs-color-neutral-6`, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: block; margin-bottom: $spacing-1`).
  - For composite messages that have a standalone `product_list` or `product_carousel` with no preceding text bubble, pass `authorName` to that first rendered `MessageContainer`.
  - In `ChatContext.jsx`, skip `unreadCount` increment and `tooltipMessage` update in `handleMessageReceived` when `message?.type === 'human_support_event'`.
- **Rationale**:
  - Covers every message type (`MessageText`, `MessageImage`, `MessageVideo`, `MessageAudio`, `MessageDocument`, `MessageOrder`, `ShowItems`, `ProductCarousel`) from one component without duplication.
  - `Notification.jsx` renders `<Message>` directly without `MessageContainer`, making it structurally impossible for agent names to leak into closed-chat previews (`FR-036`, `BD-008`, Privacy & Data Protection).
  - `author.id` is never passed to any DOM node or attribute (`BD-003`).
- **Alternatives considered**:
  - *Rendering `author.name` inside `MessageText.jsx`* — rejected because it would leak into `Notification.jsx` and omit agent names on media/order/product messages.

## 5. Header Tag & `showMode` (`Live` / `Preview`) Exclusivity (`FR-001`..`FR-004`, `FR-037`)

- **Decision**: In `Header.jsx`, render `<span className="weni-chat-header__tag weni-chat-header__tag--human-support">{t('human_support.header_tag')}</span>` when `isHumanSupportFeatureEnabled && isHumanSupportActive && !config.showMode && !isBackInStockOnlyMode`, styled identically to `.weni-chat-header__tag--live` (`$sl-color-green-3: #AFF79E`, `$fs-fg-base: #1F1F1F`, pill radius, `4px 12px` padding, `12px/16px` Medium).
- **Rationale**: `Header` sits above `<ChatContent />` in `Chat.jsx`, so the tag persists across every sub-view (`Cart`, `ProductCatalog`, `ProductDetails`, `ListMessage`, `BackInStockNotify`, `WhatsappOffersOptIn`) and disappears immediately when `humanSupport.active` turns `false` (`FR-002`, `FR-003`, `FR-037`). Guarding `!config.showMode` guarantees the tag never coexists with `"Live"` or `"Preview"` (`FR-004`). Using `<span>` avoids skipping heading levels (Constitution `Accessibility & Semantic HTML`).
- **Alternatives considered**:
  - *Adding a separate tag slot in every sub-view* — rejected as unnecessary duplication since `Header` already wraps all chat views.

## 6. Milestones, Non-Collapsing, & Polite Announcements (`FR-005`..`FR-009`, `NFR-004`)

- **Decision**:
  - Extend `FSBadge` with `type: 'success' | 'neutral'` (`.weni-fs-badge--neutral` using `$sl-color-gray-1: #F5F5F5`, `$fs-color-text: #171a1c`, `2px solid $white` border, matching Figma `Badge` `8:26`/`8:29`; both variants exceed 16:1 contrast).
  - Create `src/components/Messages/HumanSupportMilestone.tsx` rendering `<FSBadge type={event === 'started' ? 'success' : 'neutral'}>` with `t('human_support.milestone_started' | 'human_support.milestone_ended', { time })` formatted from `humanSupportEvent.occurredAt`.
  - Reuse the existing `<ComponentAnnouncementRegion announcements={announcements} />` in `MessagesList.jsx` for live milestone and human-typing announcements (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`, zero focus movement).
  - Seed `seenMilestoneIdsRef` on initial mount (and on `history:loaded`) with existing milestone `eventId`s so historical milestones rendered after reload, reopen, "Use here", or returning from a sub-view are never re-announced (`FR-034`, `NFR-004`).
- **Rationale**: Reuses existing design-system and accessibility primitives (`FSBadge`, `ComponentAnnouncementRegion`) per Constitution XII and keeps milestones completely isolated from `conversation_status` cart-notice collapsing (`FR-009`).
- **Alternatives considered**:
  - *Mounting a second `aria-live` region* — rejected because concurrent live regions interrupt screen-reader speech queues.

## 7. Human Agent Typing Indicator & Thinking Suppression (`FR-031`..`FR-033`, `NFR-002`, `NFR-004`, `AD-004`)

- **Decision**:
  - Compute `effectiveIsThinking = isHumanSupportFeatureEnabled && isHumanSupportActive ? false : isThinking` in `MessagesList.jsx` so `ThinkingIndicator` never appears during human support (`FR-033`).
  - Extend `TypingIndicator.jsx` with optional `label?: string`. When `isHumanSupportFeatureEnabled && isTyping && typingAuthor?.type === 'human_agent'`, pass `label` = `typingAuthor.name?.trim() ? t('human_support.typing_with_name', { name }) : t('human_support.typing_anonymous')`.
  - Match Stage 3 Figma (`SA/Typing` `8:168`, frames `12:4856`, `12:5968`): horizontal flex row (`gap: $spacing-2`, `align-items: center`) with the 3-dots incoming bubble (`height: 32px`, rounded border `$fs-border-color`) on the left and the `12px` Regular `#707070` label on the right.
  - Track `lastAnnouncedTypingLabelRef` in `MessagesList.jsx` so `ComponentAnnouncementRegion` announces the typing label once when it appears (or when the agent name changes), and does not re-announce on subsequent 5-second heartbeats (`AD-004`).
- **Rationale**: Aligns directly with Stage 3 Figma while keeping AI mode's dot-only `TypingIndicator` and `ThinkingIndicator` completely unchanged (`FR-033`).
- **Alternatives considered**:
  - *Stacking label beneath dots from the early 2026-11-03 prototype* — rejected because Stage 3 Figma (`12:4856`, `12:5968`) finalized the horizontal layout.

## 8. Scroll Stability on In-Place Status Updates & Composite Message Meta Placement (`FR-010`, `FR-015`, `FR-038`, `FR-039`)

- **Decision**:
  - In `MessagesList.jsx`, decouple the auto-scroll `useEffect` from raw `messageGroups` identity by keying it on a structural scroll trigger (`totalMessageCount`, `lastItemId`, `lastMessage?.direction`, `isTyping`, `effectiveIsThinking`, `voicePartialTranscript`) — NOT on in-place `message.status` changes. This guarantees `sent` -> `delivered` -> `read` updates never invoke `scrollToBottom()`, even when the shopper is within `100px` of the bottom (`FR-039`).
  - For composite messages (e.g., text bubble + `quick_replies`, `product_list`, or `product_carousel`), render `<MessageMeta>` once beneath the last rendered visual container of that message (for `StreamedMessageItem`, deferred until `!isTextStreaming && !isBuffering` per `FR-015`; if `product_list` or `product_carousel` follows the text bubble, `MessagesList` renders `<MessageMeta>` beneath that trailing card rather than duplicating it under the text bubble).
- **Rationale**: Prevents scroll jumps during bulk read transitions (`FR-039`) and avoids double timestamps on multi-part messages (`FR-010`, `FR-011`).
- **Alternatives considered**:
  - *Only guarding with `isNearBottomRef.current`* — rejected because a shopper scrolled `50px` above the bottom (still inside `BOTTOM_SCROLL_THRESHOLD_PX = 100px`) would experience an unwanted `50px` jump when a message turns `read`.

## 9. Crowdin-Locked Localization & Stage 3 Copy (`src/i18n/locales/en.json`)

- **Decision**: Add 10 English source keys in alphabetical order under `human_support` in `src/i18n/locales/en.json` ONLY, adopting Figma's Stage 3 start milestone copy `"Forwarded to human agent · {{time}}"`. Leave `pt.json`, `es.json`, and `ro.json` untouched.
- **Rationale**: Complies with Constitution `Internationalization`, `AGENTS.md`, `crowdin.yml`, and `.githooks/pre-commit` (`scripts/localization-lock.js`). Product Spec *Content* explicitly delegates final Stage 3 wording to Design.
- **Alternatives considered**:
  - *Editing `pt.json` and `es.json` in this PR* — rejected; blocked by localization lock and overwritten by Crowdin.

## 10. Development-Only Visual Debug Buttons (`HUMAN_SUPPORT_SCENARIOS` in `src/index.jsx`)

- **Decision**: Create `src/dev/simulateHumanSupport.ts` exporting `HUMAN_SUPPORT_SCENARIOS` (`{ id, buttonId, label, steps }[]`) and `runHumanSupportScenario(scenarioId, webChat, getService, delayFn?)`, rendered via `HUMAN_SUPPORT_SCENARIOS.map(...)` inside `#actions` in `src/index.jsx` right next to `COMPONENT_STREAM_SCENARIOS`.
  - Covers 9 visual scenarios spanning US 1–US 5 plus feature-OFF / pre-launch messages.
  - Uses a dev-only `state:changed` projection helper so every scenario works immediately in `npm run dev` against `@weni/webchat-service` `1.22.0` before the `1.23.0` MINOR release is published, while remaining 100% excluded from `src/index.js` and `src/standalone.jsx` production builds.
  - Includes colocated `src/dev/simulateHumanSupport.test.ts` to keep Jest's `src/**/*.{js,jsx,ts,tsx}` `>= 80%` coverage gate green.
- **Rationale**: Mirrors the proven `COMPONENT_STREAM_SCENARIOS` pattern in `src/dev/simulateComponentStreams.ts`, enables immediate visual QA against the 5 Figma frames in `npm run dev`, and keeps production bundles untouched (`BD-005`, `BD-008`).
- **Alternatives considered**:
  - *Exposing simulation methods on `window.WebChat` in `src/standalone.jsx`* — rejected because it leaks dev fixtures into the production UMD bundle and alters the public API.
