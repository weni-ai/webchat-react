/**
 * Standalone entry point for script tag usage
 * This file provides WebChat.init() method for backward compatibility
 * with the old weni-webchannel usage pattern
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

import Widget from './components/Widget/Widget';
import { service } from './contexts/ChatContext';
import './styles/index.scss';
import './i18n';

let widgetInstance = null;

async function serviceWhenReady() {
  if (typeof service.onReady === 'function') {
    return await service.onReady();
  } else {
    return service;
  }
}

/**
 * Extract theme properties from params
 * Separates visual customization from functional config
 * Handles both direct properties and customizeWidget (push-webchat legacy)
 */
function extractThemeFromParams(params) {
  // Get customizeWidget object (legacy format)
  const customize = params.customizeWidget || {};

  // Helper to get value from customizeWidget first, then params (for flexibility)
  const getValue = (key) => customize[key] ?? params[key];

  const themeProps = {
    // Colors - Header
    titleColor: getValue('titleColor'),
    subtitleColor: getValue('subtitleColor'),
    headerBackgroundColor: getValue('headerBackgroundColor'),

    // Colors - Chat
    chatBackgroundColor: getValue('chatBackgroundColor'),

    // Colors - Launcher
    launcherColor: getValue('launcherColor') || getValue('mainColor'),
    mainColor: getValue('mainColor'),

    // Colors - Input
    inputBackgroundColor: getValue('inputBackgroundColor'),
    inputFontColor: getValue('inputFontColor'),
    inputPlaceholderColor: getValue('inputPlaceholderColor'),

    // Colors - Messages
    userMessageBubbleColor: getValue('userMessageBubbleColor'),
    userMessageTextColor: getValue('userMessageTextColor'),
    botMessageBubbleColor: getValue('botMessageBubbleColor'),
    botMessageTextColor: getValue('botMessageTextColor'),
    fullScreenBotMessageBubbleColor: getValue(
      'fullScreenBotMessageBubbleColor',
    ),

    // Colors - Quick Replies
    quickRepliesFontColor: getValue('quickRepliesFontColor'),
    quickRepliesBackgroundColor: getValue('quickRepliesBackgroundColor'),
    quickRepliesBorderColor: getValue('quickRepliesBorderColor'),
    quickRepliesBorderWidth: getValue('quickRepliesBorderWidth'),

    // Colors - Suggestions
    suggestionsBackgroundColor: getValue('suggestionsBackgroundColor'),
    suggestionsSeparatorColor: getValue('suggestionsSeparatorColor'),
    suggestionsFontColor: getValue('suggestionsFontColor'),
    suggestionsHoverFontColor: getValue('suggestionsHoverFontColor'),

    // Dimensions
    widgetHeight: getValue('widgetHeight'),
    widgetWidth: getValue('widgetWidth'),
    launcherHeight: getValue('launcherHeight'),
    launcherWidth: getValue('launcherWidth'),
  };

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(themeProps).filter(([_, value]) => value !== undefined),
  );
}

/**
 * Map old params to new config format
 * Ensures backward compatibility with push-webchat
 */
function mapConfig(params) {
  const config = {
    // Required properties
    socketUrl: params.socketUrl,
    channelUuid: params.channelUuid,
    host: params.host,

    // Connection settings
    connectOn: params.connectOn || 'mount',
    storage: params.params?.storage || 'local',
    initPayload: params.initPayload,
    sessionId: params.sessionId,
    sessionToken: params.sessionToken,
    customData: params.customData,
    hideWhenNotConnected: params.hideWhenNotConnected,
    autoClearCache: params.autoClearCache,
    contactTimeout: params.contactTimeout,

    // UI settings
    title: params.title || 'Welcome',
    subtitle: params.subtitle,
    inputTextFieldHint: params.inputTextFieldHint || 'Type a message',
    embedded: params.embedded || false,
    showCloseButton: params.showCloseButton !== false,
    showFullScreenButton: params.showFullScreenButton || false,
    startFullScreen: params.startFullScreen || false,
    displayUnreadCount: params.displayUnreadCount || false,
    showMessageDate: params.showMessageDate || false,
    showHeaderAvatar: params.showHeaderAvatar !== false,
    connectingText: params.connectingText || 'Waiting for server...',
    renderPercentage: params.renderPercentage || 100,

    // Media settings
    docViewer: params.docViewer || false,
    params: params.params,

    // Images/Icons
    profileAvatar: params.profileAvatar,
    openLauncherImage: params.openLauncherImage,
    closeImage: params.closeImage,
    headerImage: params.headerImage,

    // Tooltips
    tooltipMessage: params.tooltipMessage,
    tooltipDelay: params.tooltipDelay || 500,
    disableTooltips: params.disableTooltips || false,

    // Experimental flags
    navigateIfSameDomain: params.navigateIfSameDomain,

    // Callbacks
    onSocketEvent: params.onSocketEvent,
    onWidgetEvent: params.onWidgetEvent,
    handleNewUserMessage: params.handleNewUserMessage,
    customMessageDelay: params.customMessageDelay,
    customComponent: params.customComponent,
    customAutoComplete: params.customAutoComplete,

    // Suggestions
    suggestionsConfig: params.suggestionsConfig,

    // Legacy support
    selector: params.selector,
  };

  // Remove undefined values to keep config clean
  return Object.fromEntries(
    Object.entries(config).filter(([_, value]) => value !== undefined),
  );
}

