# Engineering Specification: Show the back-in-stock offer regardless of `renderPercentage`

**Repository**: webchat-react — frontend

**Feature Branch**: `014-notify-ignores-render-percentage`

**Created**: 2026-11-18

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: `renderPercentage` samples which sessions see the widget. A session left out of the sample (`shouldRender: false`, always the case with `renderPercentage: 0`) renders nothing, so with `unavailableProductNotify: true` a shopper on an unavailable SKU never sees the back-in-stock offer. The offer is a store notification, not part of the sampled assistant, so it should reach every shopper.
- Acceptance criteria:
  - With `unavailableProductNotify: true` and a session outside the render sample (`renderPercentage: 0`, or a sampled-out session at any value between 1 and 99), a product page whose selected SKU is unavailable shows the launcher with the back-in-stock bubble. Clicking it opens the chat on the back-in-stock form, and submitting calls `subscribeBackInStock`.
  - In that session nothing else of the assistant appears: no conversation starters, no WhatsApp offers opt-in balloon, no tooltip, no `initPayload`, no connection banner, and no WebSocket connection, whatever `connectOn` is. Opening the launcher outside the form closes the chat, and the form hides "show similar products", the same as `shoppingAssistantDisabled` mode.
  - In that session, an available SKU or a page that is not a PDP renders nothing, the same as today.
  - With `unavailableProductNotify` off, a sampled-out session renders nothing, the same as today.
  - A session inside the sample (`shouldRender: true`) behaves exactly as today, with or without `unavailableProductNotify`.

## Scope in This Repository

**This repository implements**:

- A "back-in-stock only" mode in `ChatContext`, exposed as `isBackInStockOnlyMode`. It is true when `shoppingAssistantDisabled` is on (as today), or when the session is outside the render sample and `unavailableProductNotify` is on.
- `Widget` renders a sampled-out session when `unavailableProductNotify` is on, and lets the existing offer gate decide what shows.
- The components and the hook that adapt to `shoppingAssistantDisabled` today read `isBackInStockOnlyMode` instead, so a sampled-out session gets the same restricted UI.
- `README.md` documents `renderPercentage` and the bypass.

**Out of scope here**:

- `@weni/webchat-service`. It keeps returning `{ shouldRender }` from `init()` and exposing `isRenderEnabled()`. `evaluateBackInStockOffer` is a pure function, and `subscribeBackInStock` posts over HTTP without a session or a socket, so both work when `init()` returned early. No service change or release is needed, and the pinned `1.21.0` stays.
- The sampling algorithm and its storage key `weni:webchat:session:<channelUuid>:render`. Both stay in the service.
- `embedded: true`. An embedded widget is page content with no close button, so it keeps respecting `renderPercentage` (see Implementation Decisions).
- `window.WebChat.send` and `setConversationStarters` in a sampled-out session. Their behavior is unchanged.
- Translations. No new string is added.

**Depends on**: `@weni/webchat-service` `1.21.0` as pinned. `init()` resolves `{ shouldRender: false }` without restoring the session or connecting. `_ensureRenderDecision()` runs synchronously at the start of `init()`, so `isRenderEnabled()` is accurate right after `init()` is called.

## Current State

- `@weni/webchat-service` (`src/index.js` in the pinned package)
  - `_ensureRenderDecision()` clamps `config.renderPercentage` to 0–100. At 0 or 100 it clears the storage key and returns `percentage === 100`. Otherwise it reuses the stored `<percentage>:<boolean>` decision, or draws `Math.random() * 100 < percentage` and stores it.
  - `init()` returns `{ shouldRender: false }` right after a negative decision and sets `_renderEnabled = false`. It does not restore the session, does not connect, and leaves `_initialized` false.
- `src/standalone.jsx` — `mapConfig` passes `renderPercentage: params.renderPercentage ?? 100` and `unavailableProductNotify: params.unavailableProductNotify || false`. `renderPercentage` is not documented in `README.md`.
- `src/contexts/ChatContext.jsx`
  - `isShoppingAssistantDisabled` comes from `mergedConfig.shoppingAssistantDisabled`. It skips the `embedded` overrides, starts the chat closed, skips the tooltip timer and `initPayload`, and keeps the chat closed after `init()`.
  - `shouldRender` starts as `true` and is set from `service.init()`. Both values are in the exported `useChatContext()` value.
  - When the chat opens with `connectOn: 'demand'`, it calls `service.connect()`, even in a sampled-out session.
