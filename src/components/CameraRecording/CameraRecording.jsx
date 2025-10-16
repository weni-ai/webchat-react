import { useEffect, useState, useRef } from 'react';
import './CameraRecording.scss';
import Button from '@/components/common/Button';
import { useChatContext } from '@/contexts/ChatContext';

/**
 * CameraRecording - Camera recording component
 * TODO: Handle camera access error management
 */

export function CameraRecording() {
  const { stopCameraRecording, sendAttachment } = useChatContext();
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  const [isCameraPaused, setIsCameraPaused] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(setObjectStream)
      .catch((error) => {
        if (error.name === 'NotAllowedError') {
          console.log('User has not granted permission to use the camera');
        } else {
          console.log("Something went wrong!", error);
        }

        stopCameraRecording();

        throw error;
      });
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  function enumerateDevices() {
    navigator.mediaDevices.enumerateDevices().then((enumeratedDevices) => {
      const devices = enumeratedDevices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          id: device.deviceId,
          label: device.label,
        }));

      setDevices(devices);
    });
  }

  function loadNextDevice() {
    if (devices.length === 0) {
      return;
    }
    
    const currentDeviceIndex = devices.findIndex((device) => device.id === currentDeviceId);

    if (currentDeviceIndex === -1) {
      loadDeviceId(devices.at(0).id);
      return;
    }

    const nextDevice = devices[(currentDeviceIndex + 1) % devices.length];

    loadDeviceId(nextDevice.id);
  }

  function loadDeviceId(deviceId) {
    navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } })
      .then(setObjectStream);
  }

  function setObjectStream(stream) {
    setStream(stream);
    setCurrentDeviceId(stream.getTracks().at(0).getSettings().deviceId);
    videoRef.current.srcObject = stream;
    enumerateDevices();
  }

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
          aria-label="Switch camera"
        />

        {(devices.length > 1) && (
          <Button
            onClick={loadNextDevice}
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
