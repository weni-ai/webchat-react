# Quickstart: Video message media

Validates [spec.md](./spec.md) against [data-model.md](./data-model.md) and [contracts/message-video.md](./contracts/message-video.md).

## Prerequisites

- Repository root of `webchat-react`
- `npm install`

## Run

```bash
npx prettier --write src/components/Messages/MessageVideo.jsx src/components/Messages/MessageVideo.test.jsx
npm test -- --testPathPattern='MessageVideo|MessagesList' --coverage
npm run lint
```

## Outcomes

- A message with `media: 'blob:http://localhost/preview-id'` renders a `video` whose `src` is that blob URL, with no missing-`url` prop-type failure.
- Rerendering that message with `media` set to an `https://` link updates `src`.
- A message with only `url` still renders that address.
- A message with neither address does not set `src` and does not throw.
- Existing `MessagesList` routing tests still pass. Image, audio, and file assertions are unchanged.

Manual check in the widget after the service pin bump: send a short video, confirm it plays from the blob URL before the ack, then from the official link after the ack, and confirm the quota warning does not appear. The pin bump is not part of this plan's test command.
