# Engineering Specification: Video message media

**Repository**: webchat-react — frontend

**Feature Branch**: `008-video-message-media`

**Created**: 2026-10-29

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: A video message does not play. The player requires `message.url`, and the message never has that field, so the console reports that `url` is missing and the player has no address. The playable address is `message.media`, which image, audio, and file messages already use.
- Acceptance criteria:
  - A video message with `media` set renders a player whose source is that address, and the console does not warn that `message.url` is missing.
  - While the upload is in progress, a video whose `media` is a blob URL plays from that blob URL.
  - When `media` changes from that blob URL to the official uploaded link, the player source becomes the official link.
  - A caller that still passes `url` and not `media` still gets a player with that address.
  - Image, audio, and file messages keep rendering from `media` as they do today.

## Scope in This Repository

**This repository implements**: `MessageVideo` reads the playable address from the message the service already emits. It prefers `media`, and falls back to `url` so the exported component stays compatible.

**Out of scope here**:

- Browser storage, the quota warning, and replacing the base64 payload with the uploaded link. Those belong to `@weni/webchat-service`. This widget does not write the conversation to storage; `ChatContext` only forwards `sendAttachment` to the service. The stack `ChatContext.jsx` → `StorageManager: Quota exceeded` is the service save, specified in `webchat-service` `specs/002-persist-uploaded-media`.
- Video captions, poster frames, and new player controls. `MessageVideo` stays a native `<video controls>` element.
- Changing image, audio, or document components. They already use `message.media`.

**Depends on**: `@weni/webchat-service` putting the playable address on `message.media`. Until the official uploaded link arrives, that address is a temporary `blob:` URL created from the file, so this player can play it during the upload. After the socket acknowledgement, `media` becomes the official `http(s)` link. No peer-dependency bump is required for the player to stop reading `url`. The blob URL and the quota fix need the service patch and a later pin bump, and that bump is not part of this spec.

## Current State

- `src/components/Messages/MessageVideo.jsx` — `<video src={message.url}>`. PropTypes require `message.url` and `message.sender`. The service message has `media` and `direction`, so `url` is `undefined` and React warns `The prop message.url is marked as required in MessageVideo, but its value is undefined`.
- `src/components/Messages/MessageImage.jsx`, `MessageAudio.jsx`, `MessageDocument.jsx` — the source or href is `message.media`.
- `src/components/Messages/MessagesList.jsx` — `message.type === 'video'` renders `MessageVideo` inside `MessageContainer`. The container already carries direction. There is no `MessageVideo` test file. `MessagesList.test.jsx` only checks that the video type routes to the mocked component.
- `src/index.js` — exports `MessageVideo` as part of the package public API.
- `src/contexts/ChatContext.jsx` — `sendAttachment` delegates to `service.sendAttachment`. It does not persist messages.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/components/Messages/MessageVideo.jsx` | modified | Player source is `message.media`, with `message.url` only as a fallback. |
| `src/components/Messages/MessageVideo.test.jsx` | added | Asserts the player source for `media`, for a later `media` update, and for a legacy `url`. |

### Flow

1. `MessagesList` still routes `type: "video"` to `MessageVideo` with the service message.
2. The component sets the video source to `message.media` when that string is non-empty, otherwise `message.url`.
3. PropTypes require the message object, and treat `media` and `url` as optional strings. They no longer require `url` or `sender`. `direction` stays optional because the bubble chrome is `MessageContainer`.
4. While `media` is a `blob:` URL, the video element plays that preview. When the service replaces it with the official uploaded link, the same element receives the new `src`. This component does not create or revoke the blob URL.
5. If neither address is present, the component does not set `src` to `undefined`; it renders the existing unsupported-video fallback without a source, and it does not warn for a missing `url`.

### Rejected Alternatives

- Mapping `media` onto `url` in `MessagesList` before render: image, audio, and file already read `media` on the message. A video-only alias hides the field the rest of the list uses and leaves the exported `MessageVideo` broken for other callers.
- Waiting to render until `media` is an `http(s)` URL: the service preview is a blob URL so the shopper can play the video while the upload is still in progress. The player follows `media` as it changes.
- Creating the blob URL in this component from a data URL: the service owns the file bytes and the object URL. Building a second blob here would copy the file and would still require the data URL this change is trying to keep off the message.
- Dropping support for `url`: `MessageVideo` is exported. Requiring only `media` would break a caller that still passes `url`.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| `MessageVideo` `message.url` | modified (no longer required) | patch | yes — still used when `media` is absent |
| `MessageVideo` `message.media` | added as the preferred source | patch | yes — new optional field; existing `url` callers still play |
| `MessageVideo` `message.sender` | modified (no longer required) | patch | yes — the prop may still be passed and is ignored for behavior |
| Package exports and `window.WebChat` | unchanged | none | yes |

**Consumers affected**: the widget itself and any host that imports `MessageVideo` from `@weni/webchat-template-react`. No deprecation period: `url` remains a working fallback. Changelog lists the fix under Fixed.

## Non-Functional Requirements

### Peak Load

One shopper session on a campaign day, with a history page of 20 messages and one video playing at a time. The player follows a single `media` address; it does not fetch or store the file itself.

### Observability

No new log. The change removes the `message.url` prop-type warning. Playback errors stay on the native video element. No media URL or message content is logged.

### Failure Handling

A missing `media` and a missing `url` render the fallback text and no source. A later `media` value attaches the source without remounting the message row (the row key stays `message.id`). The widget does not retry uploads and does not write storage. There is no new timeout.

### Security and Authorization

`media` and `url` are the same address the service already hands to image and audio. This component does not fetch them itself and does not add a store. No new trust boundary and no new secret. The native video element loads the URL the service accepted.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| Video with `media` plays that address and does not warn about `url` | `MessageVideo.test.jsx`: render a message `{ type: 'video', media: 'https://example.com/clip.mp4', direction: 'outgoing' }` and expect the `video` element's `src` to be that URL. Prop-type failure fails the test. |
| A blob URL plays while the official link is not available yet | Render `{ media: 'blob:http://localhost/preview-id' }` and expect the `video` element's `src` to be that blob URL. |
| Source follows `media` from the blob URL to the official link | Rerender the same message id with `media` changed to `https://example.com/clip.mp4` and expect `src` to update. |
| Legacy `url` still plays | Render `{ url: 'https://example.com/legacy.mp4' }` without `media` and expect that `src`. |
| Image, audio, and file are unchanged | Existing `MessagesList` routing tests stay as they are. No assertion is weakened. |

