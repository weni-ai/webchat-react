# Data Model: Visible Human Support Status in Shopping Assistant (`webchat-react`)

**Feature**: `016-human-support-status`  
**Date**: 2026-11-25  
**Spec**: [specs/016-human-support-status/spec.md](./spec.md)  
**Upstream Contracts**:
- `contracts/human-support-shared.schema.json` (pinned commit `4f2c4b4906e7a53c53bdbb89dd75a0cedb492b27`)
- `contracts/messages/webchat-service-message.schema.json` (pinned commit `4f2c4b4906e7a53c53bdbb89dd75a0cedb492b27`)

> **Persistence note**: `webchat-react` persists no new entities in `localStorage`, `sessionStorage`, or any datastore (`BD-007`). All conversation history, milestones, author snapshots, and statuses are persisted by `weni-webchat-socket` and hydrated through `@weni/webchat-service`.

## 1. Consumed Service Entities (`@weni/webchat-service` -> `webchat-react`)

### `AuthorType` & `MessageAuthor`

Normalized `camelCase` author descriptor attached by `@weni/webchat-service` on post-launch messages (`AD-005`, `AD-008` item 4). Absence (`undefined`) denotes a pre-launch message (`FR-010`).

```ts
export type AuthorType = 'contact' | 'ai_agent' | 'human_agent';

export type MessageAuthor =
  | { type: 'contact' }
  | { type: 'ai_agent' }
  | { type: 'human_agent'; id: string; name?: string }
  | { type: 'human_agent' }; // Live Desk system message (no id, no name)
```

| Field | Type | Required | Validation Rule |
|-------|------|----------|-----------------|
| `type` | `'contact' \| 'ai_agent' \| 'human_agent'` | yes | Invalid values trigger structured PII-free `console.warn` (`invalid_author`) and fallback to `undefined`. |
| `name` | `string` | no | Only valid for `human_agent` when `id` is present; trimmed non-empty string (`1..80` chars). Rendered strictly as React text; never logged or shown in `Notification`. |
| `id` | `string` | no | Opaque HMAC key matching `/^ha_[0-9a-f]{32}$/`. Used strictly for author-identity grouping (`FR-014`, `FR-026`); NEVER rendered in DOM, `aria-*`, `data-*`, or URLs (`BD-003`). |

### `HumanSupportEvent`

Lifecycle milestone carried by `Message` items with `type === 'human_support_event'` (`AD-002`).

```ts
export type HumanSupportEventType = 'started' | 'ended';

export interface HumanSupportEvent {
  eventId: string;
  event: HumanSupportEventType;
  occurredAt: number; // Epoch milliseconds (displayed time)
}
```

| Field | Type | Required | Validation Rule |
|-------|------|----------|-----------------|
| `eventId` | `string` | yes | Deterministic UUID per `(ticket, event)`; used as React key and deduplication key in `seenMilestoneIdsRef`. |
| `event` | `'started' \| 'ended'` | yes | Maps via object map to `FSBadge` variant (`'success'` vs `'neutral'`) and i18n key (`milestone_started` vs `milestone_ended`). Invalid values are discarded with structured `console.warn` (`invalid_milestone`). |
| `occurredAt` | `number` | yes | Finite positive epoch ms (`Number.isFinite(occurredAt) && occurredAt > 0`). Always used as the displayed milestone time (never `orderKey` or `Date.now()`). |

### `ShopperMessageStatus`

```ts
export type ShopperMessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'error';
```

- **Server-confirmed statuses**: `'sent' | 'delivered' | 'read'` — strictly monotonic (`sent < delivered < read`, enforced by socket and `@weni/webchat-service`, `FR-020`). Presence on an outgoing message is the sole signal to render status ticks (`AD-003` item 7).
- **Local widget statuses**: `'pending'` (clock while sending / offline) and `'error'` (red error icon on send failure, no text or retry action per `FR-023`).

### `HumanSupportState`, `TypingAuthor`, & `HumanSupportFeatures` (Service `state` Delta)

