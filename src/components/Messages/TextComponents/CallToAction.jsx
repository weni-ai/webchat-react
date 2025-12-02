import PropTypes from 'prop-types';

import Icon from '@/components/common/Icon';
import Button from '@/components/common/Button';

import './CallToAction.scss';
export function CallToAction({ buttonText, url, disabled = false }) {
  return (
    <section className="weni-call-to-action">
      <Button
        key={buttonText}
        variant="secondary"
        disabled={disabled}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon
          name="open_in_new"
          size="medium"
        />
        {buttonText}
      </Button>
    </section>
  );
}

CallToAction.propTypes = {
  buttonText: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
};
