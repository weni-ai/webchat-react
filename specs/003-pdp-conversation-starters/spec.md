# Feature Specification: PDP Conversation Starters

**Feature Branch**: `003-pdp-conversation-starters`  
**Created**: 2026-03-14  
**Status**: Draft  
**Input**: Conversation starters for product pages with automatic VTEX PDP detection, manual API, floating/in-chat display, SKU-level context, and SPA navigation handling.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic PDP Conversation Starters (Priority: P1)

A shopper navigates to a VTEX product detail page (PDP). The webchat widget automatically detects the PDP, extracts product data via the VTEX Intelligent Search API, and requests conversation starters from the backend over WebSocket. Up to 3 suggested questions appear as floating buttons above the launcher (compact variant) while the chat is closed. When the chat is open, the starters appear inside the conversation area (full variant). The buttons use the widget's primary color as their border.

**Why this priority**: This is the core value proposition — AI-generated, product-specific conversation starters that appear automatically without any integrator code beyond enabling the flag. It drives engagement on product pages.

**Independent Test**: Can be fully tested by navigating to a VTEX PDP with `conversationStarters.pdp: true` in the init config. Starters should appear above the launcher within a few seconds. Clicking one opens the chat and sends the question as a user message.

**Acceptance Scenarios**:

1. **Given** the webchat is initialized with `conversationStarters: { pdp: true }` and the user is on a VTEX PDP (`/{slug}/p`), **When** the page loads and the WebSocket is connected, **Then** the widget extracts product data from the VTEX Intelligent Search API, sends a `get_pdp_starters` event via the service, and displays up to 3 conversation starter buttons above the launcher.

2. **Given** conversation starters have been received for the current product, **When** the chat is closed, **Then** the starters appear as floating buttons (compact variant) positioned above the launcher, aligned to the right, with the primary color as the button border, and text truncated to 2 lines with ellipsis if it exceeds.

3. **Given** conversation starters have been received for the current product, **When** the chat is open, **Then** the starters appear inside the conversation area (full variant) at the top of the message list, with the primary color as the button border.

4. **Given** conversation starters are displayed (compact variant) and the chat is closed, **When** the user clicks a starter button, **Then** the chat opens, the clicked question is sent as a user message (as if the user typed it), and all starters are removed from both compact and full views.

5. **Given** conversation starters are displayed (full variant) and the chat is open, **When** the user clicks a starter button, **Then** the question is sent as a user message and all starters are removed.

6. **Given** the user opens the chat without clicking any floating starter, **When** the chat opens, **Then** the conversation starters are displayed inside the conversation area (full variant) so the user can still interact with them.

7. **Given** the webchat is on a VTEX PDP, **When** the backend returns an error or no questions, **Then** no starters are displayed and the widget behaves as if the feature is disabled (silent failure).

8. **Given** the user is on a page that does not match the VTEX PDP URL pattern (`/{slug}/p`), **When** the page loads, **Then** no product detection or starters request occurs.

---

### User Story 2 - SPA Navigation and Page-Specific Lifecycle (Priority: P1)

The webchat handles Single Page Application (SPA) navigation in VTEX stores. When the user navigates to a new page, existing conversation starters are immediately cleared. If the new page is a PDP, the full detection and generation flow runs again for the new product. If the new page is not a PDP, starters remain empty.

**Why this priority**: Without proper SPA handling, starters from Product A would persist on Product B's page or on non-product pages, creating a broken and confusing experience.

**Independent Test**: Navigate between product pages and non-product pages in a VTEX SPA. Starters should update per-product and disappear on non-PDP pages.

**Acceptance Scenarios**:

1. **Given** starters are displayed for Product A, **When** the user navigates (SPA) to Product B's PDP, **Then** starters for Product A are cleared immediately and starters for Product B are requested and displayed.

2. **Given** starters are displayed for Product A, **When** the user navigates to a non-PDP page (e.g., category, search, checkout), **Then** starters are cleared immediately and no new starters are requested.

