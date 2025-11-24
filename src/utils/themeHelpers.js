/**
 * Theme Helpers - Apply config properties to CSS custom properties
 */

/**
 * Map config property names to CSS custom property names
 */
const configToCssVarMap = {
  // Header
  titleColor: '--weni-title-color',
  subtitleColor: '--weni-subtitle-color',
  headerBackgroundColor: '--weni-header-bg-color',

  // Chat Container
  chatBackgroundColor: '--weni-chat-bg-color',
  widgetHeight: '--weni-widget-height',
  widgetWidth: '--weni-widget-width',

  // Launcher
  launcherColor: '--weni-launcher-color',
  mainColor: '--weni-main-color',
  launcherHeight: '--weni-launcher-height',
  launcherWidth: '--weni-launcher-width',

  // Input
  inputBackgroundColor: '--weni-input-bg-color',
  inputFontColor: '--weni-input-font-color',
  inputPlaceholderColor: '--weni-input-placeholder-color',

  // User Messages
  userMessageBubbleColor: '--weni-user-message-bubble-color',
  userMessageTextColor: '--weni-user-message-text-color',

  // Bot Messages
  botMessageBubbleColor: '--weni-bot-message-bubble-color',
  botMessageTextColor: '--weni-bot-message-text-color',
  fullScreenBotMessageBubbleColor: '--weni-fullscreen-bot-message-bubble-color',

  // Quick Replies
  quickRepliesFontColor: '--weni-quick-replies-font-color',
  quickRepliesBackgroundColor: '--weni-quick-replies-bg-color',
  quickRepliesBorderColor: '--weni-quick-replies-border-color',
  quickRepliesBorderWidth: '--weni-quick-replies-border-width',

  // Suggestions
  suggestionsBackgroundColor: '--weni-suggestions-bg-color',
  suggestionsSeparatorColor: '--weni-suggestions-separator-color',
  suggestionsFontColor: '--weni-suggestions-font-color',
  suggestionsHoverFontColor: '--weni-suggestions-hover-font-color',
};

/**
 * Apply theme properties to CSS custom properties
 * @param {Object} themeOrConfig - Theme or config object with style properties
 * @param {HTMLElement} element - Target element (defaults to document.documentElement)
 */
export function applyThemeFromConfig(
  themeOrConfig,
  element = document.documentElement,
) {
  if (!themeOrConfig) return;

  Object.entries(configToCssVarMap).forEach(([configKey, cssVar]) => {
    const value = themeOrConfig[configKey];
    if (value !== undefined && value !== null) {
      element.style.setProperty(cssVar, value);
      // Also set legacy variable for backward compatibility
      const legacyVar = `--${configKey}`;
      element.style.setProperty(legacyVar, value);
    }
  });
}
export default {
  applyThemeFromConfig,
};
