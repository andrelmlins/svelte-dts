# Svelte dts

[![npm version](https://badge.fury.io/js/svelte-dts.svg)](https://www.npmjs.com/package/svelte-dts) &bull; [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/andrelmlins/svelte-dts/blob/master/LICENSE) &bull; [![Node.js CI](https://github.com/andrelmlins/svelte-dts/workflows/Node.js%20CI/badge.svg)](https://github.com/andrelmlins/svelte-dts/actions?query=workflow%3A%22Node.js+CI%22)

Typescript declaration generator for svelte with typescript. Create the declaration files for your library and project. These are the main characteristics of this library:

✨ CLI(Command-line interface)
<br />
✨ Rollup plugin
<br />
✨ Svelte and typescript files

## How it works?

The `svelte-dts` interpret the properties, events and slot properties in the svelte code, using typescript and svelte compiler. The `svelte-dts` too interpret typescript and declaration typescript code, and create default declarations for javascript code.

Observe the code of the `click-counter-button` library that has the `ClickCounterButton` component:

```html
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let initialNumber: number = 0;

  let dispatch = createEventDispatcher<{ change: number }>();
  let number = initialNumber;

  $: dispatch('change', number);
</script>

<button on:click={() => (number += 1)}>Cliques: {number}</button>
```

The result is the generated typescript declarations. Please note below:

```ts
import { SvelteComponentTyped } from 'svelte';

declare module 'click-counter-button' {
  interface ClickCounterButtonProps {
    initialNumber: number;
  }

  class ClickCounterButton extends SvelteComponentTyped<ClickCounterButtonProps, { change: CustomEvent<number> }, {}> {}

  export default ClickCounterButton;
}
```

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
