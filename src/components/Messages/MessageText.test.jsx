/* eslint-disable react/prop-types */
import { render, screen } from '@testing-library/react';

const mockUseStreamingBuffer = jest.fn();
let capturedMarkedOptions;

jest.mock('@/hooks/useStreamingBuffer', () => ({
  useStreamingBuffer: (...args) => mockUseStreamingBuffer(...args),
}));

jest.mock('dompurify', () => ({
  sanitize: (value) => value,
}));

jest.mock('marked', () => ({
  marked: {
    use: (options) => {
      capturedMarkedOptions = options;
    },
    parse: (value) => `<p>${value}</p>`,
  },
}));

jest.mock('./TextComponents/ListMessage', () => ({
  ListMessage: ({ buttonText, disabled }) => (
    <div data-testid="list-message">
      {buttonText}:{String(disabled)}
    </div>
  ),
}));

jest.mock('./TextComponents/CallToAction', () => ({
  CallToAction: ({ buttonText, url, disabled }) => (
    <div data-testid="cta">
      {buttonText}:{url}:{String(disabled)}
    </div>
  ),
}));

import { MessageText } from './MessageText';

function baseMessage(overrides = {}) {
  return {
    id: '1',
    type: 'text',
    text: 'Hello',
    timestamp: 1,
    direction: 'incoming',
    status: 'sent',
    ...overrides,
  };
}

describe('MessageText', () => {
  beforeEach(() => {
    capturedMarkedOptions = undefined;
    mockUseStreamingBuffer.mockReturnValue({
      displayedText: 'Hello',
      isBuffering: false,
    });
  });

  it('renders markdown html with the message direction', () => {
    const { container } = render(
      <MessageText
        message={baseMessage()}
        componentsEnabled
      />,
    );
    expect(
      container.querySelector('.weni-message-text--incoming'),
    ).toHaveTextContent('Hello');
  });

  it('passes streaming state into the buffer hook', () => {
    render(
      <MessageText
        message={baseMessage({ status: 'streaming', text: 'Hi' })}
      />,
    );
    expect(mockUseStreamingBuffer).toHaveBeenCalledWith({
      text: 'Hi',
      isStreaming: true,
    });
  });

  it('renders an empty html node when there is no text and no buffer', () => {
    mockUseStreamingBuffer.mockReturnValue({
      displayedText: '',
      isBuffering: false,
    });
    const { container } = render(
      <MessageText message={baseMessage({ text: '' })} />,
    );
    expect(container.querySelector('.weni-message-text').innerHTML).toBe('');
  });

  it('appends a caret while buffering and converts bullet points', () => {
    mockUseStreamingBuffer.mockReturnValue({
      displayedText: '• first\n• second',
      isBuffering: true,
    });
    const { container } = render(<MessageText message={baseMessage()} />);
    expect(container.querySelector('.weni-message-text').innerHTML).toContain(
      '* first',
    );
    expect(container.querySelector('.weni-message-text').innerHTML).toContain(
      '* second',
    );
    expect(container.querySelector('.weni-message-text').innerHTML).toContain(
      'weni-message-text__caret',
    );
  });

  it('strips mailto from string tokens and builds anchors for objects', () => {
    render(<MessageText message={baseMessage()} />);
    expect(capturedMarkedOptions.breaks).toBe(true);
    expect(capturedMarkedOptions.renderer.link('mailto:user@example.com')).toBe(
      'user@example.com',
    );
    expect(
      capturedMarkedOptions.renderer.link({
        href: 'https://example.com',
        text: 'Example',
      }),
    ).toBe('<a target="_blank" href="https://example.com">Example</a>');
    expect(capturedMarkedOptions.renderer.link('https://plain.example')).toBe(
      '<a target="_blank" href="https://plain.example">https://plain.example</a>',
    );
  });

  it('renders list and CTA components when present', () => {
    render(
      <MessageText
        message={baseMessage({
          list_message: {
            button_text: 'Options',
            list_items: [{ title: 'A' }],
          },
          cta_message: {
            display_text: 'Open',
            url: 'https://example.com',
          },
        })}
        componentsEnabled={false}
      />,
    );
    expect(screen.getByTestId('list-message')).toHaveTextContent(
      'Options:true',
    );
    expect(screen.getByTestId('cta')).toHaveTextContent(
      'Open:https://example.com:true',
    );
  });

  it('omits list and CTA when those payloads are absent', () => {
    render(<MessageText message={baseMessage()} />);
    expect(screen.queryByTestId('list-message')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cta')).not.toBeInTheDocument();
  });
});
