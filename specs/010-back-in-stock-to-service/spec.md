# Engineering Specification: Back-in-stock logic and request in the service

**Repository**: webchat-react — frontend

**Feature Branch**: `010-back-in-stock-to-service`

**Created**: 2026-11-05

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: The widget owns back-in-stock rules and the network request: the unavailable-SKU decision and seller choice (`src/utils/vtex.js`), phone validation (`src/utils/phoneCountry.js`), and the subscribe payload, locale fallback, and `fetch` (`src/utils/availabilityNotify.js`, called from `src/views/BackInStockNotify.jsx`). The widget should only be responsible for what the shopper sees, so those rules and that request move to `@weni/webchat-service`. Only interface concerns and reading the host page stay here.
- Acceptance criteria:
  - On a product page with `unavailableProductNotify` on, the offer bubble appears exactly when it does today. The widget asks the service (`evaluateBackInStockOffer`) whether it applies, and no longer evaluates stock or seller itself.
  - Submitting the form with a blank name or an invalid phone shows the same inline errors as today. The verdict comes from `service.validateBackInStockContact`.
  - Submitting a valid form calls `service.subscribeBackInStock` once with the name, the international phone, the SKU, the seller, the sales channel and store-locale candidates read from the page, and the widget language. The widget makes no direct `fetch` to the subscribe route.
  - The submit button shows loading and blocks repeat submits while the request runs. The success state shows when the request resolves or rejects, the same as today.
  - `src/utils/availabilityNotify.js` keeps only host-page readers. `isSelectedSkuAvailable`, `getSellerIdForSku`, and `isValidInternationalNumber` are removed from the widget.
  - `package.json` still declares `@weni/webchat-service` `1.19.2`. Development, tests, and the local bundle resolve the new methods from a local service build linked with `npm link`, not from a published release.

## Scope in This Repository

**This repository implements**:

- Rewiring the starters hook, the notify view, and the integration utilities to call the service's back-in-stock API.
- Keeping the interface: the offer bubble and compact chip, landing on the notify page when the chat opens (spec `009`), the form and its field state, as-you-type phone formatting, the calling-code field and its default from the store country, inline errors, the loading and success states, "Not now" and "Show me similar products", and i18n.
- Keeping the host-page reads the service must not do: product resolution and selected SKU detection (`src/utils/vtex.js`), the sales channel from the FastStore session or the `__RUNTIME__.segmentToken`, store-locale candidates from `__RUNTIME__.culture.locale` and `<html lang>`, and the store country (`src/utils/phoneCountry.js`, `src/utils/vtexCustomFields.js`).

**Out of scope here**:

- The rules, the payload, the HTTP transport, the retries, and the events. These are owned by webchat-service spec `003-back-in-stock-to-service`.
- Product resolution and conversation starters. They stay as they are.
- The agentic-cx subscribe route and the retail-setup waiter. No change.
- Any visible behavior change, including the decision to always show success. Changing that is a separate UX decision.

**Depends on**: the local webchat-service working tree that implements spec `003`, built and linked into this repo. No published version is required. In `webchat-service`, `npm run build` then `npm link`. In this repo, `npm link @weni/webchat-service`. The link overrides `node_modules/@weni/webchat-service` with that checkout's `dist/`. The declared dependency stays `1.19.2`. That local build provides:

- `evaluateBackInStockOffer({ product, selectedSkuId }) → { isUnavailable, skuId, seller }`. `product` is the result of `normalizeForContext`, passed unchanged.
- `validateBackInStockContact({ name, phone }) → { isValid, errors: { name?: 'required', phone?: 'invalid' } }`.
- `subscribeBackInStock({ name, phone, skuId, seller, salesChannel, storeLocales, language }) → Promise<{ accepted }>`, rejecting with `BackInStockError`.

## Current State

