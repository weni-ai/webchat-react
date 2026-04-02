# Data Model: PDP Product Data Extraction Strategy

**Feature**: `004-pdp-product-data-strategy`  
**Date**: 2026-04-01

## Entities

### ProductData (normalized payload)

The canonical shape sent to the backend for starters generation. Identical regardless of data source.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `account` | `string` | Yes | VTEX account name |
| `linkText` | `string` | Yes | Product URL slug |
| `productName` | `string` | Yes | Product-level name (not SKU-level) |
| `description` | `string` | No* | Product description |
| `brand` | `string` | No* | Brand name |
| `attributes` | `Record<string, string>` | No | Filtered product specifications (key-value pairs) |

\* At least one of `description` or `brand` must be non-empty for the extraction to be considered valid.

**Validation rule**: `productName` is truthy AND (`description` is truthy OR `brand` is truthy).

### ExtractionResult (internal waterfall return)

Returned by the waterfall orchestrator for internal use.

| Field | Type | Description |
|-------|------|-------------|
| `productData` | `ProductData` | Normalized payload for starters |
| `rawProduct` | `object \| null` | Source-specific raw product object for context string building |
| `source` | `'ld+json' \| 'next-data' \| 'intelligent-search'` | Which strategy succeeded |

### AccountResolver (value resolution)

Not a stored entity — a resolution chain that returns a string or `undefined`.

| Priority | Source | Storefront | Access |
|----------|--------|------------|--------|
| 1 | `window.__RUNTIME__.account` | VTEX IO | Global object |
| 2 | `window.VTEX_METADATA.account` | FastStore | Global object |

Returns `undefined` if neither is available. No hostname fallback.

## Field Mappings per Source

### Source 1: ld+json → ProductData

| ld+json path | ProductData field | Transform |
|-------------|-------------------|-----------|
| `name` | `productName` | Direct (use `isVariantOf.name` on ProductGroup if present) |
| `description` | `description` | Direct |
| `brand.name` or `brand` (string) | `brand` | Unwrap object if needed |
| `additionalProperty[].{name, value}` | `attributes` | Filter where `valueReference === "SPECIFICATION"` |
| URL slug | `linkText` | From `extractSlugFromUrl()` |
| Account resolver | `account` | From `getVtexAccount()` |

**Type detection order**: `@type` direct → `@graph[]` scan → `mainEntity` check.

### Source 2: `__NEXT_DATA__` → ProductData

Path: `window.__NEXT_DATA__.props.pageProps.data.product`

| `__NEXT_DATA__` path | ProductData field | Transform |
|---------------------|-------------------|-----------|
| `isVariantOf.name` (fallback: `name`) | `productName` | Product-level name preferred |
| `description` | `description` | Direct |
| `brand.name` | `brand` | Unwrap object |
| `customData.specificationGroups[*].specifications[*]` | `attributes` | Flatten specs, filter internal properties using `INTERNAL_PROPERTIES` set, join values |
| URL slug or `__NEXT_DATA__.query.slug` | `linkText` | Prefer URL slug for consistency |
| Account resolver | `account` | From `getVtexAccount()` |

**Page type guard**: Check `__NEXT_DATA__.page === "/[slug]/p"` before deep traversal.

### Source 3: Intelligent Search API → ProductData (existing, unchanged)

| API response path | ProductData field | Transform |
|------------------|-------------------|-----------|
| `productName` | `productName` | Direct |
| `description` | `description` | Direct |
| `brand` | `brand` | Direct |
| `properties[].{name, values}` | `attributes` | `filterInternalProperties()` (existing function) |
| `linkText` | `linkText` | Direct from API response |
| Account resolver | `account` | From `getVtexAccount()` |

## Context String Normalization

Each source produces raw product data in a different shape. Before calling `buildProductContextString`, the raw data is normalized to the shape the function expects (matching the IS API response structure).

### Target shape (what `buildProductContextString` expects)

```
{
  productName: string,
  brand: string,
  productId: string,
  description: string,
  properties: Array<{ name: string, values: string[] }>,
  items: Array<{
    itemId: string,
    nameComplete: string,
    name: string,
    sellers: Array<{
      commertialOffer: {
        Price: number,
        AvailableQuantity: number
      }
    }>,
    variations: Array<{ name: string, values: string[] }>
  }>
}
```

### ld+json → normalized product

| ld+json field | Normalized field |
|---------------|-----------------|
| `name` | `productName` |
| `brand.name` | `brand` |
| `productID` or `sku` | `productId` |
| `description` | `description` |
| `additionalProperty[]` | `properties[]` |
| `offers.offers[]` | `items[]` (one entry per offer) |
| `hasVariant[]` (on ProductGroup) | `items[]` (one entry per variant) |

### `__NEXT_DATA__` → normalized product

| `__NEXT_DATA__` field | Normalized field |
|-----------------------|-----------------|
| `isVariantOf.name` | `productName` |
| `brand.name` | `brand` |
| `isVariantOf.productGroupID` | `productId` |
| `description` | `description` |
| `customData.specificationGroups` | `properties[]` |
| `offers.offers[]` | Current SKU → `items[0]` |
| `isVariantOf.skuVariants.allVariantProducts[]` | `items[]` (name + ID; pricing only for current SKU) |

## Internal Properties Filter

The following property names are filtered out from attributes and specifications (existing `INTERNAL_PROPERTIES` set):

- `sellerId`
- `commercialConditionId`
- `cluster_highlights`
- `allSpecifications`
- `allSpecificationsGroups`

This filter applies to all three sources — ld+json `additionalProperty`, `__NEXT_DATA__` `specificationGroups`, and IS API `properties`.
