import tsParser from "@typescript-eslint/parser";

export default [
  { ignores: ["dist/**", "artifacts/**", "coverage/**", "node_modules/**"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "off",
      "no-constant-condition": "warn",
    },
  },
  {
    files: ["scripts/**/*.ts", "test/**/*.ts"],
    rules: { "no-console": "off" },
  },
];
