import PropTypes from 'prop-types';

import { useChatContext } from '@/contexts/ChatContext';

import Button from '@/components/common/Button';

import './QuickReplies.scss';

export function QuickReplies({ quickReplies, disabled }) {
  const { sendMessage } = useChatContext();

  return (
    <section className="weni-quick-replies">
      {quickReplies.map((reply) => (
        <Button key={reply} variant="secondary" disabled={disabled} onClick={() => sendMessage(reply)}>{reply}</Button>
      ))}
    </section>
  );
}

QuickReplies.propTypes = {
  quickReplies: PropTypes.array.isRequired,
  disabled: PropTypes.bool.isRequired
};