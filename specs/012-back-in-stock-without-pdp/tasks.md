# Tasks: Back-in-stock independent of `conversationStarters.pdp`

**Input**: Design documents from `/specs/012-back-in-stock-without-pdp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/init-options.md, contracts/conversation-starters-log.md, quickstart.md

**Tests**: Included. The spec's test strategy names the suites. Jest keeps mocking `@weni/webchat-service`. Write each test so it fails before the implementation task that follows it.

**Organization**: The engineering spec has no user-story headings. The stories below are the acceptance slices: the offer without `pdp`, no starters when `pdp` is off, then navigation, the warning, and the debug log. This branch must already contain spec `011`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root. Tests are colocated under `src/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm spec `011` is already on this branch. No new package or toolchain

- [x] T001 Confirm `src/standalone.jsx` still maps `shoppingAssistantDisabled` and warns with `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify and conversationStarters.pdp'`. Confirm `src/hooks/useConversationStarters.js` still returns from `detectAndFetchPdp` when `!isPdpEnabledRef.current` and re-runs detection in `applyNavigationChange` only when `isPdpEnabledRef.current`. Run `npm test -- --testPathPattern='useConversationStarters|standalone|conversationStartersLog' --coverage=false` as the baseline. Do not add a package

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: One test helper for the notify-only config used by every story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 In `src/hooks/useConversationStarters.test.js`, add `buildNotifyOnlyContext(overrides = {})` next to `buildUnavailableNotifyContext`. It must call `buildContext` with `unavailableProductNotify: true` and `conversationStarters: { pdp: false }`, then apply `overrides`. Do not change production code

**Checkpoint**: Stories can share one notify-only context builder. Detection still requires `pdp`

---

## Phase 3: User Story 1 - Offer without `conversationStarters.pdp` (Priority: P1) 🎯 MVP

**Goal**: With `unavailableProductNotify: true` and `pdp` absent or `false`, an unavailable SKU still shows the back-in-stock bubble and opening the chat lands on the form. Both flags off still skip product resolution

**Independent Test**: `npm test -- --testPathPattern='useConversationStarters' --coverage=false`

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before T005**

- [x] T003 [US1] Extend `src/hooks/useConversationStarters.test.js`. Using `buildNotifyOnlyContext`, on a PDP with `evaluateBackInStockOffer` returning `isUnavailable: true`, `isBackInStockNotify` becomes true, `questions` holds the notify CTA, and clicking it sets `currentPage.view` to `'back-in-stock-notify'` with `productName` and `skuId`. Repeat with `conversationStarters` omitted (not `{ pdp: false }`). The `init` event `detail` includes `unavailableProductNotify: true` next to `pdpEnabled: false`. Existing `buildUnavailableNotifyContext` (`pdp: true`) cases stay green
- [x] T004 [US1] In `src/hooks/useConversationStarters.test.js`, change `records skip when PDP is disabled` so both `conversationStarters.pdp` and `unavailableProductNotify` are off. Assert `reason: 'pdp_disabled'` and that `resolveProductData` is not called

### Implementation for User Story 1

- [x] T005 [US1] In `src/hooks/useConversationStarters.js`, derive `shouldResolveProduct` as `isPdpEnabledRef.current || isUnavailableNotifyEnabledRef.current`. Use it as the entry guard of `detectAndFetchPdp` and as the `applyNavigationChange` re-check (replace `if (isPdpEnabledRef.current)`). When both flags are off, still record `skip` with `reason: 'pdp_disabled'`. Add `unavailableProductNotify: isUnavailableNotifyEnabledRef.current` to the existing `init` event detail next to `pdpEnabled`. Do not change `requestStarters` yet. Do not rename `detectAndFetchPdp`

**Checkpoint**: Notify-only plus an unavailable SKU shows the offer. Both flags off still skip. An available SKU with `pdp` off may still call `getStarters` until User Story 2

---

## Phase 4: User Story 2 - No starters when `pdp` is off (Priority: P2)

