const en = require('../../src/i18n/locales/en.json');

function resolve(obj, path) {
  return path.split('.').reduce((cur, key) => cur?.[key], obj);
}

const t = (key, options) =>
  resolve(en, key) ?? options?.defaultValue ?? key;

module.exports = {
  useTranslation: () => ({ t, i18n: { language: 'en' } }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
};
