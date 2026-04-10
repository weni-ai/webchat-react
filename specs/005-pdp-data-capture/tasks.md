# Tasks: PDP Data Capture Priority & SKU-Specific Context

**Input**: Design documents from `/specs/005-pdp-data-capture/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/product-data.md, quickstart.md

**Tests**: Included — SC-006 requires 80% coverage for modified functions.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: No new dependencies or project structure changes. This feature modifies existing files only. Phase is minimal.

- [X] T001 Verify branch `005-pdp-data-capture` is checked out and `npm install` is up to date
- [X] T002 Run `npm test` to confirm all existing tests pass before any changes

**Checkpoint**: Baseline confirmed — all existing tests green.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the new `getSelectedSkuIdFromLdJson` function that both US2 and US3 depend on.

**CRITICAL**: US2 and US3 cannot start until this phase is complete. US1 can start in parallel.

- [X] T003 Implement `getSelectedSkuIdFromLdJson()` function in `src/utils/vtex.js` — calls `findProductInLdJson()`, returns `product.sku || product.productID || null`. Must be synchronous, must NOT access `window.__NEXT_DATA__`. Export the function. See contract §2 in `specs/005-pdp-data-capture/contracts/product-data.md`
- [X] T004 Add unit tests for `getSelectedSkuIdFromLdJson()` in `src/utils/vtex.test.js` — cover: (a) returns `sku` when present, (b) falls back to `productID` when `sku` is absent, (c) returns `null` when no ld+json exists, (d) returns `null` when Product node has no `sku` or `productID`, (e) returns `null` for ProductGroup with `hasVariant` but no root-level `sku`/`productID`, (f) prefers `sku` over `productID` when both exist

**Checkpoint**: `getSelectedSkuIdFromLdJson` is implemented, exported, and tested. Run `npx jest src/utils/vtex.test.js` — all pass.

---

## Phase 3: User Story 1 — Conversation Starters data source priority reorder (Priority: P1) MVP

**Goal**: Change `resolveProductData` waterfall from `ld+json → __NEXT_DATA__ → Intelligent Search` to `__NEXT_DATA__ → Intelligent Search → ld+json`.

**Independent Test**: Call `resolveProductData` with different data source combinations and verify the source priority order is correct.

### Implementation for User Story 1

- [X] T005 [US1] Reorder the waterfall in `resolveProductData()` in `src/utils/vtex.js` — move `extractFromNextData(slug)` to step 1, `fetchProductData(slug)` to step 2 (with `selectProduct` + `extractProductData`), and `extractFromLdJson(slug)` to step 3. See contract §1 in `specs/005-pdp-data-capture/contracts/product-data.md`
- [X] T006 [US1] Update the `resolveProductData` test suite in `src/utils/vtex.test.js` — update existing tests: (a) "returns next-data result when available (no API call, no ld+json)" should verify `__NEXT_DATA__` is used first and `fetch` is NOT called, (b) "falls to IS API when __NEXT_DATA__ fails" should verify Intelligent Search is attempted second, (c) "falls to ld+json when both __NEXT_DATA__ and IS fail" should verify ld+json is the last resort, (d) "returns null when all strategies fail" remains unchanged, (e) add test: when `__NEXT_DATA__` has valid data AND ld+json is present, system uses `__NEXT_DATA__` (not ld+json)
- [X] T007 [US1] Run `npx jest src/utils/vtex.test.js` and verify all tests pass including the reordered waterfall tests

**Checkpoint**: `resolveProductData` uses the new priority order. Existing tests updated, new priority test added. All pass.

---

## Phase 4: User Story 2 — Product context contains only the selected SKU (Priority: P1)

**Goal**: Replace multi-SKU context (up to 5 SKUs) with single-SKU context filtered by `selectedSkuId` from ld+json. When SKU is unknown, send product-level context only.

**Independent Test**: Build context strings with and without a `selectedSkuId` and verify the output format contains 0 or 1 SKU.

### Implementation for User Story 2

- [X] T008 [US2] Modify `buildProductContextString(product, selectedSkuId?)` in `src/utils/vtex.js` — add optional second parameter `selectedSkuId` (string or null). When `selectedSkuId` is provided: find matching item in `product.items` by `itemId`, if found show "Selected SKU:" header with single `formatSkuLine` output. When `selectedSkuId` is null/undefined or no match: omit the SKU section entirely. Remove the old multi-SKU logic (MAX_SKUS loop, "showing N of M" header). See contract §3 in `specs/005-pdp-data-capture/contracts/product-data.md`
- [X] T009 [US2] Update `buildProductContextString` tests in `src/utils/vtex.test.js` — (a) update "limits SKUs to 5" test → replace with "shows single matching SKU when selectedSkuId matches", (b) update "shows all SKUs when count is within limit" → replace with "omits SKU section when selectedSkuId is null", (c) add test: "omits SKU section when selectedSkuId does not match any item", (d) add test: "shows Selected SKU header with correct format when match found", (e) add test: "product-level fields (name, brand, description, attributes) remain unchanged regardless of selectedSkuId", (f) update "handles missing optional fields" test if affected
- [X] T010 [US2] Modify `detectAndFetchPdp()` in `src/hooks/useConversationStarters.js` — after `resolveProductData` returns, call `getSelectedSkuIdFromLdJson()` (import from `@/utils/vtex`). Pass the result as second argument to `buildProductContextString(normalized, selectedSkuId)`. See contract §4 in `specs/005-pdp-data-capture/contracts/product-data.md`
- [X] T011 [US2] Update the import statement in `src/hooks/useConversationStarters.js` to include `getSelectedSkuIdFromLdJson` from `@/utils/vtex`
- [X] T012 [US2] Update `useConversationStarters.test.js` mock for `@/utils/vtex` — add `getSelectedSkuIdFromLdJson: jest.fn()` to the mock factory in `src/hooks/useConversationStarters.test.js`
- [X] T013 [US2] Add hook integration test in `src/hooks/useConversationStarters.test.js` — verify that `detectAndFetchPdp` calls `getSelectedSkuIdFromLdJson` and passes the result to `buildProductContextString` as second argument. Test cases: (a) SKU ID returned → `buildProductContextString` called with `(normalized, skuId)`, (b) null returned → `buildProductContextString` called with `(normalized, null)`
- [X] T014 [US2] Run `npx jest src/utils/vtex.test.js src/hooks/useConversationStarters.test.js` and verify all tests pass

**Checkpoint**: Context string contains 0 or 1 SKU. Hook passes SKU ID from ld+json to context builder. All tests pass.

---

## Phase 5: User Story 3 — SKU resolution uses only ld+json (Priority: P2)

**Goal**: Ensure the SKU resolution mechanism never uses `__NEXT_DATA__` and exclusively relies on `ld+json`. This phase adds negative/edge-case tests that verify the exclusion constraint.

**Independent Test**: Simulate scenarios where `ld+json` has no SKU but `__NEXT_DATA__` does — verify no SKU appears in context.

### Implementation for User Story 3

- [X] T015 [US3] Add negative test in `src/utils/vtex.test.js` for `getSelectedSkuIdFromLdJson` — when `ld+json` has no `sku`/`productID` but `window.__NEXT_DATA__` has `product.id = "37"`, verify function returns `null` (does NOT read from `__NEXT_DATA__`)
- [X] T016 [US3] Add negative test in `src/utils/vtex.test.js` — when `ld+json` returns `sku: "42"` and `window.__NEXT_DATA__` has `product.id = "99"`, verify function returns `"42"` (ld+json value, not __NEXT_DATA__)
- [X] T017 [US3] Add integration edge-case test in `src/hooks/useConversationStarters.test.js` — when `resolveProductData` source is `intelligent-search`, and `getSelectedSkuIdFromLdJson` returns a SKU ID, verify `buildProductContextString` is called with that SKU ID (cross-source filtering works)
- [X] T018 [US3] Add integration edge-case test in `src/hooks/useConversationStarters.test.js` — when `getSelectedSkuIdFromLdJson` returns `null` (ld+json absent), verify `buildProductContextString` is called with `null` and context has no SKU section, even though `resolveProductData` returned product data from `__NEXT_DATA__` with SKU info in `rawProduct`
- [X] T019 [US3] Run `npx jest --coverage src/utils/vtex.test.js src/hooks/useConversationStarters.test.js` — verify all tests pass AND coverage meets 80% for statements, branches, functions, and lines

**Checkpoint**: All negative tests confirm `__NEXT_DATA__` is never used for SKU resolution. Coverage meets 80% threshold.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Update example file, run full lint/format cycle, final validation.

- [X] T020 [P] Update `examples/pdp-simulation-test.html` to reflect new behavior — update scenario descriptions to match the new waterfall order (`__NEXT_DATA__` first) and single-SKU context output format
- [X] T021 Run `npm run lint -- --fix` across all modified files to ensure code style compliance
- [X] T022 Run full test suite `npm test` to verify no regressions across the entire project
- [X] T023 Run `npx jest --coverage` and verify overall project coverage is not degraded — specifically check `src/utils/vtex.js` and `src/hooks/useConversationStarters.js` meet 80%+ on all four metrics (statements, branches, functions, lines)

**Checkpoint**: All modified files pass lint. Full test suite green. Coverage verified.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS US2 and US3
- **US1 (Phase 3)**: Depends on Phase 1 only — can run IN PARALLEL with Phase 2
- **US2 (Phase 4)**: Depends on Phase 2 (`getSelectedSkuIdFromLdJson` must exist)
- **US3 (Phase 5)**: Depends on Phase 2 and Phase 4 (needs both the function and the context builder changes)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent — only touches `resolveProductData` waterfall order. Can start immediately after Phase 1.
- **User Story 2 (P1)**: Depends on Foundational (T003–T004) for `getSelectedSkuIdFromLdJson`. Can run in parallel with US1.
- **User Story 3 (P2)**: Depends on US2 being complete (needs `buildProductContextString` with `selectedSkuId` param and hook integration to exist for negative tests).

### Within Each User Story

- Implementation tasks before test-update tasks (modify code, then verify)
- `vtex.js` changes before `useConversationStarters.js` changes (utility before consumer)
- Run tests after each story to confirm green

### Parallel Opportunities

- **Phase 2 (T003) and Phase 3 (T005)** can run in parallel — different functions in the same file (T003 adds new function, T005 reorders existing function)
- **T008 and T010** within US2 can potentially overlap — different files (`vtex.js` vs `useConversationStarters.js`)
- **T015 and T016** within US3 are independent test additions — can be written in parallel
- **T020** (example file) can run in parallel with T021–T023

---

## Parallel Example: Phase 2 + US1

```bash
# These can run in parallel (different functions, different concerns):
Task T003: "Implement getSelectedSkuIdFromLdJson() in src/utils/vtex.js"
Task T005: "Reorder waterfall in resolveProductData() in src/utils/vtex.js"

