# Research: PDP Conversation Starters

**Branch**: `003-pdp-conversation-starters` | **Date**: 2026-03-14

## R1: Service API Compatibility (webchat-service)

**Decision**: Use the existing `getStarters()`, `clearStarters()`, and event APIs from `@weni/webchat-service` 1.9.0 exactly as implemented.

**Rationale**: The webchat-service already implements the full starters WebSocket bridge. The React frontend must be a compatible consumer, not reimplement the protocol.

**Key implementation details from webchat-service**:

- `getStarters(productData)` validates input, checks `isConnected()`, sets fingerprint `account:linkText`, builds payload, sends via WebSocket.
- Throws `Error('WebSocket not connected')` if called when disconnected — frontend must check connection state first.
- `clearStarters()` sets fingerprint to `null`, causing in-flight responses to be silently discarded.
- Events: `starters:received` (payload `{ questions: string[] }`), `starters:error` (payload `{ error: string }`).
- Fingerprint is cleared after emitting either event — only one response per request is forwarded.

**StartersData interface**:

```typescript
interface StartersData {
  account: string       // Required: VTEX store identifier
  linkText: string      // Required: Product slug
  productName?: string  // Product display name
  description?: string  // Product description
  brand?: string        // Brand name
  attributes?: Record<string, string>  // Product properties (e.g. {"Storage": "64GB, 256GB"})
}
```

**Alternatives considered**:
- Direct WebSocket messages from React: Rejected — duplicates logic, bypasses fingerprinting and validation.
- HTTP endpoint: Rejected — architecture uses existing WebSocket connection to avoid CORS and extra handshake.

---

## R2: VTEX PDP Detection Strategy

**Decision**: Detect PDP pages via URL pathname regex `\/[^/]+\/p\/?$` matching the VTEX canonical pattern `/{slug}/p`.

**Rationale**: This is the standard VTEX PDP URL pattern. The regex is simple, reliable, and matches both with and without trailing slash.

**URLs that activate detection**:
- `/ipad-10th-gen/p`
- `/tenis-adidas-ultraboost/p`
- `/smartphone-galaxy-s24/p/`

**URLs that do NOT activate**:
- `/category/smartphones`
- `/search?q=fone`
- `/checkout`

**Alternatives considered**:
- DOM-based detection (look for product elements): Rejected — fragile, depends on store theme.
- `window.__RUNTIME__.page` check: Considered but URL regex is more universal and works even without VTEX IO runtime.

---

## R3: VTEX Product Data Extraction

**Decision**: Fetch product data from the VTEX Intelligent Search API at `/api/io/_v/api/intelligent-search/product_search/{slug}` (same-origin relative URL).

**Rationale**: This is the documented VTEX API for product search. Same-origin avoids CORS. The response includes all fields needed for `StartersData`.

**Product selection from API response**:
```javascript
data.products.find(p => p.linkText === slug) || data.products[0]
```

**Account extraction**:
```javascript
window.__RUNTIME__?.account || window.location.hostname.split('.')[0]
```

**Properties filtering**: Exclude internal fields from `product.properties`:
- Known internals: `sellerId`, `commercialConditionId`, `cluster_highlights`, `allSpecifications`
- Heuristic: filter properties whose `name` matches known internal patterns or use an exclusion list.

**Alternatives considered**:
- Reading product data from DOM: Rejected — fragile and theme-dependent.
- `window.__RUNTIME__.product`: Not always populated; Intelligent Search API is more reliable and provides all required fields.

---

## R4: VTEX SKU Selection Detection

**Decision**: Use a multi-strategy approach to detect the currently selected SKU:
1. **Primary**: Extract from VTEX product page state via `window.__RUNTIME__` or VTEX store state (`window.__STATE__`)
2. **Secondary**: Parse `skuId` query parameter from URL (VTEX stores update URL on SKU selection in some configurations)
3. **Tertiary**: Match selected SKU from DOM (selected variant buttons/dropdowns) against the `items` array from the Intelligent Search API response
4. **Fallback**: Use the first available SKU from `product.items`

**Rationale**: Since the webchat is an external script (not a VTEX IO React component), it cannot use `useProduct()` hooks. However, VTEX stores typically expose SKU selection state through multiple channels. The multi-strategy approach ensures reliability across different VTEX store configurations.

**SKU change detection**: Use `MutationObserver` on the product page's SKU selector area, combined with URL change monitoring (for stores that update `?skuId=` on selection). This is run as a debounced operation (300ms) to avoid excessive context updates.

**Context format** (string for `service.setContext()`):
```
Product: iPad 10th Gen
Brand: Apple
Selected variant: Blue, 256GB
Price: R$ 3.999,00
Availability: In stock
Specifications:
- Storage: 256GB
- Color: Blue
- Connectivity: WiFi
```

