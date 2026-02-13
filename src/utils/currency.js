import i18n from '@/i18n';

/**
 *
 * @param {number | string} price
 * @param {string} currency
 * @returns {string} The price formatted with the currency symbol
 */
function formatPriceWithCurrency(price, currency) {
  if (typeof price === 'string') {
    price = price.replace(/[^0-9.,]/g, '');
    price = parseFloat(price);
  }

  const language = i18n.language;
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'narrowSymbol',
  }).format(price);
}

export { formatPriceWithCurrency };
