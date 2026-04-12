import WeniWebchatService from '@weni/webchat-service';
import PropTypes from 'prop-types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { VoiceService } from '@/services/voice';
import { AudioCapture } from '@/services/voice/AudioCapture';
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

  // Components settings
  showVoiceRecordingButton: true,
  showCameraButton: true,
  showFileUploaderButton: true,

  // Experimental flags
  navigateIfSameDomain: false,
  addToCart: false,

  // Conversation starters
  conversationStarters: undefined,

  mode: 'live',
  showMode: false,
  showChatAvatar: true,
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
    const fns = serviceInstance?.fns ?? [];
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
  const [isChatOpen, setIsChatOpen] = useState(!!mergedConfig.startFullScreen);
  const [isChatFullscreen, setIsChatFullscreen] = useState(
    mergedConfig.startFullScreen,
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [configState] = useState(mergedConfig);
  const [shouldRender, setShouldRender] = useState(true);
  const [mode, _setMode] = useState(mergedConfig.mode);
  const [showMode, _setShowMode] = useState(mergedConfig.showMode);

  const [title] = useState(mergedConfig.title);
  const [tooltipMessage, setTooltipMessage] = useState(null);
  const [pageHistory, setPageHistory] = useState([]);
  const [cart, setCart] = useState({});

  // Voice mode state
  const [isVoiceEnabledByClient] = useState(!!mergedConfig.voiceMode?.enabled);
  const [isVoiceEnabledByServer, setIsVoiceEnabledByServer] = useState(false);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [isEnteringVoiceMode, setIsEnteringVoiceMode] = useState(false);
  const [voiceModeState, setVoiceModeState] = useState(null);
  const [voicePartialTranscript, setVoicePartialTranscript] = useState('');
  const [voiceError, setVoiceError] = useState(null);
  const [voiceLanguage, setVoiceLanguage] = useState('en');
  const isVoiceModeSupported = useMemo(() => VoiceService.isSupported(), []);
  const [isVoiceModePageActive, setIsVoiceModePageActive] = useState(false);
  const [voiceIntentBanner, setVoiceIntentBanner] = useState(null);
  const voiceServiceRef = useRef(null);
  const processedTextRef = useRef('');
  const lastProcessedVoiceMsgIdRef = useRef(null);
  const voiceStartMessageCountRef = useRef(0);

  // Navigation helper functions
  const currentPage =
    pageHistory.length > 0 ? pageHistory[pageHistory.length - 1] : null;

  const clearPageHistory = () => {
    setPageHistory([]);
  };

  const pushPage = (page) => {
    if (page === null) {
      // If null is passed, clear the history (go to chat)
      clearPageHistory();
    } else {
      // prevent pushing the same page twice
      if (pageHistory[pageHistory.length - 1]?.view === page.view) {
        return;
      }

      setPageHistory((prev) => [...prev, page]);
    }
  };

  const goBack = () => {
    setPageHistory((prev) => {
      if (prev.length <= 1) {
        return [];
      }
      return prev.slice(0, -1);
    });
  };

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

    service
      .init()
      .then(({ shouldRender }) => {
        if (typeof shouldRender === 'boolean') {
          setShouldRender(shouldRender);

          if (shouldRender && mergedConfig.initPayload) {
            const relevantMessages = service
              .getMessages()
              .filter((message) => !message.persisted);

            if (relevantMessages.length === 0) {
              service.sendMessage(mergedConfig.initPayload, { hidden: true });
            }
          }
        }

        if (mergedConfig.startFullScreen) {
          service.setIsChatOpen(true);
        } else {
          setIsChatOpen(service.getSession()?.isChatOpen || false);
        }
      })
      .catch((error) => {
        console.error('Failed to initialize service:', error);
      });

    const forwardIncomingMessageToVoiceMode = (newState) => {
      if (!voiceServiceRef.current) return;

      const messages = newState.messages || [];
      const lastMsgIndex = messages.length - 1;
      const lastMsg = messages[lastMsgIndex];

      if (!lastMsg || lastMsg.direction !== 'incoming') return;

      if (lastMsgIndex < voiceStartMessageCountRef.current) return;

      if (lastMsg.id !== lastProcessedVoiceMsgIdRef.current) {
        lastProcessedVoiceMsgIdRef.current = lastMsg.id;
        processedTextRef.current = '';
      }

      const currentText = lastMsg.text || '';
      const isStreaming = lastMsg.status === 'streaming';
      const newText = currentText.substring(processedTextRef.current.length);

      if (newText) {
        voiceServiceRef.current.processTextChunk(newText, !isStreaming);
        processedTextRef.current = isStreaming ? currentText : '';
      }
    };

    service.on('state:changed', (newState) => {
      setState(newState);
      forwardIncomingMessageToVoiceMode(newState);
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

    const syncVoiceModeLanguage = (language) => {
      const isoLang = language ? language.split('-')[0].toLowerCase() : 'en';
      setVoiceLanguage(isoLang);
      if (voiceServiceRef.current) {
        voiceServiceRef.current.setLanguage(isoLang);
      }
    };

    service.on('language:changed', (language) => {
      i18n.changeLanguage(language);
      syncVoiceModeLanguage(language);
    });

    if (isVoiceEnabledByClient) {
      service.on('voice:enabled', () => setIsVoiceEnabledByServer(true));
    }

    service.on('chat:open:changed', (isOpen) => setIsChatOpen(isOpen));

    service.clearPageHistory = clearPageHistory;

    return () => {
      clearTimeout(initialTooltipMessageTimeout);
      if (voiceServiceRef.current) {
        voiceServiceRef.current.destroy();
        voiceServiceRef.current = null;
      }
      delete service.clearPageHistory;
      service.removeAllListeners();
      service.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isChatOpen && mergedConfig.connectOn === 'demand') {
      service.connect();
    }

    const handleMessageReceived = (message) => {
      if (!isChatOpen) {
        setUnreadCount((prev) => prev + 1);

        if (!mergedConfig.disableTooltips) {
          setTooltipMessage(message);
        }
      }

      navigateIfSameDomain(message, mergedConfig.navigateIfSameDomain);
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

  const enterVoiceMode = useCallback(async () => {
    if (
      !isVoiceEnabledByClient ||
      !isVoiceEnabledByServer ||
      !isVoiceModeSupported
    ) {
      return;
    }

    if (voiceServiceRef.current) {
      voiceServiceRef.current.removeAllListeners();
      voiceServiceRef.current.destroy();
      voiceServiceRef.current = null;
    }

    voiceStartMessageCountRef.current = (state.messages || []).length;
    lastProcessedVoiceMsgIdRef.current = null;
    processedTextRef.current = '';

    setIsEnteringVoiceMode(true);

    const getTokens = () => service.requestVoiceTokens();

    const vs = new VoiceService();
    await vs.init({
      ...mergedConfig.voiceMode,
      languageCode: voiceLanguage,
      getTokens,
    });
    vs.on('state:changed', ({ state }) => setVoiceModeState(state));
    vs.on('transcript:partial', ({ text }) => setVoicePartialTranscript(text));
    vs.on('transcript:committed', () => {
      setVoicePartialTranscript('');
    });
    vs.on('session:started', () => {
      setIsEnteringVoiceMode(false);
      setIsVoiceModeActive(true);
    });
    vs.on('session:ended', ({ reason } = {}) => {
      setIsEnteringVoiceMode(false);
      setIsVoiceModeActive(false);
      setVoiceModeState(null);
      setVoicePartialTranscript('');
      processedTextRef.current = '';
      lastProcessedVoiceMsgIdRef.current = null;

      if (reason === 'user') {
        setVoiceError(null);
      }

      if (voiceServiceRef.current === vs) {
        vs.removeAllListeners();
        vs.destroy();
        voiceServiceRef.current = null;
      }
    });
    vs.on('error', (error) => {
      setIsEnteringVoiceMode(false);
      setVoiceError(error);
    });
    vs.setMessageCallback((text) => service.sendMessage(text));
    voiceServiceRef.current = vs;

    try {
      await vs.startSession();
    } catch {
      // Errors are surfaced via the 'error' event listener above.
      // This catch prevents an unhandled promise rejection when the user
      // cancels during initialization or when startSession fails.
    }
  }, [
    mergedConfig,
    voiceLanguage,
    isVoiceEnabledByClient,
    isVoiceModeSupported,
    isVoiceEnabledByServer,
    service,
  ]);

  const exitVoiceMode = useCallback(() => {
    if (voiceServiceRef.current) {
      voiceServiceRef.current.endSession();
    }
  }, []);

  const retryVoiceMode = useCallback(async () => {
    exitVoiceMode();
    setVoiceError(null);
    await enterVoiceMode();
  }, [exitVoiceMode, enterVoiceMode]);

  useEffect(() => {
    const updateVoiceIntentBanner = () => {
      if (!isVoiceModeActive) return;
      let bannerKey = 'voice_mode.intent_status_listening';
      if (voiceModeState === 'speaking') {
        bannerKey = 'voice_mode.intent_status_agent_speaking';
      } else if (voiceModeState === 'processing') {
        bannerKey = 'voice_mode.intent_status_transcribing';
      }
      setVoiceIntentBanner(i18n.t(bannerKey));
    };

    updateVoiceIntentBanner();
    i18n.on('languageChanged', updateVoiceIntentBanner);
    return () => i18n.off('languageChanged', updateVoiceIntentBanner);
  }, [isVoiceModeActive, voiceModeState]);

  const runVoiceModeEntryFlow = useCallback(async () => {
    setIsVoiceModePageActive(true);

    const permissionState = await AudioCapture.checkPermission();

    if (permissionState === 'denied') {
      setVoiceIntentBanner(i18n.t('voice_mode.microphone_disabled_in_browser'));
      return;
    }

    if (permissionState === 'granted') {
      setVoiceIntentBanner(i18n.t('voice_mode.connecting'));
      enterVoiceMode();
      return;
    }

    setVoiceIntentBanner(i18n.t('voice_mode.check_microphone_browser_settings'));
    const micGranted = await AudioCapture.requestPermission();
    if (!micGranted) {
      setVoiceIntentBanner(i18n.t('voice_mode.microphone_disabled_in_browser'));
      return;
    }

    setVoiceIntentBanner(i18n.t('voice_mode.connecting'));
    enterVoiceMode();
  }, [enterVoiceMode]);

  const handleVoiceModeIntent = useCallback(async () => {
    if (isVoiceModeActive) {
      exitVoiceMode();
      setIsVoiceModePageActive(false);
      return;
    }

    await runVoiceModeEntryFlow();
  }, [isVoiceModeActive, exitVoiceMode, runVoiceModeEntryFlow]);

  const handleCloseVoiceModePage = useCallback(() => {
    if (isEnteringVoiceMode || isVoiceModeActive) {
      exitVoiceMode();
    }
    setIsVoiceModePageActive(false);
  }, [isEnteringVoiceMode, isVoiceModeActive, exitVoiceMode]);

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
    shouldRender,
    isChatFullscreen,
    toggleChatFullscreen: () => setIsChatFullscreen(!isChatFullscreen),
    unreadCount,
    setUnreadCount,
    config: configState,
    fileConfig: service.getFileConfig(),
    tooltipMessage,
    clearTooltipMessage: () => setTooltipMessage(null),
    currentPage,
    setCurrentPage: pushPage,
    goBack,
    clearPageHistory,
    pageHistory,
    cart,
    setCart,
    mode,
    isModeVisible: showMode,

    // Voice mode state
    isVoiceEnabledByClient,
    isVoiceEnabledByServer,
    isVoiceModeActive,
    isEnteringVoiceMode,
    isVoiceModeSupported,
    voiceModeState,
    voicePartialTranscript,
    voiceError,
    enterVoiceMode,
    exitVoiceMode,
    retryVoiceMode,
    isVoiceModePageActive,
    voiceIntentBanner,
    runVoiceModeEntryFlow,
    handleVoiceModeIntent,
    handleCloseVoiceModePage,

    // Service methods (proxied for convenience)
    connect: () => service.connect(),
    sendMessage: (text) => service.sendMessage(text),
    addProductToCart: (props) => service.addProductToCart(props),
    addConversationStatus: (text, status) => service.addConversationStatus(text, status),
    sendOrder: (productItems) => service.sendOrder(productItems),
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

    // Experimental flags
    navigateIfSameDomain: PropTypes.bool,
    addToCart: PropTypes.bool,

    // Conversation starters
    conversationStarters: PropTypes.shape({
      pdp: PropTypes.bool,
    }),

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

    // Voice mode
    voiceMode: PropTypes.shape({
      enabled: PropTypes.bool,
      elevenLabs: PropTypes.shape({
        voiceId: PropTypes.string,
      }),
      texts: PropTypes.object,
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
