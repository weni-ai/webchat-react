import React from 'react'
import ReactDOM from 'react-dom/client'
import Widget from './components/Widget/Widget'
import './styles/index.scss'

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
}

// Custom theme (optional)
const customTheme = {
  colors: {
    primary: '#0084FF',
    messageClient: '#0084FF',
  },
  // Override other theme properties as needed
}

function App() {
  return (
    <div style={{ 
      width: '100%', 
      height: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ 
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1>Weni Webchat - React</h1>
        <p>Chat widget should appear in the bottom-right corner</p>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Note: Make sure to configure your channel UUID in src/index.jsx
        </p>
      </div>

      {/* The Widget component */}
      <Widget config={config} theme={customTheme} />
    </div>
  )
}

// Mount the app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

