# vue-threejs

[![npm](https://img.shields.io/npm/v/@xperimntl/vue-threejs?style=flat&colorA=09090b&colorB=09090b)](https://www.npmjs.com/package/@xperimntl/vue-threejs)
[![CI](https://img.shields.io/github/actions/workflow/status/chris-xperimntl/vue-threejs/test.yml?branch=master&style=flat&colorA=09090b&colorB=09090b&label=tests)](https://github.com/chris-xperimntl/vue-threejs/actions/workflows/test.yml)
[![docs](https://img.shields.io/badge/docs-live-09090b?style=flat&colorA=09090b)](https://chris-xperimntl.github.io/vue-threejs/)
[![license](https://img.shields.io/github/license/chris-xperimntl/vue-threejs?style=flat&colorA=09090b&colorB=09090b)](LICENSE)

A Vue 3 renderer for [Three.js](https://threejs.org/), ported from [react-three-fiber](https://github.com/pmndrs/react-three-fiber). Declarative scene authoring with Vue composables, DOM/3D slot composition, and reactive demand rendering.

```bash
npm install @xperimntl/vue-threejs three vue
```

## Quick Start

```vue
<script setup lang="ts">
import type { Mesh } from 'three'
import { Canvas, useFrame, useObjectRef } from '@xperimntl/vue-threejs'

const box = useObjectRef<Mesh>()

useFrame((_, delta) => {
  if (box.object.value) {
    box.object.value.rotation.x += delta
    box.object.value.rotation.y += delta * 0.5
  }
})
</script>

<template>
  <Canvas>
    <ambientLight :intensity="0.5" />
    <pointLight :position="[10, 10, 10]" />
    <mesh :ref="box.ref">
      <boxGeometry />
      <meshStandardMaterial color="orange" />
    </mesh>
  </Canvas>
</template>
```

## Features

|                        |                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------- |
| **Declarative scenes** | Vue components map directly to Three.js objects                                   |
| **Fiber-compatible**   | `Canvas`, `useFrame`, `useThree`, `useLoader`, `createPortal`, `extend`           |
| **Vue-native**         | `useObjectRef`, `useRenderCommit`, `useNextFrame`, `watchInvalidate`              |
| **DOM + 3D**           | Canvas `#overlay` and `#error` slots, `provide`/`inject` across boundaries        |
| **Demand rendering**   | `frameloop="demand"` + `watchInvalidate` for zero-waste rendering                 |
| **Plugin system**      | `defineFiberPlugin` for root-scoped extensions (postprocessing, physics, helpers) |

## API

<details>
<summary><strong>Core composables</strong></summary>

| Composable                                  | Purpose                                         |
| ------------------------------------------- | ----------------------------------------------- |
| `useFrame(cb, priority?)`                   | Run logic each rendered frame                   |
| `useThree(selector?)`                       | Access renderer state (gl, scene, camera, size) |
| `useLoader(loader, url, ext?, onProgress?)` | Load and cache assets                           |
| `useObjectRef<T>()`                         | Raw THREE object access with lifecycle tracking |
| `useRenderCommit()`                         | Wait for Vue flush + rendered frame             |
| `useNextFrame()`                            | Promise that resolves after one frame           |
| `useAfterRender(cb)`                        | Post-render hook with auto cleanup              |
| `watchInvalidate(source, opts?)`            | Vue reactivity to demand-mode invalidation      |
| `createPortal(children, container)`         | Render into another scene container             |

</details>

<details>
<summary><strong>Compatibility notes</strong></summary>

- **Refs** are proxy-backed. `instanceof` works, `===` identity does not. Use `useObjectRef` for the raw object.
- **Suspense** keeps previous content visible during re-entrance. Use manual loading patterns for transitions.
- **Events** are raycaster-based, not DOM-based. Pointer capture semantics differ.

See [Known Limitations](https://chris-xperimntl.github.io/vue-threejs/advanced/known-limitations) and [Compatibility Contract](https://chris-xperimntl.github.io/vue-threejs/advanced/compatibility-contract).

</details>

## Ecosystem

Built-in packages ported from [Poimandres](https://github.com/pmndrs):

| Package        | Origin                                                                                                       | What it provides                               |
| -------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| drei           | [@react-three/drei](https://github.com/pmndrs/drei)                                                          | Controls, loaders, staging, materials, helpers |
| postprocessing | [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing)                                | GPU postprocessing effects                     |
| rapier         | [@react-three/rapier](https://github.com/pmndrs/react-three-rapier)                                          | Rigid-body physics                             |
| test-renderer  | [@react-three/test-renderer](https://github.com/pmndrs/react-three-fiber/tree/master/packages/test-renderer) | Node.js testing                                |

## Documentation

[**chris-xperimntl.github.io/vue-threejs**](https://chris-xperimntl.github.io/vue-threejs/)

- [Installation](https://chris-xperimntl.github.io/vue-threejs/getting-started/installation)
- [Interactive Examples](https://chris-xperimntl.github.io/vue-threejs/getting-started/examples)
- [Vue-Native Patterns](https://chris-xperimntl.github.io/vue-threejs/tutorials/vue-native-patterns)
- [Architecture](https://chris-xperimntl.github.io/vue-threejs/advanced/architecture)
- [Support Matrix](https://chris-xperimntl.github.io/vue-threejs/advanced/support-matrix)

<details>
<summary><strong>Develop locally</strong></summary>

```bash
git clone https://github.com/chris-xperimntl/vue-threejs.git
cd vue-threejs
yarn install && yarn build
```

```bash
yarn examples      # docs site with demos
yarn test          # test suite
yarn typecheck     # TypeScript checks
yarn eslint        # lint
```

</details>

## License

[MIT](LICENSE). Includes substantial code from [react-three-fiber](https://github.com/pmndrs/react-three-fiber) by [Poimandres](https://github.com/pmndrs), licensed under the same terms. Ecosystem packages ported from [drei](https://github.com/pmndrs/drei), [react-postprocessing](https://github.com/pmndrs/react-postprocessing), and [react-three-rapier](https://github.com/pmndrs/react-three-rapier).
