import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Shared ESLint base for GebeyaLink packages and apps.
 * App-specific configs (Next.js / Expo) extend this and add their own plugins.
 */
export default [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.next/**', '.expo/**', '.turbo/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },
];
