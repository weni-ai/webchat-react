# Engineering Specification: Back-in-stock independent of `conversationStarters.pdp`

**Repository**: webchat-react — frontend

**Feature Branch**: `012-back-in-stock-without-pdp`

**Created**: 2026-11-05

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: The back-in-stock offer (`unavailableProductNotify`) only runs when `conversationStarters.pdp` is also `true`, because product detection lives behind the PDP starters guard. A store that wants the back-in-stock offer without PDP conversation starters cannot have it.
- Acceptance criteria:
  - With `unavailableProductNotify: true` and `conversationStarters.pdp` absent or `false`, on a product page whose selected SKU is unavailable, the back-in-stock bubble shows and opening the chat lands on the back-in-stock form, exactly as it does today with `pdp: true`.
  - In the same configuration, on a product page whose selected SKU is available, no conversation starters are requested (`service.getStarters` is never called, and no deferred request is flushed on `connected`), and no starters bubble shows.
  - In the same configuration, SPA navigation to another product page clears the previous offer and evaluates the new product again.
  - With both `unavailableProductNotify` and `conversationStarters.pdp` off, the widget does not resolve the product at all, the same as today.
  - With `conversationStarters.pdp: true`, behavior is unchanged with or without `unavailableProductNotify`.
  - With `shoppingAssistantDisabled: true`, `init` no longer warns when `conversationStarters.pdp` is off. It still warns when `unavailableProductNotify` is off, because nothing could ever show.

## Scope in This Repository

**This repository implements**:

- Splitting "resolve the product on this page" from "request PDP conversation starters" in `src/hooks/useConversationStarters.js`. Product resolution runs when either `conversationStarters.pdp` or `unavailableProductNotify` is on. Starters are requested only when `conversationStarters.pdp` is on.
- The same rule for the SPA navigation re-check.
- Relaxing the `shoppingAssistantDisabled` misconfiguration warning in `src/standalone.jsx` so it only requires `unavailableProductNotify`.
- Recording `unavailableProductNotify` in the conversation starters debug log, so the active mode can be read from `WebChat.getConversationStartersLog()`.

**Out of scope here**:

- The back-in-stock rules, the subscribe request, and the form. They are owned by `@weni/webchat-service` (spec `010`) and the views from spec `009`, and do not change.
- The WhatsApp offers opt-in (`whatsappOffersNotify`). Today it is only triggered by the `starters:simulate-whatsapp-offers` event, not by product detection, so it has no dependency on `pdp` to remove.
- Manual starters (`WebChat.setConversationStarters`) and the `starters:simulate-*` events. They never went through the `pdp` guard.
- Translations. No new string is added.

**Depends on**: `@weni/webchat-service` as already linked for spec `010` (`evaluateBackInStockOffer`, `setContext`, `getStarters`). No new service method or behavior is needed. This spec builds on spec `011` (`shoppingAssistantDisabled`), which is on the current branch, because it edits the warning `011` added.

## Current State

- `src/hooks/useConversationStarters.js`
  - `isPdpEnabledRef` mirrors `config.conversationStarters.pdp === true`. `isUnavailableNotifyEnabledRef` mirrors `config.unavailableProductNotify === true`.
  - `detectAndFetchPdp` returns early with `recordConversationStarterEvent('skip', { reason: 'pdp_disabled' })` when `isPdpEnabledRef` is false. This one guard is what makes back-in-stock depend on `pdp`. After the guard, the function checks the page (`isVtexPdpPage`, slug, account), resolves the product (`resolveProductData`), sets the product context on the service (`service.setContext`), evaluates the offer (`service.evaluateBackInStockOffer`) when `isUnavailableNotifyEnabledRef` is true, and diverts to `showBackInStockNotify` on an unavailable SKU. Otherwise, unless `shoppingAssistantDisabled` is on, it calls `requestStarters`.
  - `applyNavigationChange` resets the offer and starters state, then calls `detectAndFetchPdp` only `if (isPdpEnabledRef.current)`.
  - The mount effect and the "account arrived after mount" effect call `detectAndFetchPdp` unconditionally and rely on its internal guard.
  - The mount effect records an `init` event with `pdpEnabled` but not `unavailableProductNotify`.
