import { defineConfig } from "eslint/config";
import WeniReactConfig from "@weni/eslint-config/react16.js";
import globals from "globals";

export default defineConfig([
  WeniReactConfig,
  {
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },

    rules: {
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_',
        },
      ],
    },

    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]);
