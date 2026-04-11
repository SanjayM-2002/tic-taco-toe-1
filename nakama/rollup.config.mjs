import resolve from "@rollup/plugin-node-resolve";
import commonJS from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "./src/main.ts",
  external: ["nakama-runtime"],
  plugins: [resolve(), typescript(), json(), commonJS()],
  treeshake: false,
  output: {
    file: "build/index.js",
    format: "es",
  },
};
