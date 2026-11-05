# Implementation Plan: Back-in-stock independent of `conversationStarters.pdp`

**Branch**: `012-back-in-stock-without-pdp` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-back-in-stock-without-pdp/spec.md`

## Summary

`unavailableProductNotify` currently never runs unless `conversationStarters.pdp` is also `true`, because `detectAndFetchPdp` returns before product resolution. Split those concerns: resolve the product when either flag is on, request starters only when `pdp` is on. Relax the `shoppingAssistantDisabled` warning so it only needs `unavailableProductNotify`. Record the notify flag and a new `starters_disabled` skip reason in the conversation starters debug log.

## Technical Context

**Language/Version**: Existing JavaScript and JSX. No new TypeScript file. The toolchain from spec `011` stays as it is.
**Primary Dependencies**: None new. Peer `@weni/webchat-service` stays at the pin used by spec `010` / `011` (`evaluateBackInStockOffer`, `setContext`, `getStarters` unchanged).
**Storage**: None.
**Testing**: Jest, colocated. Changes in `useConversationStarters.test.js`, `standalone.test.ts`, and `conversationStartersLog.test.js`. The service stays mocked.
**Target Platform**: Storefront widget, the React package entry, and the standalone UMD bundle.
**Project Type**: Frontend widget.
**Performance Goals**: For `pdp: true`, unchanged. For `unavailableProductNotify: true` and `pdp` off, one catalog read per product page view and per SPA navigation to a product page, and zero starter requests.
**Constraints**: Do not make `unavailableProductNotify` imply `pdp`. Do not skip `service.setContext` when `pdp` is off. Do not rename `detectAndFetchPdp`. Do not add strings. Do not edit Crowdin locale files. `pdp: true` must stay identical. Both flags off must not resolve the product.
**Scale/Scope**: One hook, the standalone warning, the starters log dump, tests, and a README row for `unavailableProductNotify`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Versioned contracts (IV)** — PASS. `unavailableProductNotify` keeps its name and default. Configs with `pdp: true` are unchanged. Configs that already set `unavailableProductNotify` without `pdp` start showing the offer, which is the documented meaning of the flag. Recorded in [contracts/init-options.md](./contracts/init-options.md). Minor release, named in the release notes.
2. **Type safety (VIII)** — PASS. No new file. The edits to `useConversationStarters.js` and `standalone.jsx` are small conditionals and stay in JS with existing `prop-types`.
3. **API boundary (XVI)** — PASS. No new HTTP call. Option names stay camelCase.
4. **State (XIV)** — PASS. `shouldResolveProduct` is derived from config refs, not stored.
5. **Async state (XV)** — PASS. The new early return calls `setIsLoading(false)`. Generation and fingerprint checks stay before the offer evaluation.
6. **Observability (III)** — PASS. `unavailableProductNotify` is on the log dump and the `init` event. New skip reason `starters_disabled` carries the fingerprint. No contact data in logs.
7. **i18n** — PASS. No new string. Locale files are not edited.
8. **Testing** — PASS. The suites in [quickstart.md](./quickstart.md) cover `pdp` off with an unavailable SKU, `pdp` off with an available SKU, both flags off, `pdp` on unchanged, SPA navigation, and the warning text.
9. **Single responsibility (IX)** — PASS with the departure already in the spec. `useConversationStarters.js` stays above 350 lines. The new rule is one derived boolean used at both call sites. Splitting the hook is out of scope.
10. **Clean Code, style, naming** — PASS. `shouldResolveProduct` names the rule. Skip reasons stay snake_case, matching `pdp_disabled`.
11. **Semantic HTML / Unnnic** — PASS. No UI markup is added or changed.
12. **Pre-commit** — PASS. Lint, typecheck, and coverage from the existing scripts.

No unjustified MUST departure. Re-checked after Phase 1: nothing is persisted, so there is no migration. The public contract is additive for the log dump and enables the existing `unavailableProductNotify` flag. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/012-back-in-stock-without-pdp/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── init-options.md
│   └── conversation-starters-log.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── hooks/
│   ├── useConversationStarters.js           # shouldResolveProduct; starters gate
│   └── useConversationStarters.test.js
├── standalone.jsx                           # warning only needs unavailableProductNotify
├── standalone.test.ts
├── utils/
│   ├── conversationStartersLog.js           # dump config.unavailableProductNotify
│   └── conversationStartersLog.test.js
README.md                                    # document unavailableProductNotify
CHANGELOG.md                                 # Unreleased Changed, if the file exists from spec 011
```

