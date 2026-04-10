---
title: Composables
description: Composables are the heart of vue-threejs
---

Composables allow you to tie or request specific information to your component. For instance, components that want to participate in the renderloop can use `useFrame`, components that need to be informed of three.js specifics can use `useThree` and so on. All composables clean up after themselves once the component unmounts.

> [!NOTE]
> Composables can only be used inside the Canvas element because they rely on provide/inject context!

You cannot expect something like this to work:

```vue
<script setup>
import { useThree } from '@xperimntl/vue-threejs'

// This will just crash -- not inside Canvas context
const { size } = useThree()
</script>

<template>
  <Canvas>
    <mesh />
  </Canvas>
</template>
```

Do this instead:

```vue
<script setup>
// Foo.vue -- used inside Canvas
import { useThree } from '@xperimntl/vue-threejs'

const size = useThree((state) => state.size)
</script>
```

```vue
<template>
  <Canvas>
    <Foo />
  </Canvas>
</template>
```

## `useThree`

This composable gives you access to the state model which contains the default renderer, the scene, your camera, and so on. It also gives you the current size of the canvas in screen and viewport coordinates. In Vue, `useThree` returns `ShallowRef<T>` values -- access them with `.value`.

```js
import { useThree } from '@xperimntl/vue-threejs'

// Inside a component rendered within Canvas:
const state = useThree()
```

The composable is reactive, if you resize the browser for instance, you get fresh measurements, same applies to any of the state objects that may change.

### `state` properties

| Prop              | Description                                                  | Type                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gl`              | Renderer                                                     | `THREE.WebGLRenderer`                                                                                                                                                                                          |
| `scene`           | Scene                                                        | `THREE.Scene`                                                                                                                                                                                                  |
| `camera`          | Camera                                                       | `THREE.PerspectiveCamera`                                                                                                                                                                                      |
| `raycaster`       | Default raycaster                                            | `THREE.Raycaster`                                                                                                                                                                                              |
| `pointer`         | Contains updated, normalized, centric pointer coordinates    | `THREE.Vector2`                                                                                                                                                                                                |
| `clock`           | Running system clock                                         | `THREE.Clock`                                                                                                                                                                                                  |
| `linear`          | True when the colorspace is linear                           | `boolean`                                                                                                                                                                                                      |
| `flat`            | True when no tonemapping is used                             | `boolean`                                                                                                                                                                                                      |
| `legacy`          | Disables global color management via `THREE.ColorManagement` | `boolean`                                                                                                                                                                                                      |
| `frameloop`       | Render mode: always, demand, never                           | `always`, `demand`, `never`                                                                                                                                                                                    |
| `performance`     | System regression                                            | `{ current: number, min: number, max: number, debounce: number, regress: () => void }`                                                                                                                         |
| `size`            | Canvas size in pixels                                        | `{ width: number, height: number, top: number, left: number }`                                                                                                                                                 |
| `viewport`        | Canvas viewport size in three.js units                       | `{ width: number, height: number, initialDpr: number, dpr: number, factor: number, distance: number, aspect: number, getCurrentViewport: (camera?: Camera, target?: THREE.Vector3, size?: Size) => Viewport }` |
| `xr`              | XR interface, manages WebXR rendering                        | `{ connect: () => void, disconnect: () => void }`                                                                                                                                                              |
| `set`             | Allows you to set any state property                         | `(state: SetState<RootState>) => void`                                                                                                                                                                         |
| `get`             | Allows you to retrieve any state property non-reactively     | `() => GetState<RootState>`                                                                                                                                                                                    |
| `invalidate`      | Request a new render, given that `frameloop === 'demand'`    | `() => void`                                                                                                                                                                                                   |
| `advance`         | Advance one tick, given that `frameloop === 'never'`         | `(timestamp: number, runGlobalEffects?: boolean) => void`                                                                                                                                                      |
| `setSize`         | Resize the canvas                                            | `(width: number, height: number, top?: number, left?: number) => void`                                                                                                                                         |
| `setDpr`          | Set the pixel-ratio                                          | `(dpr: number) => void`                                                                                                                                                                                        |
| `setFrameloop`    | Shortcut to set the current render mode                      | `(frameloop?: 'always', 'demand', 'never') => void`                                                                                                                                                            |
| `setEvents`       | Shortcut to setting the event layer                          | `(events: Partial<EventManager<any>>) => void`                                                                                                                                                                 |
| `onPointerMissed` | Response for pointer clicks that have missed a target        | `() => void`                                                                                                                                                                                                   |
| `events`          | Pointer-event handling                                       | `{ connected: TargetNode, handlers: Events, connect: (target: TargetNode) => void, disconnect: () => void }`                                                                                                   |

### Selector

You can also select properties, this allows you to avoid needless re-render for components that are interested only in particulars. Reactivity does not include deeper three.js internals!

```js
// Will only trigger re-render when the default camera is exchanged
const camera = useThree((state) => state.camera)
// Will only re-render on resize changes
const viewport = useThree((state) => state.viewport)
// You cannot expect reactivity from three.js internals!
const zoom = useThree((state) => state.camera.zoom)
```

### Reading state from outside of the component cycle

```js
const get = useThree((state) => state.get)
// ...
get() // Get fresh state from anywhere you want
```

### Exchanging defaults

```vue
<script setup>
import { onMounted } from 'vue'
import { useThree } from '@xperimntl/vue-threejs'

