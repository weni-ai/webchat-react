import PropTypes from 'prop-types';

import Chat from '@/components/Chat/Chat';
import Launcher from '@/components/Launcher/Launcher';
import { ConversationStartersCompact } from '@/components/ConversationStarters/ConversationStarters';
import { ChatProvider, useChatContext } from '@/contexts/ChatContext.jsx';
import {
  ConversationStartersProvider,
  useConversationStarters,
} from '@/contexts/ConversationStartersContext';
import { ThemeProvider } from '@/theme/ThemeProvider';
import './Widget.scss';
import { useEffect } from 'react';

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
    clearTooltipMessage,
    config,
    shouldRender,
  } = useChatContext();

  const {
    questions,
    isCompactVisible,
    isHiding,
    isDismissed,
    handleStarterClick,
  } = useConversationStarters();

  const isChatFullscreenAndOpen = isChatFullscreen && isChatOpen;
  const isCompactStartersVisible =
    questions.length > 0 && isCompactVisible && !isChatOpen && !isDismissed;
  const shouldShowCompactStarters = isCompactStartersVisible || isHiding;

  useEffect(() => {
    if (isChatOpen) {
      clearTooltipMessage();
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
          {shouldShowCompactStarters && (
            <ConversationStartersCompact
              questions={questions}
              onStarterClick={handleStarterClick}
              isVisible={isCompactStartersVisible}
              isHiding={isHiding}
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
        <ConversationStartersProvider>
          <WidgetContent />
        </ConversationStartersProvider>
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
