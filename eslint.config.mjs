import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright output — generated per test run, not source. Without this,
    // a local `npm run lint` after any test run sweeps in the HTML report's
    // minified trace-viewer bundle and floods the output with thousands of
    // fake problems from vendored, unformatted code.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
