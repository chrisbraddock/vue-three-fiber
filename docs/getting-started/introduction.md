---
title: Introduction
description: Vue-three-fiber is a Vue 3 renderer for three.js.
---

<Intro>
  Build your scene declaratively with re-usable, self-contained components that react to state, are readily interactive and can participate in [Vue](https://vuejs.org)'s ecosystem.
</Intro>

[![vue-threejs banner](/banner.jpg)](/getting-started/examples)

```bash
npm install @xperimntl/vue-threejs three vue
```

## Does it have limitations?

Most core three.js workflows map cleanly, but renderer-specific features can still lag behind the latest three.js or Vue ecosystem changes. Check the API and tests when you rely on edge cases like portals, advanced event flows, or custom renderer integrations.

## Is it slower than plain Threejs?

No. There is no overhead. Components render outside of Vue. It outperforms Threejs in scale due to Vue's scheduling abilities.

## Can it keep up with frequent feature updates to Threejs?

Yes. It merely expresses Threejs in Vue render functions, `<mesh />` dynamically turns into `new THREE.Mesh()`. If a new Threejs version adds, removes or changes features, it will be available to you instantly without depending on updates to this library.

## What does it look like?

Let's make a re-usable component that has its own state, reacts to user-input and participates in the render-loop:

```vue
<script setup>
import { ref } from 'vue'
import { Canvas, useFrame } from '@xperimntl/vue-threejs'

const Box = {
  props: ['position'],
  setup(props) {
    const meshRef = ref()
    const hovered = ref(false)
    const active = ref(false)
    useFrame((state, delta) => {
      if (meshRef.value) meshRef.value.rotation.x += delta
    })
    return { meshRef, hovered, active, position: props.position }
  },
  template: `
    <mesh
      :ref="(el) => (meshRef = el)"
      :scale="active ? 1.5 : 1"
      :position="position"
      @click="active = !active"
      @pointer-over="hovered = true"
      @pointer-out="hovered = false"
    >
      <boxGeometry :args="[1, 1, 1]" />
      <meshStandardMaterial :color="hovered ? 'hotpink' : 'orange'" />
    </mesh>
  `,
}
</script>

<template>
  <Canvas>
    <ambientLight :intensity="Math.PI / 2" />
    <spotLight :position="[10, 10, 10]" :angle="0.15" :penumbra="1" :decay="0" :intensity="Math.PI" />
    <pointLight :position="[-10, -10, -10]" :decay="0" :intensity="Math.PI" />
    <Box :position="[-1.2, 0, 0]" />
    <Box :position="[1.2, 0, 0]" />
  </Canvas>
</template>
```

> [!NOTE]
> Refs in vue-threejs are proxy-backed — property access and `instanceof` work directly, but the ref is not the raw THREE object. For most in-scene use this is transparent. When you need the actual Three.js instance, use [`useObjectRef`](/tutorials/object-handles).

<details>
  <summary>Show TypeScript example</summary>

```bash
# @types/three is included in the workspace devDependencies.
# For a standalone app, install it with: npm install -D @types/three
```

> [!NOTE]
> The examples below still use the intended package import path, `@xperimntl/vue-threejs`. When consuming the repo locally, keep that import path and link the package from your local checkout as described in [Installation](/getting-started/installation).

```vue
<script setup lang="ts">
import * as THREE from 'three'
import { ref, defineComponent, h } from 'vue'
import { Canvas, useFrame, type ThreeElements } from '@xperimntl/vue-threejs'

const Box = defineComponent({
  props: {
    position: { type: Array as () => [number, number, number] },
  },
  setup(props) {
    // Template refs in the custom renderer receive a proxy-backed handle.
    // Property access, method calls, and instanceof all work directly.
    // For the raw THREE object, see useObjectRef in the Object Handles tutorial.
    const meshRef = ref<THREE.Mesh | null>(null)
    const hovered = ref(false)
    const active = ref(false)
    useFrame((state, delta) => {
      if (meshRef.value) meshRef.value.rotation.x += delta
    })
    return () =>
      h(
        'mesh',
        {
          ref: meshRef,
          scale: active.value ? 1.5 : 1,
          position: props.position,
          onClick: () => (active.value = !active.value),
          onPointerOver: () => (hovered.value = true),
          onPointerOut: () => (hovered.value = false),
        },
        [
          h('boxGeometry', { args: [1, 1, 1] }),
          h('meshStandardMaterial', { color: hovered.value ? 'hotpink' : '#2f74c0' }),
        ],
      )
  },
})
</script>

<template>
  <Canvas>
    <ambientLight :intensity="Math.PI / 2" />
    <spotLight :position="[10, 10, 10]" :angle="0.15" :penumbra="1" :decay="0" :intensity="Math.PI" />
    <pointLight :position="[-10, -10, -10]" :decay="0" :intensity="Math.PI" />
    <Box :position="[-1.2, 0, 0]" />
    <Box :position="[1.2, 0, 0]" />
  </Canvas>
</template>
```

</details>

## First steps

You need to be versed in both Vue and Threejs before rushing into this. If you are unsure about Vue consult the official [Vue docs](https://vuejs.org/guide/introduction.html), especially [the section about composables](https://vuejs.org/guide/reusability/composables.html). As for Threejs, make sure you at least glance over the following links:

1. Make sure you have a [basic grasp of Threejs](https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene). Keep that site open.
2. When you know what a scene is, a camera, mesh, geometry, material, try the demo above.
3. [Look up](https://threejs.org/docs/index.html#api/en/objects/Mesh) the elements that you see (mesh, ambientLight, etc), _all_ threejs exports are native to three-fiber.
4. Try changing some values, scroll through our [API](/API/canvas) to see what the various settings and composables do.

Some helpful material:

- [Threejs-docs](https://threejs.org/docs) and [examples](https://threejs.org/examples)
- [Discover Threejs](https://discoverthreejs.com), especially the [Tips and Tricks](https://discoverthreejs.com/tips-and-tricks) chapter for best practices
- [Bruno Simons Threejs Journey](https://threejs-journey.com), arguably the best learning resource

<a href="https://threejs-journey.com">
  <img src="/banner-journey.jpg" />
</a>

## Ecosystem

There is a vibrant and extensive ecosystem around three-fiber, full of libraries, helpers and abstractions. vue-threejs includes a [plugin system](/ecosystem/plugins) that lets ecosystem packages hook into the renderer lifecycle.

### Official packages

Ported from the [pmndrs](https://github.com/pmndrs) React Three Fiber ecosystem:

- [`@xperimntl/vue-threejs-drei`](/ecosystem/drei) &ndash; controls, loaders, staging, materials, and helpers — ported from [`@react-three/drei`](https://github.com/pmndrs/drei)
- [`@xperimntl/vue-threejs-postprocessing`](/ecosystem/postprocessing) &ndash; GPU postprocessing effects — ported from [`@react-three/postprocessing`](https://github.com/pmndrs/react-postprocessing)
- [`@xperimntl/vue-threejs-rapier`](/ecosystem/rapier) &ndash; rigid-body physics with Rapier — ported from [`@react-three/rapier`](https://github.com/pmndrs/react-three-rapier)
- [`@xperimntl/vue-threejs-test-renderer`](/API/testing) &ndash; for unit tests in node

### Compatible libraries

- [`pinia`](https://pinia.vuejs.org/) &ndash; Vue's official state management
- [`zustand`](https://github.com/pmndrs/zustand) &ndash; flux-based state management
- [`maath`](https://github.com/pmndrs/maath) &ndash; a kitchen sink for math helpers
- [`three-stdlib`](https://github.com/pmndrs/three-stdlib) &ndash; stand-alone three.js standard library