# Then sequentially:
Task T004: "Add unit tests for getSelectedSkuIdFromLdJson in src/utils/vtex.test.js"
Task T006: "Update resolveProductData tests in src/utils/vtex.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 3: US1 (T005–T007) — waterfall reorder
3. **STOP and VALIDATE**: Run tests, verify new priority order works
4. This alone delivers the core behavioral change for starters generation

### Incremental Delivery

1. Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (US1) → Waterfall reorder + SKU resolver ready
2. Phase 4 (US2) → Single-SKU context integrated → Test independently
3. Phase 5 (US3) → Negative tests confirm exclusion constraint → Full confidence
4. Phase 6 (Polish) → Lint, coverage, example update → Ship-ready

### Single Developer Strategy (Recommended)

1. T001–T002 (Setup) — 5 min
2. T003–T004 (Foundational) — 20 min
3. T005–T007 (US1) — 15 min
4. T008–T014 (US2) — 30 min
5. T015–T019 (US3) — 20 min
6. T020–T023 (Polish) — 10 min

**Estimated total**: ~100 min (1h 40m)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and Foundational can run in parallel (different functions in vtex.js)
- US3 negative tests validate the architectural constraint (ld+json only for SKU)
- `MAX_SKUS` constant can be removed from vtex.js in T008 since multi-SKU listing is eliminated
- All normalizer functions (`normalizeLdJsonForContext`, `normalizeNextDataForContext`) remain unchanged — they still produce full `items[]` arrays; the filtering happens in `buildProductContextString`
