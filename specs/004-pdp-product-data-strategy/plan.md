# Implementation Plan: PDP Product Data Extraction Strategy

**Branch**: `004-pdp-product-data-strategy` | **Date**: 2026-04-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-pdp-product-data-strategy/spec.md`

## Summary

Replace the single Intelligent Search API extraction in PDP starters with a three-tier waterfall: (1) parse `<script type="application/ld+json">` Schema.org structured data from the DOM, (2) read `window.__NEXT_DATA__.props.pageProps.data.product` for FastStore pages, (3) fall back to the existing Intelligent Search API. Update account resolution to `window.__RUNTIME__?.account || window.VTEX_METADATA?.account`, removing the hostname fallback. All strategies produce an identical normalized `ProductData` payload. All strategies also build the SKU-level AI context string for `service.setContext()`.

## Technical Context

**Language/Version**: JavaScript (ES2020+), React 18.2  
**Primary Dependencies**: React 18, @weni/webchat-service 1.10.1, i18next, Vite 5  
**Storage**: N/A (no persistent storage — product data is extracted per page load)  
**Testing**: Jest 29 with jsdom, @testing-library/react, babel-jest  
**Target Platform**: Browser (widget injected into VTEX IO and FastStore storefronts)  
**Project Type**: Frontend library (React component library + standalone UMD bundle)  
**Performance Goals**: ld+json and `__NEXT_DATA__` extraction < 50ms (synchronous DOM/global reads); IS API fallback < 3s (network-bound, cached by backend)  
**Constraints**: No new dependencies; backward-compatible payload structure; silent failure on all extraction errors; 80%+ test coverage on all metrics  
**Scale/Scope**: Runs on arbitrary VTEX store pages; changes confined to `src/utils/vtex.js`, `src/hooks/useConversationStarters.js`, and their tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Clean Code & Readability** — PASS. Each extraction strategy is a single-responsibility function. The waterfall orchestrator reads top-to-bottom. Complex Schema.org traversal logic is extracted into named helpers.
2. **Code Style Standards** — PASS. Follows existing `vtex.js` patterns (exported pure functions, try/catch for external data). Strategy dispatch uses a sequential waterfall rather than switch/map since strategies have different signatures (sync vs async). No new formatting rules introduced.
3. **Naming Conventions** — PASS. New functions follow `camelCase`: `extractFromLdJson`, `extractFromNextData`, `resolveProductData`. Descriptive names without abbreviations.
4. **Testing & Quality Assurance** — PASS. Each extractor gets dedicated unit tests. The waterfall gets integration tests. All three data sources are mocked in jsdom (DOM injection for ld+json, `window.__NEXT_DATA__` assignment, fetch mock for IS API). Target: 80%+ on statements, branches, functions, lines.
5. **Semantic HTML & Accessibility** — N/A. No UI changes in this feature — only data extraction logic.
6. **Pre-Commit Compliance** — PASS. All changes go through existing ESLint + Prettier + Jest pipeline. No new hooks or config changes needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-pdp-product-data-strategy/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── product-data.md  # Internal data contract
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── utils/
│   ├── vtex.js                    # MODIFIED — add extractors, update getVtexAccount, add waterfall
│   └── vtex.test.js               # MODIFIED — add tests for all new functions
├── hooks/
│   ├── useConversationStarters.js      # MODIFIED — replace fetchProductData call with waterfall
│   └── useConversationStarters.test.js # MODIFIED — update mocks for waterfall
└── ...

examples/
└── pdp-simulation-test.html       # MODIFIED — add ld+json and __NEXT_DATA__ test scenarios
```

**Structure Decision**: All changes are confined to existing files within `src/utils/` and `src/hooks/`. No new files, directories, or dependencies are introduced. The extraction strategies are pure functions added to `vtex.js`, keeping the module as the single source of VTEX platform integration logic.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
