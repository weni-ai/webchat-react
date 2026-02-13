import { formatPriceWithCurrency } from './currency';

// The i18n module is imported inside currency.js for language detection.
// We mock it to control the language used in Intl.NumberFormat.
jest.mock('@/i18n', () => ({
  language: 'en',
}));

describe('formatPriceWithCurrency', () => {
  describe('with numeric price', () => {
    it('formats a whole number price with USD', () => {
      const result = formatPriceWithCurrency(100, 'USD');
      expect(result).toContain('100');
      expect(result).toMatch(/\$/);
    });

    it('formats a decimal price with BRL', () => {
      const result = formatPriceWithCurrency(49.99, 'BRL');
      expect(result).toContain('49.99');
      expect(result).toMatch(/R\$/);
    });

    it('formats zero correctly', () => {
      const result = formatPriceWithCurrency(0, 'USD');
      expect(result).toContain('0.00');
    });

    it('formats a price with EUR', () => {
      const result = formatPriceWithCurrency(25.5, 'EUR');
      expect(result).toContain('25.50');
      expect(result).toMatch(/€/);
    });
  });

  describe('with string price', () => {
    it('parses a clean string number', () => {
      const result = formatPriceWithCurrency('75.50', 'USD');
      expect(result).toContain('75.50');
    });

    it('strips non-numeric characters from a string price', () => {
      const result = formatPriceWithCurrency('R$ 150.00', 'BRL');
      expect(result).toContain('150.00');
    });

    it('handles a string with only digits', () => {
      const result = formatPriceWithCurrency('200', 'USD');
      expect(result).toContain('200.00');
    });
  });

  describe('currency formatting', () => {
    it('uses narrowSymbol display for currency', () => {
      const resultUSD = formatPriceWithCurrency(10, 'USD');
      // narrowSymbol should use $ instead of US$
      expect(resultUSD).toMatch(/\$/);

      const resultBRL = formatPriceWithCurrency(10, 'BRL');
      expect(resultBRL).toMatch(/R\$/);
    });
  });
});
