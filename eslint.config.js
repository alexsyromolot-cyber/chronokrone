import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'release/', 'node_modules/', 'playwright-report/', 'test-results/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Reine Spiellogik darf nichts vom Browser wissen, sonst ist sie nicht
    // deterministisch testbar und nicht in der Simulation (Node) lauffähig.
    files: ['src/core/**/*.ts', 'src/systems/**/*.ts', 'src/data/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'requestAnimationFrame'],
    },
  },
  {
    // Electron-Hauptprozess und Preload laufen als CommonJS (package.json hat "type": "module").
    files: ['electron/**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);