**Structure Decision**: Keep the change inside `detectAndFetchPdp` and `applyNavigationChange`. Product detection already lives there. A second detection path would duplicate slug, account, fingerprint, and generation handling. Tests stay colocated.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| `useConversationStarters.js` stays above 350 lines (Principle IX, SHOULD) | The change is a derived boolean and two gates | Splitting the hook is a separate refactor and would mix with this behavior change |

## Inherited Context

- Product Spec: none
- Engineering Spec: `specs/012-back-in-stock-without-pdp/spec.md`

## Delivery Sequence

1. Hook: derive `shouldResolveProduct` from `isPdpEnabledRef` and `isUnavailableNotifyEnabledRef`. Use it as the entry guard of `detectAndFetchPdp` and as the navigation re-check in `applyNavigationChange`. Keep `pdp_disabled` when both flags are off.
2. Hook: after offer evaluation, request starters only when `isPdpEnabledRef` is true. When `pdp` is off and no offer was shown, record `skip` with `reason: 'starters_disabled'` (include the fingerprint) and `setIsLoading(false)`. Keep the `shoppingAssistantDisabled` silent return after that.
3. Hook: add `unavailableProductNotify` to the `init` event next to `pdpEnabled`.
4. Tests for the hook: `pdp` off + notify on + unavailable SKU; `pdp` off + available SKU (`getStarters` never called, including after `connected`); both flags off (`resolveProductData` not called, `pdp_disabled`); SPA navigation re-evaluates. Existing `pdp: true` suites stay green.
5. Log dump: add `unavailableProductNotify` in `getConversationStartersLog().config`. Update `conversationStartersLog.test.js`.
6. `standalone.jsx`: warn only when `shoppingAssistantDisabled` is on and `unavailableProductNotify` is off. New message `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify'`. Update `standalone.test.ts` (no warn when `pdp` is off and notify is on).
7. README Parameters table: add `unavailableProductNotify` and `conversationStarters.pdp`, stating they are independent. If `CHANGELOG.md` exists from spec `011`, add an Unreleased Changed entry. Do not create the changelog in this feature if `011` has not.
8. `npm run lint`, `npm run typecheck`, `npm test -- --coverage`, then the manual path in [quickstart.md](./quickstart.md).

**Cross-repository coordination**: none. This feature uses the linked service from spec `010` as it is. It must land on a branch that already contains spec `011`, because it edits the warning `011` added.

## Peak Load Plan

- Declared peak: a campaign-day product page view. Stores with `pdp: true` are unchanged. Stores with `unavailableProductNotify: true` and `pdp` off make one VTEX catalog request per product resolution and send zero starter requests.
- How this plan sustains it: `requestStarters` is gated on `isPdpEnabledRef`. Product resolution is the same `resolveProductData` path already used with `pdp: true`. Subscribe stays one POST per submit.
- How it is verified: hook tests assert `getStarters` is not called when `pdp` is off. No load harness. The manual path checks that an available SKU produces no starters WebSocket frame.

## Observability Plan

- Structured logs added: `unavailableProductNotify` on the starters log config and its `init` event. New `skip` reason `starters_disabled` with the fingerprint.
- Correlation identifier: fingerprint (`account:productPath`) inside the hook; SKU on `divert_back_in_stock` and the service's `backInStock:*` events.
- Error reports: `console.warn('WebChat: shoppingAssistantDisabled needs unavailableProductNotify')` when the assistant is off and notify is off. No name or phone in logs.
- Signals watched after rollout: `WebChat.getConversationStartersLog()` on a notify-only storefront shows `unavailableProductNotify: true`, `conversationStarters.pdp: false`, and either `divert_back_in_stock` or `starters_disabled`.

## Rollout and Rollback Plan

- Rollout: minor release of `@weni/webchat-template-react` and the UMD bundle, same release as spec `011` or the next minor after it. No extra feature flag. `unavailableProductNotify` is already the opt-in. Release notes must say that stores which set it without `pdp` will start seeing the offer.
- Backward compatibility window: `pdp: true` is identical. Both flags off is identical. The warning text change is console-only.
- Rollback: integrators who do not want the offer remove `unavailableProductNotify`. Reverting the commit is safe. Nothing new is persisted.
- Migration reversibility: no schema.

## Divergence Gate

Removed. This spec has no Product Spec.
