# Research: PDP Data Capture Priority & SKU-Specific Context

**Branch**: `005-pdp-data-capture` | **Date**: 2026-04-02

## R1: Data Source Priority Reorder for Conversation Starters

**Decision**: Change `resolveProductData` waterfall from `ld+json → __NEXT_DATA__ → Intelligent Search` to `__NEXT_DATA__ → Intelligent Search → ld+json`.

**Rationale**: `__NEXT_DATA__` provides the richest product data on FastStore pages (including variant information, specification groups, and structured pricing). Intelligent Search provides normalized catalog data through a network call but is reliable when available. `ld+json` is the most universally present (works on both legacy and FastStore) but often has less structured data (no specification groups, limited variant info). Prioritizing `__NEXT_DATA__` first avoids unnecessary network calls on FastStore stores.

**Alternatives considered**:
- Keep current order (`ld+json` first): Rejected because `ld+json` often lacks specification groups and detailed variant data that improve question quality.
- `Intelligent Search → __NEXT_DATA__ → ld+json`: Rejected because it would always make a network call even when local data is available.
- Parallel extraction with merge: Rejected due to complexity; waterfall with first-valid-wins is simpler and sufficient.

**Implementation impact**: Single function change in `resolveProductData` — swap the order of `extractFromNextData` and `extractFromLdJson` calls, and move `extractFromLdJson` after `fetchProductData`.

---

## R2: SKU Resolution Exclusively from ld+json

**Decision**: Resolve the currently selected SKU ID only from `ld+json` structured data. Never use `__NEXT_DATA__` for SKU identification.

**Rationale**: `ld+json` Product nodes typically include a `sku` or `productID` field that reflects the specific variant being viewed. This structured data standard is present across VTEX storefronts (both legacy Portal/CMS and FastStore). Using a single source eliminates ambiguity about which source takes precedence and simplifies the resolution logic.

**Alternatives considered**:
- `__NEXT_DATA__` first, `ld+json` fallback: Rejected by the user — they want `ld+json` as the sole source of truth.
- Both sources with precedence: Rejected — adds complexity with no clear benefit. A single source is more predictable.
- SKU from URL `?skuId=` query parameter: Not available on all VTEX storefronts; inconsistent presence.

**Implementation impact**: New function `getSelectedSkuIdFromLdJson()` that calls existing `findProductInLdJson()` and extracts `sku` or `productID`. Called independently from the product data waterfall.

---

## R3: Single-SKU Context Instead of Multi-SKU

**Decision**: Replace the current multi-SKU context (up to 5 SKUs) with either a single matched SKU or no SKU section at all.

**Rationale**: Sending up to 5 SKUs creates noise in the AI context. The user is viewing a specific variant — only that variant's details (price, availability, name, variations) are relevant for the assistant to answer questions accurately.

**Alternatives considered**:
- Keep multi-SKU but highlight the selected one: Rejected — still adds noise; simpler to include only the relevant SKU.
- Send all SKUs but limit to 3: Rejected — doesn't solve the core problem of context noise.
- No SKU info at all: Rejected — losing price and availability info would reduce assistant quality.

**Implementation impact**: Modify `buildProductContextString` to accept an optional `selectedSkuId` parameter. When provided, filter `items` to the matching item. When not provided (or no match), omit the SKU section entirely. Update the header from "Available SKUs (showing N of M)" to "Selected SKU:" when a single SKU is present.

---

## R4: Decoupling Product Data Source from SKU Resolution

**Decision**: SKU resolution (`getSelectedSkuIdFromLdJson`) runs independently of the product data waterfall (`resolveProductData`). The SKU ID is used to filter the normalized product's `items` array regardless of which source provided the product data.

**Rationale**: The waterfall determines which source provides the *product-level* data (name, brand, description, attributes) for question generation. The SKU resolution determines *which variant* the user is viewing for context. These are two orthogonal concerns.

**Alternatives considered**:
- Embed SKU resolution inside each waterfall step: Rejected — duplicates logic and couples concerns.
- Return SKU ID from `resolveProductData`: Rejected — violates single responsibility. `resolveProductData` is about product data, not SKU selection.

**Implementation impact**: In `useConversationStarters.js` `detectAndFetchPdp`, call `getSelectedSkuIdFromLdJson()` separately from `resolveProductData()`. Pass the SKU ID to a modified `buildProductContextString(normalized, selectedSkuId)`.

---

## R5: Context String Format for Single SKU

**Decision**: When a selected SKU is identified, the context string shows:
```
Product: {name}
Brand: {brand}
Product ID: {productId}
Description: {description}
Attributes: {key: value | ...}

Selected SKU:
- SKU {itemId}: {name} ({variations}) | Price: {price} | Available|Unavailable
```

When no SKU is identified:
```
Product: {name}
Brand: {brand}
Product ID: {productId}
Description: {description}
Attributes: {key: value | ...}
```

**Rationale**: Maintains backward compatibility in the product-level section. The SKU section uses the existing `formatSkuLine` function for consistency. The header changes from "Available SKUs (showing N of M)" to "Selected SKU:" to clearly indicate a single variant.

**Alternatives considered**:
- Inline SKU fields (e.g., "Current Price: 399"): Rejected — loses the SKU ID and variation info.
- JSON format for context: Rejected — the existing multi-line format is already established.

**Implementation impact**: Modify `buildProductContextString` to accept `selectedSkuId`, filter items, and adjust the header text.
