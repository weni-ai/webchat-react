import { forwardRef } from 'react';

import { useChatContext } from '@/contexts/ChatContext';

/**
 * Handles file validation and upload through the service.
 */
export const InputFile = forwardRef((props, ref) => {
  const { sendAttachment, fileConfig } = useChatContext();

  const validateFile = (file) => {
    if (file.size > fileConfig.maxFileSize) {
      throw new Error('File too large');
    }
    if (!fileConfig.allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        validateFile(file);
        sendAttachment(file);
      } catch (error) {
        console.error('File upload error:', error.message);
      }
    }
  };

  return (
    <input
      type="file"
      ref={ref}
      onChange={handleFileSelect}
      accept={fileConfig.acceptAttribute}
      style={{ display: 'none' }}
      {...props}
    />
  );
});

InputFile.displayName = 'InputFile';

export default InputFile;