- `src/hooks/useConversationStarters.js` — `detectAndFetchPdp` resolves the product and builds context. When `isUnavailableNotifyEnabledRef` is set and `isSelectedSkuAvailable(normalized, selectedSkuId)` is false, it calls `showBackInStockNotify(name, { skuId, seller: getSellerIdForSku(...) })`. The offer state, pending flags, landing on open, and simulators (`starters:simulate-unavailable`, `starters:simulate-back-in-stock-page`) are interface behavior, and they stay.
- `src/utils/vtex.js` — `isSelectedSkuAvailable` and `getSellerIdForSku` are back-in-stock rules. `findSelectedSkuItem`, `stripLeadingZeros`, and `getSelectedSkuId` stay because product context building and the page opener still use them.
- `src/utils/availabilityNotify.js` — `AVAILABILITY_NOTIFY_SUBSCRIBE_PATH`, `LOCALE_BY_LANGUAGE`, `getNotifyLocale`, `digitsOnlyPhone`, `buildAvailabilityNotifyBody`, and `subscribeAvailabilityNotify` (a `fetch` that swallows errors) move out. `getSalesChannel` is a page read and stays, minus its `'1'` default, which the service applies now.
- `src/utils/phoneCountry.js` — `isValidInternationalNumber` moves out. Store country, calling code, digit limits, `formatNationalNumber`, and `internationalDigits` serve the form fields and stay.
- `src/views/BackInStockNotify.jsx` — the submit handler validates with `isValidInternationalNumber` and a name trim, then awaits `subscribeAvailabilityNotify` and sets `submitted` in `finally`.
- Tests: `availabilityNotify.test.js` (19 references to the moved functions), `vtex.test.js` (15), `phoneCountry.test.js` (4), `useConversationStarters.test.js` (14, with `mockService` at line 57), and `BackInStockNotify.test.jsx` (asserts `globalThis.fetch` against `AVAILABILITY_NOTIFY_SUBSCRIBE_PATH`).
- `package.json` declares `@weni/webchat-service` `1.19.2`, and keeps `libphonenumber-js` for formatting. This spec does not change that declaration. A local `npm link` supplies the methods from spec `003` while developing.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/hooks/useConversationStarters.js` | modified | The divert asks `service.evaluateBackInStockOffer` instead of the local rules. `showBackInStockNotify` receives the returned `skuId` and `seller`. |
| `src/views/BackInStockNotify.jsx` | modified | Inline errors come from `service.validateBackInStockContact`; the submit calls `service.subscribeBackInStock`. The view keeps field, loading, and success state. |
| `src/utils/availabilityNotify.js` | modified | Reduced to host readers: `getSalesChannel()` (raw channel or `null`) and `getStoreLocaleCandidates()` (`[__RUNTIME__.culture.locale, <html lang>]` without empty values). |
| `src/utils/vtex.js` | modified | `isSelectedSkuAvailable` and `getSellerIdForSku` are removed. |
| `src/utils/phoneCountry.js` | modified | `isValidInternationalNumber` and the `isValidPhoneNumber` import are removed. |
| `src/utils/availabilityNotify.test.js`, `src/utils/vtex.test.js`, `src/utils/phoneCountry.test.js` | modified | Cases for removed functions are dropped; their equivalents move to webchat-service tests. Tests for the host readers are added. |
| `src/hooks/useConversationStarters.test.js` | modified | `mockService.evaluateBackInStockOffer` drives the divert. The existing back-in-stock suite (line 1162 on) asserts the same outcomes. |
| `src/views/BackInStockNotify.test.jsx` | modified | Asserts calls on the service from `useChatContext` instead of `fetch`. |
| `package.json`, `package-lock.json` | unchanged | The declared `@weni/webchat-service` stays `1.19.2`. The new methods come from the linked local build. |
| `CHANGELOG.md` | modified | Changed: back-in-stock rules and request delegated to the linked local webchat-service. No dependency version change. |

### Flow

**Offer**

1. `detectAndFetchPdp` resolves the product, normalizes it, picks `selectedSkuId`, and sets the context. This part is unchanged.
2. If `isUnavailableNotifyEnabledRef.current`, the hook calls `service.evaluateBackInStockOffer({ product: normalized, selectedSkuId })`. The init flag stays here because it is a widget `init` option.
3. When `isUnavailable` is true, it records `divert_back_in_stock` and calls `showBackInStockNotify(resolvedProductName, { skuId, seller })` with the service's values. Otherwise it calls `requestStarters`, as today.
4. The bubble, the chip, the landing on open, and `openBackInStockPage` are unchanged. `openBackInStockPage` still falls back to `getSelectedSkuId()` for the SKU prop, because that is a page read.

**Form**

1. Field changes keep today's formatting: `callingCodeDigits`, `nationalDigits`, and `formatNationalNumber`. The default calling code still comes from `loadStoreCountryAlpha3`.
2. On submit, if a submit is already in progress, return. Otherwise compose `phone = internationalDigits(ddi, nationalNumber)` and call `service.validateBackInStockContact({ name, phone })`. Map `errors.name === 'required'` to `back_in_stock.name_required` and `errors.phone === 'invalid'` to `back_in_stock.invalid_phone`. If either error is set, stop.
3. Set `isSubmitting`, then `await service.subscribeBackInStock({ name, phone, skuId: skuId || getSelectedSkuId() || '', seller, salesChannel: getSalesChannel(), storeLocales: getStoreLocaleCandidates(), language: i18n.language })`.
4. In `finally`, set `submitted`: the success state shows on both resolve and reject, as today. The rejection is caught in the view and not rethrown. The service has already emitted `backInStock:error` and logged it with its own context, so the view adds no `console` call.
5. "Not now" and "Show me similar products" are unchanged.

### Rejected Alternatives

- Keeping inline validation in the widget and letting the service validate again: two sources for the same rule would drift. The service validator is synchronous, so the inline experience is the same.
- Having the service read the page itself (sales channel, locale, selected SKU): the service must stay headless and deterministic (its Principle XIV). This repository already reads the page for product detection.
- Mapping the product to a service-specific shape in the widget: that mapping would be logic. The service accepts the `normalizeForContext` output and normalizes it at its own boundary.
- Showing an error state when `subscribeBackInStock` rejects: that is a visible UX change, outside this refactor. The rejection is now observable through the service's error event, so a later UX spec can adopt it.
- Moving the offer state machine (bubble, pending flags, landing) to the service: that is navigation and presentation, and spec `009` deliberately placed it in the hook.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| Declared `@weni/webchat-service` dependency | unchanged at `1.19.2` | none | yes — this spec does not publish or pin a new service version |
| `window.WebChat` API, `init` options (`unavailableProductNotify` included), and package exports | unchanged | none | yes |
| `simulateUnavailableProduct` and `simulateBackInStockPage` debug helpers | unchanged | none | yes |
| Internal utility exports removed: `isSelectedSkuAvailable`, `getSellerIdForSku`, `isValidInternationalNumber`, `buildAvailabilityNotifyBody`, `subscribeAvailabilityNotify`, `getNotifyLocale`, `digitsOnlyPhone`, `AVAILABILITY_NOTIFY_SUBSCRIBE_PATH` | removed | none — these are not package exports | yes — internal to `src/utils` |
| Back-in-stock request on the wire | unchanged body and route; now sent by the service | none | yes |

**Consumers affected**: none through npm. The declared dependency stays `1.19.2`, so a published widget built from the registry still resolves the current service. This spec is verified with the local link. Choosing a published service version and bumping the pin is a later release step, outside this spec. The changelog lists the delegation under Changed and states that the pin did not move.

## Non-Functional Requirements

### Peak Load

The peak is one shopper on a campaign-day product page: one offer evaluation per product resolution (in memory) and one subscribe per form submit. The widget adds no request. The service may retry a failed subscribe at most twice (webchat-service spec `003`), so a single submit sends at most three POSTs, and only when the route is failing.

### Observability

- The existing `divert_back_in_stock` starter event still records the divert with the SKU and product name, as today.
- The subscribe outcome is logged by the service (`backInStock:subscribed` / `backInStock:error`, `[WebChatService:BackInStock]` warnings) with the SKU and attempt, and never with the name or phone.
- The widget adds one starter event, `back_in_stock_evaluate_error` (warn, with the SKU), only if the offer evaluator throws. It adds no subscribe logging of its own, so there is no duplicate or personal data in the console. The correlation identifier is the SKU, shared by the starter events and the service events.

### Failure Handling

- `subscribeBackInStock` rejects: the view still shows success (the behavior is preserved), and the button never stays in loading because `submitted` is set in `finally`. Timeouts and retries are the service's (10 s per attempt, up to 2 retries).
- `service` is absent from the context, or the link points at a build without the new methods: the hook treats the offer as not applicable and falls back to starters. The view skips the request and shows success. Neither path throws. Re-run `npm run build` in webchat-service and re-link.
- `evaluateBackInStockOffer` throws on unexpected input (the service returns `isUnavailable: false` for malformed input, so this is defensive only): the hook wraps the call in a try/catch, records `back_in_stock_evaluate_error` (warn, with the SKU) through `recordConversationStarterEvent`, and falls back to starters instead of a broken bubble.

### Security and Authorization

The name and phone are entered by the shopper and validated by the service before anything is sent. The route validates again and authorizes on the server through the forwarded `vtex_session`. The widget handles no token and adds no secret. Sales channel and locale are read from the page and forwarded as untrusted hints; the route and Retail already treat them as such.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| The bubble appears exactly when the service says the offer applies | `useConversationStarters.test.js`: `mockService.evaluateBackInStockOffer` returns `{ isUnavailable: true, skuId: '27', seller: '1' }`, so `isBackInStockNotify` is true, the CTA question is set, and the page props carry SKU `27` and seller `1`. Returning `isUnavailable: false` calls `getStarters` and shows no offer. With `unavailableProductNotify` off, the service method is not called. If it throws, starters are requested and `back_in_stock_evaluate_error` is recorded. Each case asserts that the method is called with the `normalized` product and `selectedSkuId`. |
| Same inline errors, verdict from the service | `BackInStockNotify.test.jsx`: the mock `validateBackInStockContact` returns `errors.name: 'required'` (or `errors.phone: 'invalid'`), so the matching translated error renders, `aria-invalid` is set, and `subscribeBackInStock` is not called. Editing the field clears the error. |
| A valid submit calls `subscribeBackInStock` once with the composed input, and no direct `fetch` | Same file: the service is called once with name, `internationalDigits` phone, SKU, seller, `getSalesChannel()`, `getStoreLocaleCandidates()`, and `i18n.language`. `globalThis.fetch` is not called. Without a `skuId` prop, the SKU falls back to `getSelectedSkuId()`. |
| Loading and double-submit guard, then success on resolve or reject | A pending `subscribeBackInStock` keeps the button loading and disabled, and a second submit does not call it again. After it resolves, the success title renders. After it rejects, the success title also renders and nothing is thrown. |
| Moved functions are gone; host readers remain | `availabilityNotify.test.js` covers `getSalesChannel` (FastStore channel, segment token channel, `null` when absent or malformed) and `getStoreLocaleCandidates` (order, empty values dropped). `vtex.test.js` and `phoneCountry.test.js` drop the moved cases; their table cases are ported to webchat-service. Lint fails on any leftover import of a removed export. |
| Local link, declared pin unchanged | `package.json` still declares `@weni/webchat-service` `1.19.2`. Hook and view tests mock the service, so `npm test` passes in CI against that pin. Locally, with the link active, `node_modules/@weni/webchat-service` resolves to the checkout's `dist/`, `npm run build` bundles it, and that build exports `evaluateBackInStockOffer`, `validateBackInStockContact`, and `subscribeBackInStock`. |

**Flow coverage**: product page → resolution → service offer verdict → bubble → open → notify page → form validation through the service → subscribe through the service → success state.

**Failure paths covered**: subscribe rejection still reaches success with no loading stuck; invalid contact blocks the request; a missing service method falls back to starters and success; the offer evaluator throwing falls back to starters.

**Stubbed at the boundary**: `@weni/webchat-service` through `mockService` in the hook test, and through the mocked `useChatContext` service in the view test. VTEX product resolution stays mocked as today. No network.

## Rollout and Rollback

1. In webchat-service, implement spec `003`, run `npm run build`, then `npm link`. In this repo, `npm link @weni/webchat-service`. Do not publish the service and do not change the declared `1.19.2`.
2. This change rewires the widget against that link. No feature flag: visible behavior is the same, and `unavailableProductNotify` still turns the offer on or off.
3. Verify locally, and on a storefront loaded with a bundle built while the link is active, with an unavailable SKU: the bubble appears, the form validates, one POST reaches `/_v/private/availability-notify/subscribe` with the same body, and the success state shows.

A later release may publish the service and bump this pin. That release is not part of this spec, and this spec does not wait for it.

Rollback: `npm unlink @weni/webchat-service` and reinstall, which restores the declared `1.19.2`, and revert the widget code so it uses its own logic again. Nothing is persisted by this change.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| I. Version Control and Review | PR with lint and the coverage gate. | none |
| III. Observability | Only one new starter event, on evaluator failure, carrying the SKU and no personal data. The service owns subscribe telemetry. `divert_back_in_stock` is unchanged. | none |
| IV. Versioned Contracts | The declared service dependency stays `1.19.2`. The new methods are reached through a local `npm link`, which is a developer override and not a published contract change. Public API, `init` options, CSS, and class names are unchanged. | none |
| V. Specification Traceability | Opens with Origin Without Product Spec. Paired with webchat-service spec `003`. | none |
| VIII. Type Safety | The change modifies existing JS files only; no new source file is added. | Tests stay in the existing colocated `.test.js` / `.test.jsx` files, because the TypeScript toolchain is not configured (`TODO(TYPESCRIPT_TOOLCHAIN)`) and no new file triggers the setup. |
| IX. Single Responsibility | The view goes back to rendering and field state. The hook keeps offer presentation. Rules leave the widget. | none |
| XII. Component Architecture | `BackInStockNotify`, `FSButton`, and the existing views are unchanged in structure. | none |
| XIV. State Management | The offer state stays in the starters hook and the page stack in `ChatContext`. The service result is not mirrored into a second store. | none |
| XV. Async State Correctness | Loading, double-submit guard, and the success state are kept. The rejection is not silent: the service emits `backInStock:error`. The UI deliberately shows success. | Showing success on rejection keeps today's UX; changing it is a separate UX decision. |
| XVI. API Integration & Data Boundaries | The direct `fetch` leaves `src/utils/availabilityNotify.js`; HTTP is now in the service. No snake_case in the widget: the service builds the wire body. | none |
| Testing | Hook, view, and utilities tests are updated with the flows and failure paths above, within the coverage gate. | none |
| Internationalization | No new string. Service error codes map to the existing `back_in_stock.*` keys in `src/i18n/locales/en.json`. Crowdin-managed locale files are untouched. | none |
| Accessibility | `role="alert"`, `aria-invalid`, and `aria-describedby` on errors are unchanged. | none |

## Implementation Decisions

- **The init flag stays in the widget**: `unavailableProductNotify` is a widget `init` option (part of this repository's contract), so the hook decides whether to ask the service at all.
- **Store-locale candidates are passed raw**: the widget reads `__RUNTIME__.culture.locale` and `<html lang>` in order and passes both. The service picks the first regional one, so no locale rule remains here.
- **The sales channel loses its default here**: `getSalesChannel()` returns the raw channel or `null`, and the service applies `'1'`.
- **The SKU fallback stays a page read**: when the page prop lacks a SKU, the widget passes `getSelectedSkuId()`, and the service normalizes it (strips leading zeros) and rejects an empty value.
- **`libphonenumber-js` stays a widget dependency**: it is still needed for `AsYouType` formatting and calling codes. The service keeps it external in ESM/CJS, so the bundle resolves one copy.
- **No published service version**: `package.json` keeps `@weni/webchat-service` at `1.19.2`. `npm link` points `node_modules/@weni/webchat-service` at the local `dist/` from spec `003`. Tests, the dev server, and a local bundle all use that link. Bumping the pin waits for a later release.
- **Success on rejection is preserved**: a refactor must not change what the shopper sees. The service's rejection and error event make a future error state possible without another refactor.