**Goal**: After a resolved product with no offer, `pdp` off means no `getStarters` and no deferred flush on `connected`. `pdp: true` still requests starters

**Independent Test**: `npm test -- --testPathPattern='useConversationStarters' --coverage=false`

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before T007**

- [x] T006 [US2] Extend `src/hooks/useConversationStarters.test.js`. With `buildNotifyOnlyContext` and `isUnavailable: false` and `isConnected: true`, `getStarters` is never called and the log has `skip` with `reason: 'starters_disabled'` and `fingerprint`. With `isConnected: false`, emitting `connected` afterwards still does not call `getStarters`. When `evaluateBackInStockOffer` throws and `pdp` is off, `getStarters` is not called, `back_in_stock_evaluate_error` is recorded, and `starters_disabled` follows. With `conversationStarters: { pdp: true }` and an available SKU, `getStarters` is still called. With `pdp: true` and `unavailableProductNotify: false`, an unavailable SKU still requests starters as today

### Implementation for User Story 2

- [x] T007 [US2] In `src/hooks/useConversationStarters.js`, after offer evaluation, call `requestStarters` only when `isPdpEnabledRef.current` is true. When `pdp` is off and no offer was shown, record `skip` with `reason: 'starters_disabled'` and `fingerprint: currentFingerprintRef.current` (or the fingerprint just resolved), then `setIsLoading(false)` and return. Run this `pdp` gate before the existing `shoppingAssistantDisabled` silent return. Still call `service.setContext` whenever the product is resolved. Do not skip context when `pdp` is off

**Checkpoint**: Notify-only never requests starters. `pdp: true` is unchanged

---

## Phase 5: User Story 3 - Navigation, warning, and log dump (Priority: P3)

**Goal**: SPA navigation re-evaluates a notify-only offer. `shoppingAssistantDisabled` warns only when notify is off. The debug dump exposes `unavailableProductNotify`

**Independent Test**: `npm test -- --testPathPattern='useConversationStarters|standalone|conversationStartersLog' --coverage=false`

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before T012, T013, and T014**

- [x] T008 [US3] Extend `src/hooks/useConversationStarters.test.js`. With `buildNotifyOnlyContext`, chat open, and a pathname change to another product, the offer is reset and `evaluateBackInStockOffer` is called again. Do not require `conversationStarters.pdp: true` for that re-check
- [x] T009 [P] [US3] Extend `src/utils/conversationStartersLog.test.js`. After `setConversationStartersLogConfig({ unavailableProductNotify: true, conversationStarters: { pdp: false } })`, `getConversationStartersLog().config.unavailableProductNotify` is `true` and `config.conversationStarters.pdp` is `false`. When the option is absent, the dump field is `false`
- [x] T010 [P] [US3] Extend `src/standalone.test.ts`. `init` with `shoppingAssistantDisabled: true`, `unavailableProductNotify: true`, and no `conversationStarters.pdp` does not warn. `init` with `shoppingAssistantDisabled: true` and `unavailableProductNotify` off logs once `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify'`. The old string `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify and conversationStarters.pdp'` is not used

### Implementation for User Story 3

- [x] T011 [US3] Confirm `applyNavigationChange` in `src/hooks/useConversationStarters.js` already re-runs `detectAndFetchPdp` from `shouldResolveProduct` (T005). If a notify-only pathname change still skips detection, fix that re-check here. Depends on T005 and T008
- [x] T012 [P] [US3] In `src/utils/conversationStartersLog.js`, include `unavailableProductNotify: logConfig.unavailableProductNotify === true` on the `config` object returned by `getConversationStartersLog`, next to `shoppingAssistantDisabled`. Depends on T009
- [x] T013 [P] [US3] In `src/standalone.jsx`, warn only when `shoppingAssistantDisabled` is on and `unavailableProductNotify` is off. Use the exact string `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify'`. Do not mention `conversationStarters.pdp`. Keep `mapConfig` unexported. Depends on T010

