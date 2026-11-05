# Contract: widget calls into the linked service

The method, event, and body contract is webchat-service `specs/003-back-in-stock-to-service/contracts/back-in-stock-api.md`. This file records what this repo sends and what it does not change.

## Peer

`peerDependencies["@weni/webchat-service"]` stays `1.19.2`. No `dependencies` entry is added. Local override is `npm link`, described in `quickstart.md`.

## Calls

| Caller | Method | When |
|--------|--------|------|
| `src/hooks/useConversationStarters.js` | `evaluateBackInStockOffer` | PDP resolution finished and `unavailableProductNotify` is on |
| `src/views/BackInStockNotify.jsx` | `validateBackInStockContact` | Submit, before the request |
| `src/views/BackInStockNotify.jsx` | `subscribeBackInStock` | Validation returned `isValid` |

The widget does not pass `backInStock` init options. Defaults from the linked service apply. The widget does not listen for `backInStock:subscribed` or `backInStock:error`. The service emits those on its own. The view still shows success after a rejection.

## Removed widget exports

These are internal `src/utils` exports, not package exports. Removing them does not change `@weni/webchat-template-react`'s public API:

`isSelectedSkuAvailable`, `getSellerIdForSku`, `isValidInternationalNumber`, `buildAvailabilityNotifyBody`, `subscribeAvailabilityNotify`, `getNotifyLocale`, `digitsOnlyPhone`, `AVAILABILITY_NOTIFY_SUBSCRIBE_PATH`.

`getSalesChannel` remains, and its empty result becomes `null` instead of `'1'`.

## Unchanged public surface

`window.WebChat`, `init` options including `unavailableProductNotify`, `simulateUnavailableProduct`, `simulateBackInStockPage`, CSS custom properties, and `weni-` class names.

## Wire

The widget sends no subscribe HTTP request. The linked service POSTs `/_v/private/availability-notify/subscribe` with the body in the service contract. `globalThis.fetch` is not called from `BackInStockNotify`.
