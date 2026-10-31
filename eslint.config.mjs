import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  { ignores: [".next/**", "node_modules/**", "private/**", "test-results/**", "playwright-report/**", "qa-screenshots/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    files: ["src/lib/engine/**/*.ts"],
    rules: {
      "no-restricted-globals": ["error", "fetch"],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Engine must be pure — no clocks." },
        { object: "Math", property: "random", message: "Engine must be pure — no randomness." },
      ],
      "no-restricted-imports": ["error", { patterns: ["react", "react-*", "next/*"] }],
    },
  },
];

export default config;
