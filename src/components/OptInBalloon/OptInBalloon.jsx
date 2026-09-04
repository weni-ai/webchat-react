import PropTypes from 'prop-types';

import { FSButton } from '@/components/common/FSButton';
import Icon from '@/components/common/Icon';

import './OptInBalloon.scss';

export function OptInBalloon({ title, body, onOpen, onClose }) {
  return (
    <section className="weni-opt-in-balloon">
      <section
        className="weni-opt-in-balloon__content"
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen?.()}
      >
        <h2 className="weni-opt-in-balloon__title">{title}</h2>
        <p className="weni-opt-in-balloon__body">{body}</p>
      </section>

      <FSButton
        className="weni-opt-in-balloon__close-button"
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

OptInBalloon.propTypes = {
  title: PropTypes.string.isRequired,
  body: PropTypes.string.isRequired,
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
};
