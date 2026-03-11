module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'database/**', 'frontend/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    rules: {},
  },
];
