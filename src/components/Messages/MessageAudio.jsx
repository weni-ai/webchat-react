import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

import Button from '@/components/common/Button';

import { formatTime } from '@/utils/formatters';

import './MessageAudio.scss';

/**
 * MessageAudio - Audio message component
 *
 * Simple audio player with:
 * - Play/pause button
 * - Range input for progress
 * - Time display
 */
export function MessageAudio({ message }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const togglePlayPause = async () => {
    if (!audioRef.current || hasError) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error toggling audio playback:', error);
      setHasError(true);
    }
  };

  const getDisplayTime = () => {
    if (currentTime < 0.5) {
      return formatTime(duration);
    }

    return formatTime(currentTime);
  };

  const handleProgressChange = (event) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(event.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setHasError(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, []);

  return (
    <section className="weni-message-audio">
      <audio
        ref={audioRef}
        src={message.media}
        preload="metadata"
        style={{ display: 'none' }}
      />

      <Button
        className="weni-message-audio__play-button"
        onClick={togglePlayPause}
        disabled={hasError}
        icon={isPlaying ? 'pause' : 'play_arrow'}
        iconColor="white"
        iconFilled
        variant="tertiary"
        size="small"
        aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
      />

      <input
        className="weni-message-audio__progress-bar"
        type="range"
        min="0"
        max={duration || 0}
        step="0.001"
        value={currentTime}
        onChange={handleProgressChange}
        disabled={hasError || isLoading}
        style={{
          '--progress':
            duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
        }}
      />

      <p className="weni-message-audio__time">{getDisplayTime()}</p>
    </section>
  );
}

MessageAudio.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    media: PropTypes.string.isRequired,
    direction: PropTypes.oneOf(['outgoing', 'incoming']).isRequired,
    duration: PropTypes.number,
    timestamp: PropTypes.number.isRequired,
    status: PropTypes.string,
    metadata: PropTypes.object,
  }).isRequired,
};

export default MessageAudio;
