import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

// Simplified ESLint config to avoid heavy plugin dependencies in CI/local env
// This preserves basic JS/JSX checks and lets the linter run reliably.
export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage', '.vite']),

  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        process: 'readonly',
        AbortController: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        FileReader: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'smart'],
      'curly': ['error', 'all'],
    },
  },
]);