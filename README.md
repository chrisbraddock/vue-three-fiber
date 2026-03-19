# vue-three-fiber

`vue-three-fiber` is a Vue 3 port of [react-three-fiber](https://github.com/pmndrs/react-three-fiber), the React renderer for [Three.js](https://threejs.org/).

It provides declarative Three.js scene authoring for Vue, keeping high API overlap with R3F where practical and adding Vue-native APIs where Vue offers a better fit: explicit object handles, render lifecycle composables, DOM/scene slot composition, and reactive demand-render helpers. See [Vue Divergences](https://blueraai.github.io/vue-threejs/advanced/vue-divergences) for where and why the two renderers differ.

Requires `vue >= 3.3` and `three >= 0.156`.

## Why

- Declarative Three.js scene authoring with Vue components and composables
- Familiar core APIs: `Canvas`, `useFrame`, `useThree`, `useLoader`, `createPortal`
- Vue-native additions: `useObjectRef`, `useRenderCommit`, `useNextFrame`, `watchInvalidate`
- DOM and 3D stay in one app through slots and `provide` / `inject`
- Demand rendering, loader caching, portals, and a test renderer are included

## Local Usage

There is no published npm package for this repo yet. To work with it locally:

```bash
git clone https://github.com/blueraai/vue-threejs.git
cd vue-threejs
yarn install
yarn build
```

Useful local commands:

```bash
yarn examples      # run the docs site with integrated examples
yarn docs:dev      # run the docs site locally
yarn test          # run the test suite
yarn typecheck     # run TypeScript checks
yarn eslint        # lint source files
```

If you want to consume the renderer from another local project, build this repo first and link to `packages/fiber` as a local package.

## Quick Start

Composables like `useFrame` and `useObjectRef` must be used inside components rendered within `<Canvas>`.

`RotatingBox.vue`:

```vue
<script setup lang="ts">
import type { Mesh } from 'three'
import { useFrame, useObjectRef } from '@bluera/vue-threejs'

const box = useObjectRef<Mesh>()

useFrame((_, delta) => {
  if (box.object.value) {
    box.object.value.rotation.x += delta
    box.object.value.rotation.y += delta * 0.5
  }
})
</script>

<template>
  <mesh :ref="box.ref">
    <boxGeometry />
    <meshStandardMaterial color="orange" />
  </mesh>
</template>
```

`App.vue`:

```vue
<script setup lang="ts">
import { Canvas } from '@bluera/vue-threejs'
import RotatingBox from './RotatingBox.vue'
</script>

<template>
  <Canvas>
    <ambientLight :intensity="0.5" />
    <pointLight :position="[10, 10, 10]" />
    <RotatingBox />
  </Canvas>
</template>
```

## Core APIs

- `Canvas`: sets up the renderer, scene, camera, events, and slots
- `useFrame(callback, priority?)`: run logic on each rendered frame
- `useThree(selector?)`: access renderer state as reactive `ShallowRef`s
- `useLoader(loader, input, extensions?, onProgress?)`: load and cache assets
- `useObjectRef<T>()`: get raw `THREE.Object3D` access without relying on proxy identity
- `useRenderCommit()`: wait for Vue flush plus scene render
- `useNextFrame()`: wait for the next rendered frame
- `useAfterRender(callback)`: register a Vue-scoped post-render callback
- `watchInvalidate(source, options?)`: connect Vue reactivity to `frameloop="demand"`
- `createPortal(...)`: render into another scene container
- `flushSync(fn)`: compatibility export for synchronous scene flushing

## Compatibility Notes

- Template refs are proxy-backed handles, not raw `THREE.Object3D` identity. Property access, method calls, and `instanceof` work directly. Use `useObjectRef` when you need the actual object.
- Vue Suspense keeps previous content visible during async re-entrance. Use explicit loading and scene transition patterns when you need tighter control.
- For new async coordination code, prefer `useRenderCommit` and `useNextFrame` over centering everything on `flushSync`.

## Ecosystem

Vue Three Fiber includes Vue ports of popular [Poimandres](https://github.com/pmndrs) ecosystem packages, connected through a [plugin system](https://blueraai.github.io/vue-threejs/ecosystem/plugins):

| Package                                                          | Ported from                                                                                                    | Description                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [`@bluera/vue-threejs-drei`](packages/drei/)                     | [`@react-three/drei`](https://github.com/pmndrs/drei)                                                          | Controls, loaders, staging, materials, and helpers |
| [`@bluera/vue-threejs-postprocessing`](packages/postprocessing/) | [`@react-three/postprocessing`](https://github.com/pmndrs/react-postprocessing)                                | GPU postprocessing effects                         |
| [`@bluera/vue-threejs-rapier`](packages/rapier/)                 | [`@react-three/rapier`](https://github.com/pmndrs/react-three-rapier)                                          | Rigid-body physics with Rapier                     |
| [`@bluera/vue-threejs-test-renderer`](packages/test-renderer/)   | [`@react-three/test-renderer`](https://github.com/pmndrs/react-three-fiber/tree/master/packages/test-renderer) | Unit testing in Node                               |

All upstream packages are MIT-licensed by [Poimandres](https://github.com/pmndrs). Original copyright notices are preserved in the project [LICENSE](LICENSE).

## Docs

- [Docs Home](https://blueraai.github.io/vue-threejs/)
- [Introduction](https://blueraai.github.io/vue-threejs/getting-started/introduction)
- [Vue Divergences](https://blueraai.github.io/vue-threejs/advanced/vue-divergences)
- [Object Handles](https://blueraai.github.io/vue-threejs/tutorials/object-handles)
- [Demand Rendering](https://blueraai.github.io/vue-threejs/tutorials/demand-rendering)
- [DOM Overlays](https://blueraai.github.io/vue-threejs/tutorials/dom-overlays)
- [Scene Transitions](https://blueraai.github.io/vue-threejs/tutorials/scene-transitions)

## Status

The current direction is:

- explicit documentation for renderer constraints and platform behaviors
- Vue-native APIs for object access, async render coordination, and DOM/scene composition
- a standalone Vue/Three authoring model rather than inherited framework branding

## License

[MIT](LICENSE). This project includes substantial code from [react-three-fiber](https://github.com/pmndrs/react-three-fiber) by [Poimandres](https://github.com/pmndrs), licensed under the same MIT terms. The original copyright notice is preserved in the LICENSE file.

## Credits

Built on the architecture and API design of [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) and the [Poimandres](https://github.com/pmndrs) ecosystem. Ecosystem packages are ported from [drei](https://github.com/pmndrs/drei), [react-postprocessing](https://github.com/pmndrs/react-postprocessing), and [react-three-rapier](https://github.com/pmndrs/react-three-rapier).
