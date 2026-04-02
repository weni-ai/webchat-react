# Tasks: PDP Product Data Extraction Strategy

**Input**: Design documents from `/specs/004-pdp-product-data-strategy/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/product-data.md

**Tests**: Included — constitution mandates 80%+ coverage on all metrics. Tests are written alongside implementation (not TDD).

**Organization**: Tasks are grouped by user story. US4 (account resolution) is foundational since all other stories depend on it. US1 and US2 can be implemented in parallel. US3 orchestrates the waterfall and integrates into the hook.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify branch and understand current code before making changes

- [x] T001 Verify branch `004-pdp-product-data-strategy` is checked out and up to date with main
- [x] T002 Run existing test suite (`npm test`) to confirm all tests pass before changes in src/utils/vtex.test.js and src/hooks/useConversationStarters.test.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities that ALL user stories depend on — account resolution (US4) and shared validation

**CRITICAL**: No user story work can begin until this phase is complete

### Implementation

- [x] T003 [US4] Update `getVtexAccount()` to use `window.__RUNTIME__?.account || window.VTEX_METADATA?.account` (remove hostname fallback) in src/utils/vtex.js
- [x] T004 [P] [US4] Add `isValidProductData(data)` function that returns `true` when `productName` is truthy AND at least one of `description` or `brand` is truthy in src/utils/vtex.js
- [x] T005 [US4] Update existing `getVtexAccount` tests and add new tests for `VTEX_METADATA` fallback and undefined-when-neither-exists case in src/utils/vtex.test.js
- [x] T006 [P] [US4] Add unit tests for `isValidProductData` covering all combinations of name/description/brand presence in src/utils/vtex.test.js

**Checkpoint**: `getVtexAccount()` returns correct account from `__RUNTIME__` or `VTEX_METADATA`, `isValidProductData` validates extraction results. All existing tests still pass.

---

## Phase 3: User Story 1 — ld+json Product Data Extraction (Priority: P1) MVP

**Goal**: Extract product data from `<script type="application/ld+json">` Schema.org structured data on the page, producing a normalized `ProductData` payload without any network request.

**Independent Test**: Inject a `<script type="application/ld+json">` tag with Schema.org Product data in jsdom. Call `extractFromLdJson(slug)`. Verify it returns a valid `ProductData` with correct field mappings and no fetch calls.

### Implementation

- [x] T007 [P] [US1] Implement `findProductInLdJson()` helper that queries all `<script type="application/ld+json">` tags, parses each with try/catch, and finds the Product/ProductGroup object by checking `@type` direct, `@graph[]` scan, and `mainEntity` traversal in src/utils/vtex.js
- [x] T008 [US1] Implement `extractFromLdJson(slug)` that calls `findProductInLdJson()`, maps fields to `ProductData` (name→productName, brand.name→brand, description, additionalProperty→attributes via `filterInternalProperties`), validates with `isValidProductData()`, and returns `{ productData, rawProduct }` or `null` in src/utils/vtex.js
- [x] T009 [US1] Implement ld+json branch in `normalizeForContext(rawProduct, source)` that maps ld+json `offers.offers[]` and `hasVariant[]` to the `items[]` shape expected by `buildProductContextString()` in src/utils/vtex.js
- [x] T010 [US1] Add unit tests for `findProductInLdJson` covering: flat Product type, flat ProductGroup type, `@type` as array, `@graph` wrapper, `mainEntity` wrapper, multiple tags with mixed types, malformed JSON tag, no ld+json tags at all in src/utils/vtex.test.js
- [x] T011 [US1] Add unit tests for `extractFromLdJson` covering: valid Product extraction with all fields, valid ProductGroup with `hasVariant`, missing `name` (returns null), name-only without brand/description (returns null per validation), `brand` as string vs object, `additionalProperty` filtering in src/utils/vtex.test.js
- [x] T012 [US1] Add unit tests for `normalizeForContext` ld+json branch covering: single offer mapping to items, ProductGroup variants mapping, missing offers gracefully handled in src/utils/vtex.test.js

**Checkpoint**: `extractFromLdJson` correctly parses ld+json tags, produces valid `ProductData`, and context normalization works. No network calls involved.

---

## Phase 4: User Story 2 — `__NEXT_DATA__` Product Data Extraction (Priority: P1)

**Goal**: Extract product data from `window.__NEXT_DATA__.props.pageProps.data.product` on FastStore pages, using `isVariantOf.name` for product name and `customData.specificationGroups` for attributes.

**Independent Test**: Set `window.__NEXT_DATA__` with a real FastStore product structure (from the Surface Go 3 sample). Call `extractFromNextData(slug)`. Verify it returns a valid `ProductData` with correct field mappings.

### Implementation

- [x] T013 [P] [US2] Implement `extractSpecsFromNextData(specificationGroups)` helper that flattens `customData.specificationGroups[*].specifications[*]` into `{ name: values.join(', ') }` pairs, filtering internal properties using the existing `INTERNAL_PROPERTIES` set in src/utils/vtex.js
- [x] T014 [US2] Implement `extractFromNextData(slug)` that guards on `window.__NEXT_DATA__?.page === "/[slug]/p"`, reads `props.pageProps.data.product`, maps `isVariantOf.name` (fallback `name`) to `productName`, `brand.name` to `brand`, `description`, and `extractSpecsFromNextData` for attributes, validates with `isValidProductData()`, returns `{ productData, rawProduct }` or `null` in src/utils/vtex.js
- [x] T015 [US2] Implement `__NEXT_DATA__` branch in `normalizeForContext(rawProduct, source)` that maps `isVariantOf.skuVariants.allVariantProducts[]` and `offers.offers[]` to the `items[]` shape expected by `buildProductContextString()` in src/utils/vtex.js
- [x] T016 [US2] Add unit tests for `extractSpecsFromNextData` covering: single spec group, multiple spec groups, filtering `sellerId` and other internal properties, empty/missing spec groups in src/utils/vtex.test.js
- [x] T017 [US2] Add unit tests for `extractFromNextData` covering: valid extraction with full Surface Go 3 sample data, `isVariantOf.name` used as productName, fallback to `name` when `isVariantOf` absent, page guard rejects non-PDP pages (`__NEXT_DATA__.page !== "/[slug]/p"`), missing `__NEXT_DATA__` (returns null), missing nested `data.product` (returns null), incomplete data failing validation in src/utils/vtex.test.js
- [x] T018 [US2] Add unit tests for `normalizeForContext` `__NEXT_DATA__` branch covering: variant products mapping to items, current SKU offer mapping, missing skuVariants gracefully handled in src/utils/vtex.test.js

**Checkpoint**: `extractFromNextData` correctly reads FastStore `__NEXT_DATA__`, produces valid `ProductData`, and context normalization works. No network calls involved.

---

## Phase 5: User Story 3 — Waterfall Orchestration and IS API Fallback (Priority: P1)

**Goal**: Implement `resolveProductData` waterfall that tries ld+json → `__NEXT_DATA__` → Intelligent Search API in order, and integrate it into the `useConversationStarters` hook replacing the current direct API call.

**Independent Test**: Mock all three sources in various combinations (ld+json succeeds, ld+json fails + `__NEXT_DATA__` succeeds, both fail + IS API succeeds, all fail). Verify the waterfall picks the first valid result and produces the correct `source` tag.

### Implementation

- [x] T019 [US3] Implement `resolveProductData(slug, account)` async function that tries `extractFromLdJson(slug)` first, then `extractFromNextData(slug)`, then `fetchProductData(slug)` + `selectProduct()` + `extractProductData()`, returning `{ productData, rawProduct, source }` for the first valid result or `null` if all fail in src/utils/vtex.js
- [x] T020 [US3] Implement `intelligent-search` branch in `normalizeForContext(rawProduct, source)` that passes the IS API product object through unchanged (already in the expected shape) in src/utils/vtex.js
- [x] T021 [US3] Update `detectAndFetchPdp` in useConversationStarters hook to call `resolveProductData(slug, account)` instead of direct `fetchProductData` → `selectProduct` → `extractProductData` chain, and use `normalizeForContext(result.rawProduct, result.source)` → `buildProductContextString()` for setting context in src/hooks/useConversationStarters.js
- [x] T022 [US3] Add guard in `detectAndFetchPdp` to skip starters generation when `getVtexAccount()` returns `undefined` (graceful skip per FR-010) in src/hooks/useConversationStarters.js
- [x] T023 [US3] Add unit tests for `resolveProductData` waterfall covering: ld+json succeeds (no further calls), ld+json fails + `__NEXT_DATA__` succeeds (no API call), both fail + IS API succeeds, all three fail returns null, source field is correct for each strategy in src/utils/vtex.test.js
- [x] T024 [US3] Update `useConversationStarters.test.js` mocks to use `resolveProductData` instead of `fetchProductData`/`selectProduct`/`extractProductData` and verify the hook correctly calls `requestStarters` with the waterfall result in src/hooks/useConversationStarters.test.js
- [x] T025 [US3] Add test in `useConversationStarters.test.js` verifying that `detectAndFetchPdp` skips starters when `getVtexAccount()` returns undefined in src/hooks/useConversationStarters.test.js

**Checkpoint**: Full waterfall works end-to-end. Hook correctly uses the waterfall. IS API is only called when page-level sources fail. Account resolution failure gracefully skips starters. All existing starters behavior (display, click, SPA navigation, mobile auto-hide) still works.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Update manual test page, verify coverage, run pre-commit checks

- [x] T026 [P] Update `examples/pdp-simulation-test.html` to inject `<script type="application/ld+json">` with Schema.org Product data, set `window.__NEXT_DATA__` with FastStore product structure, and set `window.VTEX_METADATA` alongside existing `window.__RUNTIME__` for testing all three extraction paths
- [x] T027 [P] Add comments to `examples/pdp-simulation-test.html` explaining how to test each strategy in isolation (remove ld+json tag → falls to `__NEXT_DATA__`, remove both → falls to IS API)
- [x] T028 Run `npm test -- --coverage` and verify 80%+ coverage on statements, branches, functions, and lines for src/utils/vtex.js
- [x] T029 Run `npm run lint` and fix any ESLint/Prettier issues across all modified files
- [x] T030 Run full test suite (`npm test`) to confirm zero regressions across the entire project

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 ld+json (Phase 3)**: Depends on Foundational (Phase 2) — needs `isValidProductData`, `getVtexAccount`
- **US2 `__NEXT_DATA__` (Phase 4)**: Depends on Foundational (Phase 2) — needs `isValidProductData`, `getVtexAccount`, `filterInternalProperties`
- **US3 Waterfall (Phase 5)**: Depends on US1 (Phase 3) AND US2 (Phase 4) — orchestrates all strategies
- **Polish (Phase 6)**: Depends on US3 (Phase 5) completion

### User Story Dependencies

```
Phase 2: Foundational (US4 + shared)
    ├──→ Phase 3: US1 (ld+json)  ──┐
    └──→ Phase 4: US2 (__NEXT_DATA__) ──┤
                                        └──→ Phase 5: US3 (waterfall + hook)
                                                └──→ Phase 6: Polish