**Checkpoint**: Notify-only survives SPA navigation. The warning matches spec `012`. The log dump shows the notify flag

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Document the independent flags and run the full gate

- [x] T014 [P] In `README.md`, add `unavailableProductNotify` and `conversationStarters.pdp` to the Parameters table. State that `unavailableProductNotify` (boolean, default false) shows the back-in-stock offer on an unavailable SKU and does not require `conversationStarters.pdp`. State that `conversationStarters.pdp` (boolean, default false) only controls PDP conversation starters
- [x] T015 [P] If `CHANGELOG.md` exists from spec `011`, add an Unreleased Changed entry that `unavailableProductNotify` no longer requires `conversationStarters.pdp`, and that the `shoppingAssistantDisabled` warning no longer names `pdp`. If the file does not exist, do not create it
- [x] T016 Run `npm run typecheck`, `npm run lint`, and `npm test -- --coverage`. All four coverage metrics stay at or above 80%
- [ ] T017 Follow `specs/012-back-in-stock-without-pdp/quickstart.md`: `npm run dev` with `unavailableProductNotify: true` and `conversationStarters` omitted; available SKU shows no starters and a `starters_disabled` skip; unavailable SKU shows the bubble and form; a route change re-evaluates. Then confirm `shoppingAssistantDisabled: true` plus notify and no `pdp` does not warn

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 is the baseline
- **Foundational (Phase 2)**: Depends on T001. BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on T005, because it edits `src/hooks/useConversationStarters.js` after the detection guard
- **User Story 3 (Phase 5)**: T008 and T011 depend on T005 (same hook). T009, T010, T012, and T013 depend on Foundational only
- **Polish (Phase 6)**: T016 and T017 after the stories you ship. T014 and T015 can be written any time after Foundational

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2 or US3
- **User Story 2 (P2)**: Needs the US1 guard so a notify-only page actually resolves the product
- **User Story 3 (P3)**: The navigation half needs the US1 guard. The warning and the log dump do not

### Within Each User Story

- The failing test task is done before the implementation task in that story
- T003 then T004 in the same hook test file, then T005
- T012 and T013 can run together after T009 and T010

### Parallel Opportunities

- After T005, T009 and T010 can run beside US2. They do not touch the hook
- T008 cannot run beside T003, T004, or T006. It edits the same hook test
- T012 (`conversationStartersLog.js`) and T013 (`standalone.jsx`) are different files

---

## Parallel Example: User Story 3 (non-hook half)

```bash
# After T002, different files:
Task: "T009 src/utils/conversationStartersLog.test.js"
Task: "T010 src/standalone.test.ts"

# Then, still different files:
Task: "T012 src/utils/conversationStartersLog.js"
Task: "T013 src/standalone.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete User Story 1
3. Stop and run `npm test -- --testPathPattern='useConversationStarters' --coverage=false`
4. US1 alone still requests starters on an available SKU when `pdp` is off. The usable opt-in is US1 plus US2

### Incremental Delivery

1. Setup confirms spec `011` is present
2. Foundational adds `buildNotifyOnlyContext`
3. User Story 1 makes product detection run for notify-only
4. User Story 2 stops starter requests when `pdp` is off
5. User Story 3 covers route changes, the warning, and the log dump
6. T017 is the manual storefront check. It needs US1 and US2, and a product page

### Parallel Team Strategy

1. One person finishes Setup and Foundational, then the hook (US1, US2, T008/T011)
2. Another takes the log dump and `standalone.jsx` (T009, T010, T012, T013) plus README

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps a task to the acceptance slice above
- Do not export `mapConfig` from `src/standalone.jsx`
- Do not edit `src/i18n/locales/`
- Do not change `@weni/webchat-service` or its peer version
- Do not make `unavailableProductNotify` imply `conversationStarters.pdp`
- Do not skip `service.setContext` when `pdp` is off
- Do not rename `detectAndFetchPdp`
- Commit after each task or logical group
