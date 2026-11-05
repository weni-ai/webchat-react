# Tasks: Back-in-stock logic and request in the service

**Input**: Design documents from `/specs/010-back-in-stock-to-service/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/widget-calls.md, quickstart.md

**Tests**: Included. The spec's test strategy names the suites to change. Jest keeps mocking `@weni/webchat-service`, so these tests do not need the npm link. Write each test so it fails before the implementation task that follows it.

**Organization**: The engineering spec has no user-story headings. The stories below are the acceptance slices: show the offer, validate the form, send the subscription. The peer dependency stays `1.19.2`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root. Widget tests are colocated under `src/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Keep the published peer, and give the Jest mock the methods the new tests call

- [x] T001 Leave `peerDependencies["@weni/webchat-service"]` at `1.19.2` in `package.json`. Do not add a `dependencies` entry and do not edit `package-lock.json`. Add `evaluateBackInStockOffer`, `validateBackInStockContact`, and `subscribeBackInStock` as `jest.fn()` methods on the mock class in `test/__mocks__/@weni/webchat-service.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove the rules that move to the service so the stories cannot keep a second copy

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Remove `isSelectedSkuAvailable` and `getSellerIdForSku` from `src/utils/vtex.js` and delete their cases in `src/utils/vtex.test.js`. Keep `stripLeadingZeros`, `findSelectedSkuItem`, and `getSelectedSkuId`
- [x] T003 [P] Remove `isValidInternationalNumber` and the `isValidPhoneNumber` import from `src/utils/phoneCountry.js`, and delete the matching cases in `src/utils/phoneCountry.test.js`. Keep store-country lookup, calling-code helpers, digit limits, `formatNationalNumber`, and `internationalDigits`
- [x] T004 [P] Reduce `src/utils/availabilityNotify.js` to `getSalesChannel()` and `getStoreLocaleCandidates()`. Constraint from `data-model.md`: `getSalesChannel()` returns the FastStore session channel, else the `__RUNTIME__.segmentToken` channel, else `null` (not `'1'`). `getStoreLocaleCandidates()` returns `__RUNTIME__.culture.locale`, then `document.documentElement.lang`, dropping empty values and keeping that order. Delete `subscribeAvailabilityNotify`, `buildAvailabilityNotifyBody`, `getNotifyLocale`, `digitsOnlyPhone`, and `AVAILABILITY_NOTIFY_SUBSCRIBE_PATH`. Rewrite `src/utils/availabilityNotify.test.js` for the two remaining functions, including a missing or malformed channel returning `null`

**Checkpoint**: The widget no longer exports the moved rules. Story work can start

---

## Phase 3: User Story 1 - Show the offer (Priority: P1) 🎯 MVP

**Goal**: On a product page with `unavailableProductNotify` on, the bubble appears only when the service says the offer applies

**Independent Test**: `npm test -- --testPathPattern=useConversationStarters --coverage=false`

### Tests for User Story 1 ⚠️

> **NOTE: Write this test FIRST, ensure it FAILS before T006**

- [x] T005 [US1] Extend the back-in-stock suite in `src/hooks/useConversationStarters.test.js`. Add `evaluateBackInStockOffer` to the local `mockService`. When it returns `{ isUnavailable: true, skuId: '27', seller: '1' }`, `isBackInStockNotify` is true, the CTA question is set, and the page props carry SKU `27` and seller `1`. When it returns `isUnavailable: false`, `getStarters` is called and no offer shows. With `unavailableProductNotify` off, the method is not called. Assert the call receives the `normalized` product and `selectedSkuId`. When the method throws, starters are requested and `back_in_stock_evaluate_error` is recorded with the SKU

### Implementation for User Story 1

- [x] T006 [US1] In `detectAndFetchPdp` in `src/hooks/useConversationStarters.js`, when `isUnavailableNotifyEnabledRef.current` is set, call `service.evaluateBackInStockOffer({ product: normalized, selectedSkuId })` and pass the returned `skuId` and `seller` to `showBackInStockNotify`. On throw, record `back_in_stock_evaluate_error` (warn, with the SKU) through `recordConversationStarterEvent` and call `requestStarters`. Do not call `isSelectedSkuAvailable` or `getSellerIdForSku`. Leave the bubble, the chip, and the landing-on-open behavior from spec `009` unchanged

**Checkpoint**: The offer flag follows the service verdict and a thrown evaluator falls back to starters

---

## Phase 4: User Story 2 - Validate the form (Priority: P2)

**Goal**: A blank name or an invalid phone shows the same inline errors, using the service verdict

**Independent Test**: `npm test -- --testPathPattern=BackInStockNotify --coverage=false`

### Tests for User Story 2 ⚠️

> **NOTE: Write this test FIRST, ensure it FAILS before T008**

- [x] T007 [US2] In `src/views/BackInStockNotify.test.jsx`, drive a mock `validateBackInStockContact` from the `useChatContext` service. `errors.name === 'required'` renders `back_in_stock.name_required`, sets `aria-invalid`, and does not call `subscribeBackInStock`. `errors.phone === 'invalid'` renders `back_in_stock.invalid_phone` the same way. Editing the field clears the error

### Implementation for User Story 2

- [x] T008 [US2] In `handleSubmit` in `src/views/BackInStockNotify.jsx`, build `phone` with `internationalDigits(ddi, nationalNumber)` and call `service.validateBackInStockContact({ name, phone })`. Map `errors.name === 'required'` to `back_in_stock.name_required` and `errors.phone === 'invalid'` to `back_in_stock.invalid_phone`. Stop before any subscribe call when either error is set. Keep as-you-type formatting and the store-country calling code. Do not edit `src/i18n/locales/en.json` or any Crowdin locale file

**Checkpoint**: Invalid input never starts a subscribe call, and the existing copy still shows

---

## Phase 5: User Story 3 - Send the subscription (Priority: P3)

**Goal**: A valid submit calls `subscribeBackInStock` once and does not `fetch`. Success shows on resolve and on reject

**Independent Test**: `npm test -- --testPathPattern=BackInStockNotify --coverage=false`

### Tests for User Story 3 ⚠️

> **NOTE: Write this test FIRST, ensure it FAILS before T010**

- [x] T009 [US3] Extend `src/views/BackInStockNotify.test.jsx` so a valid submit calls `subscribeBackInStock` once with `name`, the `internationalDigits` phone, the SKU prop, the seller prop, `getSalesChannel()`, `getStoreLocaleCandidates()`, and `i18n.language`. `globalThis.fetch` is not called. Without a `skuId` prop, the SKU is `getSelectedSkuId()`. A pending promise keeps the button loading and disabled, and a second submit does not call again. Resolve and reject both render the success title, and reject does not throw

### Implementation for User Story 3

- [x] T010 [US3] In `src/views/BackInStockNotify.jsx`, after validation passes, set `isSubmitting` and await `service.subscribeBackInStock` with the fields in `specs/010-back-in-stock-to-service/data-model.md`: `name`, `phone`, `skuId` prop or `getSelectedSkuId()` or `''`, `seller`, `salesChannel` from `getSalesChannel()`, `storeLocales` from `getStoreLocaleCandidates()`, and `language` from `i18n.language`. Set `submitted` in `finally` for both resolve and reject. Catch the rejection in the view and do not rethrow. Do not call `console`. Do not pass a `backInStock` init option. Remove the `subscribeAvailabilityNotify` import

**Checkpoint**: The view performs no subscribe HTTP of its own, and a failed request still reaches the success state

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Changelog and the local link check

- [x] T011 Add a Changed entry to `CHANGELOG.md`: back-in-stock rules and the subscribe request are delegated to the linked `@weni/webchat-service`, and the declared peer stays `1.19.2`
- [x] T012 Run `npm test` and `npm run lint`
- [x] T013 With the service `dist/` linked, follow `specs/010-back-in-stock-to-service/quickstart.md`: the Node import check, `npm run build:standalone`, and the three manual submit cases. This task waits on webchat-service tasks through T020

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational only. Independent of User Story 1
- **User Story 3 (Phase 5)**: Depends on User Story 2, because T009 and T010 edit `src/views/BackInStockNotify.jsx` and `src/views/BackInStockNotify.test.jsx` after T007 and T008
- **Polish (Phase 6)**: T011 and T012 after the stories you ship. T013 after the linked service implements `subscribeBackInStock`

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on US2 or US3
- **User Story 2 (P2)**: No dependency on US1. US3 builds on this submit handler
- **User Story 3 (P3)**: Needs the validation branch from US2 in the same view

### Within Each User Story

- The failing test task is done before the implementation task in that story

### Parallel Opportunities

- T002, T003, and T004 touch different files and can run together
- After Foundational, US1 (the hook) and US2 (the view) can run together
- US3 cannot run beside US2. It edits the same view and test

---

## Parallel Example: User Story 1 and User Story 2

```bash
# After T004, different files:
Task: "T005 src/hooks/useConversationStarters.test.js"
Task: "T007 src/views/BackInStockNotify.test.jsx"

# Then:
Task: "T006 src/hooks/useConversationStarters.js"
Task: "T008 src/views/BackInStockNotify.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete User Story 1
3. Stop and run `npm test -- --testPathPattern=useConversationStarters --coverage=false`

### Incremental Delivery

1. Setup and Foundational remove the local rules
2. User Story 1 switches the bubble to the service verdict
3. User Story 2 switches inline errors to the service verdict
4. User Story 3 switches the POST to the service. Until the link is active, exercise this with the Jest mock
5. T013 is the first task that needs the real linked build

### Parallel Team Strategy

1. One person finishes Setup and Foundational
2. Then one person takes the hook and another takes the view through US2
3. The same view owner continues with US3

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to the acceptance slice above
- Do not edit files under `src/i18n/locales/` except that no edit is required at all
- `npm run build` externalizes `@weni/webchat-service`. Use `npm run build:standalone` to prove the link is bundled
- Commit after each task or logical group
