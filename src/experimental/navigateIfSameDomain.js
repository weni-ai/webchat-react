import { marked } from 'marked';

import { MESSAGE_STATUS } from '@/utils/constants';

import { isExperimentalEnabled } from './index';

export function navigateIfSameDomain(message, enabledByConfig = false) {
  if (!isExperimentalEnabled('navigateIfSameDomain', enabledByConfig)) {
    return;
  }

  // Streamed messages arrive in chunks, so a partial URL can already match the
  // host and would navigate to a truncated path. Only the finalized text is safe.
  if (message.status === MESSAGE_STATUS.STREAMING) {
    return;
  }

  if (!message.text) {
    return;
  }

  const text = message.text;

  const links = [];
  const tokens = marked.lexer(text);

  function collectLinks(tokens) {
    tokens.forEach((token) => {
      if (token.type === 'link') {
        links.push(token);
      } else if (token.tokens) {
        collectLinks(token.tokens);
      }
    });
  }

  collectLinks(tokens);

  const sameDomainLink = links.find((link) => {
    try {
      return new URL(link.href).host === window.location.host;
    } catch {
      return false;
    }
  });

  if (sameDomainLink) {
    window.location.href = sameDomainLink.href;
  }
}