const set = useThree((state) => state.set)

onMounted(() => {
  set({ camera: new THREE.OrthographicCamera(/* ... */) })
})
</script>
```

## `useFrame`

This composable allows you to execute code on every rendered frame, like running effects, updating controls, and so on. You receive the state (same as `useThree`) and a clock delta. Your callback function will be invoked just before a frame is rendered. When the component unmounts it is unsubscribed automatically from the render-loop.

```js
import { useFrame } from '@xperimntl/vue-threejs'

// Inside a component rendered within Canvas:
useFrame((state, delta, xrFrame) => {
  // This function runs at the native refresh rate inside of a shared render-loop
})
```

> [!CAUTION]
> Be careful about what you do inside useFrame! You should never update reactive state in there! Your calculations should be slim and
> you should mind all the commonly known pitfalls when dealing with loops in general, like re-use of variables, etc.

### Taking over the render-loop

If you need more control you may pass a numerical `renderPriority` value. This will cause vue-threejs to disable automatic rendering altogether. It will now be your responsibility to render, which is useful when you're working with effect composers, heads-up displays, etc.

```js
// Takes over the render-loop, the user has the responsibility to render
useFrame(({ gl, scene, camera }) => {
  gl.render(scene, camera)
}, 1)

// This will execute *after* the above useFrame
useFrame(({ gl }) => {
  gl.render(/* ... */)
}, 2)
```

> [!NOTE]
> Callbacks will be executed in order of ascending priority values (lowest first, highest last.), similar to the DOM's z-order.

### Negative indices

Using negative indices will **not take over the render loop**, but it can be useful if you really must order the sequence of useFrames across the component tree.

```js
// This will execute first
useFrame(() => {
  /* ... */
}, -2)

// This useFrame will execute *after* the one above
useFrame(() => {
  /* ... */
}, -1)
```

## `useLoader`

This composable loads assets and suspends for easier fallback- and error-handling. It can take any three.js loader as its first argument: GLTFLoader, OBJLoader, TextureLoader, FontLoader, etc.

```vue
<script setup>
import { useLoader } from '@xperimntl/vue-threejs'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const result = useLoader(GLTFLoader, '/model.glb')
// result is a ShallowRef, access with result.value when loaded
</script>

<template>
  <Suspense>
    <primitive v-if="result" :object="result.scene" />
  </Suspense>
</template>
```

> [!NOTE]
> Assets loaded with useLoader are cached by default. The urls given serve as cache-keys. This allows you to re-use loaded data everywhere in the component tree.

> [!WARNING]
> Be very careful with mutating or disposing of loaded assets, especially when you plan to re-use them. Refer to the automatic disposal section in the API.

### Loader extensions

You can provide a callback as the third argument if you need to configure your loader:

```js
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

useLoader(GLTFLoader, url, (loader) => {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco-gltf/')
  loader.setDRACOLoader(dracoLoader)
})
```

### Loading multiple assets at once

It can also make multiple requests in parallel:

```js
const [bumpMap, specMap, normalMap] = useLoader(TextureLoader, [url1, url2, url2])
```

### Loading status

You can get the loading status from a callback you provide as the fourth argument. Though consider alternatives like THREE.DefaultLoadingManager or better yet, [`@xperimntl/vue-threejs-drei`](/ecosystem/drei)'s loading helpers like `useGLTF` and `useTexture`.

```js
useLoader(loader, url, extensions, (xhr) => {
  console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
})
```

### Special treatment of GLTFLoaders and all loaders that return a scene prop

If a `result.scene` prop is found the composable will automatically create a object & material collection: `{ nodes, materials }`. This lets you build immutable scene graphs selectively. You can also specifically alter the data without having to traverse it. [GLTFJSX](https://github.com/pmndrs/gltfjsx) specifically relies on this data.

```js
const { nodes, materials } = useLoader(GLTFLoader, url)
```

### Pre-loading assets

You can pre-load assets in global space so that models can be loaded in anticipation before they're mounted in the component tree.

```js
useLoader.preload(GLTFLoader, '/model.glb' /* extensions */)
```

## `useGraph`

Convenience composable which creates a memoized, named object/material collection from any [`Object3D`](https://threejs.org/docs/#api/en/core/Object3D).

```js
import { useLoader, useGraph } from '@xperimntl/vue-threejs'

