---
title: Demand Rendering
description: Render only when something changes using watchInvalidate
---

By default, vue-threejs renders every frame. For scenes that spend most of their time idle — product viewers, editors, data visualizations — this wastes GPU cycles and battery. Setting `frameloop="demand"` tells the renderer to only produce frames when explicitly requested.

## Setting up demand mode

```vue
<template>
  <Canvas frameloop="demand">
    <MyScene />
  </Canvas>
</template>
```

With demand mode, nothing renders until something calls `invalidate()`.

## Reactive invalidation with watchInvalidate

The `watchInvalidate` composable bridges Vue reactivity and the render loop. It watches one or more reactive sources and calls `invalidate()` whenever they change:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { watchInvalidate } from '@xperimntl/vue-threejs'

const color = ref('orange')
const position = ref<[number, number, number]>([0, 0, 0])

// Any change to color or position triggers a new frame
watchInvalidate([color, position])
</script>

<template>
  <mesh :position="position" @click="color = 'hotpink'">
    <boxGeometry />
    <meshStandardMaterial :color="color" />
  </mesh>
</template>
```

`watchInvalidate` accepts the same source types and options as Vue's `watch` — refs, getters, reactive objects, or arrays of sources.

## A complete product viewer

Here is a typical demand-mode scene: a product viewer where the user rotates the camera and changes the material color:

```vue
<!-- ProductViewer.vue -->
<script setup lang="ts">
import { Canvas } from '@xperimntl/vue-threejs'
import { ref } from 'vue'
import Product from './Product.vue'

const color = ref('#4488ff')
</script>

<template>
  <div style="width: 100%; height: 100vh">
    <Canvas frameloop="demand">
      <ambientLight :intensity="0.5" />
      <directionalLight :position="[5, 5, 5]" />
      <Product :color="color" />
    </Canvas>

    <div style="position: absolute; bottom: 20px; left: 20px">
      <input type="color" v-model="color" />
    </div>
  </div>
</template>
```

```vue
<!-- Product.vue -->
<script setup lang="ts">
import { watchInvalidate } from '@xperimntl/vue-threejs'

const props = defineProps<{ color: string }>()

// Re-render whenever the color prop changes
watchInvalidate(() => props.color)
</script>

<template>
  <mesh>
    <torusKnotGeometry :args="[1, 0.3, 128, 32]" />
    <meshStandardMaterial :color="props.color" />
  </mesh>
</template>
```

The scene only renders when:

- The color picker changes the color
- vue-threejs internally detects a resize

No wasted frames between interactions.

## Combining with imperative updates

If you also mutate objects directly (orbit controls, physics, etc.), you need to invalidate for those changes too. Use `useThree` to get the `invalidate` function:

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useThree } from '@xperimntl/vue-threejs'

const invalidate = useThree((state) => state.invalidate)
const controlsRef = ref()

onMounted(() => {
  // Orbit controls mutate the camera directly — invisible to Vue
  controlsRef.value?.addEventListener('change', () => invalidate.value())
})
</script>
```

## watchInvalidate options

Since `watchInvalidate` wraps Vue's `watch`, you can pass standard watch options:

```ts
// Invalidate immediately on setup (useful for initial render)
watchInvalidate(source, { immediate: true })

// Deep watch a reactive object
watchInvalidate(source, { deep: true })
```

The returned `WatchHandle` can be used to stop watching:

```ts
const stop = watchInvalidate(source)
// Later...
stop()
```

## When to use demand mode

| Scenario                     | Recommended frameloop |
| ---------------------------- | --------------------- |
| Continuous animation         | `always` (default)    |
| User-driven interaction only | `demand`              |
| External loop (XR, physics)  | `never`               |
| Product viewers, editors     | `demand`              |
| Data visualizations          | `demand`              |

## Next steps

- See [Scaling Performance](/advanced/scaling-performance) for more optimization strategies
- Learn about [DOM overlays](/tutorials/dom-overlays) for mixing HTML UI with 3D
