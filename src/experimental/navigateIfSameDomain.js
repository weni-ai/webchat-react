import { marked } from 'marked';
import { isExperimentalEnabled } from './index';

export function navigateIfSameDomain(message) {
  if (!isExperimentalEnabled('navigateIfSameDomain')) {
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
