import { useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { useChatContext } from '@/contexts/ChatContext';

import Button from '@/components/common/Button';
import { InputFile } from './InputFile';
import AudioRecorder from './AudioRecorder';
import CameraRecording from '@/components/CameraRecording/CameraRecording';

import './InputBox.scss';

/**
 * InputBox - Message input component
 * TODO: Handle emoji picker
 * TODO: Add character limit indicator
 */
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
    mode,
    interfaceVersion,
  } = useChatContext();
  const { config } = useChatContext();

  const [text, setText] = useState('');
  const [hasAudioPermissionState, setHasAudioPermissionState] = useState(false);
  const [hasCameraPermissionState, setHasCameraPermissionState] =
    useState(false);

  const fileInputRef = useRef(null);

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

  const textAreaDefaultAttributes = useMemo(() => ({
    placeholder: inputTextFieldHint,
    value: text,
    onChange: (e) => setText(e.target.value),
    onKeyDown: handleKeyPress,
    maxLength: maxLength,
    rows: 1,
    disabled: mode === 'preview',
    className: 'weni-input-box__textarea',
  }), [inputTextFieldHint, text, setText, handleKeyPress, maxLength, mode]);

  const recordCameraDefaultAttributes = useMemo(() => ({
    onClick: handleRecordCamera,
    disabled: hasCameraPermissionState === false,
    'aria-label': 'Take photo',
    variant: 'tertiary',
    icon: 'add_a_photo',
    iconColor: 'gray-500',
    className: 'weni-input-box__photo-icon',
  }), [handleRecordCamera, hasCameraPermissionState]);

  const attachFileDefaultAttributes = {
    'aria-label': 'Attach file',
    variant: 'tertiary',
    icon: 'add_photo_alternate',
    iconColor: 'gray-900',
  };

  const recordAudioDefaultAttributes = useMemo(() => ({
    onClick: handleRecordAudio,
    disabled: hasAudioPermissionState === false,
    'aria-label': 'Record audio',
    variant: 'tertiary',
    icon: 'mic',
    iconColor: 'gray-900',
  }), [handleRecordAudio, hasAudioPermissionState]);

  const sendMessageDefaultAttributes = useMemo(() => ({
    onClick: handleSend,
    'aria-label': 'Send message',
    variant: 'primary',
    icon: 'send',
  }), [handleSend]);

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

  if (interfaceVersion === 2) {
    return (
      <InputBoxV2
        text={text}
        config={config}
        textAreaDefaultAttributes={textAreaDefaultAttributes}
        recordCameraDefaultAttributes={recordCameraDefaultAttributes}
        attachFileDefaultAttributes={attachFileDefaultAttributes}
        recordAudioDefaultAttributes={recordAudioDefaultAttributes}
        sendMessageDefaultAttributes={sendMessageDefaultAttributes}
      />
    );
  }

  return (
    <section className="weni-input-box">
      <section className="weni-input-box__textarea-container">
        <textarea
          {...textAreaDefaultAttributes}
        />

        {!text.trim() && config.showCameraRecorder && (
          <Button
            {...recordCameraDefaultAttributes}
          />
        )}
      </section>

      {!text.trim() && (
        <>
          <InputFile ref={fileInputRef} />
          {config.showFileUploader && (
            <Button
              {...attachFileDefaultAttributes}
              onClick={() => fileInputRef.current?.click()}
            />
          )}

          {config.showAudioRecorder && (
            <Button {...recordAudioDefaultAttributes} />
          )}
        </>
      )}

      {!!text.trim() && (
        <Button {...sendMessageDefaultAttributes} />
      )}
    </section>
  );
}

InputBox.propTypes = {
  maxLength: PropTypes.number,
};

export default InputBox;

function InputBoxV2(props) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  function handleClick(event) {
    if (event.target.dataset.focusable !== 'true') return;
    textareaRef.current.focus();
  }
  
  useEffect(() => {
    const textarea = textareaRef.current;

    textarea.style.height = 'auto';

    if (textarea.value === '') {
      const temp = textarea.value;
      textarea.value = textarea.placeholder;
      textarea.style.height = (textarea.scrollHeight) + "px";
      textarea.value = temp;
    } else {
      textarea.style.height = (textarea.scrollHeight) + 'px';
    }
  }, [props.text])

  return (
    <section className="weni-input-box-v2" onClick={handleClick} data-focusable="true">
      <textarea
        {...props.textAreaDefaultAttributes}
        ref={textareaRef}
      />

      <section className="weni-input-box__footer" data-focusable="true">
        <section className="weni-input-box__actions-left">
          <Button
            {...props.recordCameraDefaultAttributes}
            icon="photo_camera"
            iconColor="fg-base-soft"
            noPadding
          />

          <InputFile ref={fileInputRef} />

          {props.config.showFileUploader && (
            <Button
              {...props.attachFileDefaultAttributes}
              onClick={() => fileInputRef.current?.click()}
              icon="attach_file"
              iconColor="fg-base-soft"
              noPadding
            />
          )}

          <Button
            {...props.recordAudioDefaultAttributes}
            iconColor="fg-base-soft"
            noPadding
          />
        </section>
        
        <Button
          {...props.sendMessageDefaultAttributes}
          size="large"
          rounded
          disabled={!props.text.trim()}
        />
      </section>
    </section>
  );
}

InputBoxV2.propTypes = {
  text: PropTypes.string,
  config: PropTypes.shape({
    showCameraRecorder: PropTypes.boolean,
    showFileUploader: PropTypes.boolean,
    showAudioRecorder: PropTypes.boolean,
  }),
  textAreaDefaultAttributes: PropTypes.object,
  recordCameraDefaultAttributes: PropTypes.object,
  attachFileDefaultAttributes: PropTypes.object,
  recordAudioDefaultAttributes: PropTypes.object,
  sendMessageDefaultAttributes: PropTypes.object,
};
