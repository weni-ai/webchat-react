# Quickstart: PDP Product Data Extraction Strategy

**Feature**: `004-pdp-product-data-strategy`  
**Branch**: `004-pdp-product-data-strategy`

## What this feature changes

The PDP conversation starters now extract product data using a three-tier waterfall instead of a single API call:

1. **ld+json** — Parse `<script type="application/ld+json">` tags (Schema.org Product/ProductGroup)
2. **`__NEXT_DATA__`** — Read `window.__NEXT_DATA__.props.pageProps.data.product` (FastStore/Next.js)
3. **Intelligent Search API** — Existing `fetch` to `/api/io/_v/api/intelligent-search/product_search/{slug}` (fallback)

Account resolution also changes: `window.__RUNTIME__?.account || window.VTEX_METADATA?.account` (hostname fallback removed).

## Files modified

| File | Change |
|------|--------|
| `src/utils/vtex.js` | Add `extractFromLdJson`, `extractFromNextData`, `resolveProductData`, `isValidProductData`, `normalizeForContext`; update `getVtexAccount` |
| `src/utils/vtex.test.js` | Add tests for all new functions; update `getVtexAccount` tests |
| `src/hooks/useConversationStarters.js` | Replace direct `fetchProductData` call with `resolveProductData` waterfall |
| `src/hooks/useConversationStarters.test.js` | Update mocks for waterfall flow |
| `examples/pdp-simulation-test.html` | Add ld+json and `__NEXT_DATA__` test scenarios |

## Local development

```bash
git checkout 004-pdp-product-data-strategy
npm install
npm run dev
```

## Running tests

```bash
npm test                    # Run all tests
npm test -- vtex.test       # Run vtex.js tests only
npm test -- useConversation # Run hook tests only
npm test -- --coverage      # Run with coverage report
```

## Manual testing with the simulation page

The `examples/pdp-simulation-test.html` page supports all three extraction strategies:

1. **Build the standalone bundle**:
   ```bash
   npm run build:standalone
   ```

2. **Serve with SPA fallback** (e.g., using `npx serve`):
   ```bash
   npx serve dist-standalone --single
   ```

3. **Navigate to a product URL**: `http://localhost:3000/surface-go-3/p`

The simulation page injects:
- A `<script type="application/ld+json">` tag with Schema.org Product data
- `window.__NEXT_DATA__` with the FastStore product structure
- `window.__RUNTIME__` and `window.VTEX_METADATA` for account resolution
- A `fetch` interceptor for the Intelligent Search API

**Testing each strategy in isolation**:
- Remove the ld+json `<script>` tag → widget falls through to `__NEXT_DATA__`
- Remove both ld+json and `window.__NEXT_DATA__` → widget falls through to IS API
- Remove all three → no starters displayed (silent failure)

## Key design decisions

- **Waterfall, not parallel**: Strategies run sequentially. The first two are synchronous (< 1ms), so no performance penalty. The IS API fetch only fires if both page-level sources fail.
- **Validation threshold**: `productName` + at least one of `description`/`brand` must be present. If not, the strategy is considered failed and the next one is tried.
- **No new dependencies**: All extraction uses native browser APIs (`document.querySelectorAll`, `JSON.parse`, global object reads).
- **Backward compatible**: The `ProductData` payload structure is unchanged. The backend requires zero modifications.

## Reference data

See `data-model.md` for complete field mapping tables per source.
See `contracts/product-data.md` for the full internal API contract.
See `research.md` for technical decision rationale.
