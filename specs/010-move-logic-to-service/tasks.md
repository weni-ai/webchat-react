# Tasks: Move logic to service

**Input**: Design documents from `/specs/010-move-logic-to-service/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/widget-service.md, quickstart.md

**Tests**: Included. The spec's test strategy requires the widget to prove starters, cart rollback, checkout close, and voice states through the service mock.

**Organization**: `spec.md` has no user-story headings. Tasks follow the same three slices as `webchat-service` `specs/003-move-logic-to-service`. US1 and US2 ship after the service storefront minor. US3 ships after the service voice minor. `window.WebChat.init` is not changed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` and `test/__mocks__/`. New behavior tests are colocated `.test.js` / `.test.jsx` files. The legacy `test/contexts/ChatContext.test.jsx` stays and must still pass.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Give the existing Jest mock the methods the providers will call

- [x] T001 Add no-op, call-recording implementations of `watchStorefront`, `unwatchStorefront`, `getStorefrontSnapshot`, `setPendingCartItem`, `flushPendingCart`, `requestAvailabilityNotify`, `enterVoiceSession`, `exitVoiceSession`, and `speakIncomingText` to `test/__mocks__/@weni/webchat-service.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm the mock does not break the current suite before call sites move

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Run `npm test -- --testPathPattern='test/contexts/ChatContext'` and fix only mock fallout in `test/__mocks__/@weni/webchat-service.js`. Do not delete `src/utils/vtex.js` in this phase

**Checkpoint**: The current widget tests pass with the extra mock methods present

---

## Phase 3: User Story 1 - Starters and checkout from the service (Priority: P1) 🎯 MVP

**Goal**: Product identity and starter questions come from service events, and checkout closes the chat. Host `init` options stay the same

**Independent Test**: `npm test -- --coverage --testPathPattern='(useConversationStarters|ChatContext)'` — a product `storefront:changed` plus `starters:received` renders questions; `storefront:entered-checkout` closes the chat; the starters hook does not import `@/utils/vtex`

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [P] [US1] Extend `src/hooks/useConversationStarters.test.js` so questions render from a mocked `storefront:changed` and `starters:received`, a non-product snapshot renders no starters, and the hook module does not import `@/utils/vtex` or `@/utils/navigationMonitor`
- [x] T004 [P] [US1] Add `src/contexts/ChatContext.test.jsx` that emits `storefront:entered-checkout` and expects the chat to close. Constraint from `data-model.md`: checkout close is triggered by `storefront:entered-checkout`, not by `isCheckoutPage()`

### Implementation for User Story 1

- [x] T005 [US1] In `src/contexts/ChatContext.jsx`, call `watchStorefront()` once after `init`, close the chat on `storefront:entered-checkout`, and remove `isCheckoutPage`, `createNavigationMonitor`, and `watchVtexAccount`. Leave voice methods in place until User Story 3
- [x] T006 [US1] In `src/hooks/useConversationStarters.js`, read product identity from `storefront:changed` and questions from `starters:received`. Remove imports from `@/utils/vtex` and `@/utils/navigationMonitor`. Keep compact visibility, the mobile auto-hide timer, and in-chat dismissal
- [x] T007 [US1] Stop `src/components/Product/CounterControls.jsx` from importing `isFastStoreHost` from `@/utils/vtex`. Read host kind from the storefront snapshot already on context. Do not add a `fetch`
- [ ] T008 [US1] Pin `package.json` peer `@weni/webchat-service` to the published storefront minor and add a Changed entry in the changelog for that peer bump. Do not add or rename `window.WebChat.init` options in `src/standalone.jsx`

**Checkpoint**: Starters and checkout work against the mock. Cart still uses `OrderFormContext` until User Story 2

---

## Phase 4: User Story 2 - Cart actions go to the service (Priority: P2)

**Goal**: Quantity changes and back-in-stock notify call the service. A failed flush rolls the displayed quantity back

**Independent Test**: `npm test -- --coverage --testPathPattern='(OrderFormContext|BackInStockNotify)'` — `setPendingCartItem` is called, `cart:failed` restores the previous quantity, and the context does not import `@/utils/VTEXIOMinicartBridge`

### Tests for User Story 2 ⚠️

- [x] T009 [P] [US2] Update `src/contexts/OrderFormContext.test.jsx` so a quantity change calls `setPendingCartItem` and `cart:failed` restores the previous displayed quantity. Constraint from `data-model.md`: quantity controls refuse a new flush while a flush for that item has not produced `cart:updated` or `cart:failed`. The test must not expect `updateVTEXIOMinicart`
- [x] T010 [P] [US2] Update `src/views/BackInStockNotify.test.jsx` so submit calls `requestAvailabilityNotify` and does not import `@/utils/availabilityNotify`

### Implementation for User Story 2

- [x] T011 [US2] Forward quantity changes from `src/contexts/OrderFormContext.jsx` to `setPendingCartItem` and `flushPendingCart`. Delete the local 5000 ms debounce, FastStore bootstrap, and `updateVTEXIOMinicart` call. Keep the context value the product controls already read
- [x] T012 [P] [US2] Call `requestAvailabilityNotify` from `src/views/BackInStockNotify.jsx` and remove the `@/utils/availabilityNotify` import
- [x] T013 [P] [US2] Point `sendVtexUtm` call sites in `src/contexts/ChatContext.jsx`, `src/hooks/useConversationStarters.js`, and `src/standalone.jsx` at the service. Import `UTM_SOURCES` from `@weni/webchat-service` in those files plus `src/views/Cart.jsx` and `src/views/Cart.test.jsx`
- [x] T014 [US2] In `src/contexts/ChatContext.jsx`, remove the `startVtexCustomFieldsSync` import and its call before any delete. Retarget `getSegment` in `src/utils/phoneCountry.js` off `@/utils/vtexCustomFields`. Then delete `src/utils/vtex.js`, `src/utils/vtexCustomFields.js`, `src/utils/sendVtexUtm.js`, `src/utils/VTEXIOMinicartBridge.js`, `src/utils/faststoreBootstrap.js`, `src/utils/availabilityNotify.js`, and their colocated tests, plus `src/utils/navigationMonitor.js` if no import remains

**Checkpoint**: Storefront rules are gone from this package. Voice files are still present

---

## Phase 5: User Story 3 - Voice mode renders service state (Priority: P3)

**Goal**: The voice screen follows `voice:state` and `voice:error`. A final transcript is one `sendMessage`. The local voice pipeline is deleted

**Independent Test**: `npm test -- --coverage --testPathPattern='(useVoiceMode|VoiceMode)'` — listening, speaking, permission denial, one `sendMessage`, and no import from `@/services/voice`

### Tests for User Story 3 ⚠️

- [x] T015 [US3] Add or extend `src/hooks/useVoiceMode.test.js` for `voice:state` `listening` and `speaking`, `voice:error` with `operation: "permission"`, and one `sendMessage` from `voice:transcript`. The hook under test must not import `@/services/voice`

### Implementation for User Story 3

- [x] T016 [US3] Map `voice:state` and `voice:error` in `src/hooks/useVoiceMode.js` and call `enterVoiceSession` / `exitVoiceSession`. Remove `VoiceService` and `AudioCapture` construction from `src/contexts/ChatContext.jsx`. Forward incoming assistant text with `speakIncomingText`
- [ ] T017 [US3] Delete `src/services/voice/` after no remaining import. Bump the `package.json` peer to the published voice minor

**Checkpoint**: `src/services/voice/` is gone and push-to-talk UI still calls the existing `sendAudio` path

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Release checks from the quickstart

- [ ] T018 Run the storefront commands in `specs/010-move-logic-to-service/quickstart.md`. Coverage stays at or above 80% for statements, branches, functions, and lines
- [x] T019 [P] Run `npm test -- --coverage --testPathPattern=standalone` and confirm `src/standalone.jsx` still accepts the current `init` option names
- [x] T020 Confirm the diff does not touch `src/i18n/locales/pt.json`, `src/i18n/locales/es.json`, or `src/i18n/locales/ro.json`
- [x] T021 After User Story 3, run the voice command in `specs/010-move-logic-to-service/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001. Blocks story work.
- **User Story 1**: Depends on Foundational and on the published service storefront minor (T008 pins it).
- **User Story 2**: Depends on Foundational. File deletion in T014 waits until T005–T007 and T011–T013 have removed the imports.
- **User Story 3**: Depends on the published service voice minor. Do not start it against the storefront-only peer.
- **Polish**: T018–T020 after US2. T021 after US3.

