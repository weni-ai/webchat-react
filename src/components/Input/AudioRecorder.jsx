import { useEffect } from 'react';

import { useChatContext } from '@/contexts/ChatContext';
import Button from '@/components/common/Button';
import { formatTime } from '@/utils/formatters';

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
            {formatTime(recordingDuration, 'milliseconds', true)}
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