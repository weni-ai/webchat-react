# Contract: widget subscription

This package is the consumer of `webchat-service` `specs/003-move-logic-to-service/contracts/`. It does not define a new host-page API.

## Host page

`window.WebChat.init` options, `setConversationStarters`, `setThinkingText`, documented CSS custom properties, and `weni-` class names are unchanged. No option is added to opt into the service-owned rules. The peer dependency is the switch.

## Calls this package makes

Storefront release:

- `watchStorefront()` once from `ChatProvider` after `init`
- `setPendingCartItem` and `flushPendingCart` from `OrderFormProvider`
- `requestAvailabilityNotify` from the back-in-stock view

Voice release:

- `enterVoiceSession` and `exitVoiceSession` from the voice control path that `ChatContext` owns today
- `sendMessage` with the `voice:transcript` text
- `speakIncomingText` for incoming assistant text that voice mode already forwards

## Events this package renders

| Event | UI result |
|-------|-----------|
| `storefront:changed` | Starter hook refreshes product identity. No starters on a non-product snapshot. |
| `starters:received` / `starters:error` | Questions render, or the existing error state shows. |
| `storefront:entered-checkout` | Chat closes. |
| `cart:updated` / `cart:failed` | Quantities commit or roll back. |
| `voice:state` / `voice:error` | `VoiceMode` shows listening, speaking, or the permission error. |

## Removed modules

After the matching peer bump, these paths are not imported anywhere:

- `src/utils/vtex.js`
- `src/utils/vtexCustomFields.js`
- `src/utils/sendVtexUtm.js`
- `src/utils/VTEXIOMinicartBridge.js`
- `src/utils/faststoreBootstrap.js`
- `src/utils/availabilityNotify.js`
- `src/services/voice/`

`src/utils/navigationMonitor.js` is removed with the storefront release if nothing outside checkout detection still imports it. If a view still needs a URL listener for chrome only, that import stays and is named in the pull request.
