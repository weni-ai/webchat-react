import { useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useChatContext } from '@/contexts/ChatContext';

import Button from '@/components/common/Button';
import { FSButton } from '@/components/common/FSButton';
import { InputFile } from './InputFile';
import AudioRecorder from './AudioRecorder';
import CameraRecording from '@/components/CameraRecording/CameraRecording';
import { VoiceModeButton } from '@/components/VoiceMode';
import { Icon } from '@/components/common/Icon';

import './InputBox.scss';

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

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';

    if (textarea.value === '') {
      const temp = textarea.value;
      textarea.value = textarea.placeholder;
      textarea.style.height = textarea.scrollHeight + 'px';
      textarea.value = temp;
    } else {
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [text]);
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

        <section className={`voice-mode-page__loading-indicator ${!isVoiceModeActive ? 'voice-mode-page__loading-indicator--disabled' : ''}`}>
          <section className="voice-mode-page__loading-indicator-item"></section>
          <section className="voice-mode-page__loading-indicator-item"></section>

          <section className="voice-mode-page__loading-indicator-icon">
            <Icon name="graphic_eq" size="x-large" />
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

  return (
    <>
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
          <section className="weni-input-box__actions-left">
            {canDisplayCameraRecorder && (
              <Button
                onClick={handleRecordCamera}
                disabled={hasCameraPermissionState === false}
                aria-label="Take photo"
                variant="tertiary"
                icon="photo_camera"
                iconColor="fg-base-soft"
                noPadding
                className="weni-input-box__photo-icon"
              />
            )}

            {shouldShowMediaActions && (
              <>
                <InputFile ref={fileInputRef} />

                {config.showFileUploaderButton && (
                  <Button
                    aria-label="Attach file"
                    onClick={() => fileInputRef.current?.click()}
                    variant="tertiary"
                    icon="attach_file"
                    iconColor="fg-base-soft"
                    noPadding
                  />
                )}

                {config.showVoiceRecordingButton && (
                  <Button
                    onClick={handleRecordAudio}
                    disabled={hasAudioPermissionState === false}
                    aria-label="Record audio"
                    variant="tertiary"
                    icon="mic"
                    iconColor="fg-base-soft"
                    noPadding
                  />
                )}
              </>
            )}
          </section>

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

          {!isEnteringVoiceMode &&
            showVoiceButton &&
            hasNoTextInput ? (
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
            )
          }
        </section>
      </section>
    </>
  );
}

InputBox.propTypes = {
  maxLength: PropTypes.number,
};

export default InputBox;
