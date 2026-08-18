import js from '@eslint/js'
import reactPlugin from 'eslint-plugin-react'

export default [
  js.configs.recommended,
  {
    plugins: { react: reactPlugin },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        EventSource: 'readonly',
        matchMedia: 'readonly',
        console: 'readonly',
      },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(React|_|fn)$' }],
      'no-console': 'off',
      'react/prop-types': 'off',
    },
  },
  {
    files: ['src/**/__tests__/**/*', 'src/**/*.test.*', 'src/**/*.spec.*'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
        test: 'readonly',
      },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
]
