/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('./AudioRecorder', () => ({
  __esModule: true,
  default: () => <div data-testid="audio-recorder" />,
}));

jest.mock('@/components/CameraRecording/CameraRecording', () => ({
  __esModule: true,
  default: () => <div data-testid="camera-recording" />,
}));

jest.mock('./InputFile', () => {
  const React = jest.requireActual('react');
  return {
    InputFile: React.forwardRef((props, ref) => (
      <input
        type="file"
        ref={ref}
        data-testid="file-input"
      />
    )),
  };
});

jest.mock('@/components/VoiceMode', () => ({
  VoiceModeButton: ({ onClick, disabled }) => (
    <button
      type="button"
      aria-label="voice-mode"
      onClick={onClick}
      disabled={disabled}
    >
      voice
    </button>
  ),
}));

jest.mock('@/components/common/Dropdown', () => ({
  Dropdown: ({ content, renderTrigger }) => (
    <div>
      {renderTrigger({ 'data-testid': 'media-trigger' }, { open: false })}
      {renderTrigger({}, { open: true })}
      {content}
    </div>
  ),
}));

jest.mock('@/components/common/Tooltip', () => ({
  Tooltip: ({ children }) => children,
}));

import { useChatContext } from '@/contexts/ChatContext';
import { InputBox } from './InputBox';

const mockSendMessage = jest.fn();
const mockSetInputDraft = jest.fn();

function buildMockContext(overrides = {}) {
  return {
    isRecording: false,
    sendMessage: mockSendMessage,
    stopAndSendAudio: jest.fn(),
    requestAudioPermission: jest.fn(),
    hasAudioPermission: jest.fn().mockResolvedValue(false),
    startRecording: jest.fn(),
    isCameraRecording: false,
    hasCameraPermission: jest.fn().mockResolvedValue(false),
    requestCameraPermission: jest.fn(),
    startCameraRecording: jest.fn(),
    isVoiceEnabledByServer: false,
    isVoiceModeSupported: false,
    isVoiceModeActive: false,
    isEnteringVoiceMode: false,
    exitVoiceMode: jest.fn(),
    config: {
      inputTextFieldHint: 'Type a message',
      showCameraButton: false,
      showVoiceRecordingButton: false,
      showFileUploaderButton: false,
    },
    mode: 'live',
    isConnected: true,
    isVoiceModePageActive: false,
    voiceIntentBanner: null,
    handleVoiceModeIntent: jest.fn(),
    handleCloseVoiceModePage: jest.fn(),
    inputDraft: '',
    setInputDraft: mockSetInputDraft,
    ...overrides,
  };
}

