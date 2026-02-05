import React from 'react';
import ReactDOM from 'react-dom/client';

import Widget from './components/Widget/Widget';
import './styles/index.scss';
import './i18n';

// Import WebChat API and expose to window for testing
import WebChat from './standalone.jsx';
window.WebChat = WebChat;

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
