const {resolve} = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "prettier",
  ],
  plugins: ["@typescript-eslint"],
  env: {node: true},
  settings: {"import/resolver": {typescript: {project}}},
  rules: {
    // Allow empty catch blocks.
    "no-empty": ["error", {allowEmptyCatch: true}],

    // Allow one line arrow functions.
    "@typescript-eslint/no-confusing-void-expression": ["error", {ignoreArrowShorthand: true}],

    // Only allow types rather than interfaces.
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],

    // Only allow {[key: string]: string} rather than Record<string, string>.
    "@typescript-eslint/consistent-indexed-object-style": ["error", "index-signature"],

    // Make sure types are imported as types.
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {prefer: "type-imports", fixStyle: "separate-type-imports"},
    ],

    "@typescript-eslint/no-unused-vars": ["error", {varsIgnorePattern: "^_", argsIgnorePattern: "^_"}],

    "@typescript-eslint/ban-types": ["error", {types: {"{}": false}, extendDefaults: true}],
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
    "dist/",
  ],
  overrides: [
    {
      files: ["*.js?(x)", "*.ts?(x)"],
    },
  ],
};