- `src/components/Widget/Widget.jsx` — `WidgetContent` returns `null` when `shouldRender === false || !shouldRenderWidgetContent`, where `shouldRenderWidgetContent = !isShoppingAssistantDisabled || isBackInStockNotify || isChatOpenOnNotifyPage`. The sampling check runs first, so the offer never shows in a sampled-out session. The opt-in balloon is hidden when `isShoppingAssistantDisabled`.
- `src/components/Chat/Chat.jsx` — hides `ConnectionStatusBanner` and the input area when `isShoppingAssistantDisabled`.
- `src/components/Header/Header.jsx` — the back button closes the chat and clears history when `isShoppingAssistantDisabled`.
- `src/views/BackInStockNotify.jsx` — "Not now" closes the chat, and the success screen hides the wait prompt and "show similar products" when `isShoppingAssistantDisabled`.
- `src/hooks/useConversationStarters.js`
  - `isShoppingAssistantDisabledRef` mirrors `config?.shoppingAssistantDisabled`. It stops `requestStarters` after the offer check, ignores the `connected` flush, closes the chat on SPA navigation, and closes the chat when it opens outside the notify page.
  - Product detection (`detectAndFetchPdp`) already runs in a sampled-out session, because `ConversationStartersProvider` is mounted above `WidgetContent`. Today, with `conversationStarters.pdp: true` and `connectOn: 'demand'`, `requestStarters` calls `service.connect()` in a sampled-out session that renders nothing.
