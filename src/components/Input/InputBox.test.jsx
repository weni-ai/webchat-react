import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/contexts/ChatContext', () => ({
  useChatContext: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
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
