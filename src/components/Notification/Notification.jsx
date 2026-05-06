import './Notification.scss';
import { Message } from '../Messages/MessagesList';
import { FSButton } from '@/components/common/FSButton';
import PropTypes from 'prop-types';
import Icon from '../common/Icon';

export function Notification({ message, onClose, onOpen }) {
  return (
    <section className="weni-notification">
      <section
        className="weni-notification__content"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen?.()}
      >
        <Message
          message={message}
          componentsEnabled={true}
        />
      </section>

      <FSButton
        className="weni-notification__close-button"
        onClick={onClose}
        aria-label="Close notification"
        variant="tertiary"
        size="small"
        rounded
      >
        <Icon
          name="close"
          size="small"
          color="#1F1F1F"
        />
      </FSButton>
    </section>
  );
}

Notification.propTypes = {
  message: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onOpen: PropTypes.func,
};
