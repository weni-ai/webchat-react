import { useEffect, useState, useRef } from 'react';
import './CameraRecording.scss';
import Button from '@/components/common/Button';
import { useChatContext } from '@/contexts/ChatContext';

/**
 * CameraRecording - Camera recording component
 * TODO: Handle camera access error management
 */

export function CameraRecording() {
  const {
    cameraDevices,
    cameraRecordingStream,
    switchToNextCameraDevice,
    stopCameraRecording,
    sendAttachment,
  } = useChatContext();

  const videoRef = useRef(null);
  const [isCameraPaused, setIsCameraPaused] = useState(false);

  useEffect(() => {
    if (cameraRecordingStream) {
      videoRef.current.srcObject = cameraRecordingStream;
    }
  }, [cameraRecordingStream]);

  function pauseCamera() {
    videoRef.current.pause();
  }

  function resumeCamera() {
    videoRef.current.play();
  }

  function sendPhoto() {
    const canvas = document.createElement('canvas');

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

    canvas.toBlob(blob => {
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });

      sendAttachment(file);
      stopCameraRecording();
    }, 'image/jpeg');
  }
  
  return (
    <section className="weni-camera-recording">
      <video
        className="weni-camera-recording__video"
        autoPlay={true}
        ref={videoRef}
        onPlay={() => setIsCameraPaused(false)}
        onPause={() => setIsCameraPaused(true)}
      ></video>

      <footer className="weni-camera-recording__footer">
        <Button
          className="weni-camera-recording__actions__close"
          onClick={stopCameraRecording}
          variant="warning"
          icon="close"
          aria-label="Stop camera recording"
        />

        {(cameraDevices.length > 1) && (
          <Button
            onClick={switchToNextCameraDevice}
            variant="tertiary"
            icon="cameraswitch"
            aria-label="Switch camera"
          />
        )}

        {(!isCameraPaused) && (
          <Button
            onClick={pauseCamera}
            variant="secondary"
            icon="camera_alt"
            aria-label="Take photo"
          />
        )}

        {(isCameraPaused) && (
          <Button
            onClick={resumeCamera}
            variant="secondary"
            icon="replay"
            aria-label="Resume camera"
          />
        )}

        {(isCameraPaused) && (
          <Button
            onClick={sendPhoto}
            variant="primary"
            icon="send"
            aria-label="Send photo"
          />
        )}
      </footer>
    </section>
  )
}

CameraRecording.propTypes = {};

export default CameraRecording;
