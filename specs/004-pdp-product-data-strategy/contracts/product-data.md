# Contract: Product Data Extraction

**Feature**: `004-pdp-product-data-strategy`  
**Date**: 2026-04-01  
**Type**: Internal module contract (no external API changes)

## Overview

This contract defines the internal interfaces between the extraction strategies in `src/utils/vtex.js` and the consumer in `src/hooks/useConversationStarters.js`. No external/backend API contracts change — the backend receives the same `ProductData` payload via `service.getStarters()` as before.

## Public Functions (exported from `vtex.js`)

### `getVtexAccount(): string | undefined`

Resolves the VTEX account name.

**Resolution order**:
1. `window.__RUNTIME__?.account`
2. `window.VTEX_METADATA?.account`

**Returns**: Account name string, or `undefined` if neither source is available.

**Breaking change from current**: Removes `window.location.hostname.split('.')[0]` fallback.

---

### `extractFromLdJson(slug: string): { productData: object, rawProduct: object } | null`

Synchronous. Parses ld+json tags from the current DOM.

**Parameters**:
- `slug` — Product URL slug (used as `linkText`)

**Returns**: Object with `productData` (normalized) and `rawProduct` (raw ld+json object), or `null` if no valid Product found.

**Behavior**:
- Queries all `<script type="application/ld+json">` elements
- Identifies Product/ProductGroup via `@type`, `@graph`, or `mainEntity`
- Validates result with `isValidProductData()`
- Catches and swallows all parsing errors

---

### `extractFromNextData(slug: string): { productData: object, rawProduct: object } | null`

Synchronous. Reads product data from `window.__NEXT_DATA__`.

**Parameters**:
- `slug` — Product URL slug (used as `linkText`)

**Returns**: Object with `productData` (normalized) and `rawProduct` (raw `__NEXT_DATA__` product object), or `null` if not available or invalid.

**Behavior**:
- Guards on `window.__NEXT_DATA__?.page === "/[slug]/p"`
- Reads from `props.pageProps.data.product`
- Uses `isVariantOf.name` for `productName`, falls back to `name`
- Extracts attributes from `customData.specificationGroups` with internal property filtering
- Validates result with `isValidProductData()`

---

### `resolveProductData(slug: string, account: string): Promise<{ productData: object, rawProduct: object, source: string } | null>`

Async. Orchestrates the three-tier extraction waterfall.

**Parameters**:
- `slug` — Product URL slug
- `account` — VTEX account name (from `getVtexAccount()`)

**Returns**: Object with `productData`, `rawProduct`, and `source` string, or `null` if all strategies fail.

**Waterfall order**:
1. `extractFromLdJson(slug)` — sync, no network
2. `extractFromNextData(slug)` — sync, no network
3. `fetchProductData(slug)` + `selectProduct()` + `extractProductData()` — async, network

**Invariant**: `productData` shape is identical regardless of `source`.

---

### `isValidProductData(data: object): boolean`

Validates the minimum threshold for extracted product data.

**Rule**: Returns `true` if `data.productName` is truthy AND at least one of `data.description` or `data.brand` is truthy.

---

### `normalizeForContext(rawProduct: object, source: string): object`

Normalizes a source-specific raw product object into the shape expected by `buildProductContextString()`.

**Parameters**:
- `rawProduct` — Raw product object from any extraction source
- `source` — `'ld+json' | 'next-data' | 'intelligent-search'`

**Returns**: Object matching the IS API product shape (with `productName`, `brand`, `productId`, `description`, `properties`, `items`).

---

### Existing functions (unchanged)

- `isVtexPdpPage()` — unchanged
- `extractSlugFromUrl()` — unchanged
- `fetchProductData(slug)` — unchanged (now used only as fallback)
- `selectProduct(products, slug)` — unchanged
- `filterInternalProperties(properties)` — unchanged (now reused by `__NEXT_DATA__` extractor)
- `extractProductData(product, account)` — unchanged (now used only by IS API path)
- `buildProductContextString(product)` — unchanged (receives normalized product)

## Consumer Contract (useConversationStarters.js)

### Change in `detectAndFetchPdp`

**Before**:
```
slug → getVtexAccount() → fetchProductData(slug) → selectProduct() → extractProductData() → requestStarters()
                                                                    → buildProductContextString() → setContext()
```

**After**:
```
slug → getVtexAccount() → resolveProductData(slug, account)
  → if result:
      requestStarters(result.productData)
      normalizeForContext(result.rawProduct, result.source) → buildProductContextString() → setContext()
  → if null:
      silent skip (no starters)
```

The hook no longer calls `fetchProductData`, `selectProduct`, or `extractProductData` directly. These are encapsulated inside `resolveProductData`.

## Payload Compatibility

The `productData` object sent via `service.getStarters(productData)` has this exact shape regardless of source:

```json
{
  "account": "storename",
  "linkText": "surface-go-3",
  "productName": "Surface Go 3",
  "description": "Compact Windows tablet designed for portability and productivity.",
  "brand": "Microsoft",
  "attributes": {
    "Storage": "64GB, 128GB, 256GB"
  }
}
```

The backend requires zero changes.