3. **Given** the user has an active conversation about Product A and navigates to Product B's PDP, **When** the page loads, **Then** new conversation starters for Product B appear (starters always reflect the current page, regardless of conversation history).

4. **Given** a VTEX IO store, **When** the user navigates between pages, **Then** the widget detects navigation via the `vtex:pageView` event.

5. **Given** a non-VTEX-IO SPA, **When** the user navigates, **Then** the widget detects navigation via `history.pushState`/`history.replaceState` interception and the `popstate` event.

---

### User Story 3 - SKU-Level Context Setting (Priority: P1)

On every product page, the webchat sets the currently selected SKU information as the conversation context. This ensures the AI can answer questions specific to the exact variant (e.g., color, size, storage) the user is looking at, not just the generic product. When the user changes the selected SKU on the page, the context updates accordingly.

**Why this priority**: Without SKU-level context, the AI cannot answer variant-specific questions (e.g., "Is this color available?" or "What's the price of the 256GB version?"). This directly impacts answer quality and user satisfaction.

**Independent Test**: Navigate to a PDP, select different SKU variants, and ask variant-specific questions via the chat. The AI should respond with information matching the currently selected SKU.

**Acceptance Scenarios**:

1. **Given** the user is on a VTEX PDP, **When** the page loads and a SKU is selected, **Then** the webchat sets the conversation context with the selected SKU's information (name, price, availability, image, specifications).

2. **Given** the user is on a VTEX PDP with a specific SKU selected, **When** the user changes the selected SKU (e.g., picks a different color or size), **Then** the conversation context is updated to reflect the newly selected SKU's information.

3. **Given** SKU context is set for a product, **When** the user navigates away from the PDP, **Then** the product-specific context is cleared.

4. **Given** the VTEX page exposes SKU data, **When** reading the selected SKU, **Then** the widget extracts the SKU information from the VTEX store's runtime data or DOM state (e.g., `skuSelector` events, `__RUNTIME__` data, or product page store state).

---

### User Story 4 - Mobile-Specific Floating Behavior (Priority: P2)

On mobile screens, the floating conversation starters (compact variant) appear for approximately 5 seconds after being received, then automatically hide. After hiding, the user can only see the starters by opening the chat (full variant inside the conversation). This prevents the floating buttons from obstructing mobile browsing.

**Why this priority**: Mobile screens have limited space. Persistent floating buttons would obstruct product page content and degrade the shopping experience.

**Independent Test**: Load a PDP on a mobile viewport. Starters should appear above the launcher, then auto-hide after ~5 seconds. Opening the chat should reveal the starters inside the conversation.

**Acceptance Scenarios**:

1. **Given** the user is on a mobile device (or mobile viewport) on a PDP with starters available, **When** starters are received, **Then** the compact variant appears with a slide-in animation and auto-hides after approximately 5 seconds with a fade-out animation.

2. **Given** floating starters have auto-hidden on mobile, **When** the user taps the launcher to open the chat, **Then** the starters are displayed inside the conversation area (full variant).

3. **Given** the user is on a desktop viewport, **When** starters are received, **Then** the compact variant remains visible until the user interacts with the chat or navigates away (no auto-hide).

4. **Given** floating starters are visible on mobile, **When** the user clicks a starter before the auto-hide timer expires, **Then** the chat opens, the question is sent, and starters are removed (timer is cancelled).

---

### User Story 5 - Manual Conversation Starters API (Priority: P2)

Integrators can programmatically set conversation starters via `WebChat.setConversationStarters([...])`. This allows custom starters on any page type (not just VTEX PDPs). Each call replaces the previous starters entirely, with no caching.

**Why this priority**: Provides flexibility for non-VTEX stores or custom scenarios where the integrator wants to control the starters content directly.

**Independent Test**: After `WebChat.init()`, call `WebChat.setConversationStarters(["Q1?", "Q2?", "Q3?"])`. The starters should appear. Call again with different questions — the old ones should be replaced.

