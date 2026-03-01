import PropTypes from 'prop-types';

import Chat from '@/components/Chat/Chat';
import Launcher from '@/components/Launcher/Launcher';
import { ConversationStarters } from '@/components/ConversationStarters/ConversationStarters';
import { ChatProvider, useChatContext } from '@/contexts/ChatContext.jsx';
import { useWeniChat } from '@/hooks/useWeniChat';
import { ThemeProvider } from '@/theme/ThemeProvider';
import './Widget.scss';
import { useEffect, useRef } from 'react';

/**
 * Widget - Main container component
 * TODO: Add fullscreen support
 * TODO: Add mobile responsiveness
 * TODO: Handle widget visibility and animations
 */

function WidgetContent() {
  const {
    isChatFullscreen,
    isChatOpen,
    setIsChatOpen,
    clearTooltipMessage,
    config,
    shouldRender,
    sendMessage,
  } = useChatContext();

  const { hasConversationStarted, conversationStarters } = useWeniChat();

  const isChatFullscreenAndOpen = isChatFullscreen && isChatOpen;

  const pendingStarterMessage = useRef(null);

  const showClosedStarters =
    !isChatOpen &&
    !hasConversationStarted &&
    conversationStarters.length > 0;

  const handleStarterClick = (text) => {
    pendingStarterMessage.current = text;
    setIsChatOpen(true);
  };

  useEffect(() => {
    if (isChatOpen) {
      clearTooltipMessage();

      if (pendingStarterMessage.current) {
        const text = pendingStarterMessage.current;
        pendingStarterMessage.current = null;
        sendMessage(text);
      }
    }
  }, [isChatOpen]);

  if (shouldRender === false) {
    return null;
  }

  return (
    <aside
      className={`weni-widget ${isChatFullscreenAndOpen ? 'weni-widget--fullscreen' : ''} ${config.embedded ? 'weni-widget--disabled-animation' : ''}`}
    >
      <Chat />
      {!isChatFullscreenAndOpen && (
        <>
          {showClosedStarters && (
            <ConversationStarters
              starters={conversationStarters}
              onStarterClick={handleStarterClick}
              variant="compact"
            />
          )}
          <Launcher />
        </>
      )}
    </aside>
  );
}

export function Widget({ config, theme = null }) {
  return (
    <ThemeProvider theme={theme}>
      <ChatProvider config={config}>
        <WidgetContent />
      </ChatProvider>
    </ThemeProvider>
  );
}

Widget.propTypes = {
  config: PropTypes.shape({
    socketUrl: PropTypes.string.isRequired,
    channelUuid: PropTypes.string.isRequired,
    host: PropTypes.string.isRequired,
    // TODO: Add all config properties
  }).isRequired,
  theme: PropTypes.object,
};

export default Widget;
