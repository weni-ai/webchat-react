# Weni WebChat React

React UI for Weni Webchat - A beautiful, customizable chat widget built on top of [`@weni/webchat-service`](https://github.com/weni-ai/webchat-service/).

## Standalone setup (script tag)

Use the hosted UMD:

```html
<div id="weni-webchat"></div>

<script src="https://cdn.cloud.weni.ai/webchat-latest.umd.js"></script>
<script>
  window.WebChat.init({
    selector: '#weni-webchat',
    socketUrl: 'https://websocket.weni.ai',
    host: 'https://flows.weni.ai',
    channelUuid: 'YOUR-CHANNEL-UUID',

    // Optional behavior
    connectOn: 'demand', // 'mount' | 'manual' | 'demand'
    storage: 'local', // 'local' | 'session'
    title: 'John Doe',

    // Optional UI hints
    displayUnreadCount: true,
    tooltipMessage: 'Hi! Need help?',
    tooltipDelay: 800,

    // Visual customization via params (mapped to CSS vars)
    mainColor: '#00A49F',
    launcherColor: '#00A49F',
    widgetHeight: '65vh',
    widgetWidth: '360px',
    titleColor: '#ffffff',
    headerBackgroundColor: '#00A49F'
  });

  // Later, to destroy:
  // window.WebChat.destroy();
  // Manage context:
  // window.WebChat.default.setContext({ userId: 'abc' });
</script>
```

Or, self-host the bundle:

Build the standalone bundle:

```bash
npm run build:standalone
```

Serve the generated file `dist-standalone/webchat.umd.js` from your server or CDN, then include and initialize it:

```html
<div id="weni-webchat"></div>

<script src="/dist-standalone/webchat.umd.js"></script>
<script>
  window.WebChat.init({
    selector: '#weni-webchat',
    socketUrl: 'https://websocket.weni.ai',
    host: 'https://flows.weni.ai',
    channelUuid: 'YOUR-CHANNEL-UUID'
  });
</script>
```

## Parameters

All chat behavior, transport and state are handled by [`@weni/webchat-service`](https://github.com/weni-ai/webchat-service/). For the complete and authoritative list of configuration options, refer to the service documentation:

- Service configuration: [:link: weni-ai/webchat-service](https://github.com/weni-ai/webchat-service/)

The standalone initializer accepts:

| Attribute | Values accepted | Default | Description |
| --- | --- | --- | --- |
| `*selector` | string (CSS selector) | — | Container element to mount the widget. |
| `*socketUrl` | string (URL) | — | WebSocket/HTTP endpoint of the webchat service. |
| `*host` | string (URL) | — | Weni Flows host. |
| `*channelUuid` | string (UUID) | — | Weni channel UUID. |
| `connectOn` | 'mount' \| 'manual' \| 'demand' | 'mount' | When to establish the connection. |
| `storage` | 'local' \| 'session' | 'local' | Store data in LocalStorage or SessionStorage. |
| `initPayload` | string | — | Message sent as a user message automatically behind the scenes if this is a new session when the chat is opened for the first time. |
| `sessionId` | string | — | Custom session identifier. |
| `sessionToken` | string | — | Custom session token. |
| `customData` | object | — | Arbitrary metadata to associate with the session. |
| `autoClearCache` | boolean | false | Clear cached session automatically. |
| `contactTimeout` | number (ms) | 0 | Timeout for contact/session handling. |
| `title` | string | — | Title displayed in the header. |
| `subtitle` | string | — | Subtitle displayed in the header. |
| `inputTextFieldHint` | string | 'Type a message' | Placeholder text for the input. |
| `embedded` | boolean | false | Embedded mode; forces fullscreen and hides close/fullscreen buttons. |
| `showCloseButton` | boolean | true | Show close button (disabled when `embedded` is true). |
| `showFullScreenButton` | boolean | false | Show fullscreen toggle (disabled when `embedded` is true). |
| `startFullScreen` | boolean | false | Start opened and fullscreen (forced true when `embedded` is true). |
| `displayUnreadCount` | boolean | false | Show the unread message count badge in the launcher if the chat is closed. |
| `showMessageDate` | boolean \| function | false | Show date on messages; can be a formatter function. |
| `showHeaderAvatar` | boolean | true | Show avatar in the header. |
| `profileAvatar` | string (URL) | — | Avatar image used on the launcher/header. |
| `openLauncherImage` | string (URL) | — | Custom image for launcher (open state). |
| `closeImage` | string (URL) | — | Custom image for close icon. |
| `headerImage` | string (URL) | — | Header background or logo image. |
| `tooltipMessage` | string | — | First message displayed as a tooltip in a new session. |
| `tooltipDelay` | number (ms) | 500 | Delay before showing the tooltip message. |
| `disableTooltips` | boolean | false | Disable automatic tooltips on new messages. |
| `onSocketEvent` | { [event]: function } | — | Handlers for low-level socket/service events. |
| `onWidgetEvent` | { onChatOpen, onChatClose, onChatHidden } | — | UI lifecycle callbacks. |
| `handleNewUserMessage` | function | — | Custom handler for new user messages. |
| `customMessageDelay` | function | — | Compute delay before rendering bot messages. |

## Standalone API

The following methods are available via `window.WebChat`:

- `init(params)` – Mounts the widget into `params.selector`. Accepts all parameters listed above, plus visual customization keys (see Customization).
- `destroy()` – Unmounts and cleans up the widget instance.
- `setContext(context)` – Sets contextual data in the underlying service.
- `getContext()` – Returns the current context from the underlying service.

Experimental / not yet implemented (no-ops for now):
- `open()`, `close()`, `toggle()`
- `send(message)`, `clear()`
- `setSessionId(id)`
- `isOpen()`, `isVisible()`
- `reload()`

## Customization

You can customize the look-and-feel in two ways:

1) Pass visual params to `init()` (mapped to CSS custom properties at runtime):

- Header: `titleColor`, `subtitleColor`, `headerBackgroundColor`
- Chat: `chatBackgroundColor`
- Launcher: `launcherColor`, `mainColor`, `launcherHeight`, `launcherWidth`
- Input: `inputBackgroundColor`, `inputFontColor`, `inputPlaceholderColor`
- Messages: `userMessageBubbleColor`, `userMessageTextColor`, `botMessageBubbleColor`, `botMessageTextColor`, `fullScreenBotMessageBubbleColor`
- Quick replies: `quickRepliesFontColor`, `quickRepliesBackgroundColor`, `quickRepliesBorderColor`, `quickRepliesBorderWidth`
- Suggestions: `suggestionsBackgroundColor`, `suggestionsSeparatorColor`, `suggestionsFontColor`, `suggestionsHoverFontColor`
- Dimensions: `widgetHeight`, `widgetWidth`

Example:

```html
<script>
  window.WebChat.init({
    selector: '#weni-webchat',
    socketUrl: 'https://websocket.weni.ai',
    channelUuid: 'YOUR-CHANNEL-UUID',
    host: 'https://flows.weni.ai',
    mainColor: '#0A6564',
    userMessageBubbleColor: '#0A6564',
    userMessageTextColor: '#ffffff',
    widgetWidth: '380px',
    widgetHeight: '70vh'
  });
</script>
```

2) Override CSS variables in your page (global or scoped):

```css
:root {
  --weni-main-color: #00A49F;
  --weni-launcher-color: #00A49F;
  --weni-widget-height: 65vh;
  --weni-widget-width: 360px;
  --weni-title-color: #ffffff;
  --weni-header-bg-color: #00A49F;
  /* See the complete list below */
}
```

Core variables consumed by the widget (defaults in `src/styles/variables.scss`):

- Header: `--weni-title-color`, `--weni-subtitle-color`, `--weni-header-bg-color`
- Chat container: `--weni-chat-bg-color`, `--weni-widget-height`, `--weni-widget-width`
- Launcher: `--weni-launcher-color`, `--weni-launcher-height`, `--weni-launcher-width`
- Input: `--weni-input-bg-color`, `--weni-input-font-color`, `--weni-input-placeholder-color`
- User messages: `--weni-user-message-bubble-color`, `--weni-user-message-text-color`
- Bot messages: `--weni-bot-message-bubble-color`, `--weni-bot-message-text-color`, `--weni-fullscreen-bot-message-bubble-color`
- Quick replies: `--weni-quick-replies-font-color`, `--weni-quick-replies-bg-color`, `--weni-quick-replies-border-color`, `--weni-quick-replies-border-width`
- Suggestions: `--weni-suggestions-bg-color`, `--weni-suggestions-separator-color`, `--weni-suggestions-font-color`, `--weni-suggestions-hover-font-color`

For backward compatibility, legacy variables like `--titleColor`, `--widgetHeight`, `--launcherColor`, etc. are also kept in sync.

## Development

```bash
# Start local dev (useful for iterating the UI)
npm run dev

# Build the standalone bundle (for script-tag usage)
npm run build:standalone
```
