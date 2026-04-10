---
title: Vue-Native Patterns
description: Patterns unique to vue-threejs that have no React Three Fiber equivalent.
---

# Vue-Native Patterns

vue-threejs is a fiber-style Three.js renderer for Vue, compatible with React Three Fiber's API where practical and Vue-native where stronger. This guide covers patterns that take advantage of Vue's reactivity system, composition API, and component model in ways that are not available in the React ecosystem.

## useObjectRef -- typed access to raw THREE objects

In a Vue custom renderer, template refs resolve to the renderer's internal Instance proxy, not the raw THREE.js object. `useObjectRef` provides a typed ref callback that extracts the underlying `THREE.Object3D` and tracks reconstruction (when `args` or a primitive's `object` prop changes).

### The pattern

```vue
<script setup lang="ts">
import { useObjectRef, useFrame } from '@xperimntl/vue-threejs'
import type { Mesh } from 'three'

const mesh = useObjectRef<Mesh>()

useFrame((_, delta) => {
  if (mesh.object.value) {
    mesh.object.value.rotation.y += delta
  }
})
</script>

<template>
  <mesh :ref="mesh.ref">
    <boxGeometry />
    <meshStandardMaterial color="orange" />
  </mesh>
</template>
```

### What you get

| Property  | Type                            | Description                                  |
| --------- | ------------------------------- | -------------------------------------------- |
| `ref`     | `(value: unknown) => void`      | Function ref to bind in template or JSX      |
| `object`  | `ShallowRef<T \| null>`         | The raw THREE.Object3D, reactively updated   |
| `mounted` | `Readonly<ShallowRef<boolean>>` | Whether the object is currently in the scene |

### Why not a raw template ref?

A raw template ref gives you the Instance proxy. You can read THREE.js properties through it (the proxy delegates), but identity checks (`===`) and type narrowing (`instanceof Mesh`) behave differently. `useObjectRef` gives you the actual THREE.js object with correct TypeScript types, and it updates automatically when the underlying object is reconstructed.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { Mesh } from 'three'

// Raw ref -- value is the Instance proxy, not a Mesh
const rawRef = ref<Mesh | null>(null)
</script>

<template>
  <!-- rawRef.value is an Instance proxy, not a THREE.Mesh -->
  <mesh :ref="rawRef">
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
</template>
```

Use `useObjectRef` whenever you need to call THREE.js methods directly (raycasting, geometry manipulation, reading world matrices).

## Render lifecycle composables

vue-threejs provides three composables for coordinating Vue reactivity with the Three.js render loop. Each serves a different use case.

### useAfterRender

Registers a callback that runs after each rendered frame. Automatically subscribes on mount and cleans up on unmount.

```vue
<script setup lang="ts">
import { useAfterRender } from '@xperimntl/vue-threejs'

useAfterRender((timestamp) => {
  // Runs after every frame -- useful for analytics, profiling,
  // or syncing external state with the rendered scene
  performance.mark(`frame-${timestamp}`)
})
</script>
```

### useNextFrame

Returns a function that resolves a promise after one rendered frame. Useful for imperative "wait for render" logic.

```vue
<script setup lang="ts">
import { useNextFrame, useThree } from '@xperimntl/vue-threejs'

const waitForFrame = useNextFrame()
const gl = useThree((s) => s.gl)

async function captureScreenshot() {
  await waitForFrame()
  const dataUrl = gl.value.domElement.toDataURL()
  // dataUrl now reflects the latest rendered frame
}
</script>
```

### useRenderCommit

Returns an object with a `commit()` method that waits for Vue's `nextTick` (so reactive changes flush) and then waits for one rendered frame. This is the right tool when you change reactive state and need to guarantee the scene reflects those changes before proceeding.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRenderCommit, useThree } from '@xperimntl/vue-threejs'

const color = ref('orange')
const { commit } = useRenderCommit()
const gl = useThree((s) => s.gl)

async function changeAndCapture() {
  color.value = 'hotpink'
  // Wait for Vue to flush + scene to render the new color
  await commit()
  // Now safe to read pixels or capture
  const dataUrl = gl.value.domElement.toDataURL()
}
</script>
```

### When to use each

| Composable        | Use case                                             |
| ----------------- | ---------------------------------------------------- |
| `useAfterRender`  | Continuous per-frame side effects (logging, sync)    |
| `useNextFrame`    | One-shot "wait for next render" without state change |
| `useRenderCommit` | Change state, then wait for the change to render     |

## provide/inject across the DOM/3D boundary

Vue's `provide`/`inject` works transparently across the Canvas boundary. A service provided in your regular Vue app is injectable inside any scene component rendered by `<Canvas>`. This is possible because Canvas creates a `ContextBridge` component that forwards the parent's provide entries into the Three.js renderer tree.

### The pattern

```vue
<!-- App.vue -->
<script setup lang="ts">
import { provide, ref } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import { Canvas } from '@xperimntl/vue-threejs'
import MyScene from './MyScene.vue'

export interface SelectionService {
  selected: Ref<string | null>
  highlightColor: Ref<string>
}

export const selectionKey: InjectionKey<SelectionService> = Symbol('selection')

const selected = ref<string | null>(null)
const highlightColor = ref('#ffaa00')

provide(selectionKey, { selected, highlightColor })
</script>

<template>
  <Canvas>
    <MyScene />
  </Canvas>
</template>
```

