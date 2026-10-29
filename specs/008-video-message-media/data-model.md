# Data Model: Video message media

This repository does not persist the message. It renders the object the service passes through `MessagesList`.

## Video message (render input)

| Field | Required | Use |
|-------|----------|-----|
| `media` | no | Preferred player address. A `blob:` URL during upload, then the official `http(s)` link. |
| `url` | no | Legacy address used only when `media` is empty. |
| `type` | yes for routing | `video` selects this component in `MessagesList`. |
| `id` | yes on the list row | Unchanged. Keeps the row mounted when `media` changes. |
| `direction` | no | Bubble direction stays on `MessageContainer`. |
| `poster` | no | Passed through to the existing `<video poster>` when present. |
| `sender` | no | No longer required. Not used for the source. |

## Derived value

`videoSrc = non-empty message.media, otherwise non-empty message.url, otherwise omitted`.

## State transitions

None owned here. A rerender with the same `id` and a new `media` changes `src` from the blob URL to the official link. A message with neither address renders the existing fallback text and no `src`.

## Validation

The component does not check the URL scheme. Scheme checks stay in the service ack contract.
