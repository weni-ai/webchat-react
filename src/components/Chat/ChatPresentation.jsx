import { useChatContext } from '@/contexts/ChatContext';
import Avatar from '@/components/common/Avatar';

import './ChatPresentation.scss';

export function ChatPresentation() {
  const { config } = useChatContext();

  return (
    <section className="weni-chat-presentation">
      <section className="weni-chat-presentation__avatar">
        <Avatar
          src={config.profileAvatar}
          name={config.title}
          size="full"
        />
      </section>

      <h1 className="weni-chat-presentation__title">{config.title}</h1>

      {config.subtitle && (
        <h2 className="weni-chat-presentation__subtitle">{config.subtitle}</h2>
      )}
    </section>
  );
}
