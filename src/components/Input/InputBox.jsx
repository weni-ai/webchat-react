import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

import { useChatContext } from '@/contexts/ChatContext';

import Button from '@/components/common/Button';
import { InputFile } from './InputFile';
import AudioRecorder from './AudioRecorder';
import CameraRecording from '@/components/CameraRecording/CameraRecording';
import { VoiceModeButton } from '@/components/VoiceMode';

import './InputBox.scss';

export function InputBox({ maxLength = 5000 }) {
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
    voiceModeState,
    enterVoiceMode,
    exitVoiceMode,
  } = useChatContext();
  const { config } = useChatContext();

  const [text, setText] = useState('');
  const [hasAudioPermissionState, setHasAudioPermissionState] = useState(false);
  const [hasCameraPermissionState, setHasCameraPermissionState] =
    useState(false);

  const fileInputRef = useRef(null);

  const showVoiceButton = isVoiceEnabledByServer && isVoiceModeSupported;

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

  const handleVoiceToggle = () => {
    if (isVoiceModeActive) {
      exitVoiceMode();
    } else {
      enterVoiceMode();
    }
  };

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

  return (
    <section className="weni-input-box">
      <section className="weni-input-box__textarea-container">
        <textarea
          className="weni-input-box__textarea"
          placeholder={config.inputTextFieldHint}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyPress}
          maxLength={maxLength}
          rows={1}
        />

        {!text.trim() && !isVoiceModeActive && config.showCameraRecorder && (
          <Button
            onClick={handleRecordCamera}
            disabled={hasCameraPermissionState === false}
            aria-label="Take photo"
            variant="tertiary"
            icon="add_a_photo"
            iconColor="gray-500"
            className="weni-input-box__photo-icon"
          />
        )}
      </section>

      {!isVoiceModeActive && !text.trim() && (
        <>
          <InputFile ref={fileInputRef} />
          {config.showFileUploader && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="tertiary"
              icon="add_photo_alternate"
              iconColor="gray-900"
              aria-label="Attach file"
            />
          )}

          {config.showAudioRecorder && (
            <Button
              onClick={handleRecordAudio}
              variant="tertiary"
              icon="mic"
              iconColor="gray-900"
              disabled={hasAudioPermissionState === false}
              aria-label="Record audio"
            />
          )}
        </>
      )}

      {!!text.trim() && (
        <Button
          onClick={handleSend}
          variant="primary"
          icon="send"
          aria-label="Send message"
        />
      )}

      {showVoiceButton && (isVoiceModeActive || !text.trim()) && (
        <VoiceModeButton
          onClick={handleVoiceToggle}
          isActive={isVoiceModeActive}
          voiceState={voiceModeState}
        />
      )}
    </section>
  );
}

InputBox.propTypes = {
  maxLength: PropTypes.number,
};

export default InputBox;
