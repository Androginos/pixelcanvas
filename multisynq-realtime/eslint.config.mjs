import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Disable any rule for now
      "react-hooks/exhaustive-deps": "warn", // Make it warning instead of error
      "react/no-unescaped-entities": "warn" // Make it warning instead of error
    }
  }
];

export default eslintConfig;
