# Contract: `shoppingAssistantDisabled` init option

Public surface of this feature. Shapes used internally are in [data-model.md](../data-model.md).

## Option

| Name | Type | Default | Where it is accepted |
|------|------|---------|----------------------|
| `shoppingAssistantDisabled` | boolean | `false` | `WebChat.init` params and the `config` prop of `Widget` / `ChatProvider` |

`false` and omission keep today's behavior, including the requirement for `socketUrl` and `channelUuid`.

## When it is `true`

Required from the host, or the widget warns and never shows anything:

- `unavailableProductNotify: true`
- `conversationStarters: { pdp: true }`

No longer required:

- `socketUrl`
- `channelUuid`

Ignored:

- `connectOn` (forced to `'manual'`)
- `embedded` and `startFullScreen` at startup (the chat starts closed)
- `initPayload` (not sent)
- `tooltipMessage` (not shown)

`WebChat.send` and `WebChat.setConversationStarters` return without calling the service and log `console.warn('WebChat.<method>: shopping assistant is disabled')`.

`init` logs `console.warn('WebChat: shoppingAssistantDisabled needs unavailableProductNotify and conversationStarters.pdp')` when either flag is off.

## Unchanged

`window.WebChat` method names, every other `init` option, CSS custom properties, `weni-` class names, and the `@weni/webchat-service` peer `1.19.2`.

The back-in-stock calls stay as in spec `010`: `evaluateBackInStockOffer`, `validateBackInStockContact`, `subscribeBackInStock`. This mode does not add a socket call and does not change the subscribe request.

## Version

Minor. Additive option, and the two connection fields become optional only in the new mode.