/**
 * Initialize WebChat widget
 * @param {Object} params - Configuration parameters
 */
function init(params) {
  if (!params.selector) {
    console.error('WebChat: selector is required');
    return;
  }

  const container = document.querySelector(params.selector);
  if (!container) {
    console.error(
      `WebChat: element not found for selector "${params.selector}"`,
    );
    return;
  }

  // Map config (functional properties)
  const config = mapConfig(params);

  // Extract theme (visual properties)
  const theme = extractThemeFromParams(params);

  // Widget props - config and theme separated
  const widgetProps = {
    config,
    theme: Object.keys(theme).length > 0 ? theme : null,
  };

  // Render widget
  try {
    widgetInstance = ReactDOM.createRoot(container);
    widgetInstance.render(
      <React.StrictMode>
        <Widget {...widgetProps} />
      </React.StrictMode>,
    );

    console.log('WebChat initialized successfully');
  } catch (error) {
    console.error('WebChat: Failed to initialize', error);
  }
}

/**
 * Destroy widget instance
 */
function destroy() {
  if (widgetInstance) {
    widgetInstance.unmount();
    widgetInstance = null;
  }
}

/**
 * Open chat window
 * @returns {Promise<void>}
 */
async function open() {
  const service = await serviceWhenReady();
  await service.setIsChatOpen(true);
}

/**
 * Close chat window
 * @returns {Promise<void>}
 */
async function close() {
  const service = await serviceWhenReady();
  await service.setIsChatOpen(false);
}

/**
 * Toggle chat window
 * @returns {Promise<void>}
 */
async function toggle() {
  const service = await serviceWhenReady();
  const isOpen = await service.getIsChatOpen();
  await service.setIsChatOpen(!isOpen);
}

/**
 * Send message programmatically
 * @param {string} message
 * @param {Object} options
 * @returns {Promise<void>}
 */
async function send(message, options = {}) {
  const service = await serviceWhenReady();
  await service.sendMessage(message, options);
}

/**
 * Clear chat messages while keeping session and connection
 * @returns {Promise<void>}
 */
async function clear() {
  const service = await serviceWhenReady();
  service.clearMessages();
}

/**
 * Set session ID
 * If there's an active session, restarts it with the new ID
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
async function setSessionId(sessionId) {
  const service = await serviceWhenReady();
  await service.setSessionId(sessionId);
}

/**
 * Set context
 */
async function setContext(context) {
  const service = await serviceWhenReady();
  service.setContext(context);
}

/**
 * Get context
 */
async function getContext() {
  const service = await serviceWhenReady();
  return service.getContext();
}

/**
 * Set custom field
 */
async function setCustomField(field, value) {
  const service = await serviceWhenReady();
  service.setCustomField(field, value);
}

/**
 * Check if chat is open
 * @returns {Promise<boolean>}
 */
async function isOpen() {
  const service = await serviceWhenReady();
  return service.getIsChatOpen();
}

/**
 * Check if chat is visible
 * TODO: Implement via service state
 */
function isVisible() {
  console.warn('WebChat.isVisible() - Not implemented yet');
  // TODO: Check widget state
  return false;
}

/**
 * Reload widget
 */
function reload() {
  console.warn('WebChat.reload() - Not implemented yet');
  // TODO: Implement reload logic
}

// Export WebChat API
const WebChat = {
  init,
  destroy,
  open,
  close,
  toggle,
  send,
  clear,
  setSessionId,
  setContext,
  getContext,
  setCustomField,
  isOpen,
  isVisible,
  reload,
};

WebChat.default = WebChat;

// Expose to window for script tag usage
if (typeof window !== 'undefined') {
  window.WebChat = { default: WebChat };
}

export default WebChat;
