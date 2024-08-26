// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const ignoreRules = [{
  ignores: ["dist/*"],
}];

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...ignoreRules
);
