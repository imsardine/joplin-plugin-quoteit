import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['api/**', 'dist/**', 'publish/**', '.test-build/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.plugin.configs['eslint-recommended'].overrides[0].rules,
      ...tseslint.plugin.configs.recommended.rules,
      // The CM6 adapter and Markdown parser currently expose untyped host values.
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off',
      // Preserve TypeScript's CommonJS import syntax without permitting bare require calls.
      '@typescript-eslint/no-require-imports': ['error', { allowAsImport: true }],
      curly: ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
