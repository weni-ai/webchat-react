import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  Fragment,
} from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useChatContext } from '@/contexts/ChatContext';

import Button from '@/components/common/Button';
import { FSButton } from '@/components/common/FSButton';
import { Dropdown } from '@/components/common/Dropdown';
import { Tooltip } from '@/components/common/Tooltip';
import { InputFile } from './InputFile';
import AudioRecorder from './AudioRecorder';
import CameraRecording from '@/components/CameraRecording/CameraRecording';
import { VoiceModeButton } from '@/components/VoiceMode';
import { Icon } from '@/components/common/Icon';

import './InputBox.scss';

const fsColorNeutral7 = '#5C5C5C';

export function InputBox({ maxLength = 5000 }) {
  const { t } = useTranslation();

  const {
    isRecording,
    sendMessage,
    stopAndSendAudio,
    requestAudioPermission,
    hasAudioPermission,
    startRecording,
    isCameraRecording,
    hasCameraPermission,
    requestCameraPermission,
    startCameraRecording,
    isVoiceEnabledByServer,
    isVoiceModeSupported,
    isVoiceModeActive,
    isEnteringVoiceMode,
    exitVoiceMode,
    config,
    mode,
    isVoiceModePageActive,
    voiceIntentBanner,
    handleVoiceModeIntent,
    handleCloseVoiceModePage,
  } = useChatContext();

  const [text, setText] = useState('');
  const [hasAudioPermissionState, setHasAudioPermissionState] = useState(false);
  const [hasCameraPermissionState, setHasCameraPermissionState] =
    useState(false);

  const fileInputRef = useRef(null);

  const showVoiceButton = isVoiceEnabledByServer && isVoiceModeSupported;

  const inputTextFieldHint = useMemo(() => {
    if (mode === 'preview') {
      return t(`mode.${mode}.input_placeholder`);
    }

    return config.inputTextFieldHint;
  }, [t, mode, config.inputTextFieldHint]);

  const handleSend = async () => {
    if (isRecording) {
      await stopAndSendAudio();
      return;
    }

    if (text.trim()) {
      sendMessage(text);
      setText('');
      return;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getHasAudioPermission = async () => {
    setHasAudioPermissionState(await hasAudioPermission());
  };

  const getHasCameraPermission = async () => {
    setHasCameraPermissionState(await hasCameraPermission());
  };

  useEffect(() => {
    getHasAudioPermission();
    getHasCameraPermission();
  }, []);

  const handleRecordAudio = async () => {
    if (hasAudioPermissionState === undefined) {
      const audioPermission = await requestAudioPermission();
      setHasAudioPermissionState(audioPermission);

      if (audioPermission) startRecording();
      return;
    }

    if (hasAudioPermissionState) startRecording();
  };

  const handleRecordCamera = async () => {
    let cameraPermission = hasCameraPermissionState;

    if (cameraPermission === undefined) {
      cameraPermission = await requestCameraPermission();
      setHasCameraPermissionState(cameraPermission);
    }

    if (cameraPermission) startCameraRecording();
  };

  const textAreaDefaultAttributes = useMemo(
    () => ({
      placeholder: inputTextFieldHint,
      value: text,
      onChange: (e) => setText(e.target.value),
      onKeyDown: handleKeyPress,
      maxLength: maxLength,
      rows: 1,
      disabled: isEnteringVoiceMode || mode === 'preview',
      className: 'weni-input-box__textarea',
    }),
    [
      inputTextFieldHint,
      text,
      setText,
      handleKeyPress,
      maxLength,
      mode,
      isEnteringVoiceMode,
    ],
  );

  const textareaRef = useRef(null);

  function handleClick(event) {
    if (event.target.dataset.focusable !== 'true') return;
    textareaRef.current.focus();
  }

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return undefined;

    const adjustHeight = () => {
      const el = textareaRef.current;
      if (!el) return;

      el.style.height = 'auto';

      let height;

      if (el.value === '') {
        const temp = el.value;
        el.value = el.placeholder;
        height = el.scrollHeight;
        el.value = temp;
      } else {
        height = el.scrollHeight;
      }

      if (height === 0) {
        return;
      }

      el.style.height = `${height}px`;

      const rectHeight = el.getBoundingClientRect().height;
      const marginBottom = rectHeight - el.scrollHeight;

      if (rectHeight) {
        el.style.marginBottom = `${marginBottom}px`;
      }
    };

    adjustHeight();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      adjustHeight();
    });

    resizeObserver.observe(textarea);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    text,
    inputTextFieldHint,
    isRecording,
    isCameraRecording,
    isVoiceModePageActive,
    isEnteringVoiceMode,
    mode,
  ]);

  const hasNoTextInput = !text.trim();
  const canDisplayCameraRecorder =
    hasNoTextInput &&
    !isVoiceModeActive &&
    !isEnteringVoiceMode &&
    config.showCameraButton;
  const shouldShowMediaActions =
    !isVoiceModeActive && !isEnteringVoiceMode && hasNoTextInput;

  if (isRecording) {
    return (
      <section className="weni-input-box">
        <AudioRecorder />

        <Button
          onClick={handleSend}
          variant="primary"
          icon="send"
          aria-label="Send audio"
        />
      </section>
    );
  }

  if (isCameraRecording) {
    return (
      <section className="weni-input-box">
        <CameraRecording />
      </section>
    );
  }

  if (isVoiceModePageActive) {
    return (
      <section className="voice-mode-page">
        <p
          className={`voice-mode-page__intent-banner ${isVoiceModeActive ? 'voice-mode-page__intent-banner--active' : ''}`}
          role="status"
        >
          {voiceIntentBanner}
        </p>

        <section
          className={`voice-mode-page__loading-indicator ${!isVoiceModeActive ? 'voice-mode-page__loading-indicator--disabled' : ''}`}
        >
          <section className="voice-mode-page__loading-indicator-item"></section>
          <section className="voice-mode-page__loading-indicator-item"></section>

          <section className="voice-mode-page__loading-indicator-icon">
            <Icon
              name="graphic_eq"
              size="x-large"
            />
          </section>
        </section>

        <FSButton
          variant="tertiary"
          onClick={handleCloseVoiceModePage}
          icon="close"
          size="small"
        >
          {t('voice_mode.cancel')}
        </FSButton>
      </section>
    );
  }

  let availableOptions = [];

  if (shouldShowMediaActions && config.showFileUploaderButton) {
    availableOptions.push({
      id: 'attach',
      content: (
        <button
          type="button"
          className="weni-input-box__action-item"
          onClick={() => fileInputRef.current?.click()}
          aria-label={t('input.media_upload_file')}
        >
          <Icon name="attach_file" />
          {t('input.media_upload_file')}
        </button>
      ),
    });
  }

  if (canDisplayCameraRecorder) {
    availableOptions.push({
      id: 'camera',
      content: (
        <button
          type="button"
          className="weni-input-box__action-item"
          onClick={handleRecordCamera}
          disabled={hasCameraPermissionState === false}
          aria-label={t('input.media_camera')}
        >
          <Icon name="photo_camera" />
          {t('input.media_camera')}
        </button>
      ),
    });
  }

  if (shouldShowMediaActions && config.showVoiceRecordingButton) {
    availableOptions.push({
      id: 'voice-record',
      content: (
        <button
          type="button"
          className="weni-input-box__action-item"
          onClick={handleRecordAudio}
          disabled={hasAudioPermissionState === false}
          aria-label={t('input.media_audio')}
        >
          <Icon name="mic" />
          {t('input.media_audio')}
        </button>
      ),
    });
  }

  return (
    <>
      {availableOptions.some(({ id }) => id === 'attach') && (
        <InputFile ref={fileInputRef} />
      )}

      <section
        className="weni-input-box"
        onClick={handleClick}
        data-focusable="true"
      >
        <textarea
          {...textAreaDefaultAttributes}
          ref={textareaRef}
        />

        <section
          className="weni-input-box__footer"
          data-focusable="true"
        >
          {availableOptions.length > 0 && (
            <section className="weni-input-box__media-actions">
              <Dropdown
                placement="left-top"
                panelAriaLabel={t('input.media_menu_region')}
                content={
                  <section className="weni-input-box__dropdown-actions">
                    {availableOptions.map(({ id, content }) => (
                      <Fragment key={id}>{content}</Fragment>
                    ))}
                  </section>
                }
                renderTrigger={(triggerProps, { open }) => (
                  <Tooltip
                    label={t('input.attach_tooltip')}
                    disabled={open}
                  >
                    <FSButton
                      variant="tertiary"
                      size="large"
                      rounded
                      aria-label={t('input.open_media_menu')}
                      {...triggerProps}
                      hoverState={open}
                    >
                      <Icon
                        name="add"
                        size="large"
                        color={fsColorNeutral7}
                      />
                    </FSButton>
                  </Tooltip>
                )}
              />
            </section>
          )}

          {isEnteringVoiceMode && (
            <Button
              variant="primary"
              onClick={exitVoiceMode}
              className="weni-input-box__voice-cancel-btn"
              aria-label={t('voice_mode.cancel')}
            >
              <span className="weni-input-box__voice-cancel-spinner" />
              <span>{t('voice_mode.cancel')}</span>
            </Button>
          )}

          {!isEnteringVoiceMode && showVoiceButton && hasNoTextInput ? (
            <VoiceModeButton onClick={handleVoiceModeIntent} />
          ) : (
            <Button
              onClick={handleSend}
              aria-label="Send message"
              variant="primary"
              icon="arrow_upward"
              size="large"
              rounded
              disabled={!text.trim()}
            />
          )}
        </section>
      </section>
    </>
  );
}

InputBox.propTypes = {
  maxLength: PropTypes.number,
};

export default InputBox;
