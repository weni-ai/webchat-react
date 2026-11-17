# Engineering Specification: Resolve the VTEX IO `orderFormId` from the checkout API

**Repository**: webchat-react — frontend

**Feature Branch**: `013-vtex-io-orderform-id`

**Created**: 2026-11-17

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: On VTEX IO stores, `localStorage.getItem('orderform')` sometimes holds an `orderFormId` that is not the shopper's current order form, the one bound to the `checkout.vtex.com` cookie. The widget reads that key, so it adds products to the wrong cart, sends UTM attribution to the wrong order form, and writes the wrong `orderform` custom field.
- Acceptance criteria:
  - On a non-FastStore host whose `localStorage.orderform` holds a valid id different from the one returned by `GET /api/checkout/pub/orderForm`, the widget uses the id from the `GET` in all three places: the `orderform` custom field, the `orderFormId` sent with `addProductToCart`, and the `order_form_id` sent with `sendUtm`.
  - On a non-FastStore host, no order form id is ever read from `localStorage`, either internally or through the `window.getReliableOrderFormId` and `window.getStableOrderFormId` helpers.
  - On a non-FastStore host, when the `GET` fails or returns no valid id, no id is used: no custom field is set, no product is added to the cart, and no UTM is sent. This holds even when `localStorage.orderform` holds a valid id. The next `requestOrderForm` call tries the `GET` again.
  - On a FastStore host, the id still comes from `fs::cart`, the same as today, and the FastStore bootstrap flow is unchanged.

## Scope in This Repository

**This repository implements**:

- One resolution rule for the order form id, in `src/utils/vtexCustomFields.js` (`getValidOrderFormId`): FastStore's `fs::cart` id first, then `GET /api/checkout/pub/orderForm`. `localStorage` and the VTEX IO client-side copies (Apollo cache, React Context) are no longer sources.
- `OrderFormProvider.requestOrderForm` in `src/contexts/OrderFormContext.jsx` uses that same rule. This removes its duplicated chain (`getLocalOrderFormId` plus a direct `fetch`).
- Removing `getOrderFormIdFromStorage` from `src/utils/VTEXIOMinicartBridge.js`, so `getReliableOrderFormId` and `getStableOrderFormId` (both exposed on `window`) never return a `localStorage` id.

**Out of scope here**:

- `@weni/webchat-service`. It never reads the `orderform` key. `addToCart` and `sendUtm` in `src/core/WebSocketManager.js` only forward the `orderFormId` / `order_form_id` the caller passes, and `validateUtmData` in `src/utils/validators.js` only checks it is a non-empty string. Once this repository passes the right id, the service is correct. No spec or prompt is needed for that repository.
- The Weni backend that adds items and registers UTM against the forwarded id. It is unchanged.
- Re-resolving the id when the order form changes mid-session (for example, after a purchase in the same SPA session). `OrderFormProvider` keeps the first resolved id for the session, and the custom-field watcher stops after the first value. Both are existing behavior.
- The minicart refresh (`updateVTEXIOMinicart`) and its `?allowedOutdatedData=false` fetch. It is unchanged.
- FastStore resolution and `bootstrapOrderFormId`.
- Translations. No new string is added.

**Depends on**: the VTEX Checkout API `GET /api/checkout/pub/orderForm`, same origin as the storefront. It returns the order form bound to the `checkout.vtex.com` cookie, which the browser sends because `fetch` defaults to `credentials: 'same-origin'`. No change is needed in `@weni/webchat-service`, and the pinned peer dependency stays the same.

## Current State

