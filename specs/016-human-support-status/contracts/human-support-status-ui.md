# Contracts: Visible Human Support Status in Shopping Assistant (`webchat-react`)

**Feature**: `016-human-support-status`  
**Date**: 2026-11-25  
**Spec**: [specs/016-human-support-status/spec.md](./spec.md)

## 1. Upstream Contract Consumed from `@weni/webchat-service`

Defined authoritatively in [`contracts/messages/webchat-service-message.schema.json`](https://github.com/weni-ai/vtex-cx-experience-specs/blob/4f2c4b4906e7a53c53bdbb89dd75a0cedb492b27/specs/009-sa-human-support-status/contracts/messages/webchat-service-message.schema.json) (`AD-002`, `AD-003`, `AD-004`, `AD-005`, `AD-008`).

- **Peer dependency bump**: `@weni/webchat-service` `1.22.0` -> new MINOR (`1.23.0` once published).
- **Additive `state` fields consumed via `state:changed`**:
  - `state.features?.humanSupportStatus?: boolean` — master UI gate (`BD-006`, `AD-008`).
  - `state.humanSupport?: { active: boolean }` — current human support state (deduced from history, confirmed via `get_human_support_state`, updated live on `started`/`ended`).
  - `state.typingAuthor?: { type: 'human_agent'; name?: string } | null` — active Live Desk agent typing identity (clears on message or after `10s` without heartbeat).
- **Additive `Message` fields consumed**:
  - `author?: { type: 'contact' | 'ai_agent' | 'human_agent'; name?: string; id?: string }` (`undefined` = pre-launch message).
  - `orderKey?: number` (server ordering key enforced in `state.messages` by `@weni/webchat-service`).
  - `status?: 'pending' | 'sent' | 'delivered' | 'read' | 'error' | 'streaming'` (server status present iff message belongs to human support per `AD-003` item 7).
  - `type: 'human_support_event'` with `humanSupportEvent: { eventId: string; event: 'started' | 'ended'; occurredAt: number }`.
- **Events**: `state:changed`, `message:received`, `message:updated`, `history:loaded`, `human_support:changed` (consumed automatically via `state:changed`; `history:loaded` suppresses historical milestone announcements).
- **Graceful degradation**: When `state.features?.humanSupportStatus` is absent or `false`, `webchat-react` renders identically to `2.22.0`.

## 2. Context & Hook Surface (Additive MINOR)

### `ChatContext` (`src/contexts/ChatContext.jsx`) & `useWeniChat` (`src/hooks/useWeniChat.js`)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `isHumanSupportFeatureEnabled` | `boolean` | `false` | Derived from `Boolean(state.features?.humanSupportStatus)`. |
| `isHumanSupportActive` | `boolean` | `false` | Derived from `Boolean(state.humanSupport?.active)`. |
| `typingAuthor` | `TypingAuthor \| null` | `null` | Derived from `state.typingAuthor ?? null`. |
| `messageGroups` | `MessageGroup[]` | `[]` | Existing array extended with `kind` (`'messages' \| 'milestone' \| 'conversation_status'`) and `authorKey`. Backward compatible: every entry still has `direction` and `messages`. |

## 3. React Component Props Contracts (Additive MINOR)

All existing exports (`src/index.js`) remain backward compatible; every added prop is optional with legacy defaults.

### `FSBadge` (`src/components/common/FSBadge.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'success' \| 'neutral'` | required | Extended with `'neutral'` (gray `#F5F5F5` background, `#171a1c` text) for the human-support end milestone. |
| `children` | `React.ReactNode` | required | Badge label text. |
| `className` | `string` | `''` | Optional BEM modifier/override class. |

### `MessageContainer` (`src/components/Messages/MessageContainer.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `authorName` | `string \| undefined` | `undefined` | When non-empty, renders `<span className="weni-message__author-name">{authorName}</span>` at the top of `.weni-message` with single-line ellipsis (`FR-025`). Never used by `Notification.jsx` (`FR-036`). |

### `TypingIndicator` (`src/components/Messages/TypingIndicator.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string \| undefined` | `undefined` | When non-empty, renders the Stage 3 Figma horizontal layout (incoming 3-dots bubble + `12px` `#707070` text label). When omitted, renders the legacy 3-dots indicator unchanged. |

### `StreamedMessageItem` (`src/components/Messages/StreamedMessageItem.tsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `displayMeta` | `MessageDisplayMetadata \| undefined` | `undefined` | Per-message metadata (`showAuthorName`, `authorName`, `showTimestamp`, `visibleStatus`) computed by `useWeniChat`. `authorName` forwards to the first rendered `MessageContainer`; `showTimestamp` & `visibleStatus` drive `<MessageMeta>` once text streaming/buffering completes (`FR-014`, `FR-015`). |
| `isHumanSupportFeatureEnabled` | `boolean` | `false` | Gates new meta/status rendering and error-icon placement inside `<MessageMeta>`. |
| `hasTrailingCard` | `boolean` | `false` | When `true` (a sibling `product_list` or `product_carousel` follows in `MessagesList`), omits `<MessageMeta>` here so `MessagesList` renders the single message footer beneath the trailing card. |

### `Header` Visibility Condition (`src/components/Header/Header.jsx`)

- Renders `.weni-chat-header__tag--human-support` iff `isHumanSupportFeatureEnabled && isHumanSupportActive && !config.showMode && !isBackInStockOnlyMode && !isConnectionClosed` (never coexisting with `ModeTag` `Live`/`Preview` or showing on a superseded `AlreadyInUse` session).

### New Internal Components

- **`MessageMeta`** (`src/components/Messages/MessageMeta.tsx`):
  - Props: `{ timestamp?: number; direction: 'incoming' | 'outgoing'; status?: ShopperMessageStatus | null; showStatus?: boolean }`
  - Renders `<footer className="weni-message-meta weni-message-meta--{direction}">` with `<time className="weni-message-meta__time">` and optional `<span className="weni-message-meta__status" role="img" aria-label={...}><Icon ... aria-hidden="true" /></span>`.
- **`HumanSupportMilestone`** (`src/components/Messages/HumanSupportMilestone.tsx`):
  - Props: `{ event: HumanSupportEvent }`
  - Renders `<section className="weni-human-support-milestone"><FSBadge type={...}>{label}</FSBadge></section>`.

## 4. BEM CSS & Design Token Surface (Additive MINOR)

All selectors use the `weni-` BEM prefix and are scoped under `.weni-widget` by `postcss-prefix-selector`.

| Class | File | Tokens & Contrast Verification (`NFR-003` >= 3:1) |
|-------|------|---------------------------------------------------|
| `.weni-chat-header__tag--human-support` | `Header.scss` | `background-color: $sl-color-green-3` (`#AFF79E`), `color: $fs-fg-base` (`#1F1F1F`) — contrast ~14.7:1. |
| `.weni-fs-badge--neutral` | `FSBadge.scss` | `background-color: $sl-color-gray-1` (`#F5F5F5`), `color: $fs-color-text` (`#171a1c`), `border: 2px solid $white` — contrast ~16.0:1. |
| `.weni-fs-badge--success` | `FSBadge.scss` | `background-color: $fs-color-success-bkg` (`#E6F9EC`), `color: $fs-color-text` (`#171a1c`), `border: 2px solid $white` — contrast ~16.4:1. |
| `.weni-human-support-milestone` | `HumanSupportMilestone.scss` | Full-width centered flex container (`margin-top: $spacing-4`). |
| `.weni-message__author-name` | `MessageContainer.scss` | `$fs-text-weight-semibold` `12px`/`16px`, `$fs-color-neutral-6` (`#1F1F1F`), `margin-bottom: $spacing-1`, single-line ellipsis (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; display: block`). |
| `.weni-message-meta`, `--incoming`, `--outgoing`, `__time`, `__status` | `MessageMeta.scss` | `12px`/`16px` Regular, `$fg-base-soft` (`#707070`, contrast 4.95:1), `gap: $spacing-1`, `margin-top: $spacing-1`, `padding-left: $spacing-1` (incoming) / `padding-right: $spacing-1` (outgoing). Status icons `16px` (`$icon-size-4`): `pending`/`sent`/`delivered` `#707070` (4.95:1), `read` `$sl-color-blue-10` `#0366DD` (5.36:1), `error` `$fg-critical` `#E53E3E` (4.13:1). |
| `.weni-messages-list__direction-group--grouped` | `MessagesList.scss` | `gap: $spacing-1` (`4px`) between consecutive messages of the same author (`16px` between groups). |
| `.weni-typing-indicator--with-label`, `__bubble`, `__label` | `TypingIndicator.scss` | Horizontal flex row (`gap: $spacing-2`, `align-items: center`), `$fs-color-neutral-0` bubble with `$fs-border-width solid $fs-border-color`, `12px`/`16px` `$fg-base-soft` label. |

## 5. Internationalization Key Contract (`src/i18n/locales/en.json` ONLY)

Per Constitution `Internationalization` and `crowdin.yml`, ONLY `src/i18n/locales/en.json` is modified. Keys are in alphabetical order (`snake_case`, VTEX Content Guide). Crowdin delivers `pt.json` and `es.json` post-merge; `ro.json` falls back to `en`.

```json
"human_support": {
  "header_tag": "Human support",
  "milestone_ended": "Human support ended · {{time}}",
  "milestone_started": "Forwarded to human agent · {{time}}",
  "status_delivered": "Delivered · sent at {{time}}",
  "status_error": "Failed to send",
  "status_read": "Read · sent at {{time}}",
  "status_sending": "Sending",
  "status_sent": "Sent at {{time}}",
  "typing_anonymous": "Agent is typing",
  "typing_with_name": "{{name}} is typing"
}
```

## 6. Structured Observability Contract

Prefix: `[WebChat:HumanSupportStatus]` via `console.warn` (never `console.log`).

```ts
type HumanSupportWarningContext = {
  channelUuid?: string;
  sessionId?: string;
  messageId?: string;
  eventId?: string;
  status?: string;
  reason: 'invalid_milestone' | 'invalid_author' | 'invalid_status';
};
```

**Forbidden fields**: `text`, `author.name`, `typingAuthor.name`, email, last name, phone, or order contents (`BD-003`, Constitution III).

## 7. Development-Only Visual Debug Harness Contract (`src/dev/simulateHumanSupport.ts`)

Mirrors `COMPONENT_STREAM_SCENARIOS` / `runComponentStreamScenario` (`src/dev/simulateComponentStreams.ts`). Imported exclusively by `src/index.jsx` (`npm run dev`), excluded from `dist/` and `dist-standalone/`.

- Exports `HUMAN_SUPPORT_SCENARIOS: HumanSupportScenario[]` (9 scenarios covering US 1–US 5 + feature-OFF / pre-launch):
  1. `hs-transfer-and-close` (`simulate-hs-transfer-and-close`): Full transfer -> agent reply -> close lifecycle (US 1)
  2. `hs-queue-and-bulk-read` (`simulate-hs-queue-and-bulk-read`): Queue `pending` -> `sent` -> `delivered` -> bulk `read` (US 2)
  3. `hs-read-confirmation-off` (`simulate-hs-read-confirmation-off`): Read confirmation OFF — messages stay `delivered` (US 2)
  4. `hs-send-failure` (`simulate-hs-send-failure`): Shopper message send failure (`error` icon, no retry) (US 2)
  5. `hs-agent-typing-and-handoff` (`simulate-hs-agent-typing-and-handoff`): Named typing + thinking suppressed + grouped replies + agent handoff + long-name ellipsis (US 3)
  6. `hs-unnamed-agent` (`simulate-hs-unnamed-agent`): Unnamed agent `"Agent is typing"` + Live Desk system message without name (US 3)
  7. `hs-timestamps-grouping-streaming` (`simulate-hs-timestamps-grouping-streaming`): Other-day timestamps, same-minute grouping, cart notice, and streaming AI reply (US 4)
  8. `hs-offline-and-reconnect-close` (`simulate-hs-offline-and-reconnect-close`): Offline `ConnectionStatusBanner` + `pending` -> reconnect with end milestone `occurredAt` (US 5)
  9. `hs-feature-off-prelaunch` (`simulate-hs-feature-off-prelaunch`): Feature OFF & pre-launch messages without `author`
- Exports `runHumanSupportScenario(scenarioId, webChat, getService?, delayFn?)` returning `Promise<string | null>`.
