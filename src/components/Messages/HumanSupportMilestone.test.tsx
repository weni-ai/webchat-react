import { render, screen } from '@testing-library/react';
import { HumanSupportMilestone } from './HumanSupportMilestone';

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

describe('HumanSupportMilestone', () => {
  const START_ID = '6f1d2c3b-4a59-5e6f-8a7b-9c0d1e2f3a4b';
  const END_ID = 'a2b3c4d5-e6f7-5a8b-9c0d-1e2f3a4b5c6d';

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 3, 15, 0, 0));
    mockLanguage = 'en';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders a green success badge for started milestones', () => {
    const occurredAt = new Date(2026, 10, 3, 14, 34, 0).getTime();
    render(
      <HumanSupportMilestone
        event={{ eventId: START_ID, event: 'started', occurredAt }}
      />,
    );

    const badge = screen.getByText('Forwarded to human agent · 2:34 PM');
    expect(badge).toHaveClass('weni-fs-badge--success');
  });

  it('renders a gray neutral badge for ended milestones', () => {
    const occurredAt = new Date(2026, 10, 3, 14, 41, 0).getTime();
    render(
      <HumanSupportMilestone
        event={{ eventId: END_ID, event: 'ended', occurredAt }}
      />,
    );

    const badge = screen.getByText('Human support ended · 2:41 PM');
    expect(badge).toHaveClass('weni-fs-badge--neutral');
  });

  it('formats other-day milestones using pt/es 24h DD/MM format', () => {
    mockLanguage = 'pt';
    const yesterday = new Date(2026, 10, 2, 14, 34, 0).getTime();
    render(
      <HumanSupportMilestone
        event={{ eventId: START_ID, event: 'started', occurredAt: yesterday }}
      />,
    );

    expect(
      screen.getByText('Forwarded to human agent · 02/11 · 14:34'),
    ).toBeInTheDocument();
  });

  it('returns null and logs a PII-free warning on invalid event payload', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <HumanSupportMilestone
        event={{ eventId: 'bad', event: 'unknown', occurredAt: -1 }}
        logContext={{ channelUuid: 'ch-1', messageId: 'm1' }}
      />,
    );

    expect(container.firstChild).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WebChat:HumanSupportStatus]'),
      expect.objectContaining({
        channelUuid: 'ch-1',
        messageId: 'm1',
        reason: 'invalid_milestone',
      }),
    );
    warnSpy.mockRestore();
  });
});