```vue
<!-- MyScene.vue (rendered inside Canvas) -->
<script setup lang="ts">
import { inject, computed } from 'vue'
import { selectionKey } from './App.vue'

const service = inject(selectionKey)!
const color = computed(() => (service.selected.value === 'cube' ? service.highlightColor.value : '#4477aa'))
</script>

<template>
  <mesh @click="service.selected.value = 'cube'">
    <boxGeometry />
    <meshStandardMaterial :color="color" />
  </mesh>
</template>
```

This pattern lets you build application-level services (selection state, theme configuration, data stores) that are shared between your DOM UI and your 3D scene without prop drilling or global state.

## DOM/scene composition via slots

Canvas exposes two named slots for layering DOM content over the 3D scene:

- **`#default`** -- the Three.js scene graph (rendered by the custom renderer)
- **`#overlay`** -- a DOM div positioned over the canvas with `pointer-events: none`
- **`#error`** -- shown when a renderer error is captured, with `error` and `retry` bindings

### Building a control panel

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Canvas } from '@xperimntl/vue-threejs'

const color = ref('#ff8800')
const speed = ref(1)
</script>

<template>
  <Canvas>
    <template #default>
      <ambientLight :intensity="0.5" />
      <RotatingBox :color="color" :speed="speed" />
    </template>

    <template #overlay>
      <div style="position: absolute; top: 20px; left: 20px; pointer-events: auto">
        <label> Color: <input type="color" v-model="color" /> </label>
        <label> Speed: <input type="range" v-model.number="speed" min="0" max="5" step="0.1" /> </label>
      </div>
    </template>
  </Canvas>
</template>
```

The overlay div has `pointer-events: none` by default, so 3D pointer events pass through. Add `pointer-events: auto` to interactive elements (buttons, inputs, links) so they receive clicks.

### Error handling

```vue
<template>
  <Canvas>
    <template #default>
      <MyScene />
    </template>

    <template #error="{ error, retry }">
      <div class="error-panel">
        <p>Something went wrong: {{ error.message }}</p>
        <button @click="retry">Retry</button>
      </div>
    </template>
  </Canvas>
</template>
```

When an error is captured during rendering, the Canvas replaces the scene with the `#error` slot content. Calling `retry()` clears the error and re-renders the scene.

## Demand rendering with watchInvalidate

`watchInvalidate` connects Vue's `watch` to the render loop's `invalidate()`. When a watched source changes, it requests a new frame. This is the idiomatic way to use `frameloop="demand"` with reactive data.

### The pattern

```vue
<script setup lang="ts">
import { watchInvalidate } from '@xperimntl/vue-threejs'

const props = defineProps<{ color: string }>()

// Only render when color actually changes
watchInvalidate(() => props.color)
</script>

<template>
  <mesh>
    <torusKnotGeometry :args="[1, 0.3, 128, 32]" />
    <meshStandardMaterial :color="props.color" />
  </mesh>
</template>
```

```vue
<!-- Parent -->
<template>
  <Canvas frameloop="demand">
    <Product :color="color" />
  </Canvas>
</template>
```

`watchInvalidate` accepts the same arguments as Vue's `watch` -- single refs, getter functions, arrays of sources, and standard watch options (`deep`, `immediate`, `flush`). The returned `WatchHandle` can stop the watcher when needed.

For a complete walkthrough, see the [Demand Rendering](/tutorials/demand-rendering) tutorial.

## Plugin system

vue-threejs includes a plugin system that lets ecosystem packages hook into the renderer lifecycle without tight coupling to Canvas internals.

### Quick overview

```ts
import { defineFiberPlugin } from '@xperimntl/vue-threejs'

export const myPlugin = defineFiberPlugin({
  name: 'my-plugin',
  setup(ctx) {
    ctx.extend({ MyCustomMesh }) // register THREE constructors
    ctx.provide(MY_KEY, someValue) // inject into scene tree
    ctx.onDispose(() => {
      /* cleanup */
    })
  },
})
```

### Using plugins

```vue
<script setup>
import { Canvas } from '@xperimntl/vue-threejs'
import { createDreiPlugin } from '@xperimntl/vue-threejs-drei'

const plugins = [createDreiPlugin({ dracoPath: '/draco/' })]
</script>

<template>
  <Canvas :plugins="plugins">
    <!-- scene content -->
  </Canvas>
</template>
```

Key helpers:

- **`defineFiberPlugin<TOptions>`** -- type-safe plugin definition
- **`withPluginOptions(plugin, options)`** -- create an object-form entry with explicit options
- **`registerFiberPlugin(app, plugin)`** -- register at the app level for all Canvas instances

Plugins can declare dependencies with `requires` for guaranteed initialization order, and app-level and Canvas-level plugins are merged automatically.

For the full API reference, see the [Plugin System](/ecosystem/plugins) documentation.