**Acceptance Scenarios**:

1. **Given** the webchat is initialized, **When** `WebChat.setConversationStarters(["Q1?", "Q2?"])` is called, **Then** the provided questions are displayed as conversation starter buttons (both compact and full variants, following the same display rules as auto-generated starters).

2. **Given** starters were set via the manual API, **When** `WebChat.setConversationStarters(["NewQ1?", "NewQ2?", "NewQ3?"])` is called, **Then** the previous starters are completely replaced with the new ones.

3. **Given** auto-generated PDP starters are displayed, **When** `WebChat.setConversationStarters([...])` is called, **Then** the auto-generated starters are replaced by the manually set ones.

4. **Given** the manual API is called, **When** the argument is not an array of 1–3 strings, **Then** the call is ignored (or throws a descriptive error in dev mode) and existing starters remain unchanged.

5. **Given** starters were set via the manual API, **When** the user navigates to a new page in an SPA and `conversationStarters.pdp` is enabled, **Then** the manual starters are cleared and auto-detection takes over for the new page.

---

### User Story 6 - Conversation Starters Appearance State Management (Priority: P2)

The widget properly manages the visibility lifecycle of conversation starters across different user interactions: starting a new conversation, switching products, and re-visiting product pages. Starters are always tied to the current page and reset when the user sends a message through them.

**Why this priority**: Without proper state management, stale starters from previous products or dismissed starters could reappear, confusing the user.

**Independent Test**: Interact with starters on Product A, navigate to Product B, navigate back to Product A. Each page should trigger a fresh starters request; previously clicked/dismissed starters should not reappear without a new request.

**Acceptance Scenarios**:

1. **Given** the user clicked a conversation starter and sent a message, **When** they are still on the same PDP, **Then** the starters are no longer displayed (both compact and full variants are removed).

2. **Given** the user sent a message via a starter on Product A's page, **When** they navigate to Product B's PDP, **Then** new starters for Product B appear fresh (the previous dismissal does not carry over).

3. **Given** the user has an ongoing conversation and navigates to a new PDP, **When** starters for the new product are received, **Then** the starters appear inside the chat (full variant) alongside the existing conversation history, giving the user the option to ask about the new product.

4. **Given** starters are loading (request in-flight), **When** the user navigates away before receiving a response, **Then** the in-flight response is discarded (stale response from a previous product must not be displayed on the new page).

---

### Edge Cases

