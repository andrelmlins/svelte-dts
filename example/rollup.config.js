import path from "path";
import svelte from "rollup-plugin-svelte";
import autoPreprocess from "svelte-preprocess";

const { sveltePreprocessDts } = require(path.join(__dirname, "../dist"));

export default [
  {
    input: "example/FacebookLogin.svelte",
    output: { file: "example/dist/result.js" },
    external: ["svelte/internal"],
    plugins: [
      svelte({ preprocess: [sveltePreprocessDts(), autoPreprocess()] }),
    ],
  },
];
