# Engineering Specification: Image message caption

**Repository**: webchat-react — frontend

**Feature Branch**: `006-image-caption`

**Created**: 2026-10-29

**Status**: Draft

## Origin Without Product Spec

- Product Spec: none
- Problem: An incoming image message can include an optional caption. The widget shows the image and uses the caption only as the image alternative text, so the shopper never sees the caption in the bubble.
- Acceptance criteria:
  - When an image message has a non-blank caption, the shopper sees the image and, directly under it in the same image message, the caption rendered with the same formatting as a text message (markdown, links, line breaks), sanitized before it reaches the page.
  - When the caption is missing, empty, or only whitespace, the bubble stays image-only, as it does today.
  - The image remains openable in a new tab. The caption is not part of that link.
  - A non-blank caption is still the image alternative text; otherwise the alternative text stays "Image".
  - Video and document messages are unchanged.

## Scope in This Repository

**This repository implements**: A visible caption inside the image message bubble for messages `@weni/webchat-service` already normalizes with `type: "image"`, `media`, and an optional `caption`.

**Out of scope here**:

- Normalizing the socket payload (`media_url` to `media`, copying `caption`). Owned by `@weni/webchat-service`, and already implemented in `MessageProcessor._normalizeMessage`.
- Video captions (existing TODO on the video message), document labels, list messages, and call-to-action blocks attached to images.
- The socket timestamp location (`message.timestamp` versus the envelope timestamp).

**Depends on**: `@weni/webchat-service` continuing to set `message.media` from `media_url` and `message.caption` only when `caption` is a string. No peer-dependency bump.

## Current State

- `src/components/Messages/MessagesList.jsx` — `Message` routes `message.type === "image"` to `MessageImage`. The switch stays as it is.
- `src/components/Messages/MessageImage.jsx` — renders a new-tab link around the image. `message.caption` is the `alt` text only (`caption` or `"Image"`).
- `src/components/Messages/MessageImage.scss` — sizes the image; it has no caption layout.
- `src/components/Messages/MessageText.jsx` — renders `message.text` as sanitized markdown, including a streaming caret. Image captions are not streamed and must not go through `useStreamingBuffer`.
- `src/components/Messages/MessageText.scss` — typography for `.weni-message-text` and `.weni-message-text--incoming` / `--outgoing`.
- `src/utils/sanitizeHtml.js` — the only allowed HTML sanitizer for message content.
- `src/components/Messages/MessageImage.test.jsx` — covers image rendering, alt text, and the new-tab link. It does not assert a visible caption.

## Technical Approach

### Components Affected

| Component | Change | Why |
|-----------|--------|-----|
| `src/components/Messages/MessageImage.jsx` | modified | Render an optional caption under the image, inside this component. |
| `src/components/Messages/MessageImage.scss` | modified | Stack the image above the caption inside the same bubble. |
| `src/components/Messages/MessageImage.test.jsx` | modified | Cover caption present, blank, absent, and unsafe HTML. |
| `src/components/Messages/MessageText.jsx` | unchanged | The caption reuses the same markdown-plus-sanitize pipeline and the text-message classes. It does not mount `MessageText`, which owns streaming and text-only attachments. |

### Flow

1. The service delivers an image message with `media` and, when the socket sent a string, `caption`.
2. `MessagesList` still selects `MessageImage`.
3. `MessageImage` always renders the image link (`href={message.media}`, `target="_blank"`, `rel="noopener noreferrer"`).
4. If `caption` trims to a non-empty string, the component parses it with the same markdown settings as text messages (`breaks: true`), sanitizes the HTML with `sanitizeHtml`, and renders it under the image with `weni-message-text` and `weni-message-text--${message.direction}`.
5. If `caption` is missing or blank, that block is omitted. Alternative text is the trimmed caption when non-blank, otherwise `"Image"`.

### Rejected Alternatives

- Mounting `MessageText` under the image: it expects `message.text`, runs the streaming buffer, and can append list or call-to-action UI that does not belong on an image caption.
- Putting the caption inside the image link: a caption with its own links cannot sit inside the outer image anchor, and selecting the caption must not open the image.

