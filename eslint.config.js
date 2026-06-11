// ESLint flat config. Correctness-focused: vue "essential" (real template bugs,
// not formatting) + typescript-eslint recommended. Stylistic noise is left to
// taste on purpose; the gate exists to stop slop, not bikeshed.
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    // Stale eslint-disable comments are themselves slop; error when one no
    // longer suppresses anything.
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      // Existing debt is warn-level so the gate starts green; ratchet to error
      // once the count reaches zero. New code should not add any.
      '@typescript-eslint/no-explicit-any': 'warn',
      // _-prefixed args are the project's "intentionally unused" convention;
      // rest-sibling destructuring (`const { id, ...rest }`) strips properties.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
          caughtErrors: 'none',
        },
      ],
      // The app logs deliberately (pipeline progress, error context).
      'no-console': 'off',
    },
  },
  {
    // Node-context files (config scripts).
    files: ['*.config.{js,ts}', 'scripts/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
