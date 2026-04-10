---
title: Installation
description: How to install and use vue-threejs
---

## Install from npm

```bash
npm install @xperimntl/vue-threejs three vue
```

```ts
import { Canvas, useFrame } from '@xperimntl/vue-threejs'
```

Requires `vue >= 3.3` and `three >= 0.156`.

## Vite.js

```bash
npm create vite my-app
cd my-app
npm install @xperimntl/vue-threejs three
npm run dev
```

### Suppress custom element warnings

vue-threejs renders Three.js objects through a custom renderer, so Vue's template compiler
doesn't recognise tags like `<mesh>` or `<boxGeometry>`. To remove the warnings, pass
`templateCompilerOptions` to the Vue plugin:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import { templateCompilerOptions } from '@bluera/vue-threejs'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(templateCompilerOptions)],
})
```

If you already customise the Vue plugin options, use `isCustomElement` directly:

```ts
import vue from '@vitejs/plugin-vue'
import { isCustomElement } from '@bluera/vue-threejs'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => isCustomElement(tag) || tag.startsWith('my-'),
        },
      },
    }),
  ],
})
```

## Nuxt

Works out of the box. You may need to add three to the `transpile` option:

```ts
export default defineNuxtConfig({
  build: {
    transpile: ['three'],
  },
})
```

Wrap `<Canvas>` in `<ClientOnly>` for SSR.

## Without build tools

```html
<canvas id="canvas"></canvas>

<script type="module">
  import { createApp, ref, h } from 'https://esm.sh/vue'
  import { createRoot, extend } from 'https://esm.sh/@xperimntl/vue-threejs'
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

## Develop locally

To work on the renderer itself:

```bash
git clone https://github.com/chris-xperimntl/vue-threejs.git
cd vue-threejs
yarn install
yarn build
```

```bash
yarn examples      # docs site with interactive demos
yarn docs:dev      # docs dev server
yarn test          # test suite
yarn typecheck     # TypeScript checks
yarn eslint        # lint
```
