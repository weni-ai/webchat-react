# Data Model: PDP Data Capture Priority & SKU-Specific Context

**Branch**: `005-pdp-data-capture` | **Date**: 2026-04-02

## Entities

### ProductData (for Conversation Starters)

Sent to `service.getStarters()`. Shape is **unchanged** by this feature.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `account` | `string` | Yes | VTEX account identifier |
| `linkText` | `string` | Yes | Product slug extracted from URL |
| `productName` | `string` | Yes | Product display name |
| `description` | `string` | No | Product description text |
| `brand` | `string` | No | Brand name |
| `attributes` | `Record<string, string>` | No | Filtered specification key-value pairs |

**Validation**: `isValidProductData` — requires `productName` and at least one of `description` or `brand`.

### NormalizedProduct (for context building)

Intermediate shape produced by `normalizeForContext()`. All three sources (ld+json, next-data, intelligent-search) normalize to this shape.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `productName` | `string` | Yes | Product display name |
| `brand` | `string` | No | Brand name |
| `productId` | `string` | No | Product group/catalog ID |
| `description` | `string` | No | Product description |
| `properties` | `Array<{name: string, values: string[]}>` | No | Specification properties |
| `items` | `Array<NormalizedSkuItem>` | No | All SKU variants (full list from source) |

### NormalizedSkuItem

Individual SKU within a normalized product.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemId` | `string` | Yes | SKU identifier |
| `nameComplete` | `string` | No | Full SKU name |
| `name` | `string` | No | Short SKU name |
| `sellers` | `Array<{commertialOffer: OfferData}>` | No | Seller/pricing data |
| `variations` | `Array<{name: string, values: string[]}>` | No | Variation attributes (e.g., Color, Size) |

### OfferData

| Field | Type | Description |
|-------|------|-------------|
| `Price` | `number` | SKU price |
| `AvailableQuantity` | `number` | Stock quantity (0 = unavailable) |

### SelectedSkuId (NEW)

Resolved exclusively from `ld+json`. Used to filter context.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `selectedSkuId` | `string \| null` | `ld+json` Product node `sku` or `productID` | The SKU ID the user is currently viewing. `null` when unresolvable. |

**Resolution logic**:
1. Call `findProductInLdJson()` to get the Product/ProductGroup node
2. Read `product.sku` — if truthy, return it
3. Read `product.productID` — if truthy, return it
4. Return `null` (SKU unknown)

**Constraint**: `__NEXT_DATA__` is **never** consulted for this value.

## Data Flow

```text
┌─────────────────────────────────────────────────────────┐
│                   detectAndFetchPdp()                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ resolveProductData(slug, account) ──────────────┐   │
│  │  1. extractFromNextData(slug)    → source: next-data │
│  │  2. fetchProductData(slug)       → source: IS API    │
│  │  3. extractFromLdJson(slug)      → source: ld+json   │
│  │  → returns { productData, rawProduct, source }       │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌─ getSelectedSkuIdFromLdJson() ───────────────────┐   │
│  │  findProductInLdJson() → sku || productID || null │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  service.getStarters(productData)                        │
│                          │                               │
│  normalizeForContext(rawProduct, source)                  │
│                          │                               │
│  buildProductContextString(normalized, selectedSkuId)     │
│    → if selectedSkuId: filter items to matching SKU      │
│    → if no match / null: omit SKU section                │
│                          │                               │
│  service.setContext(contextString)                        │
└─────────────────────────────────────────────────────────┘
```

## Source Data Shapes (reference)

### ld+json Product Node

```json
{
  "@type": "Product",
  "name": "Surface Go 3 Pentium 8GB 64GB",
  "description": "Compact Windows tablet.",
  "brand": { "name": "Microsoft" },
  "sku": "37",
  "productID": "37",
  "offers": {
    "offers": [{ "price": 399, "availability": "https://schema.org/InStock" }]
  },
  "additionalProperty": [
    { "name": "Storage", "value": "64GB" }
  ],
  "hasVariant": [
    { "name": "64GB variant", "sku": "37", "offers": { "offers": [...] } },
    { "name": "128GB variant", "sku": "38", "offers": { "offers": [...] } }
  ]
}
```

### window.__NEXT_DATA__ Product

```json
{
  "page": "/[slug]/p",
  "props": {
    "pageProps": {
      "data": {
        "product": {
          "name": "Surface Go 3 Pentium 8GB 64GB",
          "id": "37",
          "sku": "37",
          "description": "Compact Windows tablet.",
          "brand": { "name": "Microsoft" },
          "isVariantOf": {
            "name": "Surface Go 3",
            "productGroupID": "7",
            "skuVariants": {
              "allVariantProducts": [
                { "name": "64GB", "productID": "37" },
                { "name": "128GB", "productID": "38" }
              ]
            }
          },
          "offers": { "offers": [{ "price": 399, "quantity": 10000 }] },
          "customData": {
            "specificationGroups": [
              { "specifications": [{ "name": "Storage", "values": ["64GB"] }] }
            ]
          }
        }
      }
    }
  }
}
```

### Intelligent Search API Response

```json
{
  "products": [{
    "productName": "Surface Go 3",
    "linkText": "surface-go-3",
    "brand": "Microsoft",
    "description": "Compact Windows tablet.",
    "productId": "7",
    "properties": [{ "name": "Storage", "values": ["64GB", "128GB"] }],
    "items": [
      {
        "itemId": "37",
        "nameComplete": "Surface Go 3 64GB",
        "name": "64GB",
        "sellers": [{ "commertialOffer": { "Price": 399, "AvailableQuantity": 10 } }],
        "variations": [{ "name": "Storage", "values": ["64GB"] }]
      }
    ]
  }]
}
```
