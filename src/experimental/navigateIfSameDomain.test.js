/**
 * @jest-environment jsdom
 */

import { marked } from 'marked';

import { navigateIfSameDomain } from '@/experimental/navigateIfSameDomain';

const SAME_DOMAIN_HOST = 'shop.example.test';
const SAME_DOMAIN_ORIGIN = `https://${SAME_DOMAIN_HOST}`;
const SAME_DOMAIN_URL = `${SAME_DOMAIN_ORIGIN}/checkout/?orderFormId=abc123&sc=1`;

const MESSAGE_WITH_SAME_DOMAIN_URL = `Here is a summary of your order.

You can finish checkout here:
${SAME_DOMAIN_URL}`;

function tokensWithBareUrl(text) {
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (!urlMatch) {
    return [{ type: 'paragraph', tokens: [{ type: 'text', text }] }];
  }

  return [
    {
      type: 'paragraph',
      tokens: [
        { type: 'text', text: text.slice(0, urlMatch.index) },
        {
          type: 'link',
          href: urlMatch[0],
          text: urlMatch[0],
        },
      ],
    },
  ];
}

describe('navigateIfSameDomain', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    marked.lexer.mockReset();
    marked.lexer.mockImplementation(tokensWithBareUrl);
    delete window.location;
    window.location = {
      host: SAME_DOMAIN_HOST,
      href: `${SAME_DOMAIN_ORIGIN}/`,
    };
  });

  afterEach(() => {
    window.location = originalLocation;
    localStorage.clear();
  });

  it('does not navigate when the feature flag is disabled', () => {
    navigateIfSameDomain({ text: MESSAGE_WITH_SAME_DOMAIN_URL }, false);
    expect(window.location.href).toBe(`${SAME_DOMAIN_ORIGIN}/`);
  });

  it('navigates for a Message object with a bare same-domain URL', () => {
    navigateIfSameDomain({ text: MESSAGE_WITH_SAME_DOMAIN_URL }, true);

    expect(window.location.href).toBe(SAME_DOMAIN_URL);
  });

  it('does not navigate while the message is still streaming', () => {
    // A partial chunk can already hold a host match, which would navigate to a
    // truncated URL.
    navigateIfSameDomain(
      {
        id: 'stream-1',
        type: 'text',
        text: `You can finish checkout here:\n${SAME_DOMAIN_ORIGIN}/chec`,
        status: 'streaming',
        direction: 'incoming',
      },
      true,
    );

    expect(window.location.href).toBe(`${SAME_DOMAIN_ORIGIN}/`);
  });

  it('does not navigate when message.text is empty (streaming first delta)', () => {
    // Real service emits MESSAGE_RECEIVED on first stream delta with text: ''.
    // The URL only arrives later via MESSAGE_UPDATED.
    navigateIfSameDomain(
      {
        id: 'stream-1',
        type: 'text',
        text: '',
        status: 'streaming',
        direction: 'incoming',
      },
      true,
    );

    expect(window.location.href).toBe(`${SAME_DOMAIN_ORIGIN}/`);
    expect(marked.lexer).not.toHaveBeenCalled();
  });
});
