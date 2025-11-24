import PropTypes from 'prop-types';
import './Radio.scss';

export function Radio({
  value,
  onChange = () => {},
  checked,
  name,
  id,
  label,
}) {
  return (
    <section className="weni-radio">
      <input
        className="weni-radio__input"
        type="radio"
        value={value}
        onChange={onChange}
        checked={checked}
        name={name}
        id={id}
      />

      <label
        className="weni-radio__label"
        htmlFor={id}
      >
        {label}
      </label>
    </section>
  );
}

Radio.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  checked: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};
