# Quickstart: PDP Data Capture Priority & SKU-Specific Context

**Branch**: `005-pdp-data-capture` | **Date**: 2026-04-02

## Prerequisites

- Node.js 18+
- npm 9+
- Git

## Setup

```bash
git checkout 005-pdp-data-capture
npm install
```

## Development

```bash
npm run dev
```

Opens the dev server at `http://localhost:3000`. Use `examples/pdp-simulation-test.html` to manually test PDP scenarios.

## Files to Modify

| File | What changes |
|------|-------------|
| `src/utils/vtex.js` | Reorder waterfall in `resolveProductData`; add `getSelectedSkuIdFromLdJson`; modify `buildProductContextString` to accept `selectedSkuId` |
| `src/hooks/useConversationStarters.js` | Call `getSelectedSkuIdFromLdJson()` in `detectAndFetchPdp` and pass SKU ID to `buildProductContextString` |
| `src/utils/vtex.test.js` | Add tests for new waterfall order, `getSelectedSkuIdFromLdJson`, single-SKU context |
| `src/hooks/useConversationStarters.test.js` | Update mocks and add tests for SKU-aware context flow |
| `examples/pdp-simulation-test.html` | Update test scenarios to reflect new behavior |

## Running Tests

```bash
# Run all tests
npm test

# Run only vtex tests
npx jest src/utils/vtex.test.js

# Run only hook tests
npx jest src/hooks/useConversationStarters.test.js

# Run with coverage
npx jest --coverage src/utils/vtex.test.js src/hooks/useConversationStarters.test.js
```

Coverage target: **80% minimum** for statements, branches, functions, and lines.

## Linting & Formatting

```bash
# Format first, then lint
npm run format   # if script exists, otherwise: npx prettier --write src/
npm run lint -- --fix
```

## Pre-Commit Checklist

1. Run `npm test` — all tests pass
2. Run `npm run lint` — no errors
3. Check coverage: `npx jest --coverage` — 80%+ on all metrics
4. Stage and commit: `git add -A && git commit`

## Manual Testing with pdp-simulation-test.html

Open `examples/pdp-simulation-test.html` in a browser. The page simulates different PDP data scenarios:

1. **FastStore PDP** (has `__NEXT_DATA__`): Verify starters use `next-data` source; context shows single selected SKU from `ld+json`.
2. **Legacy VTEX PDP** (has `ld+json` only, no `__NEXT_DATA__`): Verify starters use `ld+json` (after IS API fails); context shows single SKU if `ld+json` has `sku`/`productID`.
3. **No SKU in ld+json**: Verify context has product-level info only (no SKU section).
4. **ProductGroup with hasVariant but no root sku**: Verify context has product-level info only.

## Key Implementation Notes

- `getSelectedSkuIdFromLdJson()` reuses `findProductInLdJson()` — no DOM query duplication
- `buildProductContextString` gains an optional second parameter; existing callers passing only one argument continue to work (backward compatible — defaults to no SKU filtering)
- The `resolveProductData` waterfall change is a reorder of existing function calls — no new extraction logic
- `formatSkuLine` is reused unchanged for the single SKU line
