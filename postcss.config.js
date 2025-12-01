module.exports = {
  plugins: [
    require('postcss-prefix-selector')({
      prefix: '.weni-widget',
      transform: (prefix, selector, prefixedSelector) => {
        if (
          selector.startsWith(prefix) ||
          selector.startsWith(':root') ||
          selector.startsWith('html') ||
          selector.startsWith('body')
        ) {
          return selector;
        }
        return prefixedSelector;
      },
    }),
  ],
};
