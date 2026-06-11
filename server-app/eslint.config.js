import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import * as importPlugin from "eslint-plugin-import-x";
import node from "eslint-plugin-n";
import prettierPlugin from "eslint-plugin-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      node,
      "import-x": importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "warn",
      "node/file-extension-in-import": ["error", "always"],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  prettier,
];
