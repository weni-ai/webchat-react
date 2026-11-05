# Implementation Plan: Back-in-stock logic and request in the service

**Branch**: `010-back-in-stock-to-service` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-back-in-stock-to-service/spec.md`

## Summary

The widget stops deciding stock, validating the phone, and posting the subscribe request. It calls `evaluateBackInStockOffer`, `validateBackInStockContact`, and `subscribeBackInStock` on the chat service. Page reads and the form stay here. The declared peer stays `@weni/webchat-service` `1.19.2`. Development uses `npm link` to the local service build from that repo's spec `003`.

## Technical Context

**Language/Version**: Existing JavaScript and JSX. No new source file, so the TypeScript toolchain stays out of this change (`TODO(TYPESCRIPT_TOOLCHAIN)`).
**Primary Dependencies**: `@weni/webchat-service` peer `1.19.2`, overridden locally by `npm link`. `libphonenumber-js` and `iso-3166-1` stay, for formatting and the store-country calling code. No new dependency.
**Storage**: None.
**Testing**: Jest, colocated. `useConversationStarters.test.js` and `BackInStockNotify.test.jsx` mock the service. `availabilityNotify.test.js`, `vtex.test.js`, and `phoneCountry.test.js` drop the cases that moved.
**Target Platform**: Storefront widget. Dev server and standalone UMD bundle resolve the link. The library build keeps the service external.
**Performance Goals**: One in-memory offer call per product resolution. One subscribe call per submit. No extra request from this repo.
**Constraints**: Do not bump the peer. Do not change visible copy or the success-on-failure behavior. Do not edit Crowdin locale files. Do not call `fetch` from the view.
**Scale/Scope**: The starters hook, the notify view, two utility modules, their tests, the changelog. `package.json` is not modified.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Versioned contracts** — PASS. `window.WebChat`, `init` options, CSS, and class names stay. The peer version stays `1.19.2`. The link is a local override, not a published contract change. Recorded in `contracts/widget-calls.md`.
2. **API boundary** — PASS. The view no longer calls `fetch`. The service builds the snake_case body. The widget passes camelCase fields.
3. **State** — PASS. Offer flags stay in the starters hook. Page stack stays in `ChatContext`. The service result is not copied into a second store.
4. **Async state** — PASS. `isSubmitting` still blocks a second submit. `submitted` is still set in `finally`, including when `subscribeBackInStock` rejects. The rejection is not silent: the service emits `backInStock:error`.
5. **Observability** — PASS. No new `console` call. One new starter event, `back_in_stock_evaluate_error`, only if the evaluator throws, with the SKU and no contact data.
6. **i18n and accessibility** — PASS. Error codes map to existing `back_in_stock.*` keys. `role="alert"` and `aria-invalid` stay. `src/i18n/locales/en.json` is not edited.
7. **Testing** — PASS. The suites named in the spec cover the offer, the inline errors, the single subscribe call, rejection, and the host readers. Coverage gate stays.

No unjustified MUST departure. Re-checked after Phase 1: the contract does not add a public option or a stored preference. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/010-back-in-stock-to-service/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── widget-calls.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── hooks/
│   ├── useConversationStarters.js       # call evaluateBackInStockOffer
│   └── useConversationStarters.test.js  # mockService drives the offer
├── views/
│   ├── BackInStockNotify.jsx            # validate, then subscribe, via context service
│   └── BackInStockNotify.test.jsx       # assert service calls, not fetch
└── utils/
    ├── availabilityNotify.js            # getSalesChannel → null; getStoreLocaleCandidates
    ├── availabilityNotify.test.js
    ├── vtex.js                          # drop isSelectedSkuAvailable, getSellerIdForSku
    ├── vtex.test.js
    ├── phoneCountry.js                  # drop isValidInternationalNumber
    └── phoneCountry.test.js
CHANGELOG.md
```

**Structure Decision**: No new module. Host reads stay in `src/utils/availabilityNotify.js`, which the constitution already names as an integration module. The view receives the service from `useChatContext`, the same way the hook does. `package.json` and the lockfile are not part of the change.

## Complexity Tracking

No constitution violation that needs a new pattern. `useConversationStarters.js` is already large. This change replaces the local stock check with one service call inside `detectAndFetchPdp` and does not add a state machine. The landing behavior from spec `009` stays.

## Inherited Context

- Product Spec: none
- Engineering Spec: `specs/010-back-in-stock-to-service/spec.md`

## Delivery Sequence

1. Link the service build (`quickstart.md`). The three methods must exist before the widget calls them. Unit tests still mock them, so they can be written against the mock first.
2. Shrink `availabilityNotify.js`, `vtex.js`, and `phoneCountry.js`, and update their tests, so nothing still exports the moved rules.
3. Hook: `evaluateBackInStockOffer` in `detectAndFetchPdp`, with the try/catch and `back_in_stock_evaluate_error`. Extend `mockService` in the hook test.
4. View: replace `isValidInternationalNumber` and `subscribeAvailabilityNotify` with the two service calls. Point `BackInStockNotify.test.jsx` at the context service.
5. Changelog Changed entry: rules and request delegated to the linked service, peer not bumped.
6. `npm test`, `npm run lint`, then `npm run build:standalone` with the link active. Walk the manual path in `quickstart.md`.

**Cross-repository coordination**: webchat-service spec `003` is consumed through `npm link` to that repo's `dist/`. No publish and no peer bump. Rebuilding the service is required after each change there. A later release may publish the service and bump this peer. That release is not a task in this plan.

## Peak Load Plan

- Declared peak: one shopper on a campaign-day product page. One offer evaluation per product resolution. One subscribe call per submit.
- How this plan sustains it: both calls delegate to the linked service, which caps retries at two. The view's `isSubmitting` guard stops a second call before the service's in-flight guard. This repo adds no request.
- How it is verified: the view test asserts `subscribeBackInStock` is called once for two submit clicks, and `fetch` is not called. No load harness.

## Observability Plan

- Structured logs added: none in this repo. The service warns `[WebChatService:BackInStock]` with `code`, `skuId`, `status`, and `attempt`.
- Correlation identifier: the SKU, already present on `divert_back_in_stock`, and on the new `back_in_stock_evaluate_error` if the evaluator throws.
- Error reports: service event `backInStock:error`. The view does not log the name or the phone.
- Signals watched after rollout: the subscribe POST still hits `/_v/private/availability-notify/subscribe` once per valid submit. A thrown evaluator logs `back_in_stock_evaluate_error` and the shopper gets starters instead of a broken bubble.

## Rollout and Rollback Plan

- Rollout: develop on `010-back-in-stock-to-service` with the link. `unavailableProductNotify` still turns the offer on or off. No new flag. The standalone bundle used for a storefront check must be built while the link is active, because the library build does not inline the service.
- Backward compatibility window: the peer range stays `1.19.2`. A widget installed from the registry without the link does not contain this rewiring until this branch is released. Shipping this branch without a service that has the three methods makes the offer fall back to starters and the form skip the request. Do not release the widget that way.
- Rollback: `npm unlink @weni/webchat-service`, reinstall, and revert this branch. The previous widget code calls its own helpers against peer `1.19.2`.
- Migration reversibility: nothing stored.

## Divergence Gate

Removed. This spec has no Product Spec.
