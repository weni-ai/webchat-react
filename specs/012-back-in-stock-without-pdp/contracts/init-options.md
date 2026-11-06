# Contract: `unavailableProductNotify` without `conversationStarters.pdp`

Public `init` surface of this feature. Internal derivation is in [data-model.md](../data-model.md). The debug dump is in [conversation-starters-log.md](./conversation-starters-log.md).

## Options

No new option. Two existing booleans change how they combine.

| Name | Type | Default | Change |
|------|------|---------|--------|
| `unavailableProductNotify` | boolean | `false` | Product detection and the back-in-stock offer no longer require `conversationStarters.pdp: true`. |
| `conversationStarters.pdp` | boolean | unset / `false` | Controls PDP conversation starters only. It no longer gates product detection. |
| `shoppingAssistantDisabled` | boolean | `false` | Misconfiguration warning no longer requires `pdp`. |

## Combinations

| Config | Observable result |
|--------|-------------------|
| `unavailableProductNotify: true`, `pdp` absent or `false` | On an unavailable SKU, the back-in-stock bubble and form work. On an available SKU, `service.getStarters` is not called. |
| Both off | No product resolution. Same as today. |
| `pdp: true` | Same as today, with or without `unavailableProductNotify`. |
| `shoppingAssistantDisabled: true`, `unavailableProductNotify: true`, `pdp` off | Valid back-in-stock-only config. `init` does not warn. |
| `shoppingAssistantDisabled: true`, `unavailableProductNotify` off | `init` logs `console.warn('WebChat: shoppingAssistantDisabled needs unavailableProductNotify')`. |

Removed warning text (spec `011`): `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify and conversationStarters.pdp'`.

## Unchanged

`window.WebChat` method names, every other `init` option, CSS custom properties, `weni-` class names, and the `@weni/webchat-service` peer. Back-in-stock service calls stay as in spec `010`: `evaluateBackInStockOffer`, `validateBackInStockContact`, `subscribeBackInStock`.

## Version

Minor. Additive for `pdp: true` configs. Storefronts that already set `unavailableProductNotify: true` without `pdp` start seeing the offer; that is the intended meaning of the flag and must be named in the release notes.
