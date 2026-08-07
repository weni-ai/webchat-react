import React from 'react';
import ReactDOM from 'react-dom/client';

import Widget from './components/Widget/Widget';
import './styles/index.scss';
import './i18n';

// Import WebChat API and expose to window for testing
import WebChat from './standalone.jsx';
window.WebChat = WebChat;

// Local stubs so CounterControls add-to-cart / pending quantity UI is eligible in dev
window.__RUNTIME__ = { account: 'devstore' };
window.faststore_sdk_stores = {
  get: (key) => {
    if (key !== 'fs::cart') return undefined;
    return {
      read: () => ({ id: 'dev-order-form-id', items: [] }),
      set: () => {},
    };
  },
};

const DEMO_PRODUCT = {
  product_retailer_id: '1276545',
  seller_id: '1',
  name: 'Nike Air Zoom Pegasus',
  description: 'Running shoe for everyday training',
  price: 599.9,
  sale_price: 499.9,
  currency: 'BRL',
  image: 'https://picsum.photos/seed/weni-product/200',
};

const config = {
  // socketUrl: 'wss://websocket.weni.ai',
  // channelUuid: 'your-channel-uuid-here', // Replace with your actual channel UUID
  socketUrl: 'https://websocket.weni.ai',
  channelUuid: '5de2d244-2138-43c4-be6b-59a9eaae2f3b', // Replace with your actual channel UUID
  host: 'https://flows.weni.ai',

  // Optional configurations
  connectOn: 'mount', // or 'manual'
  storage: 'session', // 'local' or 'session'

  // TODO: Add more config options as they become available
  startFullScreen: false,
  showFullScreenButton: true,
  addToCart: true,
};

// Custom theme (optional)
const customTheme = {
  colors: {
    primary: '#0084FF',
    messageClient: '#0084FF',
  },
  // Override other theme properties as needed
};

const buttonStyle = {
  padding: '8px 14px',
  background: '#0084FF',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

function App() {
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <h1>Weni Webchat - React</h1>
        <p>Chat widget should appear in the bottom-right corner</p>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Note: Make sure to configure your channel UUID in src/index.jsx
        </p>

        <section
          id="actions"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}
        >
          <button
            id="open-chat"
            style={buttonStyle}
            onClick={async () => {
              await window.WebChat.open();
            }}
          >
            Open Chat
          </button>
          <button
            id="close-chat"
            style={buttonStyle}
            onClick={async () => {
              await window.WebChat.close();
            }}
          >
            Close Chat
          </button>
          <button
            id="toggle-chat"
            style={buttonStyle}
            onClick={async () => {
              await window.WebChat.toggle();
            }}
          >
            Toggle Chat
          </button>
          <button
            id="clear-chat"
            style={buttonStyle}
            onClick={async () => {
              await window.WebChat.clear();
            }}
          >
            Clear Chat
          </button>
          <button
            id="send-message"
            style={buttonStyle}
            onClick={async () => {
              await window.WebChat.send('Hello, how are you?');
            }}
          >
            Send Message
          </button>
          <button
            id="send-message-options"
            style={buttonStyle}
            onClick={async () => {
              await window.WebChat.send('Hello, how are you?', {
                id: '123',
                timestamp: Date.now(),
                status: 'pending',
                metadata: {
                  custom: 'data',
                },
                hidden: true,
              });
            }}
          >
            Send Hidden Message
          </button>
          <button
            id="set-session-id"
            style={buttonStyle}
            onClick={async () => {
              await window.WebChat.setSessionId(
                'new-session-id@likeanemail.com',
              );
            }}
          >
            Set New Session ID
          </button>
          <button
            id="simulate-product-conversation"
            style={buttonStyle}
            onClick={async () => {
              await window.WebChat.open();
              await window.WebChat.simulateMessageReceived({
                type: 'message',
                message: {
                  text: 'Found a product for you',
                  interactive: {
                    type: 'product_list',
                    header: { text: 'Suggested product' },
                    action: {
                      name: 'View catalog',
                      sections: [
                        {
                          title: 'Running',
                          product_items: [DEMO_PRODUCT],
                        },
                      ],
                    },
                  },
                },
              });
            }}
          >
            Simulate product (conversation)
          </button>
          <button
            id="simulate-product-carousel"
            style={buttonStyle}
            onClick={async () => {
              await window.WebChat.open();
              await window.WebChat.simulateMessageReceived({
                type: 'message',
                message: {
                  text: 'Check these products',
                  interactive: {
                    type: 'product_carousel',
                    action: {
                      product_items: [
                        DEMO_PRODUCT,
                        {
                          ...DEMO_PRODUCT,
                          product_retailer_id: '9876543',
                          seller_id: '1',
                          name: 'Brooks Ghost 16',
                          price: 899.9,
                          sale_price: undefined,
                          image:
                            'https://picsum.photos/seed/weni-product-2/200',
                        },
                      ],
                    },
                  },
                },
              });
            }}
          >
            Simulate product carousel
          </button>
          <button
            id="simulate-product-catalog"
            style={buttonStyle}
            onClick={async () => {
              await window.WebChat.open();
              await window.WebChat.simulateMessageReceived({
                type: 'message',
                message: {
                  text: 'Browse the catalog',
                  interactive: {
                    type: 'product_list',
                    header: { text: 'Catalog' },
                    action: {
                      name: 'View catalog',
                      sections: [
                        {
                          title: 'Running',
                          product_items: [
                            DEMO_PRODUCT,
                            {
                              ...DEMO_PRODUCT,
                              product_retailer_id: '9876543',
                              seller_id: '1',
                              name: 'Brooks Ghost 16',
                              price: 899.9,
                              sale_price: undefined,
                              image:
                                'https://picsum.photos/seed/weni-product-2/200',
                            },
                          ],
                        },
                      ],
                    },
                  },
                },
              });
            }}
          >
            Simulate product catalog
          </button>
        </section>
      </div>

      {/* The Widget component */}
      <Widget
        config={config}
        theme={customTheme}
      />
    </div>
  );
}

// Mount the app
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