- `src/standalone.jsx` — `init` warns `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify and conversationStarters.pdp'` when `shoppingAssistantDisabled` is on and either flag is off.
- `src/utils/conversationStartersLog.js` — `getConversationStartersLog().config` exposes `conversationStarters.pdp`, `connectOn`, and `shoppingAssistantDisabled`.
- `src/components/Widget/Widget.jsx`, `src/components/Chat/Chat.jsx`, `src/views/BackInStockNotify.jsx` — none of them read `conversationStarters.pdp`. The bubble renders from `questions` and `isBackInStockNotify`, both set by the hook. No change needed.
- Tests: `src/hooks/useConversationStarters.test.js` builds the back-in-stock context with `conversationStarters: { pdp: true }` (`buildUnavailableNotifyContext`) and has a `records skip when PDP is disabled` test asserting `reason: 'pdp_disabled'`. `src/standalone.test.ts` asserts the current warning text.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/hooks/useConversationStarters.js` | modified | Adds the derived `shouldResolveProduct = isPdpEnabled \|\| isUnavailableNotifyEnabled` and uses it for the entry guard of `detectAndFetchPdp` and for the navigation re-check. Gates `requestStarters` on `isPdpEnabled`. Records `unavailableProductNotify` in the `init` event. |
| `src/standalone.jsx` | modified | The `shoppingAssistantDisabled` warning only checks `unavailableProductNotify`, with the message `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify'`. |
| `src/utils/conversationStartersLog.js` | modified | `getConversationStartersLog().config` adds `unavailableProductNotify`. |
| `src/hooks/useConversationStarters.test.js` | modified | New cases for `pdp` off with `unavailableProductNotify` on (see Test Strategy). The existing `pdp_disabled` test now sets both flags off. |
| `src/standalone.test.ts` | modified | New warning text; no warning when `pdp` is off but `unavailableProductNotify` is on. |
| `src/utils/conversationStartersLog.test.js` | modified | Asserts the new `unavailableProductNotify` field. |
| `README.md` | modified | Adds `unavailableProductNotify` to the documented `init` options (it is not documented today) and states it does not need `conversationStarters.pdp`. |

### Flow

**Product page, `pdp` off, `unavailableProductNotify` on**

1. Mount (or account arrival, or SPA navigation) calls `detectAndFetchPdp`.
2. The guard checks `shouldResolveProduct`. It is true, so detection continues: `isVtexPdpPage`, slug, account, fingerprint, and `resolveProductData`, all unchanged. Generation and fingerprint checks still discard stale results.
3. The context string is built and passed to `service.setContext`, unchanged. This keeps the product known to the assistant if the shopper reaches the conversation from the back-in-stock success state ("Show me similar products").
4. `service.evaluateBackInStockOffer` runs, unchanged. On `isUnavailable`, `showBackInStockNotify` sets the bubble, and opening lands on the form (spec `009`).
5. On an available SKU, or when the evaluator throws, the hook checks `isPdpEnabled`. It is false, so it records `skip` with `reason: 'starters_disabled'`, calls `setIsLoading(false)`, and returns without calling `requestStarters`. No deferred product data is stored, so `handleConnected` has nothing to flush.

**SPA navigation**

1. `applyNavigationChange` resets state as today and calls `detectAndFetchPdp` when `shouldResolveProduct` is true (it was `isPdpEnabled` before).

**Both flags off**

1. The guard records `skip` with `reason: 'pdp_disabled'` and returns, exactly as today.

**`pdp` on**

1. Nothing changes: `shouldResolveProduct` is true, and `requestStarters` runs when no offer is shown and `shoppingAssistantDisabled` is off.

### Rejected Alternatives