### User Story Dependencies

- **User Story 1 (P1)**: Starters and checkout. Does not require the cart rewrite.
- **User Story 2 (P2)**: Cart and deletion of the storefront utils. Ships in the same widget minor as US1.
- **User Story 3 (P3)**: Voice. A later widget minor.

### Parallel Opportunities

- T003 and T004 are different test files.
- T009 and T010 are different test files.
- T012 and T013 are different call sites, after T011 has the cart methods on the context.
- US3 does not edit `OrderFormContext.jsx`.

---

## Parallel Example: User Story 1

```bash
Task: "T003 useConversationStarters.test.js"
Task: "T004 ChatContext.test.jsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 against the published service storefront minor.
3. Stop and run the User Story 1 independent test.

### Incremental Delivery

1. US1 + US2 → T018–T020 → release a minor of `@weni/webchat-template-react`.
2. After the service voice minor is on npm, US3 → T021 → release the next minor.
3. Do not carry both the old `vtex.js` rules and the service calls in one bundle.

### Parallel Team Strategy

After Phase 2, starters (T006) and checkout (T005) can proceed together. Cart (US2) should not delete shared utils until those call sites have moved.

---

## Notes

- [P] tasks = different files, no dependencies
- Tests fail before the matching implementation task
- Do not add a TypeScript production file in this plan. A new production source file stops the pull request until the TypeScript toolchain from the constitution is included. `src/contexts/ChatContext.test.jsx` and `src/hooks/useVoiceMode.test.js` are the test-file exception recorded under Principle VIII in `spec.md`
- Commit after each task or logical group
