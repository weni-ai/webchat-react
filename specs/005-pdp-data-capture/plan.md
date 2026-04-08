# Implementation Plan: PDP Data Capture Priority & SKU-Specific Context

**Branch**: `005-pdp-data-capture` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-pdp-data-capture/spec.md`

## Summary

Change the product data extraction priority for Conversation Starters from `ld+json → __NEXT_DATA__ → Intelligent Search` to `__NEXT_DATA__ → Intelligent Search → ld+json`. Simultaneously, replace the multi-SKU context (up to 5 SKUs) with a single-SKU context resolved exclusively from `ld+json`. When the selected SKU cannot be determined from `ld+json`, send product-level context only (no SKU section). These changes affect `src/utils/vtex.js` (waterfall order + new SKU resolution + context builder) and `src/hooks/useConversationStarters.js` (integration of SKU resolution into the flow).

## Technical Context

**Language/Version**: JavaScript (ES2020+, transpiled via Babel for Jest, Vite for bundling)
**Primary Dependencies**: React 18, Vite 5, Jest 29 + Testing Library, @weni/webchat-service
**Storage**: N/A (browser DOM APIs — `window.__NEXT_DATA__`, `document.querySelectorAll` for ld+json, `fetch` for Intelligent Search)
**Testing**: Jest 29 with jsdom environment, @testing-library/react, babel-jest transform
**Target Platform**: Browser widget (embedded in VTEX storefronts — both legacy Portal/CMS and FastStore)
**Project Type**: Single frontend library (React component library bundled as UMD + ESM)
**Performance Goals**: Product data resolution must complete within existing PDP page load (no additional network calls when `__NEXT_DATA__` is available)
**Constraints**: No new dependencies. All changes are internal refactors of existing utility functions and hook logic.
**Scale/Scope**: 2 source files modified (`vtex.js`, `useConversationStarters.js`), 2 test files updated (`vtex.test.js`, `useConversationStarters.test.js`), 1 example file updated (`pdp-simulation-test.html`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Clean Code & Readability** — PASS. Changes are isolated to two well-structured utility files. New functions (`getSelectedSkuId`, `buildSingleSkuContext`) follow single-responsibility principle. The waterfall reorder is a minimal change to `resolveProductData`.
2. **Code Style Standards** — PASS. Object map pattern already used for `CONTEXT_NORMALIZERS`. New SKU resolution follows the same pattern. No switch statements introduced.
3. **Naming Conventions** — PASS. New function names use `camelCase`, follow existing patterns (e.g., `extractFromLdJson`, `normalizeForContext`). New function `getSelectedSkuIdFromLdJson` is descriptive and follows the `verbNounFromSource` convention.
4. **Testing & Quality Assurance** — PASS. Plan includes updating both `vtex.test.js` and `useConversationStarters.test.js` with new test cases for the reordered waterfall, SKU resolution, and single-SKU context. Target: 80%+ coverage for all metrics.
5. **Semantic HTML & Accessibility** — N/A. No UI changes; only data extraction and context logic.
6. **Pre-Commit Compliance** — PASS. Will run `npm run format && npm run lint -- --fix && npm test` before committing.

## Project Structure

### Documentation (this feature)

```text
specs/005-pdp-data-capture/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── product-data.md
├── checklists/
│   └── requirements.md
└── tasks.md              (created by /speckit.tasks — NOT part of /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── utils/
│   ├── vtex.js            # Modified: waterfall reorder + getSelectedSkuIdFromLdJson + buildProductContextString refactor
│   └── vtex.test.js       # Modified: new tests for waterfall order, SKU resolution, single-SKU context
├── hooks/
│   ├── useConversationStarters.js       # Modified: integrate SKU resolution into detectAndFetchPdp
│   └── useConversationStarters.test.js  # Modified: test SKU-aware context flow
examples/
└── pdp-simulation-test.html             # Modified: update test scenarios for new behavior
```

**Structure Decision**: Single frontend library. No new files created — all changes are modifications to existing files within `src/utils/` and `src/hooks/`. The feature is a behavioral refactor, not a new module.

## Complexity Tracking

No constitution violations. No complexity additions needed.
