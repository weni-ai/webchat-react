import PropTypes from 'prop-types';

import Chat from '@/components/Chat/Chat';
import Launcher from '@/components/Launcher/Launcher';
import { ChatProvider } from '@/contexts/ChatContext.jsx';
import { ThemeProvider } from '@/theme/ThemeProvider';
import './Widget.scss';

/**
 * Widget - Main container component
 * TODO: Add fullscreen support
 * TODO: Add mobile responsiveness
 * TODO: Handle widget visibility and animations
 */
export function Widget({ config, theme = null }) {
  return (
    <ThemeProvider theme={theme}>
      <ChatProvider config={config}>
        <aside className="weni-widget">
          {/* TODO: Implement conditional rendering based on chat state */}
          <Chat />
          <Launcher />
        </aside>
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

