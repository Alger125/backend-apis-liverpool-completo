import tseslint from 'typescript-eslint';
export default tseslint.config({
  files: ['src/**/*.ts', 'test/**/*.ts'],
  plugins: { '@typescript-eslint': tseslint.plugin },
  languageOptions: { parser: tseslint.parser, parserOptions: { project: './tsconfig.json' } },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-floating-promises': 'error'
  }
});
