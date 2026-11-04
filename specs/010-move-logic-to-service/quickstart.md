# Quickstart: Move logic to service

Validates `@weni/webchat-template-react` on branch `010-move-logic-to-service`. The service is the Jest mock at `test/__mocks__/@weni/webchat-service.js`. Scenarios match [contracts/widget-service.md](./contracts/widget-service.md) and [data-model.md](./data-model.md).

## Prerequisites

- Node and npm
- Repository root: `webchat-react`
- `npm install`
- For the storefront scenarios, the mock implements `watchStorefront`, `setPendingCartItem`, `flushPendingCart`, and the storefront events
- For the voice scenarios, the mock implements `enterVoiceSession`, `exitVoiceSession`, and `voice:*`

## Storefront slice

```bash
npx prettier --write src/contexts/ChatContext.jsx src/contexts/OrderFormContext.jsx src/hooks/useConversationStarters.js
npm run lint
npm test -- --coverage --testPathPattern='(ChatContext|OrderFormContext|useConversationStarters)'
```

Expected:

- A mocked `storefront:changed` for a product page followed by `starters:received` renders the questions.
- A checkout event closes the chat. The test does not import `vtex.js`.
- A quantity change calls `setPendingCartItem`. `cart:failed` restores the previous quantity.
- `npm test -- --coverage` still meets 80% statements, branches, functions, and lines.
- `src/i18n/locales/pt.json`, `es.json`, and `ro.json` are not in the diff.

## Voice slice

```bash
npm test -- --coverage --testPathPattern='(useVoiceMode|VoiceMode)'
```

Expected:

- `voice:state` `listening` and `speaking` render those states.
- `voice:error` with `operation: "permission"` renders the denial state.
- A `voice:transcript` results in one `sendMessage` call.
- `src/services/voice/` is not imported by the hook under test.

## Host contract

```bash
npm test -- --coverage --testPathPattern='standalone'
```

Expected: existing `init` option names still initialize the widget. No new required option.
