# Svelte dts

[![npm version](https://badge.fury.io/js/svelte-dts.svg)](https://www.npmjs.com/package/svelte-dts) &bull; [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/andrelmlins/svelte-dts/blob/master/LICENSE) &bull; [![Node.js CI](https://github.com/andrelmlins/svelte-dts/workflows/Node.js%20CI/badge.svg)](https://github.com/andrelmlins/svelte-dts/actions?query=workflow%3A%22Node.js+CI%22)

Typescript declaration generator for svelte with typescript. These are the main characteristics of this library:

✨ CLI(Command-line interface)
<br />
✨ Rollup plugin
<br />
✨ Transpile typescript in the svelte file

## Installation

```
npm i svelte-dts
// OR
yarn add svelte-dts
```

## Using with rollup

```js
import typescript from '@rollup/plugin-typescript';
import svelte from 'rollup-plugin-svelte';
import autoPreprocess from 'svelte-preprocess';
import svelteDts from 'svelte-dts';

export default [
  {
    input: 'src/lib/App.svelte',
    external: ['svelte/internal'],
    plugins: [svelteDts(), svelte({ preprocess: autoPreprocess() }), typescript()],
  },
];
```

### Options

| Option | Type   | Description     |
| ------ | ------ | --------------- |
| output | string | App output file |

## Using with cli

```sh
svelte-dts -i src/index.ts -o dist/index.d.ts
```

### Options

| Option                         | Alias           | Description     |
| ------------------------------ | --------------- | --------------- |
| <code>--input [input]</code>   | <code>-i</code> | App input file  |
| <code>--output [output]</code> | <code>-o</code> | App output file |

## NPM Statistics

Download stats for this NPM package

[![NPM](https://nodei.co/npm/svelte-dts.png)](https://nodei.co/npm/svelte-dts/)

## License

Svelte dts is open source software [licensed as MIT](https://github.com/andrelmlins/svelte-dts/blob/master/LICENSE).
