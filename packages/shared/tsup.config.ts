import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "types/index": "src/types/index.ts",
    "validations/index": "src/validations/index.ts",
    "constants/index": "src/constants/index.ts",
    "utils/index": "src/utils/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
  treeshake: true,
});