describe('InputBox — inputDraft persistence', () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
    mockSetInputDraft.mockReset();
  });

  it('renders textarea with value from context inputDraft', () => {
    useChatContext.mockReturnValue(
      buildMockContext({ inputDraft: 'pre-typed text' }),
    );
    render(<InputBox />);
    expect(screen.getByRole('textbox')).toHaveValue('pre-typed text');
  });

  it('typing in the textarea calls setInputDraft with the new value', () => {
    useChatContext.mockReturnValue(buildMockContext({ inputDraft: '' }));
    render(<InputBox />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'hello' },
    });
    expect(mockSetInputDraft).toHaveBeenCalledWith('hello');
  });

  it('pressing Enter calls sendMessage and then setInputDraft("")', () => {
    useChatContext.mockReturnValue(buildMockContext({ inputDraft: 'send me' }));
    render(<InputBox />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(mockSendMessage).toHaveBeenCalledWith('send me');
    expect(mockSetInputDraft).toHaveBeenCalledWith('');
  });

  it('does not call sendMessage or setInputDraft when Enter is pressed on empty text', () => {
    useChatContext.mockReturnValue(buildMockContext({ inputDraft: '' }));
    render(<InputBox />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockSetInputDraft).not.toHaveBeenCalled();
  });

  it('does not call sendMessage or setInputDraft when Enter is pressed on whitespace-only text', () => {
    useChatContext.mockReturnValue(buildMockContext({ inputDraft: '   ' }));
    render(<InputBox />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockSetInputDraft).not.toHaveBeenCalled();
  });

  it('while isVoiceModePageActive is true, the voice panel renders and no textarea is present', () => {
    useChatContext.mockReturnValue(
      buildMockContext({
        isVoiceModePageActive: true,
        inputDraft: 'unsent draft',
      }),
    );
    render(<InputBox />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('when remounted with a pre-existing inputDraft from context, textarea shows that value', () => {
    useChatContext.mockReturnValue(
      buildMockContext({ inputDraft: 'preserved text' }),
    );
    const { unmount } = render(<InputBox />);
    unmount();

    render(<InputBox />);
    expect(screen.getByRole('textbox')).toHaveValue('preserved text');
  });
});

describe('InputBox — modes and send', () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
    mockSetInputDraft.mockReset();
  });

  it('uses the preview placeholder and disables the textarea in preview mode', () => {
    useChatContext.mockReturnValue(
      buildMockContext({ mode: 'preview', inputDraft: '' }),
    );
    render(<InputBox />);
    expect(screen.getByRole('textbox')).toHaveAttribute(
      'placeholder',
      'mode.preview.input_placeholder',
    );
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('disables the textarea, send, and voice controls when disconnected', () => {
    useChatContext.mockReturnValue(
      buildMockContext({
        isConnected: false,
        inputDraft: '',
        isVoiceEnabledByServer: true,
        isVoiceModeSupported: true,
      }),
    );
    render(<InputBox />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByLabelText('voice-mode')).toBeDisabled();
  });

  it('keeps the textarea enabled and voice disabled when disconnected in demand mode', () => {
    useChatContext.mockReturnValue(
      buildMockContext({
        isConnected: false,
        inputDraft: '',
        isVoiceEnabledByServer: true,
        isVoiceModeSupported: true,
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: false,
          showVoiceRecordingButton: false,
          showFileUploaderButton: false,
          connectOn: 'demand',
        },
      }),
    );
    render(<InputBox />);
    expect(screen.getByRole('textbox')).toBeEnabled();
    expect(screen.getByLabelText('voice-mode')).toBeDisabled();
  });

  it('sends from the input when disconnected in demand mode', () => {
    useChatContext.mockReturnValue(
      buildMockContext({
        isConnected: false,
        inputDraft: 'first message',
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: false,
          showVoiceRecordingButton: false,
          showFileUploaderButton: false,
          connectOn: 'demand',
        },
      }),
    );
    render(<InputBox />);
    expect(screen.getByRole('textbox')).toBeEnabled();
    expect(screen.getByLabelText('Send message')).toBeEnabled();

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(mockSendMessage).toHaveBeenCalledWith('first message');
    expect(mockSetInputDraft).toHaveBeenCalledWith('');
  });

  it('does not send when Shift+Enter is pressed', () => {
    useChatContext.mockReturnValue(
      buildMockContext({ inputDraft: 'keep typing' }),
    );
    render(<InputBox />);
    fireEvent.keyDown(screen.getByRole('textbox'), {
      key: 'Enter',
      shiftKey: true,
    });
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('sends audio while recording', async () => {
    const stopAndSendAudio = jest.fn().mockResolvedValue();
    useChatContext.mockReturnValue(
      buildMockContext({ isRecording: true, stopAndSendAudio }),
    );
    render(<InputBox />);
    expect(screen.getByTestId('audio-recorder')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Send audio'));
    await waitFor(() => expect(stopAndSendAudio).toHaveBeenCalledTimes(1));
  });

  it('renders the camera recorder while camera recording is active', () => {
    useChatContext.mockReturnValue(
      buildMockContext({ isCameraRecording: true }),
    );
    render(<InputBox />);
    expect(screen.getByTestId('camera-recording')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('closes the voice mode page', () => {
    const handleCloseVoiceModePage = jest.fn();
    useChatContext.mockReturnValue(
      buildMockContext({
        isVoiceModePageActive: true,
        isVoiceModeActive: true,
        voiceIntentBanner: 'Listening',
        handleCloseVoiceModePage,
      }),
    );
    render(<InputBox />);
    expect(screen.getByText('Listening')).toHaveClass(
      'voice-mode-page__intent-banner--active',
    );
    fireEvent.click(screen.getByText('voice_mode.cancel'));
    expect(handleCloseVoiceModePage).toHaveBeenCalledTimes(1);
  });

  it('marks the voice loading indicator as disabled when voice is not active', () => {
    useChatContext.mockReturnValue(
      buildMockContext({
        isVoiceModePageActive: true,
        isVoiceModeActive: false,
        voiceIntentBanner: 'Connecting',
      }),
    );
    const { container } = render(<InputBox />);
    expect(
      container.querySelector('.voice-mode-page__loading-indicator--disabled'),
    ).toBeInTheDocument();
  });

  it('focuses the textarea when a focusable area is clicked', () => {
    useChatContext.mockReturnValue(buildMockContext());
    render(<InputBox />);
    const textarea = screen.getByRole('textbox');
    const focusSpy = jest.spyOn(textarea, 'focus');
    fireEvent.click(textarea.closest('.weni-input-box'));
    expect(focusSpy).toHaveBeenCalled();
  });

  it('does not focus the textarea when the click target is not focusable', () => {
    useChatContext.mockReturnValue(buildMockContext());
    render(<InputBox />);
    const textarea = screen.getByRole('textbox');
    const focusSpy = jest.spyOn(textarea, 'focus');
    fireEvent.click(textarea);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('shows the voice mode button when voice is enabled and the draft is empty', () => {
    const handleVoiceModeIntent = jest.fn();
    useChatContext.mockReturnValue(
      buildMockContext({
        isVoiceEnabledByServer: true,
        isVoiceModeSupported: true,
        handleVoiceModeIntent,
      }),
    );
    render(<InputBox />);
    fireEvent.click(screen.getByLabelText('voice-mode'));
    expect(handleVoiceModeIntent).toHaveBeenCalledTimes(1);
  });

  it('cancels entering voice mode', () => {
    const exitVoiceMode = jest.fn();
    useChatContext.mockReturnValue(
      buildMockContext({ isEnteringVoiceMode: true, exitVoiceMode }),
    );
    render(<InputBox />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('voice_mode.cancel'));
    expect(exitVoiceMode).toHaveBeenCalledTimes(1);
  });

  it('sends the current draft from the send button', () => {
    useChatContext.mockReturnValue(
      buildMockContext({ inputDraft: 'hello there' }),
    );
    render(<InputBox />);
    fireEvent.click(screen.getByLabelText('Send message'));
    expect(mockSendMessage).toHaveBeenCalledWith('hello there');
    expect(mockSetInputDraft).toHaveBeenCalledWith('');
  });
});

describe('InputBox — media actions', () => {
  it('opens the hidden file input from the attach action', () => {
    useChatContext.mockReturnValue(
      buildMockContext({
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: false,
          showVoiceRecordingButton: false,
          showFileUploaderButton: true,
        },
      }),
    );
    render(<InputBox />);
    const fileInput = screen.getByTestId('file-input');
    const clickSpy = jest.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByLabelText('input.media_upload_file'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('starts recording when audio permission is already granted', async () => {
    const startRecording = jest.fn();
    useChatContext.mockReturnValue(
      buildMockContext({
        hasAudioPermission: jest.fn().mockResolvedValue(true),
        startRecording,
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: false,
          showVoiceRecordingButton: true,
          showFileUploaderButton: false,
        },
      }),
    );
    render(<InputBox />);
    await waitFor(() =>
      expect(screen.getByLabelText('input.media_audio')).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByLabelText('input.media_audio'));
    await waitFor(() => expect(startRecording).toHaveBeenCalledTimes(1));
  });

  it('requests audio permission when the current state is undefined', async () => {
    const requestAudioPermission = jest.fn().mockResolvedValue(true);
    const startRecording = jest.fn();
    useChatContext.mockReturnValue(
      buildMockContext({
        hasAudioPermission: jest.fn().mockResolvedValue(undefined),
        requestAudioPermission,
        startRecording,
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: false,
          showVoiceRecordingButton: true,
          showFileUploaderButton: false,
        },
      }),
    );
    render(<InputBox />);
    await waitFor(() =>
      expect(screen.getByLabelText('input.media_audio')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByLabelText('input.media_audio'));
    await waitFor(() => expect(requestAudioPermission).toHaveBeenCalled());
    await waitFor(() => expect(startRecording).toHaveBeenCalledTimes(1));
  });

  it('does not start recording when requested audio permission is denied', async () => {
    const requestAudioPermission = jest.fn().mockResolvedValue(false);
    const startRecording = jest.fn();
    useChatContext.mockReturnValue(
      buildMockContext({
        hasAudioPermission: jest.fn().mockResolvedValue(undefined),
        requestAudioPermission,
        startRecording,
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: false,
          showVoiceRecordingButton: true,
          showFileUploaderButton: false,
        },
      }),
    );
    render(<InputBox />);
    await waitFor(() =>
      expect(screen.getByLabelText('input.media_audio')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByLabelText('input.media_audio'));
    await waitFor(() => expect(requestAudioPermission).toHaveBeenCalled());
    expect(startRecording).not.toHaveBeenCalled();
  });

  it('does not start recording when audio permission is denied', async () => {
    const startRecording = jest.fn();
    useChatContext.mockReturnValue(
      buildMockContext({
        hasAudioPermission: jest.fn().mockResolvedValue(false),
        startRecording,
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: false,
          showVoiceRecordingButton: true,
          showFileUploaderButton: false,
        },
      }),
    );
    render(<InputBox />);
    await waitFor(() =>
      expect(screen.getByLabelText('input.media_audio')).toBeDisabled(),
    );
    expect(startRecording).not.toHaveBeenCalled();
  });

  it('starts the camera when permission is granted', async () => {
    const startCameraRecording = jest.fn();
    useChatContext.mockReturnValue(
      buildMockContext({
        hasCameraPermission: jest.fn().mockResolvedValue(true),
        startCameraRecording,
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: true,
          showVoiceRecordingButton: false,
          showFileUploaderButton: false,
        },
      }),
    );
    render(<InputBox />);
    await waitFor(() =>
      expect(screen.getByLabelText('input.media_camera')).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByLabelText('input.media_camera'));
    await waitFor(() => expect(startCameraRecording).toHaveBeenCalledTimes(1));
  });

  it('requests camera permission when the current state is undefined', async () => {
    const requestCameraPermission = jest.fn().mockResolvedValue(true);
    const startCameraRecording = jest.fn();
    useChatContext.mockReturnValue(
      buildMockContext({
        hasCameraPermission: jest.fn().mockResolvedValue(undefined),
        requestCameraPermission,
        startCameraRecording,
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: true,
          showVoiceRecordingButton: false,
          showFileUploaderButton: false,
        },
      }),
    );
    render(<InputBox />);
    await waitFor(() =>
      expect(screen.getByLabelText('input.media_camera')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByLabelText('input.media_camera'));
    await waitFor(() => expect(requestCameraPermission).toHaveBeenCalled());
    await waitFor(() => expect(startCameraRecording).toHaveBeenCalledTimes(1));
  });

  it('does not start the camera when requested permission is denied', async () => {
    const requestCameraPermission = jest.fn().mockResolvedValue(false);
    const startCameraRecording = jest.fn();
    useChatContext.mockReturnValue(
      buildMockContext({
        hasCameraPermission: jest.fn().mockResolvedValue(undefined),
        requestCameraPermission,
        startCameraRecording,
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: true,
          showVoiceRecordingButton: false,
          showFileUploaderButton: false,
        },
      }),
    );
    render(<InputBox />);
    await waitFor(() =>
      expect(screen.getByLabelText('input.media_camera')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByLabelText('input.media_camera'));
    await waitFor(() => expect(requestCameraPermission).toHaveBeenCalled());
    expect(startCameraRecording).not.toHaveBeenCalled();
  });

  it('hides media actions while voice mode is active', () => {
    useChatContext.mockReturnValue(
      buildMockContext({
        isVoiceModeActive: true,
        config: {
          inputTextFieldHint: 'Type a message',
          showCameraButton: true,
          showVoiceRecordingButton: true,
          showFileUploaderButton: true,
        },
      }),
    );
    render(<InputBox />);
    expect(
      screen.queryByLabelText('input.open_media_menu'),
    ).not.toBeInTheDocument();
  });
});

describe('InputBox — textarea autosize', () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it('observes the textarea when ResizeObserver is available', () => {
    const observe = jest.fn();
    const disconnect = jest.fn();
    globalThis.ResizeObserver = jest.fn(function MockObserver(callback) {
      this.observe = observe;
      this.disconnect = disconnect;
      this.callback = callback;
    });

    useChatContext.mockReturnValue(
      buildMockContext({ inputDraft: 'tall text' }),
    );
    const { unmount } = render(<InputBox />);
    expect(observe).toHaveBeenCalled();
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('uses the placeholder height when the draft is empty', () => {
    useChatContext.mockReturnValue(buildMockContext({ inputDraft: '' }));
    render(<InputBox />);
    const textarea = screen.getByRole('textbox');
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      get: () => 40,
    });
    textarea.getBoundingClientRect = () => ({ height: 48 });
    fireEvent.change(textarea, { target: { value: '' } });
    expect(textarea).toBeInTheDocument();
  });

  it('skips applying height when scrollHeight is 0', () => {
    useChatContext.mockReturnValue(buildMockContext({ inputDraft: 'value' }));
    render(<InputBox />);
    const textarea = screen.getByRole('textbox');
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      get: () => 0,
    });
    textarea.getBoundingClientRect = () => ({ height: 0 });
    fireEvent.change(textarea, { target: { value: 'value' } });
    expect(textarea.style.height).not.toBe('0px');
  });

  it('recomputes height from a ResizeObserver callback', () => {
    let observerCallback;
    globalThis.ResizeObserver = jest.fn(function MockObserver(callback) {
      observerCallback = callback;
      this.observe = jest.fn();
      this.disconnect = jest.fn();
    });
    useChatContext.mockReturnValue(buildMockContext({ inputDraft: 'hello' }));
    render(<InputBox />);
    const textarea = screen.getByRole('textbox');
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      get: () => 32,
    });
    textarea.getBoundingClientRect = () => ({ height: 40 });
    act(() => {
      observerCallback();
    });
    expect(textarea.style.height).toBe('32px');
  });

  it('skips margin updates when the bounding height is 0', () => {
    let observerCallback;
    globalThis.ResizeObserver = jest.fn(function MockObserver(callback) {
      observerCallback = callback;
      this.observe = jest.fn();
      this.disconnect = jest.fn();
    });
    useChatContext.mockReturnValue(buildMockContext({ inputDraft: 'hello' }));
    render(<InputBox />);
    const textarea = screen.getByRole('textbox');
    Object.defineProperty(textarea, 'scrollHeight', {
      configurable: true,
      get: () => 24,
    });
    textarea.getBoundingClientRect = () => ({ height: 0 });
    act(() => {
      observerCallback();
    });
    expect(textarea.style.height).toBe('24px');
    expect(textarea.style.marginBottom).toBe('');
  });

  it('ignores ResizeObserver callbacks after unmount', () => {
    let observerCallback;
    globalThis.ResizeObserver = jest.fn(function MockObserver(callback) {
      observerCallback = callback;
      this.observe = jest.fn();
      this.disconnect = jest.fn();
    });
    useChatContext.mockReturnValue(buildMockContext());
    const { unmount } = render(<InputBox />);
    unmount();
    expect(() => observerCallback()).not.toThrow();
  });
});
