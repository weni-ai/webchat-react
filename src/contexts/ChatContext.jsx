import WeniWebchatService from '@weni/webchat-service';
import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import i18n from '@/i18n';
import { navigateIfSameDomain } from '@/experimental/navigateIfSameDomain';

let serviceInstance = {
  fns: [],
  onReady: () => {
    return new Promise((resolve) => {
      serviceInstance.fns.push(resolve);
    });
  },
};

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
  disableTooltips: false,
};

/**
 * ChatProvider - Context provider that integrates WeniWebchatService
 *
 * This component follows the Service/Template architecture:
 * - Service (WeniWebchatService): Manages all business logic, WebSocket, and state
 * - Template (React components): Only renders UI and handles user interactions
 *
 * SINGLE SOURCE OF TRUTH:
 * The service StateManager is the only source of truth for:
 * - Messages (including sender, timestamp, processing)
 * - Connection state
 * - Typing indicators (isTyping, isThinking)
 * - Session management and context
 * - Error state
 *
 * The template only manages UI-specific state:
 * - Chat open/closed
 * - Unread count
 * - Visual preferences
 */
export function ChatProvider({ children, config }) {
  const mergedConfig = { ...defaultConfig, ...config };

  if (mergedConfig.embedded) {
    mergedConfig.startFullScreen = true;
    mergedConfig.showFullScreenButton = false;
    mergedConfig.showCloseButton = false;
  }

  // Service instance
  const [service] = useState(() => {
    const fns = serviceInstance.fns;
    serviceInstance = new WeniWebchatService(mergedConfig);
    fns.forEach((fn) => fn(serviceInstance));
    return serviceInstance;
  });

  // State comes from service
  const [state, setState] = useState(() => service.getState());

  // Messages state
  const [context, setContext] = useState(state.context);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Camera recording state
  const [isCameraRecording, setIsCameraRecording] = useState(false);
  const [cameraRecordingStream, setCameraRecordingStream] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);

  // UI-specific state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatFullscreen, setIsChatFullscreen] = useState(
    mergedConfig.startFullScreen,
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [configState] = useState(mergedConfig);

  const [title] = useState(mergedConfig.title);
  const [tooltipMessage, setTooltipMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(null);

  const isChatOpenRef = useRef(isChatOpen);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  let initialTooltipMessageTimeout = null;

  function displaysTooltipAsAReceivedMessage(message) {
    if (isChatOpenRef.current) {
      return;
    }

    service.simulateMessageReceived({
      type: 'message',
      message: {
        text: message,
      },
    });
  }

  useEffect(() => {
    if (mergedConfig.tooltipMessage) {
      initialTooltipMessageTimeout = setTimeout(() => {
        if (service.getMessages().length !== 0) {
          return;
        }

        displaysTooltipAsAReceivedMessage(mergedConfig.tooltipMessage);
      }, mergedConfig.tooltipDelay);
    }

    service.init().catch((error) => {
      console.error('Failed to initialize service:', error);
    });

    service.on('state:changed', (newState) => {
      setState(newState);
    });

    // Audio recording events (UI-specific feedback)
    service.on('recording:started', () => setIsRecording(true));
    service.on('recording:stopped', () => setIsRecording(false));
    service.on('recording:tick', (duration) => setRecordingDuration(duration));
    service.on('recording:cancelled', () => setIsRecording(false));

    service.on('camera:stream:received', (stream) =>
      setCameraRecordingStream(stream),
    );
    service.on('camera:recording:started', () => setIsCameraRecording(true));
    service.on('camera:recording:stopped', () => setIsCameraRecording(false));
    service.on('camera:devices:changed', (devices) =>
      setCameraDevices(devices),
    );

    service.on('context:changed', (context) => setContext(context));

    service.on('language:changed', (language) => i18n.changeLanguage(language));

    service.on('chat:open:changed', (isOpen) => setIsChatOpen(isOpen));

    if (mergedConfig.startFullScreen) {
      service.setIsChatOpen(true);
    } else {
      setIsChatOpen(service.getSession()?.isChatOpen || false);
    }

    return () => {
      clearTimeout(initialTooltipMessageTimeout);
      service.removeAllListeners();
      service.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isChatOpen && mergedConfig.initPayload) {
      const relevantMessages = service
        .getMessages()
        .filter((message) => !message.persisted);

      if (relevantMessages.length === 0) {
        service.sendMessage(mergedConfig.initPayload, { hidden: true });
      }
    }

    const handleMessageReceived = (message) => {
      if (!isChatOpen) {
        setUnreadCount((prev) => prev + 1);

        if (!mergedConfig.disableTooltips) {
          setTooltipMessage(message);
        }
      }

      navigateIfSameDomain(message);
    };

    service.on('message:received', handleMessageReceived);

    return () => {
      service.off('message:received', handleMessageReceived);
    };
  }, [isChatOpen]);

  const stopAndSendAudio = async () => {
    // Stop recording method also sends the audio to the server
    await service.stopRecording();
  };

  const value = {
    // Service instance (for advanced use cases)
    service,

    // State from service StateManager (single source of truth)
    messages: state.messages || [],
    isConnected: state.connection?.status === 'connected',
    isConnectionClosed: state.connection?.status === 'closed',
    isTyping: state.isTyping || false,
    isThinking: state.isThinking || false,
    context,
    error: state.error || null,

    // Audio recording state (UI-specific)
    isRecording,
    recordingDuration,
    isAudioRecordingSupported: service.isAudioRecordingSupported,

    // Camera recording state
    isCameraRecording,
    cameraRecordingStream,
    cameraDevices,

    // UI-specific state
    title,
    isChatOpen,
    setIsChatOpen: (isOpen) => service.setIsChatOpen(isOpen),
    isChatFullscreen,
    toggleChatFullscreen: () => setIsChatFullscreen(!isChatFullscreen),
    unreadCount,
    setUnreadCount,
    config: configState,
    fileConfig: service.getFileConfig(),
    tooltipMessage,
    clearTooltipMessage: () => setTooltipMessage(null),
    currentPage,
    setCurrentPage,

    // Service methods (proxied for convenience)
    connect: () => service.connect(),
    sendMessage: (text) => service.sendMessage(text),
    sendAttachment: (file) => service.sendAttachment(file),
    stopAndSendAudio,
    startRecording: () => service.startRecording(),
    stopRecording: () => service.stopRecording(),
    cancelRecording: () => service.cancelRecording(),
    hasAudioPermission: () => service.hasAudioPermission(),
    requestAudioPermission: () => service.requestAudioPermission(),
    hasCameraPermission: () => service.hasCameraPermission(),
    requestCameraPermission: () => service.requestCameraPermission(),
    startCameraRecording: () => service.startCameraRecording(),
    stopCameraRecording: () => service.stopCameraRecording(),
    switchToNextCameraDevice: () => service.switchToNextCameraDevice(),
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
    connectOn: PropTypes.oneOf(['mount', 'manual', 'demand']),
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
          height: PropTypes.number,
        }),
      }),
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
      onChatHidden: PropTypes.func,
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
      automaticSend: PropTypes.bool,
    }),

    // Legacy support
    selector: PropTypes.string,
  }).isRequired,
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
export { serviceInstance as service };