```

- **US4 (account)**: Foundational — must complete first
- **US1 (ld+json)** and **US2 (`__NEXT_DATA__`)**: Can run in PARALLEL after Phase 2
- **US3 (waterfall)**: Depends on US1 + US2 completion
- All stories share a single file (`src/utils/vtex.js`) — parallel work requires coordination on non-overlapping functions

### Parallel Opportunities

- **T003 + T004**: Different functions in the same file, but small and non-overlapping
- **T005 + T006**: Different test sections in vtex.test.js
- **T007 + T013**: ld+json helper and `__NEXT_DATA__` helper are independent functions (US1 ∥ US2)
- **T010–T012 + T016–T018**: Test suites for US1 and US2 are independent
- **T026 + T027**: Different sections of simulation page

---

## Parallel Example: US1 and US2

```bash
# After Phase 2 completes, launch US1 and US2 in parallel:

# Developer A (US1 - ld+json):
Task: "T007 [US1] Implement findProductInLdJson() helper in src/utils/vtex.js"
Task: "T008 [US1] Implement extractFromLdJson() in src/utils/vtex.js"
Task: "T009 [US1] Implement ld+json normalizeForContext branch in src/utils/vtex.js"
Task: "T010-T012 [US1] Tests in src/utils/vtex.test.js"