**Alternatives considered**:
- Only product-level context: Rejected by stakeholder — SKU-level context is needed for variant-specific questions.
- JSON as context string: Rejected — natural language context is more useful for the AI.
- VTEX `vtex.product-context`: Not accessible from external scripts.

---

## R5: SPA Navigation Detection

**Decision**: Dual-strategy navigation monitoring:
1. **VTEX IO**: Listen for `vtex:pageView` events via `window.addEventListener('message', handler)` — these are dispatched via `postMessage`.
2. **Fallback**: Patch `history.pushState` and `history.replaceState` + listen for `popstate` event.

**Rationale**: VTEX IO stores fire `vtex:pageView` on navigation, which is the most reliable signal. The History API fallback covers non-VTEX-IO SPAs and edge cases.

**Implementation pattern**:
```javascript
// VTEX IO
window.addEventListener('message', (event) => {
  if (event.data?.eventName === 'vtex:pageView') { onNavigate(); }
});

// Fallback: patch History API
const originalPush = history.pushState;
history.pushState = function(...args) {
  originalPush.apply(this, args);
  onNavigate();
};
// + same for replaceState + popstate listener
```

**Cleanup**: All patches and listeners must be removed on widget destroy.

**Alternatives considered**:
- `MutationObserver` on `<title>` or URL polling: Rejected — less reliable and higher performance cost.
- Only VTEX IO events: Rejected — must work in non-VTEX-IO environments for the manual API use case.

---

## R6: Widget Integration Architecture

**Decision**: Implement conversation starters as a new module within the existing Widget/ChatContext architecture:

1. **New hook**: `useConversationStarters()` — manages starters state, PDP detection, VTEX API calls, service event listeners, navigation monitoring, SKU context, mobile auto-hide.
2. **New component**: `ConversationStarters` — renders starter buttons (reuses `Button` component with themed borders).
3. **Compact variant**: Rendered inside `WidgetContent` (in `Widget.jsx`), between `Chat` and `Launcher` in the flex column — naturally positions above the launcher.
4. **Full variant**: Rendered inside `MessagesList.jsx` when starters are available.
5. **State**: Managed via React state in `ChatContext` or the custom hook, not as messages.

**Rationale**: Following the existing architecture patterns:
- `ChatContext` is the integration point with the service (like voice mode, tooltips).
- Hooks encapsulate complex logic (like `useWeniChat`, voice mode).
- Components reuse `Button` and design tokens (like `QuickReplies`).

**Alternatives considered**:
- Store starters as "special messages": Rejected — starters have unique lifecycle (clear on navigation, show in compact mode outside chat) that doesn't fit the message model.
- Separate context for starters: Rejected — `ChatContext` already manages all widget state, adding a separate context would fragment state management.

---

## R7: Mobile Detection and Auto-Hide

**Decision**: Use `window.matchMedia('(max-width: 768px)')` for mobile detection. Auto-hide floating starters after 5 seconds with a CSS fade-out animation.

**Rationale**: `matchMedia` is the standard and performant way to check viewport size. 768px is the common mobile breakpoint. CSS animations match the existing widget animation patterns (`weni-slide-in`, `weni-slide-out`).

**Implementation**:
- On starters received: start 5s timer if mobile.
- On timer expiry: set `isCompactVisible = false` with fade-out animation.
- On starter click before timer: cancel timer, send message, clear starters.
- On navigation: cancel timer, clear starters.

**Alternatives considered**:
- User-Agent detection: Rejected — unreliable and doesn't account for responsive desktop browsers.
- Touch event detection: Rejected — touchscreen laptops would trigger mobile behavior.

---

## R8: Race Condition Handling (Click While Chat Closed)

**Decision**: Use a `useRef` to store the pending starter message text. A `useEffect` watches `isChatOpen` and sends the stored message once the chat is open and the WebSocket is connected.

**Rationale**: This pattern is explicitly described in the architecture document and avoids the message being lost when the chat/connection aren't ready. `useRef` survives re-renders without triggering them, making it ideal for transient pending state.

**Flow**:
1. User clicks compact starter → store text in `pendingStarterRef.current`
2. Call `setIsChatOpen(true)`
3. `useEffect` on `isChatOpen` fires → if `pendingStarterRef.current` exists and `service.isConnected()`, call `sendMessage(text)` and clear the ref.
4. If `connectOn: 'demand'`, the `isChatOpen` effect in `ChatContext` triggers `service.connect()` first — the starters effect waits for connection.

**Alternatives considered**:
- Queuing in the service: Rejected — service `sendMessage` requires active connection.
- `setTimeout` polling: Rejected — fragile, non-deterministic.
