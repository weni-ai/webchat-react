# Quickstart: Back-in-stock logic and request in the service

Proves the widget against a linked local service. Shapes are in [contracts/widget-calls.md](./contracts/widget-calls.md). Service setup is webchat-service `specs/003-back-in-stock-to-service/quickstart.md`.

## Prerequisites

- The service repo has the feature implemented and `npm run build` has succeeded.
- This repo's dependencies are installed (`npm install`). Do not change the `1.19.2` peer.

## Link

```bash
cd /home/cris/Documents/webchat-service
npm run build
npm link

cd /home/cris/Documents/webchat-react
npm link @weni/webchat-service
```

Confirm the link, not the registry copy:

```bash
node --input-type=module -e "
import S from '@weni/webchat-service';
const names = ['evaluateBackInStockOffer', 'validateBackInStockContact', 'subscribeBackInStock'];
const missing = names.filter((name) => typeof S.prototype[name] !== 'function');
if (missing.length) { console.error(missing); process.exit(1); }
console.log('linked service ok');
"
```

Rebuild the service after each change there. The link reads `dist/`.

## Automated checks

```bash
npm test
npm run lint
```

Expected: the back-in-stock suites pass without calling `fetch`. Jest maps `@weni/webchat-service` to `test/__mocks__/@weni/webchat-service.js`, so this passes on a CI agent that has no link and still has peer `1.19.2`.

## Bundle

```bash
npm run build:standalone
```

Expected: `dist/webchat.umd.js` builds while the link is active. `npm run build` (the library build) may also be run; it leaves `@weni/webchat-service` external, so it does not prove the new methods are inside the widget bundle.

## Manual path

`npm run dev`, then use the existing "Simulate back in stock page" control.

1. Submit with an empty name. The existing "Complete this field" message shows, and the network panel has no request to `/_v/private/availability-notify/subscribe`.
2. Submit with a valid name and phone. One POST goes to that path. The body has `sku_id`, `phone`, `name`, `seller`, `sales_channel`, and `locale`. The success title shows.
3. Force the POST to fail (offline, or the service stub rejecting). The success title still shows, and the button does not stay on loading.

## Unlink

```bash
npm unlink @weni/webchat-service
npm install
```

That restores the registry `1.19.2`. The rewired widget then fails the offer call closed (starters instead of the bubble) until the link is restored. Revert the widget change to get today's behavior on `1.19.2`.