- What happens when the VTEX Intelligent Search API is unreachable or returns empty results? The widget silently skips starters — no error is shown to the user.
- What happens when the WebSocket is not connected when a PDP is detected? The starters request is deferred until the connection is established (demand-connect scenario).
- What happens when the user is on a PDP but `conversationStarters.pdp` is not enabled? No detection or starters generation occurs; the page behaves normally.
- What happens when `setConversationStarters` is called before `init()`? The call is ignored; starters are only accepted after initialization.
- What happens when the same product page is revisited (browser back/forward)? The full detection flow runs again — the backend cache (DynamoDB) ensures fast responses for repeated products.
- What happens when the VTEX `__RUNTIME__` object is not available? The account is derived from the hostname as a fallback (`window.location.hostname.split('.')[0]`).
- What happens when `product.properties` includes internal fields like `sellerId`? Internal properties are filtered out and not sent to the backend.
- What happens during a race condition where the user clicks a compact starter while the chat is still opening? The message text is stored in a ref and sent via a `useEffect` once the chat and WebSocket connection are ready.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect VTEX PDP pages by matching the URL pattern `/{slug}/p` or `/{slug}/p/`.
- **FR-002**: System MUST extract product data from the VTEX Intelligent Search API (`/api/io/_v/api/intelligent-search/product_search/{slug}`) when a PDP is detected.
- **FR-003**: System MUST read the VTEX account from `window.__RUNTIME__.account` with fallback to `window.location.hostname.split('.')[0]`.
- **FR-004**: System MUST extract `linkText`, `productId`, `productName`, `description`, `brand`, and `attributes` (from `product.properties`, filtering internal properties like `sellerId`) from the API response.
- **FR-005**: System MUST select the correct product from the API response by matching `linkText` to the URL slug, falling back to the first result.
- **FR-006**: System MUST call `service.getStarters(productData)` with the extracted product data to request conversation starters via WebSocket.
- **FR-007**: System MUST listen for `starters:received` and `starters:error` events from the service.
- **FR-008**: System MUST display up to 3 conversation starter buttons using the widget's primary color (`--weni-main-color`) as the button border color.
- **FR-009**: System MUST show starters in compact variant (floating above launcher) when the chat is closed, and in full variant (inside conversation area) when the chat is open.
- **FR-010**: System MUST send the clicked starter's text as a user message and remove all starters after a click.
- **FR-011**: System MUST handle the click-while-chat-closed race condition by storing the message in a ref and sending it once the chat and connection are ready.
- **FR-012**: System MUST detect SPA navigation via `vtex:pageView` events (VTEX IO) and `history.pushState`/`replaceState` interception + `popstate` as fallback.
- **FR-013**: System MUST clear starters immediately on any page navigation, then re-evaluate the new page.
- **FR-014**: System MUST call `service.clearStarters()` on navigation away from a PDP to discard in-flight responses.
- **FR-015**: System MUST auto-hide floating starters on mobile screens after approximately 5 seconds.
- **FR-016**: System MUST expose `WebChat.setConversationStarters(questions)` as a public API that accepts 1–3 strings and replaces any existing starters.
- **FR-017**: System MUST set SKU-level product context via `service.setContext()` (or equivalent) on every PDP, using the currently selected SKU's information.
- **FR-018**: System MUST update the SKU context when the user changes the selected variant on the product page.
- **FR-019**: System MUST clear product-specific context when navigating away from a PDP.
- **FR-020**: System MUST show starters inside the conversation (full variant) when the user opens the chat without clicking a floating starter.
- **FR-021**: System MUST support the `conversationStarters: { pdp: true }` configuration flag in `WebChat.init()` to enable automatic PDP detection.
- **FR-022**: System MUST truncate starter button text to a maximum of 2 lines with ellipsis overflow.
- **FR-023**: System MUST animate compact starters with a slide-in entrance (250ms) and fade-out on mobile auto-hide.

### Key Entities

- **ConversationStarters**: A list of 1–3 question strings associated with the current page. Can originate from auto-detection (PDP) or manual API. Has a source (`pdp` | `manual`), a product fingerprint (`account:linkText` for PDP), and a visibility state.
- **ProductData**: Extracted from VTEX API for starters generation. Contains `account`, `linkText`, `productId`, `productName`, `description`, `brand`, `attributes`.
- **SKUContext**: The currently selected SKU variant's information (name, price, availability, image, specifications). Set as the conversation context so the AI can answer variant-specific questions.
- **NavigationMonitor**: Listens for SPA route changes (VTEX `pageView` or History API patches) and triggers starters cleanup + re-evaluation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a VTEX PDP with `conversationStarters.pdp` enabled, conversation starters appear within 3 seconds of page load (assuming backend cache hit).
- **SC-002**: When navigating between product pages in an SPA, starters from the previous product are never visible on the new product's page.
- **SC-003**: Clicking a conversation starter sends the message and opens the chat in under 500ms (perceived latency).
- **SC-004**: On mobile screens, floating starters auto-hide after 5 seconds without user intervention.
- **SC-005**: The manual `setConversationStarters` API updates the displayed starters within 100ms of being called.
- **SC-006**: AI responses to user questions reflect the currently selected SKU's information (e.g., correct price, color, availability for the selected variant).
- **SC-007**: Zero starters-related errors are visible to the end user — all failures are handled silently.
- **SC-008**: The feature has no impact on widget load time for pages where `conversationStarters.pdp` is disabled or the page is not a PDP.