- Making `unavailableProductNotify` imply `conversationStarters.pdp`: it would also request starters on every available product page, which is the behavior the integrator turned off.
- A separate product detection path for back-in-stock only: it would duplicate slug and account extraction, resolution, generation, and fingerprint handling in `detectAndFetchPdp`. One guard change gets the same result.
- Renaming `detectAndFetchPdp` to match its wider role: the name still describes what it does (detect the PDP, fetch the product). A rename would spread the diff over many test references for no change in behavior.
- Skipping `service.setContext` when `pdp` is off: the back-in-stock success state can lead to a conversation, and without the context the assistant would not know which product the shopper was looking at.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `init` option `unavailableProductNotify` | now works without `conversationStarters.pdp: true` | minor | yes — configs with `pdp: true` behave the same. Configs with `unavailableProductNotify: true` and `pdp` off start showing the offer, which is what the flag asks for. |
| `init` option `conversationStarters.pdp` | now only controls PDP starters, not product detection | minor | yes — no behavior change when it is on |
| `shoppingAssistantDisabled` misconfiguration warning | message becomes `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify'` and no longer fires for `pdp` off | patch | yes — console text only |
| `WebChat.getConversationStartersLog()` | `config.unavailableProductNotify` added; new `skip` reason `starters_disabled` | minor | yes — additive debug output |
| Other `window.WebChat` methods, CSS custom properties, `weni-` classes | unchanged | none | yes |
| `@weni/webchat-service` dependency | unchanged | none | yes |

**Consumers affected**: integrators who set `unavailableProductNotify: true` without `conversationStarters.pdp: true`. Today the flag does nothing for them. After this change the offer appears on unavailable SKUs. This is the intended effect, and the release notes call it out. There is no `CHANGELOG.md` yet (`TODO(CHANGELOG)` in the constitution), so the release note goes in the GitHub release description, and in `CHANGELOG.md` under "Changed" if spec `011` creates it first.

## Non-Functional Requirements

### Peak Load

The peak is a campaign-day product page view. For stores with `pdp: true` nothing changes. For stores with `unavailableProductNotify: true` and `pdp` off, each product page view, and each SPA navigation to a product page, now makes one VTEX catalog request through `resolveProductData`, the same request a `pdp: true` store makes today. No WebSocket message is added: starters are not requested. Subscribe POSTs stay at one per form submit, with the service's retry bounds from spec `010`.

### Observability

- `init` event: adds `unavailableProductNotify` next to `pdpEnabled`.
- `getConversationStartersLog().config`: adds `unavailableProductNotify`.
- New `skip` event with `reason: 'starters_disabled'` when the product was resolved and no offer was shown, but `pdp` is off. It carries the fingerprint so it can be matched with the `attempt` event.
- `skip` with `reason: 'pdp_disabled'` keeps its meaning for the "nothing to do" case, now when both flags are off.
- The correlation identifier is unchanged: the fingerprint (`account:productPath`) within the hook, and the SKU shared with the service's `backInStock:*` events.
- No log carries the shopper's name or phone.

### Failure Handling

- Product resolution failing (`product_resolve_failed`): nothing shows, as today. No starters fallback.
- `evaluateBackInStockOffer` throwing (`back_in_stock_evaluate_error`): falls through to the starters gate. With `pdp` off, it records `starters_disabled` and shows nothing. With `pdp` on, it requests starters as today.
- Stale results after fast navigation: discarded by the existing generation and fingerprint checks, which run before the offer evaluation.
- No new external call, timeout, or retry. `resolveProductData` keeps its current behavior.

### Security and Authorization

No new input crosses the trust boundary. The product data comes from the same VTEX catalog request already used with `pdp: true`. The form and subscribe request are unchanged from spec `010`: the service validates name and phone, and the subscribe route authorizes server-side through the forwarded `vtex_session`.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| `pdp` off, `unavailableProductNotify` on, unavailable SKU: bubble and form | `useConversationStarters.test.js`: with `conversationStarters: { pdp: false }`, `unavailableProductNotify: true`, a PDP page, and `evaluateBackInStockOffer` returning `isUnavailable: true`, `isBackInStockNotify` becomes true, `questions` holds the notify CTA, and clicking it sets the `back-in-stock-notify` page with the product name and SKU. |
| Same config, available SKU: no starters | `useConversationStarters.test.js`: with `isUnavailable: false` and `isConnected: true`, `service.getStarters` is never called. With `isConnected: false`, emitting `connected` afterwards still does not call `getStarters`. The log has `skip` with `reason: 'starters_disabled'`. |
| Same config, SPA navigation re-evaluates | `useConversationStarters.test.js`: after a pathname change, the offer state is reset and `evaluateBackInStockOffer` is called again for the new product. |
| Both flags off: no product resolution | `useConversationStarters.test.js`: the existing `records skip when PDP is disabled` test, now with both flags off, also asserts `resolveProductData` is not called. |
| `pdp` on: unchanged | Existing hook suites for `buildContext` and `buildUnavailableNotifyContext` (both `pdp: true`) pass unchanged. |
| Warning only needs `unavailableProductNotify` | `standalone.test.ts`: `shoppingAssistantDisabled: true` with `unavailableProductNotify: true` and no `pdp` does not warn. With `unavailableProductNotify` off, it warns once with the new text. |
| Mode visible in the log | `conversationStartersLog.test.js`: `getConversationStartersLog().config.unavailableProductNotify` reflects the config. |

