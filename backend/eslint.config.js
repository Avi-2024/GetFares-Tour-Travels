export default [
  {
    ignores: ["node_modules/**", "coverage/**", "database/**", "frontend/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {},
  },
];
