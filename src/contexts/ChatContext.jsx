import WeniWebchatService from '@weni/webchat-service';
import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useState } from 'react';

const ChatContext = createContext();

/**
 * Default configuration values
 */
const defaultConfig = {
  // Connection settings
  connectOn: 'mount',
  storage: 'local',
  hideWhenNotConnected: true,
  autoClearCache: false,
  contactTimeout: 0,
  
  // UI settings
  title: 'Welcome',
  inputTextFieldHint: 'Type a message',
  embedded: false,
  showCloseButton: true,
  showFullScreenButton: false,
  startFullScreen: false,
  displayUnreadCount: false,
  showMessageDate: false,
  showHeaderAvatar: true,
  connectingText: 'Waiting for server...',
  
  // Media settings
  docViewer: false,
  
  // Tooltips
  tooltipDelay: 500,
  disableTooltips: false
};

/**
 * ChatProvider - Context provider that integrates WeniWebchatService
 * TODO: Handle all service events and state management
 * TODO: Implement error handling and reconnection logic
 * TODO: Add support for custom event handlers
 */
export function ChatProvider({ children, config }) {
  // Merge config with defaults
  const mergedConfig = { ...defaultConfig, ...config };
  
  const [service] = useState(() => new WeniWebchatService(mergedConfig));
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [configState] = useState(mergedConfig);
  
  useEffect(() => {
    // TODO: Initialize service with proper error handling
    service.init();
    
    // TODO: Setup all event listeners
    service.on('connected', () => setIsConnected(true));
    service.on('disconnected', () => setIsConnected(false));
    service.on('message:received', (msg) => {
      setMessages(prev => [...prev, msg]);
      // TODO: Update unread count when chat is closed
    });
    service.on('typing:start', () => setIsTyping(true));
    service.on('typing:stop', () => setIsTyping(false));
    
    // TODO: Add more event listeners (error, state:changed, etc.)
    
    return () => {
      // TODO: Cleanup all event listeners
      service.disconnect();
    };
  }, [service]);
  
  const value = {
    service,
    messages,
    isConnected,
    isTyping,
    isChatOpen,
    setIsChatOpen,
    unreadCount,
    setUnreadCount,
    config: configState,
    sendMessage: (text) => service.sendMessage(text),
    sendAttachment: (file) => service.sendAttachment(file),
    // TODO: Add more helper methods (clearSession, getHistory, etc.)
  };
  
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

ChatProvider.propTypes = {
  children: PropTypes.node.isRequired,
  config: PropTypes.shape({
    // Required properties
    socketUrl: PropTypes.string.isRequired,
    channelUuid: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,
    
    // Connection settings
    initPayload: PropTypes.string,
    sessionId: PropTypes.string,
    sessionToken: PropTypes.string,
    customData: PropTypes.object,
    connectOn: PropTypes.oneOf(['mount', 'open']),
    storage: PropTypes.oneOf(['local', 'session']),
    hideWhenNotConnected: PropTypes.bool,
    autoClearCache: PropTypes.bool,
    contactTimeout: PropTypes.number,
    
    // UI settings
    title: PropTypes.string,
    subtitle: PropTypes.string,
    inputTextFieldHint: PropTypes.string,
    embedded: PropTypes.bool,
    showCloseButton: PropTypes.bool,
    showFullScreenButton: PropTypes.bool,
    startFullScreen: PropTypes.bool,
    displayUnreadCount: PropTypes.bool,
    showMessageDate: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
    showHeaderAvatar: PropTypes.bool,
    connectingText: PropTypes.string,
    
    // Media settings
    docViewer: PropTypes.bool,
    params: PropTypes.shape({
      images: PropTypes.shape({
        dims: PropTypes.shape({
          width: PropTypes.number,
          height: PropTypes.number
        })
      })
    }),
    
    // Images/Icons
    profileAvatar: PropTypes.string,
    openLauncherImage: PropTypes.string,
    closeImage: PropTypes.string,
    headerImage: PropTypes.string,
    
    // Tooltips
    tooltipMessage: PropTypes.string,
    tooltipDelay: PropTypes.number,
    disableTooltips: PropTypes.bool,
    
    // Callbacks and custom functions
    onSocketEvent: PropTypes.objectOf(PropTypes.func),
    onWidgetEvent: PropTypes.shape({
      onChatOpen: PropTypes.func,
      onChatClose: PropTypes.func,
      onChatHidden: PropTypes.func
    }),
    handleNewUserMessage: PropTypes.func,
    customMessageDelay: PropTypes.func,
    customComponent: PropTypes.func,
    customAutoComplete: PropTypes.func,
    
    // Suggestions
    suggestionsConfig: PropTypes.shape({
      url: PropTypes.string,
      datasets: PropTypes.arrayOf(PropTypes.string),
      language: PropTypes.string,
      excludeIntents: PropTypes.arrayOf(PropTypes.string),
      automaticSend: PropTypes.bool
    }),
    
    // Legacy support
    selector: PropTypes.string
  }).isRequired
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