## Contracts

| Interface | Change | Version impact | Backward compatible |
|-----------|--------|----------------|---------------------|
| Normalized image message `{ type, media, caption? }` consumed from `@weni/webchat-service` | unchanged | none | yes |
| `MessageImage` props | unchanged; `caption` remains optional | none | yes |
| Package exports, `window.WebChat`, CSS custom properties, and `weni-` class names host pages may override | unchanged. The caption reuses existing `weni-message-text` classes. | none | yes |

**Consumers affected**: none. Host pages are not notified.

## Non-Functional Requirements

### Peak Load

No new requests. Caption parsing happens when the message list renders, once per captioned image. A seasonal sales peak produces the same volume of image messages the widget already renders; the added work is one markdown parse of a short string per captioned image.

### Observability

No new logs. Do not log caption text or media URLs. A markdown parse failure must not throw out of the message list: render the image and omit the caption body.

### Failure Handling

The image request is unchanged. A broken `media` URL shows the browser broken-image state and still shows the caption when one exists. There is no network call, timeout, or retry for the caption; it is already on the message. Parsing is local and idempotent: the same caption string always produces the same sanitized HTML.

### Security and Authorization

`caption` crosses the trust boundary from the socket into the host page. Render it only after `sanitizeHtml` (DOMPurify), the same gate as text messages. Do not interpolate the raw caption into HTML. This repository does not authorize the message; it only displays what the service already delivered. The image link keeps `rel="noopener noreferrer"`.

## Test Strategy

| Success / acceptance criterion | How this repository proves it |
|--------------------------------|-------------------------------|
| Non-blank caption is visible under the image with text-message formatting | `MessageImage.test.jsx`: render a caption that includes a line break and a link. Assert the caption text is in the document, the link is present, and the image is the first content. |
| Missing, empty, or whitespace-only caption leaves an image-only bubble | Three cases: omit `caption`, `""`, and `"   "`. Assert no caption node. |
| Image still opens in a new tab and the caption is outside that link | Assert the anchor `href` is `media`, `target="_blank"`, and the caption node is not inside the anchor. |
| Alternative text | The caption string is the `alt` when non-blank; `"Image"` when absent or blank. |
| Markup in the caption is sanitized | A caption containing a script tag does not produce a script element after render. |

**Flow coverage**: image with caption, from the normalized message props through the rendered bubble; image without caption, same path.

**Failure paths covered**: blank caption; unsafe HTML in the caption.

**Stubbed at the boundary**: none. These are component tests. The service normalizer is not under test here.

## Rollout and Rollback

Ship inside the normal widget release. No feature flag. The change is done when a production widget build shows a non-blank caption under the image and still shows image-only bubbles when the caption is absent. Rollback is reverting that widget build. Older widgets ignore the visible caption and keep using it as alternative text, so the service payload can stay as it is. The previous widget version still works against the same service messages.

## Constitution Alignment

| Principle | How this spec complies | Exception + justification |
|-----------|------------------------|---------------------------|
| II. Supply chain and sanitization | Caption HTML goes through `src/utils/sanitizeHtml.js` before render. No new dependency. | none |
| III. Observability | No new logs. Caption text and media URLs are not written to the console. | none |
| IV. Versioned contracts | No public API, overridable class-name, or `@weni/webchat-service` peer change. | none |
| V. Specification traceability | Opens with Origin Without Product Spec. Nothing is inherited, so nothing diverges. | none |

## Implementation Decisions

- **Blank caption**: `undefined`, `""`, and whitespace-only are treated as no caption. A string of spaces must not render an empty text block. The service copies any string, including a blank one, so the widget makes this decision.
- **Formatting**: captions use the text-message markdown pipeline (`marked` with `breaks: true`, then `sanitizeHtml`) without the streaming caret.
- **Layout**: image first, caption second, one bubble. Direction classes follow `message.direction` so incoming and outgoing captions match text messages.
- **Video**: left unchanged.
