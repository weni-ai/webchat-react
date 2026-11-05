# Contract: conversation starters debug log

Additive fields on `WebChat.getConversationStartersLog()`. See [data-model.md](../data-model.md).

## `config`

```json
{
  "conversationStarters": { "pdp": false },
  "connectOn": "mount",
  "shoppingAssistantDisabled": false,
  "unavailableProductNotify": true
}
```

`unavailableProductNotify` is a boolean, `true` only when the init option is strictly `true`. Existing keys stay.

## New skip event

| Field | Value |
|-------|--------|
| `phase` | `skip` |
| `detail.reason` | `starters_disabled` |
| `detail.fingerprint` | the `account:productPath` fingerprint of the resolution that just finished |

Emitted when the product was resolved, no back-in-stock offer was shown, and `conversationStarters.pdp` is off.

`skip` with `reason: 'pdp_disabled'` remains, now only when both `conversationStarters.pdp` and `unavailableProductNotify` are off.

## `init` event

`detail` gains `unavailableProductNotify` next to the existing `pdpEnabled`.