- `src/utils/VTEXIOMinicartBridge.js`
  - `getOrderFormIdFromStorage` parses `localStorage.getItem('orderform')` and returns `orderFormId ?? id` when it matches `/^[a-f0-9]{32}$/`. The bug comes from here: the key can be well-formed but stale.
  - `getReliableOrderFormId` returns `getOrderFormIdFromApollo() || getOrderFormIdFromContext() || getOrderFormIdFromStorage() || null`. On a VTEX IO page where the Apollo cache and Context are not readable yet, or not readable at all, the `localStorage` id wins.
  - `getStableOrderFormId` polls Apollo and Context for a stable value, then falls back to `getOrderFormIdFromStorage` after the timeout.
  - `setupMinicartBridge` exposes `updateMinicart`, `findNativeOrderFormContext`, `getReliableOrderFormId`, `getStableOrderFormId`, and `getOrderFormIdFromApollo` on `window`. They are not documented in `README.md`.
- `src/utils/vtexCustomFields.js`
  - `getOrderFormId` tries FastStore's `fs::cart` id, then `getReliableOrderFormId()`, then `fetch('/api/checkout/pub/orderForm')`. Because `getReliableOrderFormId` includes `localStorage`, the `GET` only runs when `localStorage` has no valid id.
  - `getValidOrderFormId` applies the 32-hex check. It resolves the `orderform` watcher in `startVtexCustomFieldsSync`, which `ChatContext` starts only when `isInsideVTEXStore`. `sendVtexUtm` uses it too.
- `src/contexts/OrderFormContext.jsx`
  - `requestOrderForm` runs once per provider (`fetchStartedRef`). It calls a private `getLocalOrderFormId` (FastStore `fs::cart` id, then `getReliableOrderFormId()`). Only when that returns nothing does it `fetch('/api/checkout/pub/orderForm')` directly from the context, with `isLoadingOrderForm` set during the fetch. On failure, it neither saves nor retries for the rest of the session.
  - `sendProductsToCart` sends `orderFormIdRef.current` to `chat.addProductToCart` and to the throttled `orderform` custom field.
