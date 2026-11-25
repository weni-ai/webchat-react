# Data Model: Shopping Assistant Components Streaming (`webchat-react`)

**Feature**: `015-components-streaming`  
**Date**: 2026-11-24  
**Spec**: [specs/015-components-streaming/spec.md](./spec.md)  
**Upstream Contract**: `contracts/messages/webchat-service-message.schema.json` (pinned commit `fe00c1ce98126044f7b5770fb75d54aadc88d34d`)

> **Persistence note**: `webchat-react` persists no new entities in `localStorage`, `sessionStorage`, or any datastore (`BD-007`). All entities below are in-memory TypeScript models consumed from `@weni/webchat-service` or held transiently inside per-message React hook state.

## 1. Consumed Service Entities (`@weni/webchat-service` -> `webchat-react`)

### `ComponentType`

Fixed union of streaming component kinds in scope (`BD-009`), ordered in fixed display order (`BD-006`, `FR-026`):

```ts
export type ComponentType = 'list_message' | 'cta_message' | 'quick_replies';

export const COMPONENT_DISPLAY_ORDER: readonly ComponentType[] = [
  'list_message',
  'cta_message',
  'quick_replies',
] as const;
```

### `StreamPhase`

Lifecycle phase emitted on live streamed incoming messages (`AD-005`). Omitted (`undefined`) on history, reloaded, reconnected, or non-streamed messages (`BD-007`, `FR-029`).

```ts
export type StreamPhase =
  | 'streaming_text'
  | 'awaiting_components'
  | 'completed';
```

### `ComponentHint`

Ephemeral hint normalized to `camelCase` by `@weni/webchat-service` (`AD-005`). Never carries a CTA URL (`BD-004`, Privacy).

| Field | Type | Required | Validation Rule |
|-------|------|----------|-----------------|
| `componentType` | `ComponentType` | yes | Must be one of `'list_message' \| 'cta_message' \| 'quick_replies'`; invalid entries discarded with structured `console.warn`. |
| `labels` | `string[]` | no | When present, filtered to non-empty strings; drives in-flow skeleton sizing (`FR-006`). When omitted or empty, fallback widths apply (`120px`, `210px` for CTA). |
| `count` | `number` | no | Positive integer (`>= 1`). Used for skeleton placeholder count when `labels` are omitted; defaults to `labels.length` when `labels` are present, otherwise `1`. |
| `itemCount` | `number` | no | Positive integer (`>= 1`). Applicable only to `list_message` (`AD-006`); ignored for other types. |

### Component Payloads on `Message`

Legacy wire-compatible field names preserved by `@weni/webchat-service` (`AD-005`):

- **`QuickReplyItem`**: `string | { type?: string; title: string; payload?: string }`
  - Normalized at render time to `{ label: string; key: string }`: for strings, `label = item`; for objects, `label = item.title`. Empty/whitespace-only labels are filtered out. Clicking a quick reply always sends `item.label` via `sendMessage(item.label)` (`FR-023`).
- **`ListItem`**: `{ uuid: string; title: string; description?: string }`
- **`ListMessagePayload`**:
  - `button_text: string` (non-empty)
  - `list_items: ListItem[]` (non-empty array)
  - `item_count?: number` (optional positive integer; when present, screen-reader announcement uses counted copy per `AD-006` / `FR-019` / `FR-038`; when absent, generic copy)
- **`CtaMessagePayload`**:
  - `display_text: string` (non-empty)
  - `url: string` (MUST satisfy `/^https?:\/\/.+/i` via `isValidCtaUrl`; invalid/partial URLs are blocked from rendering with structured `console.warn` per `BD-004` / `FR-018`)

### `StreamedMessage` (Augmented `Message` Shape)

Fields read by `StreamedMessageItem` and `useComponentStreamLifecycle`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Correlation identifier (`msg_id`), used in React keys and PII-free warnings. |
| `type` | `string` | `'text' \| 'message'` (or default fallback routed to `MessageText`). |
| `text` | `string` | May be `""` during early hint arrival or textless component responses (`FR-028`). |
| `direction` | `'incoming' \| 'outgoing'` | Only `'incoming'` messages can activate components (`FR-022`). |
| `status` | `'pending' \| 'sent' \| 'delivered' \| 'read' \| 'streaming' \| 'error'` | `'streaming'` while live stream is active. |
| `streamPhase` | `StreamPhase \| undefined` | `undefined` on history/persisted/legacy messages. |
| `componentHints` | `ComponentHint[] \| undefined` | Active hints; cleared (`undefined`) on `stream_end` or disconnect (`FR-012`). |
| `list_message` | `ListMessagePayload \| undefined` | Authoritative list trigger + items. |
| `cta_message` | `CtaMessagePayload \| undefined` | Authoritative CTA button + complete URL. |
| `quick_replies` | `QuickReplyItem[] \| undefined` | Authoritative quick reply labels. |

## 2. Transient UI State Entities (`webchat-react` Local Hook State)

