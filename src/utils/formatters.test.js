import formatters, {
  formatTimestamp,
  formatFileSize,
  truncateText,
  parseLinks,
  formatPhoneNumber,
  formatTime,
  sanitizeHTML,
} from './formatters';

describe('formatTimestamp', () => {
  it('returns an empty string when timestamp is falsy', () => {
    expect(formatTimestamp()).toBe('');
    expect(formatTimestamp(null)).toBe('');
    expect(formatTimestamp(0)).toBe('');
  });

  it('formats time by default', () => {
    const ts = new Date('2026-01-15T14:30:00').getTime();
    expect(formatTimestamp(ts)).toBe(
      new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
  });

  it('formats a date', () => {
    const ts = new Date('2026-01-15T14:30:00').getTime();
    expect(formatTimestamp(ts, 'date')).toBe(new Date(ts).toLocaleDateString());
  });

  it('formats a datetime', () => {
    const ts = new Date('2026-01-15T14:30:00').getTime();
    expect(formatTimestamp(ts, 'datetime')).toBe(new Date(ts).toLocaleString());
  });

  it('falls back to time for unknown formats', () => {
    const ts = new Date('2026-01-15T14:30:00').getTime();
    expect(formatTimestamp(ts, 'unknown')).toBe(
      new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
  });
});

describe('formatTimestamp relative', () => {
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns Just now for differences under a minute', () => {
    expect(formatTimestamp(NOW - 15_000, 'relative')).toBe('Just now');
  });

  it('returns minutes ago', () => {
    expect(formatTimestamp(NOW - 5 * 60_000, 'relative')).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(formatTimestamp(NOW - 3 * 60 * 60_000, 'relative')).toBe('3h ago');
  });

  it('returns days ago when under a week', () => {
    expect(formatTimestamp(NOW - 2 * 24 * 60 * 60_000, 'relative')).toBe(
      '2d ago',
    );
  });

  it('falls back to a date string after a week', () => {
    const ts = NOW - 8 * 24 * 60 * 60_000;
    expect(formatTimestamp(ts, 'relative')).toBe(
      new Date(ts).toLocaleDateString(),
    );
  });
});

describe('formatFileSize', () => {
  it('returns 0 Bytes for falsy or zero values', () => {
    expect(formatFileSize()).toBe('0 Bytes');
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('formats bytes, kilobytes, and megabytes', () => {
    expect(formatFileSize(512)).toBe('512 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
  });
});

describe('truncateText', () => {
  it('returns the original value when it is missing or short enough', () => {
    expect(truncateText()).toBeUndefined();
    expect(truncateText('short')).toBe('short');
    expect(truncateText('exactly-ten', 11)).toBe('exactly-ten');
  });

  it('truncates and appends an ellipsis', () => {
    expect(truncateText('abcdefghij', 5)).toBe('abcde...');
  });
});

describe('passthrough formatters', () => {
  it('parseLinks returns the original text', () => {
    expect(parseLinks('see https://example.com')).toBe(
      'see https://example.com',
    );
  });

  it('formatPhoneNumber returns the original number', () => {
    expect(formatPhoneNumber('+5511999999999')).toBe('+5511999999999');
  });

  it('sanitizeHTML keeps safe markup', () => {
    expect(sanitizeHTML('<b>ok</b>')).toBe('<b>ok</b>');
  });

  it('sanitizeHTML strips script tags', () => {
    expect(sanitizeHTML('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>');
  });

  it('sanitizeHTML strips event handlers', () => {
    expect(sanitizeHTML('<img src="x" onerror="alert(1)">')).toBe(
      '<img src="x">',
    );
  });
});

describe('formatTime', () => {
  it('returns a zero clock for non-finite values', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(Infinity, 'seconds', true)).toBe('00:00');
  });

  it('formats seconds without padded minutes by default', () => {
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(5, 'seconds')).toBe('0:05');
  });

  it('formats milliseconds and pads minutes when requested', () => {
    expect(formatTime(90_000, 'milliseconds', true)).toBe('01:30');
  });
});

describe('default export', () => {
  it('exposes the named formatters', () => {
    expect(formatters.formatTimestamp).toBe(formatTimestamp);
    expect(formatters.formatFileSize).toBe(formatFileSize);
    expect(formatters.truncateText).toBe(truncateText);
    expect(formatters.parseLinks).toBe(parseLinks);
    expect(formatters.formatPhoneNumber).toBe(formatPhoneNumber);
    expect(formatters.sanitizeHTML).toBe(sanitizeHTML);
    expect(formatters.formatTime).toBe(formatTime);
  });
});
