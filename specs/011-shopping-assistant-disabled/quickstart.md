# Quickstart: Back-in-stock only mode

Proves `shoppingAssistantDisabled`. The option is in [contracts/init-options.md](./contracts/init-options.md).

## Prerequisites

- Dependencies installed (`npm install`).
- The linked `@weni/webchat-service` from spec `010`, if you walk the form against a real subscribe route. Unit tests mock the service and do not need the link.

## Automated checks

```bash
npx prettier --write <changed files>
npm run lint
npm run typecheck
npm test -- --coverage
```

`typecheck` is `tsc --noEmit`. Coverage stays at or above 80% for statements, branches, functions, and lines. The new file `src/utils/shoppingAssistantMode.ts` is included.

What the suites assert:

- `shoppingAssistantMode.test.ts`: missing connection values become the placeholders, a host-provided `channelUuid` is kept, `connectOn` becomes `'manual'`, and a second call changes nothing. The flag off returns the config unchanged.
- `Widget.test.jsx`: with the flag and no connection values, the mocked service is constructed and `connect` is not called. Nothing renders until the offer is active. No opt-in balloon.
- `Chat.test.jsx`: no connection banner and no input while the flag is on.
- `BackInStockNotify.test.jsx` and `Header.test.jsx`: "Not now" and back close the chat. The success state has no similar-products action.
- `useConversationStarters.test.js`: no `getStarters` call, and a pathname change closes an open chat.
- `standalone.test.ts`: `init` with the flag does not throw without connection values. `send` and `setConversationStarters` warn and do not reach the service.

## Manual path

In `src/index.jsx`, use a config shaped like this and run `npm run dev`:

```js
shoppingAssistantDisabled: true,
unavailableProductNotify: true,
conversationStarters: { pdp: true },
```

Leave `socketUrl` and `channelUuid` unset.

1. Open the dev page. The launcher is absent. The browser's Network panel has no WebSocket.
2. On a product page whose selected SKU is available, the launcher stays absent.
3. On an unavailable SKU, the back-in-stock bubble and the launcher appear.
4. Open the chat. The form shows. The connection banner and the message field do not.
5. Submit a valid name and phone. The success title shows, without "Show me similar products". No message is sent.
6. "Not now", the back button, and the close button each close the chat. The bubble remains.
7. Navigate to another product. The bubble clears. The chat closes if it was open.

`npm run build:standalone` is the build to load on a storefront. The library build leaves the service external, so it is not the check for the socket.
