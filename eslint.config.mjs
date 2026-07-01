import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: currentDirectory,
  recommendedConfig: js.configs.recommended
});

const eslintConfig = [
  {
    ignores: [".next/**", ".codex-backups/**", "node_modules/**", "prisma/generated/**"]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "inline-type-imports"
        }
      ]
    }
  }
];

export default eslintConfig;
