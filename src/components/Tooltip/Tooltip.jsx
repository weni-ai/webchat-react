import Button from '@/components/common/Button';

import './Tooltip.scss';
import { Message } from '../Messages/MessagesList';
import PropTypes from 'prop-types';

export function Tooltip({ name, message, onClose }) {
  return (
    <section className="weni-tooltip">
      <header className="weni-tooltip__header">
        <h3 className="weni-tooltip__title">{name}</h3>

        <Button
          className="weni-tooltip__close-button"
          onClick={onClose}
          aria-label="Close tooltip"
          variant="tertiary"
          icon="close"
          iconColor="fg-emphasized"
          size="small"
        />
      </header>

      <Message
        message={message}
        componentsEnabled={true}
      />
    </section>
  );
}

Tooltip.propTypes = {
  name: PropTypes.string.isRequired,
  message: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
