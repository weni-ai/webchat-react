import PropTypes from 'prop-types';

import Chat from '@/components/Chat/Chat';
import Launcher from '@/components/Launcher/Launcher';
import { ChatProvider } from '@/contexts/ChatContext.jsx';
import { ThemeProvider } from '@/theme/ThemeProvider';

/**
 * Widget - Main container component
 * TODO: Implement widget positioning logic
 * TODO: Add fullscreen support
 * TODO: Add mobile responsiveness
 * TODO: Handle widget visibility and animations
 */
export function Widget({ config, theme = null }) {
  // TODO: Implement widget state and positioning
  
  return (
    <ThemeProvider theme={theme}>
      <ChatProvider config={config}>
        <div className="weni-webchat-widget">
          {/* TODO: Implement conditional rendering based on chat state */}
          <Launcher />
          <Chat />
        </div>
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

