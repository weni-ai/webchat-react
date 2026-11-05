# Data Model: Back-in-stock independent of `conversationStarters.pdp`

Nothing is stored for this feature. Offer fields stay in `useConversationStarters` (`isBackInStockNotify`, `notifySkuIdRef`, `notifySellerRef`).

## Init config

Owned by the host. Mapped in `mapConfig`. This feature does not add a field.

| Field | Type | Rule after this change |
|-------|------|------------------------|
| `unavailableProductNotify` | boolean | Default `false`. When `true`, product detection runs even if `conversationStarters.pdp` is off. |
| `conversationStarters.pdp` | boolean | Default unset/false. When `true`, product detection runs and starters are requested after an available SKU. When `false`, starters are never requested from this path. |
| `shoppingAssistantDisabled` | boolean | Unchanged meaning. The misconfiguration warning now depends only on `unavailableProductNotify`. |

`true` is a strict `=== true`. Absent, `false`, and any other value count as off.

## Derived detection rule

Computed from the two refs. Not stored.

| `conversationStarters.pdp` | `unavailableProductNotify` | `shouldResolveProduct` | After a resolved available SKU |
|----------------------------|----------------------------|------------------------|--------------------------------|
| false | false | false — skip `pdp_disabled`, no catalog read | n/a |
| false | true | true | skip `starters_disabled`, no `getStarters` |
| true | false | true | `requestStarters` (unless shopping assistant disabled) |
| true | true | true | offer if unavailable, else `requestStarters` |

## Offer lifecycle (`pdp` off, notify on)

1. Mount, account arrival, or SPA navigation calls `detectAndFetchPdp`.
2. Product resolution, `setContext`, and `evaluateBackInStockOffer` run as today.
3. Unavailable SKU → `showBackInStockNotify`. Opening lands on `back-in-stock-notify`.
4. Available SKU, failed resolution, or thrown evaluator → no offer, no starters.
5. Closing the chat does not clear the offer.
6. A pathname change clears the offer and evaluates the new page, because `applyNavigationChange` uses `shouldResolveProduct`.

## Debug log dump

Shape returned by `WebChat.getConversationStartersLog()`. Additive field only.

| Field | Type | Meaning |
|-------|------|---------|
| `config.conversationStarters.pdp` | boolean | Unchanged. |
| `config.connectOn` | string | Unchanged. |
| `config.shoppingAssistantDisabled` | boolean | Unchanged. |
| `config.unavailableProductNotify` | boolean | New. `true` when the init option is `true`. |

New skip detail: `reason: 'starters_disabled'` plus `fingerprint`.
