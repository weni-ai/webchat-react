import { render, screen } from '@testing-library/react';
import { MessageVideo } from './MessageVideo';

function buildMessage(overrides = {}) {
  return {
    id: 'msg-video-1',
    type: 'video',
    direction: 'outgoing',
    timestamp: 1000,
    ...overrides,
  };
}

describe('MessageVideo', () => {
  it('plays message.media for an https address and a blob URL', () => {
    const { rerender, container } = render(
      <MessageVideo
        message={buildMessage({ media: 'https://example.com/clip.mp4' })}
      />,
    );

    expect(container.querySelector('video')).toHaveAttribute(
      'src',
      'https://example.com/clip.mp4',
    );

    rerender(
      <MessageVideo
        message={buildMessage({ media: 'blob:http://localhost/preview-id' })}
      />,
    );

    expect(container.querySelector('video')).toHaveAttribute(
      'src',
      'blob:http://localhost/preview-id',
    );
    expect(screen.queryByText(/url is marked as required/i)).toBeNull();
  });

  it('updates src when media changes from the blob URL to the official link', () => {
    const { rerender, container } = render(
      <MessageVideo
        message={buildMessage({ media: 'blob:http://localhost/preview-id' })}
      />,
    );

    rerender(
      <MessageVideo
        message={buildMessage({ media: 'https://example.com/clip.mp4' })}
      />,
    );

    expect(container.querySelector('video')).toHaveAttribute(
      'src',
      'https://example.com/clip.mp4',
    );
  });

  it('falls back to url when media is absent', () => {
    const { container } = render(
      <MessageVideo
        message={buildMessage({
          url: 'https://example.com/legacy.mp4',
        })}
      />,
    );

    expect(container.querySelector('video')).toHaveAttribute(
      'src',
      'https://example.com/legacy.mp4',
    );
  });

  it('omits src when neither media nor url is set', () => {
    const { container } = render(<MessageVideo message={buildMessage()} />);
    const video = container.querySelector('video');

    expect(video).toBeTruthy();
    expect(video.getAttribute('src')).toBeNull();
  });
});
