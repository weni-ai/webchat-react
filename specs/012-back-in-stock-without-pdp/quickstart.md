# Quickstart: Back-in-stock independent of `conversationStarters.pdp`

Proves `unavailableProductNotify` without `conversationStarters.pdp`. Options are in [contracts/init-options.md](./contracts/init-options.md). Log dump is in [contracts/conversation-starters-log.md](./conversation-starters-log.md).

## Prerequisites

- Dependencies installed (`npm install`).
- Unit tests mock `@weni/webchat-service` and VTEX product resolution. They do not need a live storefront.

## Automated checks

```bash
npx prettier --write <changed files>
npm run lint
npm run typecheck
npm test -- --coverage
```

Coverage stays at or above 80% for statements, branches, functions, and lines.

What the suites assert:

- `useConversationStarters.test.js`:
  - `unavailableProductNotify: true`, `conversationStarters.pdp` false, unavailable SKU → `isBackInStockNotify` true, CTA present, click opens `back-in-stock-notify` with product name and SKU.
  - Same config, available SKU, connected → `getStarters` never called. Same config, disconnected then `connected` → still no `getStarters`. Log has `skip` / `starters_disabled`.
  - Both flags off → `pdp_disabled` and `resolveProductData` not called.
  - Same notify-only config, pathname change → offer reset and `evaluateBackInStockOffer` called again.
  - Existing `pdp: true` cases still pass.
- `conversationStartersLog.test.js`: dump `config.unavailableProductNotify` reflects the config.
- `standalone.test.ts`: `shoppingAssistantDisabled: true` with `unavailableProductNotify: true` and no `pdp` does not warn. With notify off, warns once with `'WebChat: shoppingAssistantDisabled needs unavailableProductNotify'`.

## Manual path

In `src/index.jsx`, use a config shaped like this and run `npm run dev`:

```js
unavailableProductNotify: true,
// conversationStarters omitted or { pdp: false }
```

Keep `socketUrl` and `channelUuid` as in a normal assistant storefront.

1. Open a product page whose selected SKU is available. No starters bubble. `WebChat.getConversationStartersLog()` has `unavailableProductNotify: true`, `conversationStarters.pdp: false`, and a `skip` with `starters_disabled`.
2. Open an unavailable SKU. The back-in-stock bubble appears. Opening the chat lands on the form.
3. Navigate to another product. The previous offer clears. An unavailable SKU shows the bubble again; an available SKU does not request starters.

For the back-in-stock-only storefront (spec `011` plus this change):

```js
shoppingAssistantDisabled: true,
unavailableProductNotify: true,
// no conversationStarters.pdp
```

`init` must not warn. An unavailable SKU still shows the bubble and form.

`npm run build:standalone` is the bundle to load on a storefront.
