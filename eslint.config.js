module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'database/**'],
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
