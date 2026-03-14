# Contract: Public API (window.WebChat)

**Branch**: `003-pdp-conversation-starters` | **Date**: 2026-03-14

## New Init Configuration

### `conversationStarters` (in `WebChat.init()` params)

```javascript
WebChat.init({
  selector: '#weni-webchat',
  socketUrl: 'https://websocket.weni.ai',
  host: 'https://flows.weni.ai',
  channelUuid: 'YOUR-CHANNEL-UUID',

  conversationStarters: {
    pdp: true,  // Enable automatic PDP detection
  },
});
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `conversationStarters` | `object \| undefined` | `undefined` | Conversation starters configuration |
| `conversationStarters.pdp` | `boolean` | `false` | Enable automatic VTEX PDP detection and AI-generated starters |

When `conversationStarters.pdp` is `true`:
- Widget detects VTEX PDP pages via URL pattern
- Extracts product data from VTEX Intelligent Search API
- Requests starters via `service.getStarters(productData)`
- Monitors SPA navigation for page changes
- Sets SKU-level context via `service.setContext()`

---

## New Public Method

### `WebChat.setConversationStarters(questions)`

Sets conversation starters programmatically. Replaces any existing starters (both manual and auto-generated).

```javascript
WebChat.setConversationStarters([
  "Qual o prazo de garantia do produto?",
  "Funciona com 110V e 220V?",
  "Tem assistência técnica autorizada?"
]);
```

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `questions` | `string[]` | Yes | Array of 1–3 question strings |

**Behavior**:
- Accepts 1–3 non-empty strings
- Replaces any existing starters (both `pdp` and `manual` sources)
- Invalid input (not an array, empty array, >3 items, non-string items) is silently ignored in production; logs a warning in development
- Can be called at any time after `WebChat.init()`
- If called before `init()`, the call is ignored
- If `conversationStarters.pdp` is enabled and the user navigates to a new PDP, these manual starters are cleared and auto-detection takes over

**Returns**: `void`

**Example — replace starters**:
```javascript
WebChat.setConversationStarters(["Q1?", "Q2?"]);
// Later...
WebChat.setConversationStarters(["NewQ1?", "NewQ2?", "NewQ3?"]);
// Now displays NewQ1, NewQ2, NewQ3
```

---

## Service Events Consumed

These events from `@weni/webchat-service` are consumed by the React frontend:

| Event | Payload | Action |
|-------|---------|--------|
| `starters:received` | `{ questions: string[] }` | Store questions, show starters, stop loading |
| `starters:error` | `{ error: string }` | Stop loading, keep starters hidden (silent failure) |

---

## Service Methods Called

| Method | When Called | Purpose |
|--------|-----------|---------|
| `service.getStarters(productData)` | PDP detected + connected | Request AI-generated starters |
| `service.clearStarters()` | Navigation away from PDP | Discard in-flight starters responses |
| `service.setContext(contextString)` | PDP detected + SKU selected | Set SKU context for AI |
| `service.isConnected()` | Before `getStarters()` | Verify WebSocket is ready |
| `service.sendMessage(text)` | User clicks a starter | Send question as user message |

---

## Component Contract: ConversationStarters

### Props (Compact variant — floating above launcher)

```typescript
interface ConversationStartersCompactProps {
  questions: string[];
  onStarterClick: (question: string) => void;
  isVisible: boolean;
  isHiding: boolean;  // Triggers fade-out animation on mobile
}
```

### Props (Full variant — inside chat)

```typescript
interface ConversationStartersFullProps {
  questions: string[];
  onStarterClick: (question: string) => void;
}
```

### Styling Contract

Compact variant buttons:
- Background: `#272B2F` (dark, matching screenshots)
- Text color: `white`
- Border radius: pill shape (`9999px`)
- Max width: `var(--weni-widget-width, 360px)`
- Text: max 2 lines, ellipsis overflow
- Animation: `weni-slide-in` on enter, `weni-slide-out` on mobile auto-hide

Full variant buttons:
- Background: `transparent`
- Text color: `var(--weni-main-color)`
- Border: `1px solid var(--weni-main-color)`
- Border radius: pill shape (`9999px`)
- Text: max 2 lines, ellipsis overflow
