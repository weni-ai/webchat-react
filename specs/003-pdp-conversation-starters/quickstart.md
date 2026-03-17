# Quickstart: PDP Conversation Starters

**Branch**: `003-pdp-conversation-starters` | **Date**: 2026-03-14

## Scenario 1: Automatic PDP Starters (VTEX Store)

Enable AI-generated conversation starters on VTEX product pages.

### Setup

```html
<div id="weni-webchat"></div>
<script src="https://cdn.weni.ai/webchat/webchat.umd.js"></script>
<script>
  WebChat.init({
    selector: '#weni-webchat',
    socketUrl: 'https://websocket.weni.ai',
    host: 'https://flows.weni.ai',
    channelUuid: 'YOUR-CHANNEL-UUID',

    conversationStarters: {
      pdp: true,
    },
  });
</script>
```

### Expected Behavior

1. On a VTEX PDP (e.g., `https://store.com/ipad-10th-gen/p`):
   - Widget detects the PDP URL pattern
   - Fetches product data from VTEX Intelligent Search API
   - Requests AI-generated starters via WebSocket
   - Displays 3 floating buttons above the launcher
   - Sets SKU context for AI responses

2. On non-PDP pages:
   - No starters displayed
   - No API calls made

3. SPA navigation:
   - Navigating to a new product → starters refresh for the new product
   - Navigating away from PDP → starters cleared

4. Mobile (viewport ≤ 768px):
   - Floating starters auto-hide after 5 seconds
   - Starters visible inside chat when opened

---

## Scenario 2: Manual Conversation Starters (Any Store)

Set custom starters programmatically for any page.

### Setup

```html
<div id="weni-webchat"></div>
<script src="https://cdn.weni.ai/webchat/webchat.umd.js"></script>
<script>
  WebChat.init({
    selector: '#weni-webchat',
    socketUrl: 'https://websocket.weni.ai',
    host: 'https://flows.weni.ai',
    channelUuid: 'YOUR-CHANNEL-UUID',
  });

  // Set starters after init
  WebChat.setConversationStarters([
    "Qual o prazo de garantia?",
    "Como funciona a troca?",
    "Quanto tempo para chegar?",
  ]);
</script>
```

### Expected Behavior

1. After `setConversationStarters()`:
   - 3 floating buttons appear above the launcher
   - Buttons show inside the chat when opened

2. Clicking a starter:
   - Chat opens (if closed)
   - Question sent as user message
   - All starters removed

3. Replacing starters:
   ```javascript
   WebChat.setConversationStarters(["New Q1?", "New Q2?"]);
   // Previous starters replaced with new ones
   ```

---

## Scenario 3: Combined (Auto + Manual Override)

Use auto-detection on PDPs with manual override capability.

### Setup

```javascript
WebChat.init({
  selector: '#weni-webchat',
  socketUrl: 'https://websocket.weni.ai',
  host: 'https://flows.weni.ai',
  channelUuid: 'YOUR-CHANNEL-UUID',

  conversationStarters: {
    pdp: true,
  },
});

// On a specific page, override with custom starters:
if (window.location.pathname === '/promotions') {
  WebChat.setConversationStarters([
    "Quais promoções estão ativas?",
    "Tem cupom de desconto?",
  ]);
}
```

### Expected Behavior

- On PDP pages: auto-generated starters
- On `/promotions`: manual starters override
- On other pages: no starters

---

## Scenario 4: Mobile Auto-Hide Test

### Setup

Open a VTEX PDP on a mobile device or resize browser to ≤ 768px width.

### Expected Behavior

1. Starters slide in above the launcher
2. After 5 seconds, starters fade out
3. Tap the launcher to open chat
4. Starters are visible inside the chat conversation area
5. Click a starter → sends message, starters removed

---

## Scenario 5: SKU Context Verification

### Setup

Navigate to a VTEX PDP with multiple variants (e.g., different colors or sizes).

### Steps

1. Open the chat
2. Select "Blue 256GB" variant on the product page
3. Ask "What's the price?" → AI should answer with Blue 256GB price
4. Change to "Silver 64GB" variant
5. Ask "What's the price?" → AI should answer with Silver 64GB price

### Verification

The conversation context updates when the SKU selection changes, ensuring AI responses match the currently viewed variant.

---

## Test HTML File

For local development testing, create an example file similar to `examples/voice-mode-test.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conversation Starters Test</title>
</head>
<body>
  <h1>Conversation Starters Test</h1>
  <div id="weni-webchat"></div>

  <script src="../dist-standalone/webchat.umd.js"></script>
  <script>
    WebChat.init({
      selector: '#weni-webchat',
      socketUrl: 'https://websocket.weni.ai',
      host: 'https://flows.weni.ai',
      channelUuid: 'YOUR-CHANNEL-UUID',
    });

    // Test manual starters
    WebChat.setConversationStarters([
      "Qual o meu tamanho ideal?",
      "Quanto tempo para chegar?",
      "Como funciona a troca?",
    ]);
  </script>
</body>
</html>
```
