// Default export
export { default } from './components/Widget/Widget';
export { default as Widget } from './components/Widget/Widget';

// Context and Hooks
export { ChatProvider, useChatContext } from './contexts/ChatContext.jsx';
export { useWeniChat } from './hooks/useWeniChat';

// Components
export { default as Launcher } from './components/Launcher/Launcher';
export { default as Chat } from './components/Chat/Chat';
export { default as Header } from './components/Header/Header';
export { default as MessagesList } from './components/Messages/MessagesList';
export { default as MessageText } from './components/Messages/MessageText';
export { default as MessageImage } from './components/Messages/MessageImage';
export { default as MessageVideo } from './components/Messages/MessageVideo';
export { default as MessageAudio } from './components/Messages/MessageAudio';
export { default as MessageDocument } from './components/Messages/MessageDocument';
export { default as InputBox } from './components/Input/InputBox';

// Common Components
export { default as Avatar } from './components/common/Avatar';
export { default as Badge } from './components/common/Badge';
export { default as Button } from './components/common/Button';
export { default as Icon } from './components/common/Icon';

// Theme
export { ThemeProvider, useTheme } from './theme/ThemeProvider';
export { default as defaultTheme } from './theme/defaultTheme';

// Utils
export * from './utils/constants';
export * from './utils/formatters';

// Styles
import './styles/index.css';

