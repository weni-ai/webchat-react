import PropTypes from 'prop-types';
import { useState, useRef } from 'react';

import Button from '@/components/common/Button';
import { useWeniChat } from '@/hooks/useWeniChat';

/**
 * InputBox - Message input component
 * TODO: Implement text input with send button
 * TODO: Add file attachment button
 * TODO: Add audio recording button
 * TODO: Handle emoji picker
 * TODO: Implement send on Enter (Shift+Enter for new line)
 * TODO: Add character limit indicator
 * TODO: Show typing indicator to server
 */
export function InputBox({ placeholder = 'Type a message...', maxLength = 5000 }) {
  const { sendMessage, sendAttachment, isConnected } = useWeniChat();
  const [text, setText] = useState('');
  const fileInputRef = useRef(null);
  
  // TODO: Implement send message logic
  const handleSend = () => {
    if (text.trim()) {
      sendMessage(text);
      setText('');
    }
  };
  
  // TODO: Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // TODO: Handle file attachment
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      sendAttachment(file);
    }
  };
  
  return (
    <div className="weni-input-box">
      {/* TODO: Add attachment button */}
      <Button 
        onClick={() => fileInputRef.current?.click()}
        disabled={!isConnected}
        aria-label="Attach file"
      >
        {/* TODO: Add attach icon */}
      </Button>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {/* TODO: Add audio recording button */}
      
      <textarea
        className="weni-input-textarea"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        maxLength={maxLength}
        disabled={!isConnected}
        rows={1}
      />
      
      {/* TODO: Add emoji picker button */}
      
      <Button
        onClick={handleSend}
        disabled={!isConnected || !text.trim()}
        aria-label="Send message"
      >
        {/* TODO: Add send icon */}
      </Button>
    </div>
  );
}

InputBox.propTypes = {
  placeholder: PropTypes.string,
  maxLength: PropTypes.number
};

export default InputBox;

