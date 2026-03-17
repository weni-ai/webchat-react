# Data Model: PDP Conversation Starters

**Branch**: `003-pdp-conversation-starters` | **Date**: 2026-03-14

## Entities

### ConversationStartersState

Central state for the conversation starters feature. Managed in `ChatContext` or a dedicated hook.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `questions` | `string[]` | `[]` | Current list of 1–3 starter questions |
| `source` | `'pdp' \| 'manual' \| null` | `null` | Origin of current starters |
| `fingerprint` | `string \| null` | `null` | `account:linkText` for PDP starters; `null` for manual |
| `isLoading` | `boolean` | `false` | Whether a starters request is in-flight |
| `isCompactVisible` | `boolean` | `false` | Whether compact (floating) variant is visible |
| `isDismissed` | `boolean` | `false` | Whether starters were dismissed (user clicked one) |

**State transitions**:

```
IDLE → LOADING (PDP detected or manual API called)
LOADING → ACTIVE (starters received)
LOADING → IDLE (error received or navigation away)
ACTIVE → DISMISSED (user clicks a starter)
ACTIVE → IDLE (navigation to non-PDP)
ACTIVE → LOADING (navigation to different PDP)
DISMISSED → LOADING (navigation to different PDP)
```

### ProductData

Extracted from VTEX Intelligent Search API for starters generation. Matches `StartersData` interface from `@weni/webchat-service`.

| Field | Type | Required | Source |
|-------|------|----------|--------|
| `account` | `string` | Yes | `window.__RUNTIME__?.account \|\| hostname.split('.')[0]` |
| `linkText` | `string` | Yes | `product.linkText` |
| `productId` | `string` | No | `product.productId` |
| `productName` | `string` | No | `product.productName` |
| `description` | `string` | No | `product.description` |
| `brand` | `string` | No | `product.brand` |
| `attributes` | `Record<string, string>` | No | `product.properties` (filtered) |

### SKUContext

Information about the currently selected SKU variant. Serialized as a natural-language string for `service.setContext()`.

| Field | Type | Source |
|-------|------|--------|
| `productName` | `string` | `product.productName` |
| `brand` | `string` | `product.brand` |
| `skuName` | `string` | `selectedItem.name` or `selectedItem.nameComplete` |
| `price` | `number` | `selectedItem.sellers[0].commertialOffer.Price` |
| `listPrice` | `number` | `selectedItem.sellers[0].commertialOffer.ListPrice` |
| `availability` | `boolean` | `selectedItem.sellers[0].commertialOffer.AvailableQuantity > 0` |
| `imageUrl` | `string` | `selectedItem.images[0].imageUrl` |
| `specifications` | `Record<string, string>` | From SKU-level variations |

**Context serialization**: Converted to a formatted string for the AI:

```
Product: iPad 10th Gen
Brand: Apple
Selected variant: Blue, 256GB
Price: R$ 3.999,00
List price: R$ 4.499,00
Availability: In stock
Image: https://store.vteximg.com.br/.../ipad-blue.jpg
Specifications:
- Storage: 256GB
- Color: Blue
```

### VTEXProductResponse

Shape of the VTEX Intelligent Search API response (relevant fields only).

| Field | Type | Description |
|-------|------|-------------|
| `products` | `Product[]` | Array of matched products |
| `products[].linkText` | `string` | Product slug |
| `products[].productId` | `string` | Numeric product ID |
| `products[].productName` | `string` | Product name |
| `products[].description` | `string` | Product description |
| `products[].brand` | `string` | Brand name |
| `products[].properties` | `PropertyEntry[]` | Product-level properties |
| `products[].items` | `SKUItem[]` | Array of SKU items |

**PropertyEntry**:

| Field | Type |
|-------|------|
| `name` | `string` |
| `values` | `string[]` |

**SKUItem**:

| Field | Type |
|-------|------|
| `itemId` | `string` |
| `name` | `string` |
| `nameComplete` | `string` |
| `images` | `{ imageUrl: string }[]` |
| `sellers` | `Seller[]` |
| `variations` | `{ name: string, values: string[] }[]` |

### NavigationEvent

Represents a detected SPA navigation.

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | New page URL |
| `isPDP` | `boolean` | Whether the new page matches the PDP pattern |
| `slug` | `string \| null` | Extracted product slug if PDP |

## Relationships

```
ConversationStartersState
  ├── has ProductData (for PDP source, used to call service.getStarters)
  ├── has SKUContext (set as service context on PDP)
  └── observes NavigationEvent (triggers state transitions)

ProductData
  ├── extracted from VTEXProductResponse
  └── sent to service.getStarters()

SKUContext
  ├── extracted from VTEXProductResponse.products[].items[]
  └── sent to service.setContext()

VTEXProductResponse
  ├── fetched from VTEX Intelligent Search API
  └── contains ProductData + SKUContext data
```

## Internal Properties Filter

Properties excluded from `attributes` when building `ProductData`:

| Property name | Reason |
|---------------|--------|
| `sellerId` | Internal VTEX field |
| `commercialConditionId` | Internal VTEX field |
| `cluster_highlights` | Internal VTEX field |
| `allSpecifications` | Meta-property listing all spec names |
| `allSpecificationsGroups` | Meta-property listing all spec group names |