**Flow coverage**: init with `pdp` off → product page → product resolved → offer verdict unavailable → bubble → open → form; and init with `pdp` off → product page → available → no starters → navigation → unavailable product → bubble.

**Failure paths covered**: product resolution failure shows nothing; evaluator throwing with `pdp` off shows nothing and requests no starters; stale generation after navigation is discarded.

**Stubbed at the boundary**: `@weni/webchat-service` through the existing `mockService` in the hook test and `test/__mocks__/@weni/webchat-service.js`. VTEX product resolution and `isVtexPdpPage` are mocked as today. No network.

## Rollout and Rollback

1. Ship in the same minor release as spec `011`, or the next minor release after it. The `@weni/webchat-service` pin is unchanged.
2. No feature flag: `unavailableProductNotify` is already the opt-in. Stores that set it without `pdp` will start seeing the offer, so the release notes name this change explicitly.
3. Verify on a storefront with the local bundle and `{ unavailableProductNotify: true }` without `conversationStarters`: an unavailable SKU shows the bubble and the form, an available SKU shows nothing and the WebSocket frames contain no starters request, and the debug log shows `starters_disabled`.

Rollback: integrators who do not want the offer remove `unavailableProductNotify`. Reverting the code is safe: nothing new is persisted, and the previous version simply goes back to ignoring the flag when `pdp` is off.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| I. Version Control and Review | PR with lint and the coverage gate. | none |
| III. Observability | The mode and the new skip reason are recorded in the starters log. No personal data in logs. | none |
| IV. Versioned Contracts | The change is additive for `pdp: true` configs and enables the documented meaning of `unavailableProductNotify` for the rest. Minor release, called out in the release notes. | `CHANGELOG.md` does not exist yet (`TODO(CHANGELOG)`); the note goes in the release description until it does. |
| V. Specification Traceability | Opens with Origin Without Product Spec. | none |
| VII. Code as Documentation | `shouldResolveProduct` names the new rule. A short comment on the starters gate explains why the product is resolved even when starters are off. | none |
| VIII. Type Safety | No new file. The edits to `useConversationStarters.js` and `standalone.jsx` are small conditionals and stay in JS. | none |
| IX. Single Responsibility | The rule is one derived boolean used at both call sites. | `useConversationStarters.js` already exceeds 350 lines; splitting it is out of scope for a guard change. |
| XIV. State Management | `shouldResolveProduct` is derived from config refs, not stored as state. | none |
| XV. Async State Correctness | `setIsLoading(false)` on the new early return, so loading never stays on. Stale-result checks are unchanged. | none |
| Testing | Colocated tests for each change, covering flows and failure paths, within the 80% gate. | none |
| Internationalization | No new string. Crowdin-managed locale files are untouched. | none |

## Implementation Decisions

- **One guard, not two paths**: `detectAndFetchPdp` keeps doing product detection for both features. Only its entry guard and its last step (`requestStarters`) read different flags.
- **Context is set whenever the product is resolved**: see Rejected Alternatives. With both flags off, the product is not resolved and no context is set, as today.
- **`pdp_disabled` keeps its reason name**: it now fires only when both flags are off. Renaming it would break anyone filtering the debug log, and the name is still accurate for the default config.
- **Order of the starters gates**: the `pdp` check runs before the `shoppingAssistantDisabled` check. Both lead to "no starters", but `starters_disabled` tells you the integrator turned starters off, while the `shoppingAssistantDisabled` path stays silent as in spec `011`.
- **Warning text changes**: under `shoppingAssistantDisabled`, `pdp` is no longer needed, so naming it in the warning would mislead.