- `src/utils/sendVtexUtm.js` — `sendVtexUtm` awaits `getValidOrderFormId()` and sends `order_form_id` through `service.sendUtm`.
- `src/components/Product/CounterControls.jsx` — calls `requestOrderForm()` on mount. It only shows the add-to-cart controls when `orderFormId || isFastStore`. On VTEX IO today the id is usually available synchronously from the bridge. After this change, the controls show once the `GET` resolves, as they already do on hosts where the bridge returns nothing.
- Tests:
  - `src/utils/vtexCustomFields.test.js` mocks `getReliableOrderFormId` and has a case `returns id from getReliableOrderFormId when FastStore cart is absent`. The `startVtexCustomFieldsSync` cases also drive the `orderform` field through that mock.
  - `src/contexts/OrderFormContext.test.jsx` mocks `getReliableOrderFormId` for the local path and `globalThis.fetch` for the fallback.
  - `src/utils/VTEXIOMinicartBridge.test.js` has a `getOrderFormIdFromStorage` suite, plus `getReliableOrderFormId` and `getStableOrderFormId` cases that expect the `localStorage` fallback.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/utils/vtexCustomFields.js` | modified | `getOrderFormId` drops the `getReliableOrderFormId` step, so it becomes FastStore `fs::cart` id or `GET /api/checkout/pub/orderForm`. The `GET` checks `response.ok` before reading the body. The import of `VTEXIOMinicartBridge` is removed. |
| `src/contexts/OrderFormContext.jsx` | modified | `requestOrderForm` awaits `getValidOrderFormId()` instead of `getLocalOrderFormId()` plus its own `fetch`. `isLoadingOrderForm` covers the whole resolution. When no id is resolved, `fetchStartedRef` is reset so a later call can retry, and one `console.warn` is logged. `getLocalOrderFormId` and the `getReliableOrderFormId` import are removed. |
| `src/utils/VTEXIOMinicartBridge.js` | modified | `getOrderFormIdFromStorage` is removed. `getReliableOrderFormId` becomes `getOrderFormIdFromApollo() \|\| getOrderFormIdFromContext() \|\| null`. `getStableOrderFormId` throws after the timeout instead of falling back to storage. The header comment no longer lists `localStorage`. |
| `src/utils/vtexCustomFields.test.js` | modified | Repro test with a stale `localStorage` id (see Test Strategy). The bridge mock and its case are removed. The sync cases use the `fetch` mock by URL that already exists in the file (`mockFetchByUrl`). |
| `src/contexts/OrderFormContext.test.jsx` | modified | Covers the end-to-end flow from a stale `localStorage` id to `addProductToCart`, the retry after a failed `GET`, and the unchanged FastStore path. The `getReliableOrderFormId` mock is removed. |
| `src/utils/VTEXIOMinicartBridge.test.js` | modified | The `getOrderFormIdFromStorage` suite is removed. `getReliableOrderFormId` and `getStableOrderFormId` cases assert that a `localStorage`-only id is ignored. |

### Flow

**Non-FastStore host (VTEX IO): custom field and UTM**

1. `ChatContext` starts `startVtexCustomFieldsSync` inside a VTEX store. The `orderform` watcher calls `getValidOrderFormId()`.
2. `getOrderFormId` reads `window.faststore_sdk_stores?.get('fs::cart')?.read?.()?.id`. It is absent, so it calls `fetch('/api/checkout/pub/orderForm')`. The browser sends the `checkout.vtex.com` cookie, and VTEX returns the order form bound to it.
3. If `response.ok` and `data.orderFormId` matches the 32-hex check, the id is returned. Otherwise the result is `null`.
4. The watcher calls `setCustomField('orderform', id)` and stops. On `null`, it polls again in 15 s, as today.
5. `sendVtexUtm` runs the same resolution for each UTM source. On `null`, it skips (`silent`) or throws `order_form_id is not available`, as today.

**Non-FastStore host (VTEX IO): add to cart**

1. `CounterControls` mounts and calls `requestOrderForm()`. The `fetchStartedRef` guard keeps a single resolution in flight.
2. `isLoadingOrderForm` becomes `true`, and `getValidOrderFormId()` runs the same steps 2 and 3 above.
3. With an id, `setOrderFormId(id)` runs and the add-to-cart controls appear. `sendProductsToCart` later sends that id to `chat.addProductToCart` and to the `orderform` custom field.
4. With `null`, no id is set and `console.warn('[OrderForm] Could not resolve orderFormId', { account })` is logged once. `fetchStartedRef` is reset so the next `requestOrderForm()` (the next product card that mounts) retries. `isLoadingOrderForm` goes back to `false` in a `finally` block.

**FastStore host**

1. `fs::cart` has an id, so it is returned with no `GET`, the same as today.
2. With an empty cart id, the flow is unchanged: `sendProductsToCart` bootstraps through `bootstrapOrderFormId` because `isFastStoreHost()` is true.

### Rejected Alternatives

- **Only drop `localStorage` and keep Apollo and Context ahead of the `GET`**: these are client-side copies of the order form, not the checkout's source of truth. `vtex.order-manager` seeds its initial order form from the same `orderform` key before its query resolves. That seeding still needs confirming in `research.md` during the plan. If it holds, Context can carry the stale id for that window and reintroduce the bug. The Apollo lookup also takes the first `OrderForm:*` key, which is ambiguous if the cache holds more than one. The `GET` is the only source tied to the cookie.
- **Compare the `localStorage` id with the `GET` id and prefer the `GET` on mismatch**: this costs the same request and keeps a source that is never authoritative.
- **Detect VTEX IO explicitly (`window.__RUNTIME__`) and use the `GET` only there**: on legacy CMS stores, the `GET` is already the effective source, because the bridge finds nothing there. "Not FastStore" covers both without a new detector.
- **Cache the resolved id at module level**: an in-memory cache would hide a mid-session order form change and add invalidation rules. Each resolution makes one same-origin request, and there are only a handful per session (see Peak Load).
- **Use `?allowedOutdatedData=false` for the id**: it forces VTEX to recompute the order form, which only the minicart refresh needs. The id is the same either way.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `orderform` custom field (sent through `setCustomField`) | on non-FastStore hosts, the value comes from `GET /api/checkout/pub/orderForm`, never from `localStorage` | patch | yes — same field and format, correct value |
| `orderFormId` passed to `service.addProductToCart` and `order_form_id` passed to `service.sendUtm` | same source change | patch | yes — same shape |
| `window.getReliableOrderFormId()` | no longer falls back to `localStorage`. Returns `null` where it used to return the stored id. | patch | yes — same signature. Undocumented debug helper. |
| `window.getStableOrderFormId()` | no longer falls back to `localStorage`. Rejects with `[Minicart] Could not resolve a stable orderFormId` where it used to return the stored id. | patch | yes — same signature and error. Undocumented debug helper. |
| `getOrderFormIdFromStorage` (internal module export) | removed | none | not part of the package exports or `window.WebChat` |
| `window.WebChat`, `init` options, CSS custom properties, `weni-` classes | unchanged | none | yes |
| `@weni/webchat-service` peer dependency | unchanged | none | yes |

**Consumers affected**: shoppers on VTEX IO stores, whose cart adds and attribution now reach their real order form. Weni's backend receives a different, correct `order_form_id` for the affected sessions. Integrators who call the undocumented `window.getReliableOrderFormId` or `window.getStableOrderFormId` from host code lose the `localStorage` fallback, and the release notes say so. There is no `CHANGELOG.md` yet (`TODO(CHANGELOG)`), so the note goes in the GitHub release description under "Fixed".

## Non-Functional Requirements

### Peak Load

The peak is a campaign-day storefront peak (Black Friday, 2026-11-27, ten days from this spec), counted per widget session on a VTEX IO store. The new load lands on VTEX's checkout on the store's own domain, not on Weni. Today the bridge usually answers synchronously and no `GET` runs. After the change, one widget session makes these `GET /api/checkout/pub/orderForm` requests:

- 1 from the `orderform` watcher at chat start, plus 1 every 15 s only while it keeps failing.
- 1 from the first `requestOrderForm`, plus 1 per later product-card mount only after a failure.
- Up to 3 from `sendVtexUtm`, once per UTM source (`once: true`).

That is at most 5 requests per healthy session. The storefront makes the same call itself on page load and after every cart change. No WebSocket message is added.

### Observability

- `OrderFormProvider` logs `console.warn('[OrderForm] Could not resolve orderFormId', { account })` once per failed resolution, with `account` from `getVtexAccount()`. It never logs the order form body, the cookie, or cart contents.
- The custom-field watcher and `sendVtexUtm` keep their current, silent `null` handling. A warning there would repeat every 15 s on a host where the endpoint never answers, and the `requestOrderForm` warning already makes the failure visible.
- To verify the id actually used, compare the `order_form_id` / `orderFormId` in the WebSocket frames with the `orderFormId` in the network response of `GET /api/checkout/pub/orderForm`.

### Failure Handling

- **Network error, non-2xx response, or a non-JSON body**: caught in `getOrderFormId`, which returns `null`. No exception reaches a component.
- **2xx with a missing or malformed `orderFormId`**: rejected by the 32-hex check in `getValidOrderFormId`.
- **Timeout**: no explicit timeout, the same as the current `GET` fallback. The browser default applies. `isLoadingOrderForm` stays `true` until it settles, and the controls stay hidden until then (they require `orderFormId`).
- **Retries**: the watcher keeps its 15 s interval until it gets a value. `requestOrderForm` does not loop. It re-arms on failure, and the next call retries. Each retry is a read (`GET`), so retries are idempotent.
- **No cookie yet**: VTEX creates an order form and sets the cookie in the response. On VTEX IO, `vtex.order-manager` normally fetches the order form at page load, before the chat connects. If the widget's call came first, the minicart catches up through `trySyncHostCart` → `updateVTEXIOMinicart` after the first add.
- **Concurrent resolutions** (the watcher and `requestOrderForm` at the same time): they are two independent reads of the same cookie-bound order form and return the same id.

### Security and Authorization

- The trust boundary is the response of a same-origin VTEX endpoint. Only `orderFormId` is read, and it must pass `/^[a-f0-9]{32}$/` before it is used. Nothing from the body is rendered or logged.
- The request sends no credentials beyond the browser's same-origin cookies. No secret is involved.
- Authorization stays server-side: VTEX checkout binds the order form to the cookie, and Weni's backend authorizes `addToCart` and `sendUtm` as it does today.
- Not reading `localStorage` removes one way for page scripts or stale state to redirect cart adds to another order form.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| Stale `localStorage` id: the `GET` id is used for the custom field, the cart, and UTM | Repro (fails on `main`): `vtexCustomFields.test.js`, `getValidOrderFormId` with `localStorage.orderform = { id: VALID_A }`, no FastStore, and `fetch` returning `{ orderFormId: VALID_B }` resolves `VALID_B`. `startVtexCustomFieldsSync` with the same setup calls `setCustomField('orderform', VALID_B)`. `OrderFormContext.test.jsx`, same setup: after `requestOrderForm`, `orderFormId` is `VALID_B`, and flushing a pending item calls `addProductToCart` with `orderFormId: VALID_B`. `sendVtexUtm.test.js` keeps covering that `getValidOrderFormId`'s value is sent as `order_form_id`. |
| No `localStorage` read on non-FastStore hosts, including the `window` helpers | `VTEXIOMinicartBridge.test.js`: with only `localStorage.orderform` set, `getReliableOrderFormId()` returns `null` and `getStableOrderFormId({ timeoutMs: 50 })` rejects with `stable orderFormId`. `vtexCustomFields.test.js`: a `jest.spyOn(Storage.prototype, 'getItem')` sees no `'orderform'` read during `getValidOrderFormId`. |
| `GET` fails: no id is used, and the next `requestOrderForm` retries | `vtexCustomFields.test.js`: `fetch` rejecting, `ok: false`, and an invalid id each resolve `null` even with a valid `localStorage` id. `OrderFormContext.test.jsx`: the first `GET` rejects, so `orderFormId` stays `null`, `isLoadingOrderForm` goes back to `false`, `console.warn` is called once with `'[OrderForm] Could not resolve orderFormId'`, and no `addProductToCart` call happens. A second `requestOrderForm` with a succeeding `GET` sets the id. |
| FastStore unchanged | `vtexCustomFields.test.js`: the existing `fs::cart` case still returns its id, and `fetch` is not called. `OrderFormContext.test.jsx`: the existing FastStore and `bootstrapOrderFormId` cases pass unchanged. |

**Flow coverage**: a non-FastStore host with a stale `localStorage` id, through chat start, the `orderform` custom field, a product card mount, the resolved id, a staged item, and `addProductToCart` with the `GET` id. Also a failed first `GET`, the retry on the next card mount, and the id set.

**Failure paths covered**: `fetch` rejects, a non-2xx response, a non-JSON body, an invalid id, a `localStorage`-only id ignored by the `window` helpers, and `isLoadingOrderForm` never stuck at `true`.

**Stubbed at the boundary**: `globalThis.fetch` by URL (`/api/checkout/pub/orderForm`), `localStorage` (jsdom, cleared per test), `window.faststore_sdk_stores`, and `@weni/webchat-service` through the existing mocks and `ChatContext` test providers. No real network.

## Rollout and Rollback

1. Ship as a patch release of `@weni/webchat-template-react` and the standalone bundle. Shipping before the 2026-11-27 campaign peak is preferable, because wrong-cart adds cost the most then. No `@weni/webchat-service` release is needed.
2. No feature flag. This is a correctness fix with no configuration surface.
3. Verify on a VTEX IO storefront with the local bundle:
   - Set `localStorage.orderform` to `{"id":"<another valid 32-hex id>"}` and reload.
   - Open the chat and add a product. The WebSocket `addToCart` frame and the `orderform` custom field carry the `orderFormId` from the `GET /api/checkout/pub/orderForm` response, and the product appears in the store's minicart.
   - On a FastStore storefront, nothing changes.

Rollback: revert the release. Nothing is persisted, so the previous version works again immediately, along with its `localStorage` fallback and the bug.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| I. Version Control and Review | PR with lint and the coverage gate. | none |
| III. Observability | One stable, searchable warning on a failed resolution, with the VTEX account as context. No order form contents, cookie, or personal data. | The custom-field watcher and `sendVtexUtm` stay silent on `null` to avoid a warning every 15 s. The `requestOrderForm` warning covers the failure. |
| IV. Versioned Contracts | Patch: same interfaces, corrected values. The `window` helper behavior change goes in the release notes. | `CHANGELOG.md` does not exist yet (`TODO(CHANGELOG)`), so the note goes in the release description. |
| V. Specification Traceability | Opens with Origin Without Product Spec. | none |
| VII. Code as Documentation | A short comment on `getOrderFormId` explains why the checkout `GET`, not `localStorage` or the host context, is the source on VTEX IO. | none |
| VIII. Type Safety | No new file. The edits are small changes to existing `.js`/`.jsx` files for a bug fix, so they stay in JS. | none |
| IX. Single Responsibility | The resolution rule lives in one function, `getOrderFormId`. `requestOrderForm` only manages provider state around it. | `OrderFormContext.jsx` already exceeds 350 lines. This change shrinks it, and splitting it is out of scope for a fix. |
| XIV. State Management | `orderFormId` stays owned by `OrderFormProvider`, and nothing is duplicated. | none |
| XV. Async State Correctness | `isLoadingOrderForm` is cleared in `finally`. The `fetchStartedRef` guard prevents double resolution. Failure is logged and re-armed, not silent. | none |
| XVI. API Integration & Data Boundaries | The direct `fetch` in `OrderFormContext` moves to the integration module `vtexCustomFields.js`. Errors are handled explicitly and never surface as unhandled exceptions. | none |
| Testing | Colocated tests, a repro test for the bug, failure paths, a flow test from resolution to `addProductToCart`, and the 80% gate. | none |
| Defensive Programming | The 32-hex check and `response.ok` guard host-page data, which is the realistic invalid state named in the constitution. The root cause, an unreliable source, is removed rather than masked. | none |
| Maintainability | Two duplicated resolution chains (`getLocalOrderFormId` plus a direct `fetch`, and `getOrderFormId`) become one. | none |
| Internationalization | No new string. Crowdin-managed locale files are untouched. | none |

## Implementation Decisions

- **The checkout `GET` is the only VTEX IO source**: the user asked to drop `localStorage` and use the `GET` on VTEX IO. Apollo and Context are dropped from the chain too, for the reason under Rejected Alternatives.
- **"VTEX IO" means "not FastStore"**: no new host detector. Legacy CMS stores follow the same path, which matches what they effectively do today.
- **One shared resolver**: `OrderFormProvider` calls `getValidOrderFormId()`. It gains the 32-hex check, which it did not have before, and the context no longer calls `fetch`.
- **Re-arm on failure instead of retry loops**: before this change, a failed `GET` in `requestOrderForm` only mattered on hosts where the bridge also failed. Now it is the only VTEX IO source, so a single transient error would disable add-to-cart for the whole session. Resetting `fetchStartedRef` lets the next card mount retry, without a timer.
- **No in-flight dedupe or cache**: at most about five reads per session, and they are independent and idempotent. Dedupe can come later if the plan finds a hot path.
- **The bridge helpers stay on `window`**: `getReliableOrderFormId`, `getStableOrderFormId`, and `getOrderFormIdFromApollo` are kept for host-side debugging, minus the `localStorage` fallback. The bridge module is still imported by `OrderFormContext` (`updateVTEXIOMinicart`), so `setupMinicartBridge` still runs.
- **Plain `GET` without query parameters**: the same URL the current fallback uses. `allowedOutdatedData=false` stays exclusive to the minicart refresh.
