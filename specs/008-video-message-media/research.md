# Research: Video message media

## Which field the player reads

- Decision: `src` is `message.media` when it is a non-empty string, otherwise `message.url`. If both are empty, do not pass `src`.
- Rationale: Image, audio, and file already play `message.media`. The service never sets `url`. The prop-type warning is `url` required and `undefined`. `MessageVideo` is exported, so dropping `url` would break an external caller.
- Alternatives considered: Map `media` to `url` in `MessagesList` (hides the real field and leaves the export broken). Require only `media` (breaking change).

## Blob URL versus waiting for the official link

- Decision: The component treats a `blob:` URL as a playable `src`. It does not create or revoke object URLs. When the service replaces `media` with the official `http(s)` link, the same element updates `src`.
- Rationale: The service owns the file and the object URL (`specs/002-persist-uploaded-media` in `webchat-service`). Creating a second blob from a data URL in the widget would copy the file and would require the data URL to sit on the message.
- Alternatives considered: Render the `<video>` only after `media` is `http:` or `https:` (nothing to play during the upload). Build the blob URL in `MessageVideo`.

## Test file type

- Decision: `src/components/Messages/MessageVideo.test.jsx`.
- Rationale: The testing standard requires a colocated `.test.jsx`. Jest is not set up for TypeScript (`TODO(TYPESCRIPT_TOOLCHAIN)`). `MessagesList.test.jsx` mocks `MessageVideo`, so it cannot see the `<video>` source.
- Alternatives considered: A `.ts` test that also adds the toolchain. Assertions only on the mocked list route.
