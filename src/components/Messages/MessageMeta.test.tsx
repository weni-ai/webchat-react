import { render, screen } from '@testing-library/react';
import { MessageMeta } from './MessageMeta';

let mockLanguage = 'en';

jest.mock('react-i18next', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const en = require('@/i18n/locales/en.json');
  const resolve = (key: string, params?: Record<string, string | number>) => {
    const val = key
      .split('.')
      .reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === 'object'
            ? (acc as Record<string, unknown>)[part]
            : undefined,
        en,
      );
    if (typeof val !== 'string') return key;
    if (!params) return val;
    return val.replace(/\{\{(\w+)\}\}/g, (_, k) =>
      params[k] !== undefined ? String(params[k]) : `{{${k}}}`,
    );
  };
  return {
    useTranslation: () => ({
      t: resolve,
      i18n: {
        get language() {
          return mockLanguage;
        },
      },
    }),
  };
});

describe('MessageMeta', () => {
  const ts = new Date(2026, 10, 3, 14, 32, 0).getTime();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 3, 15, 0, 0));
    mockLanguage = 'en';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders incoming timestamp without status icon', () => {
    render(
      <MessageMeta
        timestamp={ts}
        direction="incoming"
      />,
    );

    expect(screen.getByText('2:32 PM')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it.each([
    ['pending', 'Sending'],
    ['sent', 'Sent at 2:32 PM'],
    ['delivered', 'Delivered · sent at 2:32 PM'],
    ['read', 'Read · sent at 2:32 PM'],
    ['error', 'Failed to send'],
  ] as const)(
    'renders accessible %s status icon with sent-time aria-label',
    (status, expectedLabel) => {
      const { container } = render(
        <MessageMeta
          timestamp={ts}
          direction="outgoing"
          status={status}
          showStatus
        />,
      );

      expect(screen.getByText('2:32 PM')).toBeInTheDocument();
      const statusEl = screen.getByRole('img', { name: expectedLabel });
      expect(statusEl).toHaveClass(`weni-message-meta__status--${status}`);
      // Error state must not display visible text or retry buttons (FR-023)
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(container.textContent).toBe('2:32 PM');
    },
  );

  it('omits status icon when showStatus is false or status is null (AI mode)', () => {
    render(
      <MessageMeta
        timestamp={ts}
        direction="outgoing"
        status={null}
        showStatus
      />,
    );
    expect(screen.getByText('2:32 PM')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('returns null when timestamp is invalid and no status is shown', () => {
    const { container } = render(
      <MessageMeta
        timestamp={0}
        direction="incoming"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('formats 24h time in pt and es locales', () => {
    mockLanguage = 'pt';
    render(
      <MessageMeta
        timestamp={ts}
        direction="outgoing"
        status="delivered"
        showStatus
      />,
    );
    expect(screen.getByText('14:32')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Delivered · sent at 14:32' }),
    ).toBeInTheDocument();
  });
});