- `src/utils/conversationStartersLog.js` — `recordConversationStarterEvent` and the `getConversationStartersLog()` dump used to debug this flow.
- Tests: `src/components/Widget/Widget.test.jsx` (assistant-disabled and back-in-stock cases), `test/contexts/ChatContext.test.jsx` (`sets shouldRender from init result`), `src/hooks/useConversationStarters.test.js`, `src/views/BackInStockNotify.test.jsx`, `src/components/Header/Header.test.jsx`, `src/components/Chat/Chat.test.jsx`. The service mock `test/__mocks__/@weni/webchat-service.js` returns `{ shouldRender: true }` and has no `isRenderEnabled`.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/contexts/ChatContext.jsx` | modified | Derives `isOutsideRenderSample = shouldRender === false` and `isBackInStockOnlyMode = isShoppingAssistantDisabled \|\| (isOutsideRenderSample && isUnavailableNotifyEnabled && !embedded)`, and exposes `isBackInStockOnlyMode`. After `init()` resolves outside the sample, it closes the chat when back-in-stock-only applies, the same as the disabled branch. The tooltip timer checks `service.isRenderEnabled()` before simulating the message. The `connectOn: 'demand'` effect does not connect in back-in-stock-only mode. Records one `render_sampled_out` log event. |
| `src/components/Widget/Widget.jsx` | modified | `isHiddenByRenderSample = shouldRender === false && !isBackInStockOnlyMode` replaces `shouldRender === false` in the early return. `shouldRenderWidgetContent` and `shouldShowOptInBalloon` read `isBackInStockOnlyMode`. |
| `src/components/Chat/Chat.jsx` | modified | Reads `isBackInStockOnlyMode` for the banner and input gates. |
| `src/components/Header/Header.jsx` | modified | Reads `isBackInStockOnlyMode` for the back button. |
| `src/views/BackInStockNotify.jsx` | modified | Reads `isBackInStockOnlyMode` for "Not now" and the success screen. |
| `src/hooks/useConversationStarters.js` | modified | `isShoppingAssistantDisabledRef` becomes `isBackInStockOnlyModeRef`. It is true when the context's `isBackInStockOnlyMode` is true, or when `service.isRenderEnabled?.() === false` and notify is on and not embedded. The synchronous service check covers the window before the context re-renders with `shouldRender: false`. All four guards use it. |
| `src/utils/conversationStartersLog.js` | unchanged | Already accepts arbitrary events. |
| `README.md` | modified | Adds `renderPercentage` (number, default 100) to the Parameters table and states that `unavailableProductNotify` shows the back-in-stock offer to sampled-out sessions. |
| `src/components/Widget/Widget.test.jsx`, `test/contexts/ChatContext.test.jsx`, `src/hooks/useConversationStarters.test.js`, `src/views/BackInStockNotify.test.jsx`, `src/components/Header/Header.test.jsx`, `src/components/Chat/Chat.test.jsx` | modified | New cases (see Test Strategy). |
| `test/__mocks__/@weni/webchat-service.js` | modified | Adds `isRenderEnabled()`, backed by the same flag `init()` reports, so tests can drive both. |

### Flow

**Sampled-out session, `unavailableProductNotify: true`, unavailable SKU**

1. `Widget` mounts `ChatProvider` → `ConversationStartersProvider` → `WidgetContent`. Child effects run first, so `useConversationStarters` calls `detectAndFetchPdp()`, which awaits `resolveProductData`.
2. `ChatProvider`'s effect calls `service.init()`. `_ensureRenderDecision()` runs synchronously and returns `false`, so `isRenderEnabled()` is now `false`. `init()` resolves `{ shouldRender: false }` without connecting.
3. `ChatContext` sets `shouldRender` to `false`. `isBackInStockOnlyMode` becomes true. The chat is closed, and `render_sampled_out` is recorded with `{ renderPercentage, backInStockOnly: true }`.
4. `detectAndFetchPdp` resolves the product and calls `evaluateBackInStockOffer`. It returns `isUnavailable: true`, so `showBackInStockNotify` sets the CTA.
5. `WidgetContent`: `isHiddenByRenderSample` is false and `isBackInStockNotify` is true, so the launcher and the bubble render. The opt-in balloon stays hidden.
6. Click → chat opens → the open effect pushes `back-in-stock-notify`. The form submits through `service.subscribeBackInStock`. "Not now" and the header back button close the chat.

**Same session, available SKU**

4'. `evaluateBackInStockOffer` returns `isUnavailable: false`. `requestStarters` is skipped because `isBackInStockOnlyModeRef` is true, so no `getStarters` call and no `connect()`. `isBackInStockNotify` stays false, and `WidgetContent` returns `null`.

**Sampled-out session, `unavailableProductNotify` off**

`isBackInStockOnlyMode` is false (unless `shoppingAssistantDisabled`), so `isHiddenByRenderSample` is true and nothing renders, as today. Today's `requestStarters` path is unchanged here.

**Sampled-in session**

`shouldRender` stays true, `isBackInStockOnlyMode` equals `isShoppingAssistantDisabled`, and every path is the same as today.

### Rejected Alternatives

- **Pass `renderPercentage: 100` to the service when notify is on**: it would render the whole assistant for every session and make sampling meaningless for any store with the offer on.
- **Change `_ensureRenderDecision` in `@weni/webchat-service`**: sampling is the service's decision, and the bypass is a UI rule about which surface may still show. Doing it in the service would need a release and a peer bump for a template-only concern.
- **Widen `isShoppingAssistantDisabled` instead of adding a field**: it is in the exported `useChatContext()` value and means "the integrator disabled the assistant". Reusing it for sampling would silently change its meaning for consumers.
- **Mount `ConversationStartersProvider` without `ChatProvider` for sampled-out sessions**: it would duplicate the provider tree and the notify view wiring for one case.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `init` option `renderPercentage` | no longer hides the back-in-stock offer when `unavailableProductNotify` is on. It still samples the assistant. | minor | yes — sampled-in sessions are unchanged. Sampled-out sessions on stores with `unavailableProductNotify: true` start showing the offer on unavailable SKUs, which is what this change asks for. |
| `useChatContext()` value | adds `isBackInStockOnlyMode` (boolean). `shouldRender` and `isShoppingAssistantDisabled` keep their meaning. | minor | yes — additive |
| `WebChat.getConversationStartersLog()` | new event `render_sampled_out` | patch | yes — additive debug output |
| `window.WebChat` API, other `init` options, CSS custom properties, `weni-` classes | unchanged | none | yes |
| `@weni/webchat-service` peer dependency | unchanged (`1.21.0`) | none | yes |

**Consumers affected**: integrators who use `renderPercentage` below 100 together with `unavailableProductNotify: true`. Their sampled-out shoppers start seeing the offer, and the release notes call this out. There is no `CHANGELOG.md` yet (`TODO(CHANGELOG)`), so the note goes in the GitHub release description under "Changed".

## Non-Functional Requirements

### Peak Load

The peak is the campaign-day product page peak (Black Friday, 2026-11-27), counted per sampled-out session on a store with `unavailableProductNotify: true`. Product resolution and offer evaluation already run in those sessions today, so no catalog request is added. What is new:

- Rendering the launcher and the bubble on unavailable SKUs.
- One `subscribeBackInStock` POST per form submit, deduplicated per `skuId:phone` and bounded by the service's existing timeout and retry settings (spec `010`).

No WebSocket connection is opened in these sessions. With `connectOn: 'demand'` and `conversationStarters.pdp: true`, this removes the connection a sampled-out session opens today.

### Observability

- `render_sampled_out` is recorded once per mount, through `recordConversationStarterEvent`, when `init()` resolves `shouldRender: false`. Its detail is `{ renderPercentage, backInStockOnly }`, where `backInStockOnly` shows whether the bypass applies. No personal data.
- The existing `divert_back_in_stock`, `back_in_stock_evaluate_error`, and the service's `[WebChatService:BackInStock]` warning keep covering the offer and the submit.
- To check the mode on a storefront: `WebChat.getConversationStartersLog()` shows `render_sampled_out` and `config.unavailableProductNotify`, and `localStorage['weni:webchat:session:<channelUuid>:render']` holds the stored decision for values between 1 and 99.

### Failure Handling

- **`init()` rejects**: `shouldRender` stays `true` and today's error log stays. The session behaves as sampled-in, the same as today.
- **Context not re-rendered yet when the offer is evaluated**: the hook also reads `service.isRenderEnabled()`, which is set synchronously when `init()` is called, so starters are never requested in a sampled-out session. The mock and older service builds without `isRenderEnabled` fall back to the context value (`?.()`).
- **`evaluateBackInStockOffer` throws**: `back_in_stock_evaluate_error` is recorded. No offer shows, and nothing renders in a sampled-out session.
- **`subscribeBackInStock` fails**: unchanged. The service emits `backInStock:error` and warns, and the form shows its success state as today (spec `009`).
- No new network call, timeout, or retry is added in this repository.

### Security and Authorization

- No new input crosses the trust boundary. Product data and the selected SKU still come from the host page through the existing VTEX adapters. Name and phone go only to `subscribeBackInStock`, and are validated by the service as today.
- No secret is involved. Authorization of the subscription stays server-side, the same as for sampled-in sessions.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| Sampled-out + notify on + unavailable SKU shows the bubble, opens the form, submits | Repro (fails on `main`): `Widget.test.jsx` mocks `init` to resolve `{ shouldRender: false }`, renders with `unavailableProductNotify: true` and `mockStarters.isBackInStockNotify = true`, and finds the launcher and the bubble text. `useConversationStarters.test.js`: with `isRenderEnabled()` returning `false` and `evaluateBackInStockOffer` returning `isUnavailable: true`, `isBackInStockNotify` becomes true and clicking the CTA sets `currentPage.view` to `'back-in-stock-notify'`. `BackInStockNotify.test.jsx`: with `isBackInStockOnlyMode` from the context, submit calls `subscribeBackInStock`. |
| Nothing else of the assistant in that session, no connection | `Widget.test.jsx`: same setup with `isOptInBalloonVisible = true`, so no `.weni-opt-in-balloon`. `ChatContext.test.jsx`: with `{ shouldRender: false }` and notify on, `isBackInStockOnlyMode` is true, `isChatOpen` stays false with `startFullScreen: true`, no tooltip message is simulated after `tooltipDelay`, `initPayload` is not sent, and opening the chat with `connectOn: 'demand'` does not call `connect`. `useConversationStarters.test.js`: with `pdp: true`, an available SKU, and `connectOn: 'demand'`, neither `getStarters` nor `connect` is called, and opening the chat outside the notify page closes it. `Header.test.jsx`, `BackInStockNotify.test.jsx`, `Chat.test.jsx`: each `isShoppingAssistantDisabled` case is repeated with only `isBackInStockOnlyMode` true. |
| Sampled-out + available SKU or non-PDP renders nothing | `Widget.test.jsx`: `{ shouldRender: false }`, notify on, `isBackInStockNotify = false`, so no `complementary` role. |
| Sampled-out + notify off renders nothing | `Widget.test.jsx`: `{ shouldRender: false }`, `unavailableProductNotify: false`, `isBackInStockNotify = true`, so no `complementary` role. `ChatContext.test.jsx`: `isBackInStockOnlyMode` is false. |
| Sampled-in unchanged | Existing `Widget`, `ChatContext`, and `useConversationStarters` suites pass unchanged. `ChatContext.test.jsx`: with `{ shouldRender: true }` and notify on, `isBackInStockOnlyMode` is false. |
| Embedded keeps respecting the sample | `ChatContext.test.jsx`: `{ shouldRender: false }`, notify on, `embedded: true`, so `isBackInStockOnlyMode` is false. |

**Flow coverage**: a sampled-out session on a PDP with an unavailable SKU, from `init()` resolving `shouldRender: false`, through product resolution and offer evaluation, to the bubble, the opened form, and `subscribeBackInStock`. Also the same session on an available SKU, from resolution to rendering nothing and skipping starters.

**Failure paths covered**: `init()` rejecting (sampled-in fallback, existing test), `evaluateBackInStockOffer` throwing in a sampled-out session (nothing renders, no starters), and a service without `isRenderEnabled` (falls back to the context).

**Stubbed at the boundary**: `@weni/webchat-service` through `test/__mocks__/@weni/webchat-service.js` (`init`, `isRenderEnabled`, `evaluateBackInStockOffer`, `subscribeBackInStock`, `connect`), VTEX product resolution through the existing mocks in `useConversationStarters.test.js`, and `useConversationStarters` through the existing context mock in `Widget.test.jsx`. No real network.

## Rollout and Rollback

1. Ship as a minor release of `@weni/webchat-template-react` and the standalone bundle. No `@weni/webchat-service` release is needed. Shipping before the 2026-11-27 peak lets sampled-out shoppers subscribe during the campaign.
2. No new feature flag. `unavailableProductNotify` is already the opt-in, and stores without it are unaffected.
3. Verify on a VTEX store with the local bundle and `renderPercentage: 0`, `unavailableProductNotify: true`:
   - An unavailable SKU shows the bubble. The form opens and submits, and no WebSocket opens.
   - An available SKU and a non-PDP page show nothing.
   - With `unavailableProductNotify: false`, nothing shows anywhere.
   - With `renderPercentage: 100`, the assistant behaves as today.

Rollback: revert the release. Nothing new is persisted, and the service keeps owning the render key, so the previous version works again immediately and sampled-out sessions go back to rendering nothing.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| I. Version Control and Review | PR with lint and the coverage gate. | none |
| III. Observability | One structured `render_sampled_out` event with no personal data. Existing back-in-stock events and warnings are kept. | none |
| IV. Versioned Contracts | Minor: `renderPercentage` behavior changes only for sampled-out sessions with notify on, and `isBackInStockOnlyMode` is additive. `shouldRender` and `isShoppingAssistantDisabled` keep their meaning. | `CHANGELOG.md` does not exist yet (`TODO(CHANGELOG)`), so the note goes in the release description. |
| V. Specification Traceability | Opens with Origin Without Product Spec. | none |
| VII. Code as Documentation | A short comment on `isBackInStockOnlyMode` explains why the offer bypasses sampling, and one on the `isRenderEnabled()` read explains the effect-order window. | none |
| VIII. Type Safety | No new file. The edits are small changes to existing `.js`/`.jsx` files, so they stay in JS with `prop-types` where they already exist. | none |
| IX. Single Responsibility | The rule lives in one derived boolean in `ChatContext`. Components use descriptive booleans (`isHiddenByRenderSample`, `isBackInStockOnlyMode`). | `ChatContext.jsx` and `useConversationStarters.js` already exceed 350 lines. This change adds a few lines, and splitting them is out of scope. |
| XIV. State Management | `shouldRender` stays owned by `ChatContext`, which derives the new mode. The hook reads the context and the service, and does not mirror state. | none |
| XV. Async State Correctness | The mode is derived, not stored, so it cannot contradict `shouldRender`. The synchronous `isRenderEnabled()` read closes the window before the context re-renders. | none |
| Testing | Colocated tests for the changed components and the hook, a repro test for the hidden offer, failure paths, and the 80% gate. The `ChatContext` cases go into the existing legacy `test/contexts/ChatContext.test.jsx`, which the constitution allows maintaining. | none |
| Internationalization | No new string. Crowdin-managed locale files are untouched. | none |
| Maintainability | The restricted UI rules already written for `shoppingAssistantDisabled` are reused through one flag instead of being duplicated for sampling. | none |

## Implementation Decisions

- **Sampled-out sessions get the offer only, not the assistant**: the request is about notifying the shopper. Rendering the full widget would remove sampling for every store that turns the offer on. The restricted UI already exists for `shoppingAssistantDisabled`, so it is reused.
- **A new context field instead of widening `isShoppingAssistantDisabled`**: see Rejected Alternatives. Internal consumers switch to `isBackInStockOnlyMode`, and the old field stays for external consumers of `useChatContext()`.
- **`embedded: true` is excluded**: an embedded widget hides the close button and forces fullscreen as page content, so a notify-only chat could not be dismissed and the bubble has no floating launcher to sit on. Embedded sessions keep respecting `renderPercentage`.
- **Sampled-out with notify on blocks the WebSocket**: the form does not need it, and a sampled-out shopper should not count as an assistant session. This also covers `connectOn: 'demand'`, which would otherwise connect when the form opens.
- **Read `service.isRenderEnabled()` in the hook as well as the context**: React runs the hook's mount effect before `ChatProvider`'s, and the context only re-renders after `init()` resolves. The service flag is already set by then, so a fast product resolution cannot request starters in a sampled-out session.
- **`renderPercentage` keeps its default and clamp**: the template still passes `params.renderPercentage ?? 100`, and the service clamps it. Only the template's reaction to `shouldRender: false` changes.