### `ComponentLifecyclePhase`

```ts
export type ComponentLifecyclePhase = 'skeleton' | 'entering' | 'ready';
```

### `ComponentSchedule`

Computed per message when entering `'entering'` or `'ready'` phase, in fixed order (`list_message` -> `cta_message` -> `quick_replies`):

| Field | Type | Rule |
|-------|------|------|
| `totalButtonCount` | `number` | `(hasList ? 1 : 0) + (hasCta ? 1 : 0) + quickReplies.length` |
| `durationMs` | `number` | `0` if `prefersReducedMotion`, else `180` (`COMPONENT_ENTER_DURATION_MS`) |
| `staggerMs` | `number` | `0` if `prefersReducedMotion`, else `computeComponentStaggerMs(totalButtonCount)` (`min(70, 120 / (n - 1))`) |
| `totalSequenceMs` | `number` | `0` if `prefersReducedMotion`, else `computeSequenceDurationMs(totalButtonCount, staggerMs)` (strictly `<= 300ms`) |
| `offsets` | `Record<ComponentType, number>` | `list_message: 0`, `cta_message: hasList ? 1 : 0`, `quick_replies: (hasList ? 1 : 0) + (hasCta ? 1 : 0)` |

### `AnnouncementItem`

Queued into `ComponentAnnouncementRegion` (`aria-live="polite"`) when a live streamed message transitions `'entering' -> 'ready'` AND `isLastMessage === true`:

| Field | Type | Rule |
|-------|------|------|
| `id` | `string` | Unique queue key (`${messageId}:${componentType}:${seq}`) |
| `text` | `string` | Localized via `t()` from `streaming_components.*`. Never includes `cta_message.url`. |

## 3. State Machine Transitions (`useComponentStreamLifecycle`)

```text
Mount check:
  ├── message.status !== 'streaming' (history / reload / closed-chat completed / legacy)
  │     └──▶ READY (shouldAnimate = false, no skeleton, no announcement)
  └── message.status === 'streaming' (live stream or returned mid-stream)
        └──▶ SKELETON (wasObservedStreaming = true)

From SKELETON:
  ├── while (isBuffering || isTextStreaming)
  │     └── stay SKELETON; render skeletons for valid componentHints not in timedOutTypes;
  │         real components NOT mounted (BD-001).
  │
  ├── when ((!isBuffering && !isTextStreaming) OR message.text === '') AND pending hinted component exists
  │     └── stay SKELETON; start 10_000ms wait timer (for textless responses where message.text === '',
  │         starts immediately on hint arrival even if streamPhase === 'streaming_text', and cancels/resets
  │         if text deltas arrive later before restarting once text finishes).
  │         ├── 10_000ms expires ─▶ add missing hinted types to timedOutTypes, log console.warn:
  │         │     ├── any complete component exists ─▶ ENTERING (FR-026)
  │         │     └── no complete component exists ─▶ READY (text-only, no error UI, FR-011)
  │         └── streamPhase === 'completed' / disconnect with no delivered components ─▶
  │               READY (skeletons removed immediately, partial text stays, FR-012)
  │
  └── when (!isBuffering && !isTextStreaming) AND all non-timed-out hinted components are ready
      (or streamPhase === 'completed' with delivered components and no prior hints — BD-008)
        ├── prefersReducedMotion === true ─▶ READY (shouldAnimate = false, announce if isLastMessage)
        └── prefersReducedMotion === false ─▶ ENTERING (mount real components disabled=true,
              start timer for totalSequenceMs <= 300ms)

From ENTERING:
  └── totalSequenceMs timer completes ─▶ READY:
        ├── if isLastMessage && !hasUserSubmitted ─▶ components active (disabled=false) +
        │     enqueue ordered aria-live="polite" announcements
        └── if !isLastMessage (shopper sent message mid-stream, FR-031, or newer message arrived) ─▶
              components remain disabled=true, no announcement

From READY:
  ├── isLastMessage becomes false ─▶ components immediately become disabled=true (FR-022)
  └── user clicks QuickReply or submits ListMessage ─▶ immediate local click lock +
        sendMessage appends outgoing message ─▶ isLastMessage becomes false (FR-023, FR-024)
```

## 4. Dev Simulation Scenario Entity (`src/dev/simulateComponentStreams.ts`)

Development-only model used solely by `src/index.jsx`:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique scenario identifier (e.g., `'qr-3'`, `'cta-delayed'`, `'multi-component'`). |
| `label` | `string` | Button label shown in `src/index.jsx` `#actions`. |
| `buttonId` | `string` | DOM `id` on the dev button (e.g., `simulate-stream-qr-3`). |
| `steps` | `Array<{ delayMs: number; frame: SocketStreamFrame }>` | Ordered `socket-stream-frames.schema.json` frames replayed via `window.WebChat.simulateMessageReceived` (with automatic `AD-005` state fallback when running against `@weni/webchat-service` `1.21.0`). |
