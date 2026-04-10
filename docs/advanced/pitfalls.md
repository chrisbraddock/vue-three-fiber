---
title: Performance pitfalls
description: Performance 1x1
---

## Tips and Tricks

This is a good overview: https://discoverthreejs.com/tips-and-tricks

The most important gotcha in three.js is that creating objects can be expensive, think twice before you mount/unmount things! Every material or light that you put into the scene has to compile, every geometry you create will be processed. Share materials and geometries if you can, either in global scope or locally:

```vue
<script setup>
import { computed } from 'vue'

const geom = computed(() => new BoxGeometry())
const mat = computed(() => new MeshBasicMaterial())
</script>

<template>
  <mesh v-for="item in items" :key="item.id" :geometry="geom" :material="mat" />
</template>
```

Try to use [instancing](https://threejs.org/docs/#api/en/objects/InstancedMesh) as much as you can when you need to display many objects of a similar type!

## Avoid reactive state updates in loops

TLDR, don't, mutate inside `useFrame`!

- Threejs has a render-loop, it does not work like the DOM does. **Fast updates are carried out in `useFrame` by mutation**. `useFrame` is your per-component render-loop.

- It is not enough to set values in succession, _you need frame deltas_. Instead of `position.x += 0.1` consider `position.x += delta` or your project will run at different speeds depending on the end-users system. Many updates in threejs need to be paired with update flags (`.needsUpdate = true`), or imperative functions (`.updateProjectionMatrix()`).

- You might be tempted to update reactive refs inside `useFrame` but there is no reason to. You would only complicate something as simple as an update by routing it through Vue's reactivity system, triggering component re-renders etc.

### Do not update reactive state in loops

```js
// Bad: using setInterval
onMounted(() => {
  const interval = setInterval(() => (x.value += 0.1), 1)
  onUnmounted(() => clearInterval(interval))
})
```

### Do not update reactive state in useFrame

```vue
<script setup>
const x = ref(0)
useFrame(() => (x.value += 0.1))
</script>

<template>
  <mesh :position-x="x" />
</template>
```

### Do not update reactive state in fast events

```vue
<template>
  <mesh @pointer-move="(e) => (x.value = e.point.x)" />
</template>
```

### Instead, just mutate, use deltas

In general you should prefer useFrame. Consider mutating props safe as long as the component is the only entity that mutates. Use deltas instead of fixed values so that your app is refresh-rate independent and runs at the same speed everywhere!

```vue
<script setup>
import { ref } from 'vue'
import { useFrame } from '@xperimntl/vue-threejs'

const meshRef = ref()
useFrame((state, delta) => {
  if (meshRef.value) meshRef.value.position.x += delta
})
</script>

<template>
  <mesh ref="meshRef" />
</template>
```

Same goes for events, use references.

```vue
<template>
  <mesh @pointer-move="(e) => ($refs.meshRef.position.x = e.point.x)" />
</template>
```

## Handle animations in loops

The frame loop is where you should place your animations. For instance using lerp, or damp.

### Use `lerp` + `useFrame`

```vue
<script setup>
import { ref } from 'vue'
import { useFrame } from '@xperimntl/vue-threejs'

const props = defineProps({ active: Boolean })
const meshRef = ref()

useFrame((state, delta) => {
  if (meshRef.value) {
    meshRef.value.position.x = THREE.MathUtils.lerp(meshRef.value.position.x, props.active ? 100 : 0, 0.1)
  }
})
</script>

<template>
  <mesh ref="meshRef" />
</template>
```

### Or use animation libraries

Use animation libraries that operate outside of Vue's reactivity. Libraries like `@vueuse/motion` or GSAP can animate values directly.

## Do not bind to fast state reactively

Using state-managers and selective state is fine, but not for updates that happen rapidly for the same reason as above.

### Don't bind reactive fast-state

```js
// Assuming that x gets animated inside the store 60fps
const x = computed(() => store.state.x)
```

```vue
<template>
  <mesh :position-x="x" />
</template>
```

### Fetch state directly

For instance using [Pinia](https://pinia.vuejs.org/) or another state manager.

```js
useFrame(() => {
  meshRef.value.position.x = store.x
})
```

```vue
<template>
  <mesh ref="meshRef" />
</template>
```

## Don't mount indiscriminately

In threejs it is very common to not re-mount at all, see the ["disposing of things"](https://discoverthreejs.com/tips-and-tricks/) section in discover-three. This is because buffers and materials get re-initialized/compiled, which can be expensive.

### Avoid mounting at runtime

```vue
<template>
  <Stage1 v-if="stage === 1" />
  <Stage2 v-if="stage === 2" />
  <Stage3 v-if="stage === 3" />
</template>
```

### Consider using visibility instead

```vue
<template>
  <Stage1 :visible="stage === 1" />
  <Stage2 :visible="stage === 2" />
  <Stage3 :visible="stage === 3" />
</template>
```

### Use async components for expensive ops

Vue 3 supports async components and Suspense. Use these to defer expensive operations.

```vue
<script setup>
import { defineAsyncComponent } from 'vue'

const HeavyComponent = defineAsyncComponent(() => import('./HeavyComponent.vue'))
</script>

<template>
  <Suspense>
    <HeavyComponent />
  </Suspense>
</template>
```

> [!NOTE]
> Vue's Suspense keeps previously resolved content visible while new async content loads, rather than hiding it. This is usually better UX for 3D scenes. See [Vue Divergences](/advanced/vue-divergences) for details.

## Don't re-create objects in loops

Try to avoid creating too much effort for the garbage collector, re-pool objects when you can!

### Bad news for the GC

This creates a new vector 60 times a second, which allocates memory and forces the GC to eventually kick in.

```js
useFrame(() => {
  meshRef.value.position.lerp(new THREE.Vector3(x, y, z), 0.1)
})
```

### Better re-use object

Set up re-used objects in global or local space, now the GC will be silent.

```js
const vec = new THREE.Vector3()
useFrame(() => {
  meshRef.value.position.lerp(vec.set(x, y, z), 0.1)
})
```

## `useLoader` instead of plain loaders

Threejs loaders give you the ability to load async assets (models, textures, etc), but if you do not re-use assets it can quickly become problematic.

### No re-use is bad for perf

This re-fetches, re-parses for every component instance.

```vue
<script setup>
import { ref, onMounted } from 'vue'

const texture = ref()
onMounted(() => {
  new TextureLoader().load(url, (t) => (texture.value = t))
})
</script>

<template>
  <mesh v-if="texture">
    <sphereGeometry />
    <meshBasicMaterial :map="texture" />
  </mesh>
</template>
```

Instead use useLoader, which caches assets and makes them available throughout the scene.

### Cache and re-use objects

```vue
<script setup>
import { useLoader } from '@xperimntl/vue-threejs'
import { TextureLoader } from 'three'

const texture = useLoader(TextureLoader, url)
</script>

<template>
  <mesh>
    <sphereGeometry />
    <meshBasicMaterial :map="texture" />
  </mesh>
</template>
```

Regarding GLTF's try to use [GLTFJSX](https://github.com/pmndrs/gltfjsx) as much as you can, this will create immutable graphs which allow you to even re-use full models.