```ts
export interface HumanSupportFeatures {
  humanSupportStatus?: boolean;
}

export interface HumanSupportState {
  active: boolean;
}

export interface TypingAuthor {
  type: 'human_agent';
  name?: string;
}
```

- `state.features?.humanSupportStatus`: `true` enables all human support UI features together (`BD-006`, `AD-008`); `false` or `undefined` keeps legacy widget behavior.
- `state.humanSupport?.active`: `true` while human support is open (queued or with an agent); drives the header `"Human support"` tag (when `!config.showMode`) and suppresses `ThinkingIndicator` (`FR-033`).
- `state.typingAuthor`: `{ type: 'human_agent', name?: string } | null`; active while `state.isTyping === true` until incoming agent message or `10s` heartbeat expiration in `@weni/webchat-service` (`AD-004`).

### `HumanSupportMessage` (Augmented `Message` Shape)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Correlation ID (`message.id` for outgoing shopper messages, `hs_<eventId>` for milestones). |
| `type` | `string` | Existing types plus `'human_support_event'`. |
| `direction` | `'incoming' \| 'outgoing'` | Existing direction field. |
| `timestamp` | `number` | Epoch ms — **displayed time** on regular messages (`AD-002` item 4). |
| `orderKey` | `number \| undefined` | Epoch ms (socket clock) — ordering key enforced by `@weni/webchat-service`, never displayed. |
| `status` | `ShopperMessageStatus \| 'streaming' \| undefined` | Controls ticks (`sent`/`delivered`/`read`), clock (`pending`), error icon (`error`), and streaming timestamp deferral (`streaming`). |
| `author` | `MessageAuthor \| undefined` | Present on post-launch messages; absent on pre-launch messages (`FR-010`, `AD-008`). |
| `humanSupportEvent` | `HumanSupportEvent \| undefined` | Present when `type === 'human_support_event'`. |

## 2. Derived UI Models (`webchat-react` In-Memory / Memoized)

### `MessageGroup`

Produced by `useWeniChat.js` (memoized over `context.messages` and `isHumanSupportFeatureEnabled`):

```ts
export type MessageGroupKind = 'messages' | 'milestone' | 'conversation_status';

export interface MessageGroup {
  kind: MessageGroupKind;
  direction: 'incoming' | 'outgoing';
  authorKey: string | null;
  messages: HumanSupportMessage[];
  displayMeta?: MessageDisplayMetadata[];
}
```

Grouping rules when `isHumanSupportFeatureEnabled === true`:
1. Each `type === 'human_support_event'` produces its own `{ kind: 'milestone', direction: 'incoming', authorKey: null, messages: [msg] }`.
2. Consecutive `type === 'conversation_status'` messages produce `{ kind: 'conversation_status', direction: msg.direction, authorKey: null, messages: [...] }` (preserving existing 2+ cart-notice collapsing without ever merging with milestones, `FR-009`).
3. Regular messages group consecutively while `getAuthorKey(msg.author, msg.direction)` matches the previous regular message's `authorKey`:
   - `contact` -> `'contact'`
   - `ai_agent` -> `'ai_agent'`
   - `human_agent` with `id` -> `'human_agent:' + author.id`
   - `human_agent` without `id` -> `'human_agent:system'`
   - `author` absent (pre-launch) -> `'legacy:' + direction`

### `MessageDisplayMetadata`

Computed per message within a `'messages'` group by `computeMessageDisplayMetadata(groupMessages)`:

