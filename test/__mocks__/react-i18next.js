const en = require('../../src/i18n/locales/en.json');

function resolve(obj, path) {
  return path.split('.').reduce((cur, key) => cur?.[key], obj);
}

const t = (key, options) => {
  let value = resolve(en, key) ?? options?.defaultValue ?? key;
  if (typeof value === 'string' && options) {
    value = value.replace(/\{\{(\w+)\}\}/g, (_, name) =>
      options[name] != null ? String(options[name]) : `{{${name}}}`,
    );
  }
  return value;
};

module.exports = {
  useTranslation: () => ({ t, i18n: { language: 'en' } }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
};
