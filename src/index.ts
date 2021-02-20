import { PreprocessorGroup } from "svelte/types/compiler/preprocess/types";

type Options = {
  dist: string;
};

type Result = {};

export const sveltePreprocessDts = (
  { dist } = {} as Options
): PreprocessorGroup => {
  return {
    script: ({ content }) => {
      console.log(content);

      return { code: content };
    },
  };
};

export default sveltePreprocessDts;
//script?: Preprocessor;
