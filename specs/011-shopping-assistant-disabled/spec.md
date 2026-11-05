# Engineering Specification: Back-in-stock only mode (`shoppingAssistantDisabled`)

**Repository**: webchat-react — frontend

**Feature Branch**: `011-shopping-assistant-disabled`

**Created**: 2026-11-05

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: A store that wants only the back-in-stock notification has to load the whole shopping assistant. The widget always needs `socketUrl` and `channelUuid`, connects to the WebSocket, shows the launcher on every page, and after the form it starts a conversation ("Show me similar products"). There is no way to turn the assistant off and keep only the back-in-stock form.
- Acceptance criteria:
  - A new boolean `init` option, `shoppingAssistantDisabled`, defaults to `false`. With `false` or absent, the widget behaves exactly as it does today.
  - With `shoppingAssistantDisabled: true`, `WebChat.init` works without `socketUrl` and `channelUuid`. No error is thrown and nothing is logged as a failure.
  - With the flag on, the widget never opens a WebSocket connection, never requests conversation starters, never sends `initPayload`, and never shows the tooltip message, during the whole page session.
  - With the flag on, `unavailableProductNotify: true`, and `conversationStarters.pdp: true`, nothing from the widget is visible until a product page resolves to an unavailable SKU. Then the back-in-stock bubble and the launcher appear, exactly as they do today.
  - On a page that is not a product page, or where the selected SKU is available, nothing from the widget is visible (no launcher, no bubble, no chat).
  - Opening the chat lands on the back-in-stock form. "Not now", the header back button, and the close button all close the chat. None of them shows the conversation.
  - After a valid submit, the success state shows the title and description, but not the "While you wait…" prompt and not the "Show me similar products" button. No message is sent.
  - The connection status banner and the message input never render while the flag is on.
  - Navigating to another product page (SPA navigation) clears the offer. If the new SKU is unavailable, the offer shows again. Otherwise the widget hides and, if the chat was open, closes it.

## Scope in This Repository

**This repository implements**:

- The new `init` option `shoppingAssistantDisabled` in `src/standalone.jsx` (`mapConfig`), the `ChatProvider` defaults and `propTypes`, and the `Widget` `propTypes`.
- Placeholder connection values (`socketUrl`, `channelUuid`) and a forced `connectOn: 'manual'` when the flag is on, so the service can be built without a real channel and never connects.
- Turning off every socket-dependent path in the widget while the flag is on: `initPayload`, the tooltip message, conversation starter requests, restoring the persisted open state, the connection banner, the input box, `WebChat.send`, and `WebChat.setConversationStarters`.
- Visibility gating: the widget content (launcher, bubble, chat) renders only while the back-in-stock offer is active or the chat is open on the notify page.
- Closing instead of falling back to the conversation from the notify page, and the reduced success state.

**Out of scope here**:

- Any change to `@weni/webchat-service`. Its constructor still requires `socketUrl` and `channelUuid` (`validateConfig` in `src/utils/validators.js`). The widget satisfies that with placeholder values instead, by decision of the developer. A real "headless" mode in the service is a possible later service spec.
- The back-in-stock rules, payload, and HTTP request. They are owned by the service (webchat-service spec `003`, wired here by spec `010`) and do not change.
- Making the flag imply `unavailableProductNotify` or `conversationStarters.pdp`. Integrators still set both. The flag only turns the assistant off.
- The WhatsApp offers opt-in (`whatsappOffersNotify`). Its balloon is not rendered in this mode; no other change to it.
- Translations. No new string is added.

**Depends on**: `@weni/webchat-service` as already linked for spec `010` (methods `evaluateBackInStockOffer`, `validateBackInStockContact`, `subscribeBackInStock`). This spec relies on three behaviors of the current service, verified in the linked checkout:

- `new WeniWebchatService(config)` only checks that `socketUrl` and `channelUuid` are non-empty strings. It does not contact them.
- `init()` connects only when `mode === 'live'` and `connectOn` is `'mount'`, or `'demand'` with queued messages. With `connectOn: 'manual'` it never connects.
- `runQueue()` connects on its own only when `connectOn === 'demand'`.