**Flow coverage**: `Message` routing for `video` already mounts `MessageVideo`. The new test mounts `MessageVideo` with the message shape the list passes through, including a rerender that stands in for the service ack.

**Failure paths covered**: message with neither `media` nor `url` does not set a source and does not throw.

**Stubbed at the boundary**: no network and no `@weni/webchat-service`. The test renders the component with a plain message object.

## Rollout and Rollback

Ship with the widget release. No feature flag. Binding `src` to `media` is useful before the service patch, because today's `media` is the data URL and the element can play it. Playback from a blob URL during the upload, and the quota fix, require the service release in `specs/002-persist-uploaded-media` and a pin bump of `@weni/webchat-service`. That bump is a follow-up, not this change.

Rollback is the previous widget bundle. Stored sessions are untouched by this repository.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| I. Version Control and Review | Change enters through a pull request with lint and the coverage gate. | none |
| III. Observability | No new console output and no media logged. The prop-type warning goes away. | none |
| IV. Versioned Contracts | Patch. `url` remains a fallback. Exports are unchanged. | none |
| V. Specification Traceability & No Silent Divergence | Opens with Origin Without Product Spec. | none |
| VIII. Type Safety | Bug fix in the existing `MessageVideo.jsx`, with prop-types kept. | The new test file is `MessageVideo.test.jsx`, not TypeScript. The testing standard requires a colocated `.test.jsx`, and the TypeScript toolchain is not configured (`TODO(TYPESCRIPT_TOOLCHAIN)`). A TypeScript test would force that toolchain into this bug fix. |
| XII. Component Architecture | Behavior stays inside `MessageVideo`. The list keeps routing by type. | none |
| XIV. State Management | The widget does not copy `media` into storage or into a second context. It renders the service message. | none |
| XV. Async State Correctness | The player source tracks `media` from the temporary blob URL to the official uploaded link. | none |
| Testing | New colocated test covers the bug, the update, the legacy prop, and the empty address. | none |
| Internationalization | No new user-facing string. The existing unsupported-video fallback stays as it is. | none |

## Implementation Decisions

- **`media` wins over `url`**: the service field is `media`. `url` is only the legacy prop on the exported component.
- **Do not persist in this repository**: the quota bug is the service writing the data URL. This spec does not create the blob URL, revoke it, or write storage. It plays whatever `media` the service sets.
- **Blob URL is the in-progress address**: a `blob:` value is a real player source, not a placeholder to hide. The official link is whatever `http(s)` address replaces it.
- **Native video element stays**: the defect is the missing source, not the player chrome.
