# Contract: Product Data Extraction & Context

**Branch**: `005-pdp-data-capture` | **Date**: 2026-04-02

## 1. resolveProductData(slug, account) — MODIFIED

Resolves product data from available sources in waterfall order.

**Signature** (unchanged):
```js
async function resolveProductData(slug: string, account: string): Promise<ResolveResult | null>
```

**Return type** (unchanged):
```js
{
  productData: ProductData,
  rawProduct: object,
  source: 'next-data' | 'intelligent-search' | 'ld+json'
}
```

**Waterfall order** (CHANGED):
| Step | Source | Condition to use | Condition to skip |
|------|--------|-----------------|-------------------|
| 1 | `extractFromNextData(slug)` | Returns valid `productData` | `null` (no `__NEXT_DATA__` or invalid) |
| 2 | `fetchProductData(slug)` → IS API | Returns valid response with matching product | `null` or network error |
| 3 | `extractFromLdJson(slug)` | Returns valid `productData` | `null` (no ld+json or invalid) |

**Previous order**: ld+json → next-data → intelligent-search
**New order**: next-data → intelligent-search → ld+json

---

## 2. getSelectedSkuIdFromLdJson() — NEW

Resolves the currently selected SKU ID from `ld+json` structured data only.

**Signature**:
```js
function getSelectedSkuIdFromLdJson(): string | null
```

**Behavior**:
1. Call `findProductInLdJson()` to locate the Product/ProductGroup node
2. If found, return `product.sku` (if truthy) or `product.productID` (if truthy)
3. Return `null` if no Product node found, or neither field is present

**Constraints**:
- MUST NOT access `window.__NEXT_DATA__`
- MUST NOT make network calls
- MUST be synchronous (DOM read only)
- MUST reuse existing `findProductInLdJson()` function

---

## 3. buildProductContextString(product, selectedSkuId?) — MODIFIED

Builds the context string sent to `service.setContext()`.

**Signature** (CHANGED — new optional parameter):
```js
function buildProductContextString(product: NormalizedProduct, selectedSkuId?: string | null): string | null
```

**Behavior when `selectedSkuId` is provided and matches an item**:
```
Product: {productName}
Brand: {brand}
Product ID: {productId}
Description: {description}
Attributes: {key: value | ...}

Selected SKU:
- SKU {itemId}: {name} ({variations}) | Price: {price} | Available|Unavailable
```

**Behavior when `selectedSkuId` is `null`/`undefined` or no matching item found**:
```
Product: {productName}
Brand: {brand}
Product ID: {productId}
Description: {description}
Attributes: {key: value | ...}
```

**Changes from current behavior**:
- Previously: listed up to 5 SKUs from `product.items` with header "Available SKUs (showing N of M)"
- Now: shows 0 or 1 SKU based on `selectedSkuId` match
- The `formatSkuLine` helper is reused unchanged for the single SKU line
- The `filterInternalProperties` helper is reused unchanged for attributes

---

## 4. detectAndFetchPdp() in useConversationStarters — MODIFIED

Integration point in the hook that orchestrates the full flow.

**Current flow**:
```
resolveProductData → requestStarters → normalizeForContext → buildProductContextString → setContext
```

**New flow**:
```
resolveProductData → requestStarters → getSelectedSkuIdFromLdJson → normalizeForContext → buildProductContextString(normalized, skuId) → setContext
```

**Key change**: `getSelectedSkuIdFromLdJson()` is called independently from `resolveProductData()`. The SKU ID is passed to `buildProductContextString` as the second argument.

---

## 5. Unchanged Contracts

The following functions and interfaces are NOT modified by this feature:

| Function | Reason |
|----------|--------|
| `isVtexPdpPage()` | PDP URL detection unchanged |
| `extractSlugFromUrl()` | Slug extraction unchanged |
| `getVtexAccount()` | Account resolution unchanged |
| `isValidProductData()` | Validation rules unchanged |
| `findProductInLdJson()` | Used by both extraction and SKU resolution (unchanged) |
| `extractFromLdJson(slug)` | Extraction logic unchanged; only call order changes |
| `extractFromNextData(slug)` | Extraction logic unchanged; only call order changes |
| `fetchProductData(slug)` | API call unchanged |
| `selectProduct(products, slug)` | Product selection unchanged |
| `filterInternalProperties(properties)` | Property filtering unchanged |
| `extractProductData(product, account)` | IS product extraction unchanged |
| `normalizeForContext(rawProduct, source)` | All three normalizers unchanged |
| `formatSkuLine(item)` | SKU line formatting unchanged |
| `service.getStarters(productData)` | Starters payload shape unchanged |
| `service.setContext(contextString)` | Context interface unchanged |