## Current State

- `src/standalone.jsx` — `mapConfig` copies `socketUrl` and `channelUuid` unchanged and defaults `connectOn` to `'mount'`. `showMode` and `unavailableProductNotify` are mapped as `params.x || false`. `send` and `setConversationStarters` always reach the service.
- `src/contexts/ChatContext.jsx` — `ChatProvider` builds `WeniWebchatService(mergedConfig)` at mount, so the constructor throws when `socketUrl` or `channelUuid` is missing. `service.init()` then connects (default `connectOn: 'mount'`). After `init`, it sends `initPayload` when there are no messages, and restores `isChatOpen` from `service.getSession()`. The tooltip timer simulates a received message. An effect calls `service.connect()` when the chat opens with `connectOn: 'demand'`. `propTypes` mark `socketUrl` and `channelUuid` as required.
- `src/components/Widget/Widget.jsx` — `WidgetContent` always renders `Chat` and, while the chat is closed, the `OptInBalloon`, `ConversationStartersCompact`, and `Launcher`. `propTypes` require `socketUrl` and `channelUuid`.
- `src/hooks/useConversationStarters.js` — `detectAndFetchPdp` diverts to `showBackInStockNotify` when `service.evaluateBackInStockOffer` says the SKU is unavailable. Otherwise it calls `requestStarters`, which calls `service.getStarters` or defers until connected. Navigation (`applyNavigationChange`) resets the offer state. On open, the hook lands on the `back-in-stock-notify` page (spec `009`). It exposes `isBackInStockNotify`.
- `src/views/BackInStockNotify.jsx` — "Not now" calls `clearPageHistory()`, which shows the conversation. The success state renders `wait_prompt` and a "Show me similar products" button that calls `sendMessage`.
- `src/components/Header/Header.jsx` — the back button calls `goBack`, which empties the page stack and shows the conversation. The close button calls `toggleChat`.
- `src/components/Chat/Chat.jsx` — the footer renders `InputBox` when no page is open, and `ConnectionStatusBanner` always renders. The banner shows an outage while the status is `'disconnected'`, which is the permanent status in this mode.
- `src/utils/conversationStartersLog.js` — the log config records `connectOn` and is set from the widget config.
- Tests: `src/components/Widget/Widget.test.jsx`, `src/components/Chat/Chat.test.jsx`, `src/components/Header/Header.test.jsx`, `src/hooks/useConversationStarters.test.js`, `src/views/BackInStockNotify.test.jsx`, with the service mocked by `test/__mocks__/@weni/webchat-service.js`. `src/standalone.jsx` has no colocated test today.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/utils/constants.js` | modified | Adds `SHOPPING_ASSISTANT_DISABLED_SOCKET_URL` and `SHOPPING_ASSISTANT_DISABLED_CHANNEL_UUID` placeholders, in one place. |
| `src/utils/shoppingAssistantMode.ts` | new | `applyShoppingAssistantMode(config)`: when `shoppingAssistantDisabled` is true, fills missing `socketUrl` and `channelUuid` with the placeholders and forces `connectOn: 'manual'`. Returns the config unchanged otherwise. A pure function, so `ChatProvider` and `standalone` share one rule. TypeScript, see Constitution Alignment. |
| `src/standalone.jsx` | modified | `mapConfig` maps `shoppingAssistantDisabled: params.shoppingAssistantDisabled \|\| false`. `init` warns once when the flag is on but `unavailableProductNotify` or `conversationStarters.pdp` is off, because nothing would ever show. `send` and `setConversationStarters` return early with a `console.warn` while the flag is on. |
| `src/contexts/ChatContext.jsx` | modified | Applies `applyShoppingAssistantMode` before building the service. Skips `initPayload`, the tooltip timer, and the restored open state when the flag is on. Exposes `isShoppingAssistantDisabled`. `propTypes` for `socketUrl` and `channelUuid` become optional, and `shoppingAssistantDisabled` is added. |
| `src/components/Widget/Widget.jsx` | modified | When the flag is on, `WidgetContent` renders nothing unless `isBackInStockNotify` or `isChatOpen`. It never renders `OptInBalloon`. `propTypes` for `socketUrl` and `channelUuid` become optional. |
| `src/hooks/useConversationStarters.js` | modified | When the flag is on, `detectAndFetchPdp` does not call `requestStarters` and `handleConnected` does nothing. When navigation clears the offer and the chat is open, it closes the chat and clears the page stack. |
| `src/views/BackInStockNotify.jsx` | modified | When the flag is on, "Not now" closes the chat and clears the page stack. The success state hides `wait_prompt` and the "Show me similar products" button. |
| `src/components/Header/Header.jsx` | modified | When the flag is on, the back button closes the chat and clears the page stack instead of `goBack`. |
| `src/components/Chat/Chat.jsx` | modified | When the flag is on, `ConnectionStatusBanner` and `InputBox` are not rendered. |
| `src/utils/conversationStartersLog.js` | modified | The log config and the `init` event record `shoppingAssistantDisabled`. |
| `src/index.jsx` | modified | The local demo gets a commented example of the back-in-stock only config. |
| Tests next to each file above, `src/utils/shoppingAssistantMode.test.ts`, `src/standalone.test.ts` | new / modified | See Test Strategy. |
| `tsconfig.json`, Babel and Jest config, `package.json` lint script | new / modified | First TypeScript file in the repo triggers the toolchain setup required by Principle VIII. |
| `CHANGELOG.md` | modified | Added: `shoppingAssistantDisabled` init option. |

### Flow

**Init**

1. The host calls `WebChat.init({ selector, shoppingAssistantDisabled: true, unavailableProductNotify: true, conversationStarters: { pdp: true }, ... })`, without `socketUrl` or `channelUuid`.
2. `mapConfig` maps the flag. `init` checks the two other flags and warns if either is off.
3. `ChatProvider` merges defaults, then calls `applyShoppingAssistantMode`. The service receives `socketUrl: SHOPPING_ASSISTANT_DISABLED_SOCKET_URL`, `channelUuid: SHOPPING_ASSISTANT_DISABLED_CHANNEL_UUID` (or the host's values if given), and `connectOn: 'manual'`.
4. `service.init()` restores the session and does not connect. `ChatProvider` does not send `initPayload`, does not start the tooltip timer, and keeps `isChatOpen` false (unless on checkout, which already closes it).
5. `WidgetContent` sees `isShoppingAssistantDisabled`, no offer, and a closed chat, so it renders nothing.

**Offer**

1. `useConversationStarters` runs `detectAndFetchPdp` as today. The product is resolved over HTTP from the VTEX catalog, not over the socket, and the context string is set locally on the service.
2. If `service.evaluateBackInStockOffer` says the SKU is unavailable, `showBackInStockNotify` sets `isBackInStockNotify`. `WidgetContent` now renders the bubble and the launcher.
3. If the SKU is available, the hook returns without calling `requestStarters`. Nothing renders.

**Form**

1. The shopper opens the chat from the bubble or the launcher. The hook lands on `back-in-stock-notify` (spec `009`, unchanged).
2. Validation and `service.subscribeBackInStock` run as in spec `010`. This is an HTTP call and needs no socket.
3. The success state renders the title and description only.
4. "Not now", the header back button, and the header close button call `setIsChatOpen(false)` and `clearPageHistory()`. The offer stays active, so the launcher and bubble stay visible until navigation clears them, and opening again lands on the form.

**Navigation**

1. `applyNavigationChange` resets the offer as today and runs `detectAndFetchPdp` again.
2. While the flag is on, if the chat was open, it is closed and the page stack is cleared. Then the offer flow above decides whether the widget shows again.

### Rejected Alternatives

- A headless mode in `@weni/webchat-service` (skip `validateConfig` and the WebSocket manager): cleaner, but it needs a service release or link change. The developer chose to fake the connection values in the widget, which keeps this change in one repository.
- Not creating the service at all in this mode: the back-in-stock rules and the subscribe request live in the service since spec `010`, so the widget would have to duplicate them.
- Making the flag imply `unavailableProductNotify` and `conversationStarters.pdp`: rejected by the developer. The flags stay independent, and `init` warns about a configuration that can never show anything.
- Naming the option `shopping_assistant_disabled`: every `init` option is camelCase, and Principle XVI keeps snake_case at backend boundaries only. The developer chose `shoppingAssistantDisabled`.
- Keeping `connectOn` as given and only skipping `connect()` calls in the widget: `service.init()` connects by itself with `'mount'`, and `runQueue` connects with `'demand'`. Forcing `'manual'` is the only setting under which the current service never connects.
- Hiding the widget with CSS: the service would still connect, and hidden content would stay in the accessibility tree.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `init` option `shoppingAssistantDisabled` (boolean, default `false`) | added | minor | yes — absent means today's behavior |
| `init` options `socketUrl` and `channelUuid` | optional when `shoppingAssistantDisabled` is true; still required otherwise | minor | yes — existing configs are unaffected |
| `init` option `connectOn` | ignored (forced to `'manual'`) when `shoppingAssistantDisabled` is true | minor | yes — only applies to the new mode |
| `Widget` and `ChatProvider` `propTypes` | `socketUrl` and `channelUuid` no longer `isRequired` | minor | yes — prop-types only warn; runtime still fails in the service without the flag, as today |
| `WebChat.send`, `WebChat.setConversationStarters` | no-op with a `console.warn` when `shoppingAssistantDisabled` is true | minor | yes — only applies to the new mode |
| Other `window.WebChat` methods, CSS custom properties, `weni-` classes | unchanged | none | yes |
| `@weni/webchat-service` dependency | unchanged at `1.19.2` (linked locally, as in spec `010`) | none | yes |

**Consumers affected**: none unless they opt in. Integrators who want back-in-stock only set `shoppingAssistantDisabled: true`, `unavailableProductNotify: true`, and `conversationStarters: { pdp: true }`. The changelog documents the option and the placeholder behavior. The release is a minor version.

## Non-Functional Requirements

### Peak Load

The peak is a campaign-day product page with many shoppers. In this mode the widget opens zero WebSocket connections and sends zero starter requests per page view, which removes the socket load of these stores entirely. What remains is unchanged: one VTEX catalog request per product resolution (already made today) and one subscribe POST per form submit, with at most two retries inside the service (spec `010`).

### Observability

- The conversation starters log config and its `init` event include `shoppingAssistantDisabled`, next to `connectOn`. This makes the mode visible in `WebChat.getConversationStartersLog()`.
- The existing `divert_back_in_stock` event still records each offer with the SKU and product name. The correlation identifier is the SKU, shared with the service's `backInStock:*` events.
- `init` logs one `console.warn('WebChat: shoppingAssistantDisabled needs unavailableProductNotify and conversationStarters.pdp')` when the configuration can never show anything.
- `send` and `setConversationStarters` log `console.warn('WebChat.<method>: shopping assistant is disabled')` when called in this mode.
- No log carries the name or phone. No new log carries the placeholder values.

### Failure Handling

- No socket means no reconnect loop, no timeout, and no "already in use" state in this mode. `isConnectionClosed` stays false because the status never reaches `'closed'`.
- A product page whose resolution fails (`product_resolve_failed`) shows nothing, the same as an available SKU. The shopper sees no broken launcher.
- `evaluateBackInStockOffer` throwing is handled as in spec `010` (`back_in_stock_evaluate_error`), and falls back to showing nothing here instead of requesting starters.
- `subscribeBackInStock` failing keeps today's behavior: the success state shows, and the service emits `backInStock:error`.
- A host that calls `WebChat.open()` with no offer active opens a chat with no page. The widget treats this as invalid in this mode: `WidgetContent` keeps the chat hidden unless the offer is active, and the hook closes it.
- If a future service version starts using `channelUuid` or `socketUrl` outside `connect()`, the placeholders could reach a request. The test on `applyShoppingAssistantMode` plus the "no WebSocket constructed" test (below) are the guard when the pin is bumped.

### Security and Authorization

No new input crosses the trust boundary. The placeholders are constants, not secrets, and are never sent: with `connectOn: 'manual'` the WebSocket manager is never asked to connect. The shopper's name and phone are handled exactly as in spec `010`: validated by the service, sent over HTTP to the subscribe route, and authorized server-side through the forwarded `vtex_session`.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| Flag defaults to `false`; absent means today's behavior | `standalone.test.ts`: `mapConfig` without the flag yields `shoppingAssistantDisabled: false` and passes `socketUrl`, `channelUuid`, `connectOn` through. Existing suites for Widget, Chat, Header, hook, and view pass unchanged. |
| `init` works without `socketUrl` and `channelUuid` | `shoppingAssistantMode.test.ts`: with the flag on and the values missing, the placeholders are filled and `connectOn` becomes `'manual'`. Given values are kept. With the flag off, the config is returned unchanged. `Widget.test.jsx`: rendering with the flag and no connection values does not throw, and the mocked service constructor receives the placeholders. |
| No WebSocket, no starters, no `initPayload`, no tooltip | `Widget.test.jsx` (flag on, `initPayload` and `tooltipMessage` set): `service.connect`, `service.getStarters`, `service.sendMessage`, and `service.simulateMessageReceived` are never called, including after the chat opens and after a `connected` event is emitted. |
| Nothing visible until an unavailable SKU | `Widget.test.jsx`: with `evaluateBackInStockOffer` returning `isUnavailable: false`, no launcher, bubble, or chat is in the DOM. Returning `isUnavailable: true` shows the bubble and the launcher. |
| Not a product page, or available SKU: nothing visible | `useConversationStarters.test.js` and `Widget.test.jsx`: non-PDP path and available SKU leave `isBackInStockNotify` false and `getStarters` uncalled; the widget renders nothing. |
| Opening lands on the form; "Not now", back, and close all close the chat | `BackInStockNotify.test.jsx`: "Not now" with the flag calls `setIsChatOpen(false)` and `clearPageHistory`, and does not call `sendMessage`. `Header.test.jsx`: the back button with the flag closes the chat instead of calling `goBack`. |
| Reduced success state, no message sent | `BackInStockNotify.test.jsx`: after a valid submit with the flag, the success title and description render, while `wait_prompt` and "Show me similar products" do not. `sendMessage` is never called. |
| No connection banner, no input | `Chat.test.jsx`: with the flag and status `'disconnected'`, neither `ConnectionStatusBanner` nor `InputBox` renders. Without the flag, both render as today. |
| Navigation clears and re-evaluates; closes an open chat | `useConversationStarters.test.js`: with the flag, chat open, and a pathname change, `setIsChatOpen(false)` and `clearPageHistory` are called, and the offer is evaluated again for the new product. |
| `send` and `setConversationStarters` ignored | `standalone.test.ts`: after `init` with the flag, both return without reaching the service and warn once each. |

**Flow coverage**: init without connection values → product page → offer verdict → bubble and launcher → open → form → subscribe → reduced success → close → launcher still shown → SPA navigation to an available product → widget hidden.

**Failure paths covered**: product resolution failure shows nothing; evaluator throwing shows nothing; subscribe rejection still shows the reduced success; `WebChat.open()` without an offer does not show an empty chat; misconfiguration warning.

**Stubbed at the boundary**: `@weni/webchat-service` through `test/__mocks__/@weni/webchat-service.js` and the existing `mockService` in the hook test. VTEX product resolution is mocked as today. No network.

## Rollout and Rollback

1. Implement and release as a minor version of `@weni/webchat-template-react` and the UMD bundle. The `@weni/webchat-service` pin and its local link are unchanged from spec `010`.
2. No feature flag is needed: the option itself is the opt-in, and it defaults to off.
3. Verify on a storefront loaded with the local bundle and the back-in-stock only config: the Network panel shows no WebSocket, the widget is hidden on available products and non-product pages, and an unavailable SKU shows the bubble, the form, one subscribe POST, and the reduced success.
4. Announce the option to integrators through the changelog.

Rollback: integrators remove `shoppingAssistantDisabled` (or set it to `false`) and restore `socketUrl` and `channelUuid`. Reverting the code is also safe: nothing new is persisted. The render-decision key the service writes under the placeholder `channelUuid` is harmless and is cleared by the service itself when `renderPercentage` is 0 or 100.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| I. Version Control and Review | PR with lint and the coverage gate. | none |
| III. Observability | New mode is recorded in the starters log. Warnings use stable messages. No personal data and no placeholder values in logs. | none |
| IV. Versioned Contracts | New `init` option and relaxed requirements are additive and backward compatible; minor release; changelog entry. Service pin unchanged. | none |
| V. Specification Traceability | Opens with Origin Without Product Spec. | none |
| VIII. Type Safety | The new files (`shoppingAssistantMode.ts`, `shoppingAssistantMode.test.ts`, `standalone.test.ts`) are TypeScript in strict mode, and this feature adds the toolchain (`tsconfig.json`, Babel/Jest, coverage, lint). Changes to existing `.jsx`/`.js` files are small conditionals and stay in JS with `prop-types`. | none |
| IX. Single Responsibility | The config rule lives in one function. Components use descriptive booleans such as `isShoppingAssistantDisabled` and `shouldRenderWidgetContent` instead of inline conditions. `ChatContext.jsx` (over 350 lines today) only gains a few lines. | `ChatContext.jsx` already exceeds 350 lines; splitting it is out of scope. |
| XII. Component Architecture | Existing `Button`, `FSButton`, and views are reused. No raw elements are added. | none |
| XIV. State Management | The flag is read from `config` in `ChatContext`, and `isShoppingAssistantDisabled` is derived there once. Offer state stays in the starters hook. Nothing is mirrored. | none |
| XV. Async State Correctness | The submit keeps its loading and double-submit guard from spec `010`. Closing the chat on navigation avoids a contradictory "open with no page" state. | none |
| XVI. API Integration & Data Boundaries | No new HTTP call. The option is camelCase. | none |
| Maintainability | Placeholders live in `src/utils/constants.js`, the rule in one module. | none |
| Testing | Colocated tests for each change, including flows and failure paths, within the 80% gate. | none |
| Internationalization | No new string. Crowdin-managed locale files are untouched. | none |
| Accessibility | Hidden content is not rendered, so it is not in the accessibility tree. Focus and labels on the form are unchanged. | none |

## Implementation Decisions

- **Placeholders only when missing**: if the host does pass `channelUuid` or `socketUrl`, they are kept. A real `channelUuid` keeps the service's render-decision key per channel. Either way, `connectOn: 'manual'` stops the connection.
- **Placeholder values**: `SHOPPING_ASSISTANT_DISABLED_SOCKET_URL = 'wss://shopping-assistant-disabled.invalid'` and `SHOPPING_ASSISTANT_DISABLED_CHANNEL_UUID = 'shopping-assistant-disabled'`. The `.invalid` TLD can never resolve, so even an accidental connect would fail locally instead of reaching a real host.
- **The open state is not restored**: the session may say the chat was open on a previous page. In this mode that would show an empty chat, so the widget starts closed and only opens from the offer.
- **Visibility needs the offer**: `shouldRenderWidgetContent = !isShoppingAssistantDisabled || isBackInStockNotify || isChatOpenOnNotifyPage`. The launcher alone is never shown without an offer, because opening it would have nothing to show.
- **"Not now" keeps the offer**: closing does not clear `isBackInStockNotify`, so the shopper can come back to the form from the bubble until they navigate away. This matches today's behavior for the bubble.
- **The success state has no new action**: removing "Show me similar products" leaves the header close button and the launcher as the ways out. No new string is needed.
- **`embedded` and `startFullScreen` are not supported together with the flag**: they force the chat open with no offer. In this mode they are ignored at startup, and the changelog says so.
- **The WhatsApp offers balloon is not rendered**: it is a separate feature that may lead to a conversation, so the back-in-stock only mode does not show it.

## Open Questions

- none
