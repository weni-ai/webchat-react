/* eslint-disable react/prop-types */
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useWeniChat', () => ({
  useWeniChat: jest.fn(),
}));

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('@/components/Notification/Notification', () => ({
  Notification: ({ message }) => (
    <div data-testid="notification">{message.text}</div>
  ),
}));

jest.mock('@/components/common/Badge', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/common/Icon', () => ({
  Icon: ({ name }) => <span data-testid={`icon-${name}`} />,
}));

jest.mock('@/components/common/Avatar', () => ({
  __esModule: true,
  default: () => null,
}));

import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';
import { Launcher } from './Launcher';

function setup({ weniChat = {}, chatContext = {}, hideNotification } = {}) {
  const weniDefaults = {
    isChatOpen: false,
    unreadCount: 0,
    toggleChat: jest.fn(),
    isVoiceModePageActive: false,
    handleCloseVoiceModePage: jest.fn(),
    runVoiceModeEntryFlow: jest.fn(),
    isVoiceModeActive: false,
    isVoiceEnabledByClient: false,
    isVoiceEnabledByServer: false,
    isVoiceModeSupported: false,
  };
  const contextDefaults = {
    config: {},
    title: 'Welcome',
    tooltipMessage: null,
    clearTooltipMessage: jest.fn(),
  };

  useWeniChat.mockReturnValue({ ...weniDefaults, ...weniChat });
  useChatContext.mockReturnValue({ ...contextDefaults, ...chatContext });

  return render(<Launcher hideNotification={hideNotification} />);
}

describe('Launcher — notification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the notification when tooltipMessage is set', () => {
    setup({
      chatContext: { tooltipMessage: { text: 'Need help?' } },
    });

    expect(screen.getByTestId('notification')).toHaveTextContent('Need help?');
  });

  it('does not render the notification when hideNotification is true', () => {
    setup({
      chatContext: { tooltipMessage: { text: 'Need help?' } },
      hideNotification: true,
    });

    expect(screen.queryByTestId('notification')).not.toBeInTheDocument();
  });

  it('renders the notification when hideNotification is false', () => {
    setup({
      chatContext: { tooltipMessage: { text: 'Need help?' } },
      hideNotification: false,
    });

    expect(screen.getByTestId('notification')).toBeInTheDocument();
  });

  it('does not render the notification when tooltipMessage is null', () => {
    setup();

    expect(screen.queryByTestId('notification')).not.toBeInTheDocument();
  });
});