| Field | Type | Rule |
|-------|------|------|
| `showAuthorName` | `boolean` | `true` iff index `0` in group AND `author?.type === 'human_agent'` AND `Boolean(author.name?.trim())`. |
| `authorName` | `string \| undefined` | Trimmed `author.name` when `showAuthorName` is `true`; `undefined` otherwise. |
| `showTimestamp` | `boolean` | `false` when `author` is absent or `timestamp` is invalid or `status === 'streaming'`. Otherwise `true` iff this message is the last item of a consecutive same-local-minute (`YYYY-MM-DD HH:MM`) sub-run (stopping before any streaming message) OR `status === 'error'` (so send failures never disappear). |
| `visibleStatus` | `ShopperMessageStatus \| null` | Non-null only for `direction === 'outgoing'` with `author` present when `status` is `'pending' \| 'sent' \| 'delivered' \| 'read' \| 'error'`. Rendered alongside the timestamp when `showTimestamp` is `true` (and always rendered when `status === 'error'`). |

### `SupportedLocale` & `StatusMetaDescriptor`

```ts
export type SupportedLocale = 'en' | 'pt' | 'es';

export interface StatusMetaDescriptor {
  icon: 'schedule' | 'check' | 'done_all' | 'error';
  color: 'fg-base-soft' | 'sl-color-blue-10' | 'fg-critical';
  ariaLabelKey: string;
  includesTime: boolean;
}
```

## 3. State Transitions

### Shopper Outgoing Message Status (`MessageMeta`)

| Mode | Trigger | `message.status` | Visual Output (`MessageMeta`) |
|------|---------|------------------|-------------------------------|
| Human support (`active: true`) | Local send / offline | `'pending'` | Timestamp + `schedule` (`#707070`), muted bubble text (`$semantic-colors-light-fg`) |
| Human support (`active: true`) | `message_saved` (socket 2xx from courier) | `'sent'` | Timestamp + `check` (`#707070`) |
| Human support (`active: true`) | `message_status` (`delivered`, incl. queued) | `'delivered'` | Timestamp + `done_all` (`#707070`) |
| Human support (`active: true`, read confirm ON) | `message_status` (`read`, single or batch) | `'read'` | Timestamp + `done_all` (`#0366DD`) |
| Human support (`active: true`, read confirm OFF) | Agent opens room (no `msg.read` emitted) | stays `'delivered'` | Timestamp + `done_all` (`#707070`), zero notice (`FR-048`, `FR-051`) |
| Human support -> Ended | `human_support_event` (`ended`) | unchanged (frozen) | Retains last reached status icon (`FR-021`) |
| Any mode | Send failure | `'error'` | Timestamp + `error` (`#E53E3E`), no text/retry (`FR-023`) |
| AI mode (`active: false`) | Local send | `'pending'` -> cleared | Clock while pending, then timestamp only — never `✓` or `✓✓` (`FR-022`) |

### Polite Live Announcement Tracking (`MessagesList` Local Refs)

- `seenMilestoneIdsRef: Set<string>`:
  - Initialized on mount with all `humanSupportEvent.eventId` already present in `messages`.
  - Updated on `history:loaded` with all loaded milestone IDs (never announcing history).
  - On subsequent renders, any unseen valid milestone `eventId` is added to `seenMilestoneIdsRef` and its formatted localized text is pushed to `ComponentAnnouncementRegion`.
- `lastAnnouncedTypingLabelRef: string | null`:
  - When human agent typing becomes visible with `label` and `label !== lastAnnouncedTypingLabelRef.current`, sets ref to `label` and pushes `label` to `ComponentAnnouncementRegion`.
  - When human agent typing hides (`!isTyping || typingAuthor?.type !== 'human_agent'`), resets ref to `null`. Repeated heartbeats with the same `label` do not re-announce.

## 4. Dev-Only Visual Debug Entities (`src/dev/simulateHumanSupport.ts`)

```ts
export interface HumanSupportScenarioStep {
  delayMs: number;
  apply: (ctx: DevHumanSupportRunContext) => Promise<void> | void;
}

export interface HumanSupportScenario {
  id: string;
  buttonId: string;
  label: string;
  steps: HumanSupportScenarioStep[];
}
```

Excluded from production builds (`src/index.js`, `src/standalone.jsx`). Used solely by `src/index.jsx` in `npm run dev` and verified by `src/dev/simulateHumanSupport.test.ts`.
