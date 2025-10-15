import { useEffect } from 'react';

import { useChatContext } from '@/contexts/ChatContext';
import Button from '@/components/common/Button';

import './AudioRecorder.scss';

/**
 * AudioRecorder - Component for recording audio messages
 * 
 * Features:
 * - Auto-starts recording when mounted
 * - Visual feedback during recording
 * - Timer display
 * - Cancel option
 * - Uses service for audio logic
 * 
 * TODO: Error handling visual feedback
 */
export const AudioRecorder = () => {
  const { isRecording, recordingDuration, cancelRecording } = useChatContext();

  // Format duration in MM:SS format
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (isRecording) {
        cancelRecording();
      }
    };
  }, []);

  return (
      (isRecording) && (
        <section className="weni-audio-recorder">
          <p className="weni-audio-recorder__timer">
            {formatDuration(recordingDuration)}
          </p>

          <Button
            onClick={cancelRecording}
            variant="tertiary"
            icon="close"
            aria-label="Cancel recording"
          />
        </section>
      )
  );
};

export default AudioRecorder;