import { useState, useRef } from 'react';
import PropTypes from 'prop-types';

import { useWeniChat } from '@/hooks/useWeniChat';
import { useChatContext } from '@/contexts/ChatContext';

import Button from '@/components/common/Button';
import { InputFile } from './InputFile';

import './InputBox.scss';

/**
 * InputBox - Message input component
 * TODO: Handle emoji picker
 * TODO: Add character limit indicator
 */
export function InputBox({ maxLength = 5000 }) {
  const { sendMessage, isConnected } = useWeniChat()
  const { config } = useChatContext();
  const [text, setText] = useState('');
  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(text);
      setText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
          disabled={!isConnected}
          rows={1}
        />

        {!text.trim() &&
          <Button
            disabled={!isConnected}
            aria-label="Take photo"
            variant="tertiary"
            icon="add_a_photo"
            iconColor="gray-500"
            className='weni-input-box__photo-icon'
          />
        }
      </section>

      {(!text.trim()) && (
        <>
          <InputFile ref={fileInputRef} />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="tertiary"
            icon="add_photo_alternate"
            iconColor="gray-900"
            disabled={!isConnected}
            aria-label="Attach file"
          />

          <Button
            onClick={handleSend}
            variant="tertiary"
            icon="mic"
            iconColor="gray-900"
            disabled={!isConnected}
            aria-label="Record audio"
          />
        </>
      )}

      {(!!text.trim()) && (
        <Button
          onClick={handleSend}
          variant="primary"
          icon="send"
          disabled={!isConnected}
          aria-label="Send message"
        />
      )}
    </section>
  );
}

InputBox.propTypes = {
  maxLength: PropTypes.number
};

export default InputBox;

