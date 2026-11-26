import { render, screen } from '@testing-library/react';
import { Notification } from './Notification';

jest.mock('@/hooks/useStreamingBuffer', () => ({
  useStreamingBuffer: ({ text }) => ({
    displayedText: text,
    isBuffering: false,
  }),
}));

describe('Notification — closed-chat privacy (FR-036, BD-003, BD-008)', () => {
  it('renders incoming human agent message text without agent name or opaque id', () => {
    const agentId = 'ha_5f0c3a9e1b7d4c2a8e6f0b1d3c5a7e9f';
    render(
      <Notification
        message={{
          id: 'm-agent-1',
          type: 'text',
          text: 'Your exchange request is ready.',
          timestamp: Date.now(),
          direction: 'incoming',
          status: 'delivered',
          author: {
            type: 'human_agent',
            name: 'Julia',
            id: agentId,
          },
        }}
        onClose={jest.fn()}
        onOpen={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Your exchange request is ready.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Julia')).not.toBeInTheDocument();
    expect(screen.queryByText(agentId)).not.toBeInTheDocument();
  });
});