# Developer B (US2 - __NEXT_DATA__):
Task: "T013 [US2] Implement extractSpecsFromNextData() helper in src/utils/vtex.js"
Task: "T014 [US2] Implement extractFromNextData() in src/utils/vtex.js"
Task: "T015 [US2] Implement __NEXT_DATA__ normalizeForContext branch in src/utils/vtex.js"
Task: "T016-T018 [US2] Tests in src/utils/vtex.test.js"
```

---

## Implementation Strategy

### MVP First (Phases 1–3: ld+json only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (account + validation)
3. Complete Phase 3: US1 (ld+json extraction)
4. **STOP and VALIDATE**: On a VTEX store with ld+json, starters appear without API calls
5. Can deploy as incremental improvement (ld+json first, API fallback preserved)

### Full Delivery (Phases 1–6)

1. Complete Setup + Foundational → base ready
2. Add US1 (ld+json) + US2 (`__NEXT_DATA__`) in parallel → two extraction strategies ready
3. Add US3 (waterfall + hook integration) → full feature wired up
4. Polish → simulation page updated, coverage verified
5. Each phase adds value without breaking previous behavior

---

## Notes

- All changes are in existing files — no new files or dependencies
- `src/utils/vtex.js` is the primary file; coordinate parallel work on non-overlapping functions
- The `normalizeForContext` function grows incrementally: ld+json branch in US1, `__NEXT_DATA__` branch in US2, IS API branch in US3
- Existing functions (`fetchProductData`, `selectProduct`, `extractProductData`, `buildProductContextString`) remain unchanged
- The hook change (T021) is the integration point — everything before it is pure utility work
