# Contracts: Shopping Assistant Components Streaming (`webchat-react`)

**Feature**: `015-components-streaming`  
**Date**: 2026-11-24  
**Spec**: [specs/015-components-streaming/spec.md](./spec.md)

## 1. Upstream Contract Consumed from `@weni/webchat-service`

Defined authoritatively in [`contracts/messages/webchat-service-message.schema.json`](https://github.com/weni-ai/vtex-cx-experience-specs/blob/fe00c1ce98126044f7b5770fb75d54aadc88d34d/specs/019-sa-components-streaming/contracts/messages/webchat-service-message.schema.json) (`AD-005`, `AD-006`).

- **Peer dependency bump**: `@weni/webchat-service` `1.21.0` -> new MINOR (`1.22.0` once published).
- **Additive `Message` fields consumed**:
  - `streamPhase?: 'streaming_text' | 'awaiting_components' | 'completed'` (omitted on history/persisted/legacy messages)
  - `componentHints?: Array<{ componentType: 'list_message' | 'cta_message' | 'quick_replies'; labels?: string[]; count?: number; itemCount?: number }>` (cleared on `stream_end` and WebSocket disconnect/close; never persisted)
  - `list_message?: { button_text: string; list_items: Array<{ uuid: string; title: string; description?: string }>; item_count?: number }`
  - `cta_message?: { display_text: string; url: string }` (restored in `HistoryManager.processHistory`)
  - `quick_replies?: Array<string | { type?: string; title: string; payload?: string }>`
- **Graceful degradation (`BD-008`)**: When `componentHints` and `streamPhase` are absent (older service or non-hinting agent), `webchat-react` renders zero skeletons and applies the staggered entrance on completion for streamed messages, or final state immediately for non-streamed/history messages.

## 2. React Component Props Contracts (Additive MINOR)

All existing exported components (`src/index.js`) preserve backward compatibility. Every new prop is optional with non-animated defaults.

### `MessageText` (`src/components/Messages/MessageText.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `StreamedMessage` | required | Existing prop; extended `prop-types` for `streamPhase`, `componentHints`, `list_message.item_count`. |
| `componentsEnabled` | `boolean` | `false` | Existing prop; whether interactive controls are enabled. |
| `displayedText` | `string \| undefined` | `undefined` | Optional externally buffered text supplied by `StreamedMessageItem`; when omitted, `MessageText` falls back to internal `useStreamingBuffer`. |
| `isBuffering` | `boolean \| undefined` | `undefined` | Optional externally tracked buffering flag supplied by `StreamedMessageItem`. |
| `renderListSlot` | `React.ReactNode \| undefined` | `undefined` | Optional override slot for `ListMessage` or its `ComponentSkeleton` rendered in exact `.weni-list-message` position. |
| `renderCtaSlot` | `React.ReactNode \| undefined` | `undefined` | Optional override slot for `CallToAction` or its `ComponentSkeleton` rendered in exact `.weni-call-to-action` position. |

### `QuickReplies`, `ListMessage`, `CallToAction` (Additive Animation Props)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `animate` | `boolean` | `false` | Enables CSS entrance animation (`pop-in` for `QuickReplies`/`ListMessage`, `grow-in` for `CallToAction`). |
| `staggerOffset` | `number` | `0` | Zero-based starting index within the message's unified button sequence (`BD-006`). |
| `staggerMs` | `number` | `0` | Delay increment per button in milliseconds (`<= 70ms`). |
| `durationMs` | `number` | `180` | Individual button entrance duration in milliseconds (`0` under reduced motion). |

### `views/ListMessage` (`src/views/ListMessage.jsx`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `string[]` | required | Existing option titles. |
| `animateEntrance` | `boolean` | `false` | When `true` (passed by `TextComponents/ListMessage`), animates list options in sequence (`180ms`, `min(40, 120 / (n - 1))` ms stagger, `<= 300ms` total; `0ms` under reduced motion). |

### New Internal Components

- **`ComponentSkeleton`** (`src/components/Messages/TextComponents/ComponentSkeleton.tsx`):
  - Props: `{ variant: ComponentType; labels?: string[]; count?: number }`
  - Renders `aria-hidden="true"` non-focusable `<span>` shimmer boxes matching the target button's box model and wrapping, or default widths (`120px`, `210px` for CTA) when `labels` are omitted.
- **`StreamedMessageItem`** (`src/components/Messages/StreamedMessageItem.tsx`):
  - Props: `{ message: StreamedMessage; direction: 'incoming' | 'outgoing'; isLastMessage: boolean; onAnnounce: (messages: string[]) => void }`
- **`ComponentAnnouncementRegion`** (`src/components/Messages/ComponentAnnouncementRegion.tsx`):
  - Props: `{ announcements: AnnouncementItem[] }`
  - Renders `<div className="weni-sr-only" role="status" aria-live="polite" aria-atomic="true">`.

## 3. BEM CSS & Design Token Surface (Additive MINOR)

All new selectors use the `weni-` BEM prefix and are automatically scoped under `.weni-widget` by `postcss-prefix-selector`.

| Class / Keyframe / Variable | Scope | Purpose |
|-----------------------------|-------|---------|
| `.weni-component-skeleton` | `ComponentSkeleton.scss` | Shimmer skeleton wrapper (`aria-hidden="true"`). |
| `.weni-component-skeleton__item`, `--quick-reply`, `--list`, `--cta`, `--fallback` | `ComponentSkeleton.scss` | Individual placeholder box matching `FSButton` / `Button` dimensions and border-radius (`$fs-color-main-0`, `$fs-border-color`). |
| `.weni-component-skeleton__sizer` | `ComponentSkeleton.scss` | In-flow `visibility: hidden` text/icon sizer guaranteeing 0px shift on swap. |
| `.weni-component-enter--pop`, `.weni-component-enter--grow` | `QuickReplies.scss`, `ListMessage.scss`, `CallToAction.scss`, `views/ListMessage.scss` | Applies entrance keyframes driven by `--weni-enter-duration` and `--weni-enter-delay`. |
| `.weni-sr-only` | `ComponentAnnouncementRegion.scss` | Visually hidden live region accessible to screen readers. |
| `weni-component-pop-in`, `weni-component-grow-in`, `weni-skeleton-shimmer` | `src/styles/animations.scss` | Reusable `@keyframes` only (no selector rules in `animations.scss`, avoiding CSS duplication across `@use` imports). |
| Design-reference CSS variables (`--weni-component-enter-easing`, `--weni-skeleton-shimmer-duration`, `--weni-component-pop-offset`, `--weni-component-grow-scale`, `--weni-component-state-transition`) | Consumed via `var(--weni-..., <default>)` in `ComponentSkeleton.scss` and component SCSS | Defaults match BD-005 prototype values (`cubic-bezier(0.2, 0.8, 0.2, 1)`, `1.2s`, `6px`, `0.94`, `150ms`) so Design or themes can override them without JS edits or duplicated CSS blocks. |

## 4. Internationalization Key Contract (`src/i18n/locales/en.json` ONLY)

Per Constitution `Internationalization` and `crowdin.yml`, ONLY `src/i18n/locales/en.json` is edited. Crowdin delivers `pt.json` and `es.json` post-merge; `ro` resolves to `en` via `fallbackLng: 'en'`.

```json
"streaming_components": {
  "cta_available": "{{label}} link available",
  "list_available": "List of options available",
  "list_available_with_count": "List with {{count}} options available",
  "quick_replies_available": "{{count}} options available"
}
```

## 5. Structured Observability Contract

Prefix: `[WebChat:ComponentStreaming]` via `console.warn` (never `console.log`).

```ts
type ComponentStreamingWarningContext = {
  channelUuid?: string;
  sessionId?: string;
  messageId: string;
  componentType?: ComponentType | string;
  componentTypes?: ComponentType[];
  reason: 'invalid_hint' | 'invalid_cta_url' | 'component_timeout';
};
```

**Forbidden fields in logs**: `text`, `labels`, `button_text`, `list_items`, `display_text`, `url`.

## 6. Development-Only Simulation Harness Contract (`src/index.jsx` + `src/dev/simulateComponentStreams.ts`)

- **Not a public contract**: Excluded from `dist/` (`vite.config.js` -> `src/index.js`) and `dist-standalone/` (`vite.config.standalone.js` -> `src/standalone.jsx`). Zero changes to `window.WebChat`.
- **Wire frames replayed**: Matches [`contracts/messages/socket-stream-frames.schema.json`](https://github.com/weni-ai/vtex-cx-experience-specs/blob/fe00c1ce98126044f7b5770fb75d54aadc88d34d/specs/019-sa-components-streaming/contracts/messages/socket-stream-frames.schema.json) (`typing_start`, `stream_start`, `stream_component_hint`, `{ v, seq }`, `stream_text_end`, `stream_component`, `stream_end`) via `window.WebChat.simulateMessageReceived(...)`, with automatic `AD-005` `state:changed` fallback when running against `@weni/webchat-service` `1.21.0`.