const scene = useLoader(OBJLoader, url)
const { nodes, materials } = useGraph(scene)
```

```vue
<template>
  <mesh :geometry="nodes.robot.geometry" :material="materials.metal" />
</template>
```

## `useObjectRef`

Provides a typed ref callback that extracts the raw `THREE.Object3D` from the custom renderer's Instance proxy. Handles object reconstruction automatically when `args` or the `object` prop changes.

```vue
<script setup lang="ts">
import { useObjectRef, useFrame } from '@xperimntl/vue-threejs'
import type { Mesh } from 'three'

const cube = useObjectRef<Mesh>()

useFrame((_, delta) => {
  if (cube.object.value) cube.object.value.rotation.x += delta
})
</script>

<template>
  <mesh :ref="cube.ref">
    <boxGeometry />
    <meshStandardMaterial color="orange" />
  </mesh>
</template>
```

### Return value

| Property  | Type                            | Description                                |
| --------- | ------------------------------- | ------------------------------------------ |
| `ref`     | `(value: unknown) => void`      | Callback ref — bind with `:ref="cube.ref"` |
| `object`  | `ShallowRef<T \| null>`         | The raw THREE.Object3D, reactively updated |
| `mounted` | `Readonly<ShallowRef<boolean>>` | Whether the object is in the scene         |

See the [Object Handles tutorial](/tutorials/object-handles) for detailed usage patterns.

## `watchInvalidate`

Watches reactive Vue sources and calls `invalidate()` on the current root whenever they change. Designed for `frameloop="demand"` scenes where you want Vue reactivity to drive rendering.

```vue
<script setup>
import { ref } from 'vue'
import { watchInvalidate } from '@xperimntl/vue-threejs'

const color = ref('orange')
watchInvalidate(color)
</script>
```

Accepts the same source types and options as Vue's `watch`. Returns a `WatchHandle` that can be used to stop watching.

See the [Demand Rendering tutorial](/tutorials/demand-rendering) for a complete example.

## `useAfterRender`

Registers a callback that runs after each rendered frame. Automatically subscribes on mount and unsubscribes on unmount.

```vue
<script setup>
import { useAfterRender } from '@xperimntl/vue-threejs'

useAfterRender((timestamp) => {
  // Runs after every frame render
  console.log('Frame rendered at', timestamp)
})
</script>
```

Useful for analytics, performance monitoring, or synchronizing external systems with the render loop.

## `useNextFrame`

Returns a function that resolves after one rendered frame. Must be called during component setup. Useful for waiting until the scene has actually rendered before taking a screenshot or reading pixel data.

```vue
<script setup>
import { useNextFrame, useThree } from '@xperimntl/vue-threejs'

const waitForFrame = useNextFrame()
const gl = useThree((state) => state.gl)

async function captureScreenshot() {
  await waitForFrame()
  const dataUrl = gl.value.domElement.toDataURL('image/png')
  // Use dataUrl...
}
</script>
```

Each call to the returned function invalidates the current root (requests a frame) and resolves once that frame has been rendered.

> [!WARNING] > `useNextFrame` relies on `invalidate()` to request a frame. It works with `frameloop="always"` and `frameloop="demand"` but **not** with `frameloop="never"`, where the user drives the loop manually via `advance()`. In `never` mode, the after-effect callback will fire when you call `advance()`, but `useNextFrame` will not trigger a frame on its own.

## `useRenderCommit`

Returns an object with a `commit()` method that waits until Vue updates have been flushed and the scene has rendered. Combines `nextTick` (Vue flush) with a frame wait (scene application).

```vue
<script setup>
import { ref } from 'vue'
import { useRenderCommit, useThree } from '@xperimntl/vue-threejs'

const { commit } = useRenderCommit()
const gl = useThree((state) => state.gl)
const color = ref('orange')

async function changeAndCapture() {
  color.value = 'hotpink'
  await commit()
  // Vue has flushed, the scene has rendered — safe to read pixels
  const dataUrl = gl.value.domElement.toDataURL('image/png')
}
</script>
```

This is the recommended pattern when you need to guarantee that a reactive state change has been fully applied to the rendered scene before proceeding.

> [!WARNING]
> Like `useNextFrame`, `useRenderCommit` relies on `invalidate()` internally and does not work with `frameloop="never"`. In `never` mode, call `advance()` yourself after `nextTick()` to achieve the same result.
