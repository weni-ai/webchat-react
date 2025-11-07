import PropTypes from 'prop-types';

import Chat from '@/components/Chat/Chat';
import Launcher from '@/components/Launcher/Launcher';
import { ChatProvider, useChatContext } from '@/contexts/ChatContext.jsx';
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
  const { isChatFullscreen, isChatOpen, clearTooltipMessage } = useChatContext();

  const isChatFullscreenAndOpen = isChatFullscreen && isChatOpen;

  useEffect(() => {
    if (isChatOpen) {
      clearTooltipMessage();
    }
  }, [isChatOpen]);

  return (
    <aside className={`weni-widget ${isChatFullscreenAndOpen ? 'weni-widget--fullscreen' : ''}`}>
      <Chat />
      {!isChatFullscreenAndOpen && <Launcher />}
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
  theme: PropTypes.object
};

export default Widget;

