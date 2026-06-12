import { render, screen, fireEvent, act } from '@testing-library/react';

jest.mock('@/components/common/Icon', () => ({
  Icon: () => <span data-testid="icon" />,
}));

import { MessageAudio } from './MessageAudio';

function buildMessage(overrides = {}) {
  return {
    id: 'msg-audio-1',
    type: 'audio',
    direction: 'incoming',
    media: 'https://example.com/voice.mp3',
    timestamp: 1000,
    ...overrides,
  };
}

function getAudioElement(container) {
  return container.querySelector('audio');
}

function setAudioProperty(audio, property, value) {
  Object.defineProperty(audio, property, {
    configurable: true,
    writable: true,
    value,
  });
}

function dispatchMetadataLoaded(container, duration = 90) {
  const audio = getAudioElement(container);
  setAudioProperty(audio, 'duration', duration);
  fireEvent.loadedMetadata(audio);
  return audio;
}

describe('MessageAudio — rendering', () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.pause = jest.fn();
  });

  it('renders the hidden audio element with the message media URL', () => {
    const { container } = render(<MessageAudio message={buildMessage()} />);
    const audio = getAudioElement(container);

    expect(audio).toHaveAttribute('src', 'https://example.com/voice.mp3');
    expect(audio).toHaveAttribute('preload', 'metadata');
  });

  it('renders the play button and progress bar', () => {
    render(<MessageAudio message={buildMessage()} />);

    expect(
      screen.getByRole('button', { name: 'Play audio' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('disables the progress bar while metadata is loading', () => {
    render(<MessageAudio message={buildMessage()} />);

    expect(screen.getByRole('slider')).toBeDisabled();
  });
});

describe('MessageAudio — metadata and time display', () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.pause = jest.fn();
  });

  it('shows total duration after metadata loads', () => {
    const { container } = render(<MessageAudio message={buildMessage()} />);

    dispatchMetadataLoaded(container, 90);

    expect(screen.getByText('1:30')).toBeInTheDocument();
    expect(screen.getByRole('slider')).not.toBeDisabled();
  });

  it('shows current time after playback progresses past 0.5 seconds', () => {
    const { container } = render(<MessageAudio message={buildMessage()} />);
    const audio = dispatchMetadataLoaded(container, 90);

    setAudioProperty(audio, 'currentTime', 45);
    fireEvent.timeUpdate(audio);

    expect(screen.getByText('0:45')).toBeInTheDocument();
  });
});

describe('MessageAudio — playback controls', () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.pause = jest.fn();
  });

  it('plays audio when the play button is clicked', async () => {
    const { container } = render(<MessageAudio message={buildMessage()} />);
    const audio = dispatchMetadataLoaded(container, 60);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play audio' }));
    });

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    fireEvent.play(audio);
    expect(
      screen.getByRole('button', { name: 'Pause audio' }),
    ).toBeInTheDocument();
  });

  it('pauses audio when the pause button is clicked', async () => {
    const { container } = render(<MessageAudio message={buildMessage()} />);
    const audio = dispatchMetadataLoaded(container, 60);

    fireEvent.play(audio);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pause audio' }));
    });

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    fireEvent.pause(audio);
    expect(
      screen.getByRole('button', { name: 'Play audio' }),
    ).toBeInTheDocument();
  });

  it('seeks when the progress bar value changes', () => {
    const { container } = render(<MessageAudio message={buildMessage()} />);
    const audio = dispatchMetadataLoaded(container, 120);
    setAudioProperty(audio, 'currentTime', 0);

    fireEvent.change(screen.getByRole('slider'), { target: { value: '30' } });

    expect(audio.currentTime).toBe(30);
    expect(screen.getByText('0:30')).toBeInTheDocument();
  });

  it('resets state when playback ends', () => {
    const { container } = render(<MessageAudio message={buildMessage()} />);
    const audio = dispatchMetadataLoaded(container, 60);

    fireEvent.play(audio);
    setAudioProperty(audio, 'currentTime', 60);
    fireEvent.timeUpdate(audio);
    fireEvent.ended(audio);

    expect(
      screen.getByRole('button', { name: 'Play audio' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1:00')).toBeInTheDocument();
  });
});

describe('MessageAudio — error handling', () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.pause = jest.fn();
  });

  it('disables controls when the audio element fires an error', () => {
    const { container } = render(<MessageAudio message={buildMessage()} />);
    const audio = getAudioElement(container);

    fireEvent.error(audio);

    expect(screen.getByRole('button', { name: 'Play audio' })).toBeDisabled();
    expect(screen.getByRole('slider')).toBeDisabled();
  });

  it('does not attempt playback when already in an error state', async () => {
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
    const { container } = render(<MessageAudio message={buildMessage()} />);
    const audio = getAudioElement(container);

    fireEvent.error(audio);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play audio' }));
    });

    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('marks the player as errored when play() rejects', async () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    HTMLMediaElement.prototype.play = jest.fn(() =>
      Promise.reject(new Error('playback blocked')),
    );

    const { container } = render(<MessageAudio message={buildMessage()} />);
    dispatchMetadataLoaded(container, 60);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Play audio' }));
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error toggling audio playback:',
      expect.any(Error),
    );
    expect(screen.getByRole('button', { name: 'Play audio' })).toBeDisabled();

    consoleSpy.mockRestore();
  });

  it('clears the error state when a new load starts', () => {
    const { container } = render(<MessageAudio message={buildMessage()} />);
    const audio = getAudioElement(container);

    fireEvent.error(audio);
    fireEvent.loadStart(audio);
    dispatchMetadataLoaded(container, 45);

    expect(
      screen.getByRole('button', { name: 'Play audio' }),
    ).not.toBeDisabled();
    expect(screen.getByText('0:45')).toBeInTheDocument();
  });
});

describe('MessageAudio — cleanup', () => {
  it('removes audio event listeners on unmount', () => {
    const removeListenerSpy = jest.spyOn(
      HTMLMediaElement.prototype,
      'removeEventListener',
    );

    const { container, unmount } = render(
      <MessageAudio message={buildMessage()} />,
    );
    dispatchMetadataLoaded(container, 30);

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith(
      'loadedmetadata',
      expect.any(Function),
    );
    expect(removeListenerSpy).toHaveBeenCalledWith(
      'timeupdate',
      expect.any(Function),
    );

    removeListenerSpy.mockRestore();
  });
});
