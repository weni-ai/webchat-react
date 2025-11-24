import PropTypes from 'prop-types';
import { createContext, useContext, useEffect } from 'react';

import { applyThemeFromConfig } from '@/utils/themeHelpers';

const ThemeContext = createContext();

/**
 * ThemeProvider - Theme context provider
 * Applies theme configuration to CSS custom properties
 */
export function ThemeProvider({ children, theme = null }) {
  useEffect(() => {
    if (theme && Object.keys(theme).length > 0) {
      applyThemeFromConfig(theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
  theme: PropTypes.shape({
    // Colors - Header
    titleColor: PropTypes.string,
    subtitleColor: PropTypes.string,
    headerBackgroundColor: PropTypes.string,

    // Colors - Chat
    chatBackgroundColor: PropTypes.string,

    // Colors - Launcher
    launcherColor: PropTypes.string,
    mainColor: PropTypes.string,

    // Colors - Input
    inputBackgroundColor: PropTypes.string,
    inputFontColor: PropTypes.string,
    inputPlaceholderColor: PropTypes.string,

    // Colors - User Messages
    userMessageBubbleColor: PropTypes.string,
    userMessageTextColor: PropTypes.string,

    // Colors - Bot Messages
    botMessageBubbleColor: PropTypes.string,
    botMessageTextColor: PropTypes.string,
    fullScreenBotMessageBubbleColor: PropTypes.string,

    // Colors - Quick Replies
    quickRepliesFontColor: PropTypes.string,
    quickRepliesBackgroundColor: PropTypes.string,
    quickRepliesBorderColor: PropTypes.string,
    quickRepliesBorderWidth: PropTypes.string,

    // Colors - Suggestions
    suggestionsBackgroundColor: PropTypes.string,
    suggestionsSeparatorColor: PropTypes.string,
    suggestionsFontColor: PropTypes.string,
    suggestionsHoverFontColor: PropTypes.string,

    // Dimensions
    widgetHeight: PropTypes.string,
    widgetWidth: PropTypes.string,
    launcherHeight: PropTypes.string,
    launcherWidth: PropTypes.string,
  }),
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;
