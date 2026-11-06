# Data Model: Back-in-stock only mode

Nothing is stored for this feature. The service may still write its existing render-decision key, `weni:webchat:session:<channelUuid>:render`, using the placeholder channel id when the host passed none. That key is the service's, and it clears it when `renderPercentage` is 0 or 100.

## Init config

Owned by the host. Mapped in `mapConfig` and merged with `defaultConfig` in `ChatProvider`.

| Field | Type | Rule |
|-------|------|------|
| `shoppingAssistantDisabled` | boolean | Default `false`. `true` selects this mode. |
| `unavailableProductNotify` | boolean | Still required for the offer. The mode does not turn it on. |
| `conversationStarters.pdp` | boolean | Still required for PDP detection. The mode does not turn it on. |
| `socketUrl` | string, optional in this mode | Kept when it is a non-empty string. Otherwise the placeholder. |
| `channelUuid` | string, optional in this mode | Kept when it is a non-empty string. Otherwise the placeholder. |
| `connectOn` | `'mount' \| 'manual' \| 'demand'` | Forced to `'manual'` in this mode, whatever the host passed. |
| `embedded`, `startFullScreen` | boolean | Ignored at startup in this mode. The chat starts closed. |

## Derived service config

Produced by `applyShoppingAssistantMode`. This is the object passed to `WeniWebchatService`.

| Field | When the mode is off | When the mode is on |
|-------|----------------------|---------------------|
| `shoppingAssistantDisabled` | `false` | `true` |
| `socketUrl` | host value | host value, or `wss://shopping-assistant-disabled.invalid` |
| `channelUuid` | host value | host value, or `shopping-assistant-disabled` |
| `connectOn` | host value, default `'mount'` | `'manual'` |

A second call with the result of the first returns the same object. Empty strings count as missing.

## Widget visibility

Derived in `WidgetContent`. Not stored.

| State | What renders |
|-------|----------------|
| Mode off | Today's widget. |
| Mode on, no offer, chat closed | Nothing. Providers stay mounted. |
| Mode on, offer active, chat closed | Back-in-stock bubble and launcher. No opt-in balloon. |
| Mode on, chat open on `back-in-stock-notify` | Header, form or reduced success. No connection banner, no input. |
| Mode on, chat open with any other page | Treated as invalid. Nothing is rendered, and the hook closes the chat. |

## Offer lifecycle

The offer state stays in `useConversationStarters` (`isBackInStockNotify`, `notifySkuIdRef`, `notifySellerRef`). This mode adds no field.

1. PDP resolution and `evaluateBackInStockOffer` set the offer, as today.
2. An available SKU, a non-PDP page, a failed resolution, or a thrown evaluator leaves the offer unset. `requestStarters` is not called.
3. Closing the chat does not clear the offer.
4. A pathname change clears the offer, closes the chat, and evaluates the new page.
