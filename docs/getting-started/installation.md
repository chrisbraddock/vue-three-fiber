---
title: Installation
description: Learn how to use vue-threejs locally today
---

> [!IMPORTANT] > `@bluera/vue-threejs` is not published to npm yet. The package names used throughout the docs describe the intended public interface, but today you should use the repo locally.

## Use the repo locally

Clone the repository, install dependencies, and build the workspace:

```bash
git clone https://github.com/blueraai/vue-threejs.git
cd vue-threejs
yarn install
yarn build
```

Useful local commands:

```bash
yarn examples
yarn docs:dev
yarn test
yarn typecheck
```

## Consume it from another local app

If you want to use the renderer from a separate local Vue app before npm publication, point that app at the package folder directly.

Example `package.json` dependencies:

```json
{
  "dependencies": {
    "@bluera/vue-threejs": "file:../vue-threejs/packages/fiber",
    "three": "^0.172.0",
    "vue": "^3.3.0"
  }
}
```

Then install dependencies in your app as usual and keep the import path unchanged:

```ts
import { Canvas, useFrame } from '@bluera/vue-threejs'
```

> [!WARNING]
> Vue Three Fiber is compatible with Vue 3. It is a Vue renderer, similar to how `vue-dom` works for the browser.

Getting started with Vue Three Fiber is not nearly as hard as you might have thought, but various frameworks may require particular attention.

We've put together guides for getting started with each popular framework:

- Vite.js
- Nuxt
- CDN w/o build tools

## Vite.js

`vite` will work out of the box.

```bash
# Create app
npm create vite my-app

# Select vue as framework

# Install dependencies in your app
cd my-app
npm install three vue
npm install ../vue-threejs/packages/fiber

# Start development server
npm run dev
```

## Nuxt

It should work out of the box but you will encounter untranspiled add-ons in the three.js ecosystem, in that case,

You may need to add three to the `transpile` option in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  build: {
    transpile: ['three'],
  },
})
```

## Without build tools

You can use Vue Three Fiber with browser-ready ES Modules from [esm.sh](https://esm.sh).

> [!WARNING]
> This documents the intended package interface. Until the package is published, prefer the local repo workflow above.

```html
<div id="app"></div>
<canvas id="canvas"></canvas>

<script type="module">
  import { createApp, ref, h } from 'https://esm.sh/vue'
  import { createRoot, extend } from 'https://esm.sh/@bluera/vue-threejs'
  import * as THREE from 'https://esm.sh/three'

  extend(THREE)

  const root = createRoot(document.getElementById('canvas'))
  await root.configure({ camera: { position: [0, 0, 5] } })

  const App = {
    setup() {
      return () =>
        h('mesh', {}, [h('boxGeometry', { args: [1, 1, 1] }), h('meshStandardMaterial', { color: 'orange' })])
    },
  }

  root.render(h(App))
</script>
```
