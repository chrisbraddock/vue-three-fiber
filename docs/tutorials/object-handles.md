---
title: Object Handles
description: Access Three.js objects directly with useObjectRef
---

When you need to read or mutate a Three.js object imperatively — for instance to sample world positions, call `lookAt`, or pass an object to a physics engine — `useObjectRef` gives you a typed, reactive handle.

## The problem with template refs

In vue-threejs's custom renderer, template refs receive an internal Instance proxy rather than the raw `THREE.Object3D`. Property access, method calls, and `instanceof` all work through the proxy, but the ref's value is not the THREE object itself. This matters when you need to pass the object to external libraries or compare identity.

`useObjectRef` solves this by extracting the underlying THREE object and exposing it as a `ShallowRef`.

## Basic usage

```vue
<script setup lang="ts">
import { useObjectRef, useFrame } from '@xperimntl/vue-threejs'
import type { Mesh } from 'three'

const cube = useObjectRef<Mesh>()

useFrame((_, delta) => {
  if (cube.object.value) {
    cube.object.value.rotation.x += delta
  }
})
</script>

<template>
  <mesh :ref="cube.ref">
    <boxGeometry />
    <meshStandardMaterial color="orange" />
  </mesh>
</template>
```

### What you get back

| Property  | Type                            | Description                                  |
| --------- | ------------------------------- | -------------------------------------------- |
| `ref`     | `(value: unknown) => void`      | Callback ref — bind with `:ref="cube.ref"`   |
| `object`  | `ShallowRef<T \| null>`         | The raw THREE.Object3D, reactively updated   |
| `mounted` | `Readonly<ShallowRef<boolean>>` | Whether the object is currently in the scene |

## Passing objects to external code

A common need is handing the Three.js object to a physics library, animation system, or postprocessing pass:

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { useObjectRef } from '@xperimntl/vue-threejs'
import type { Mesh } from 'three'

const target = useObjectRef<Mesh>()

// Respond when the object becomes available
watch(target.object, (mesh) => {
  if (mesh) {
    // Pass the real THREE.Mesh to any external API
    physicsWorld.addBody(mesh)
  }
})
</script>

<template>
  <mesh :ref="target.ref">
    <sphereGeometry :args="[1, 32, 32]" />
    <meshStandardMaterial color="cyan" />
  </mesh>
</template>
```

## Handling reconstruction

When a component's `args` or `object` prop changes, vue-threejs destroys the old THREE object and creates a new one. `useObjectRef` handles this automatically — `object.value` updates to the new instance and any watchers fire again.

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useObjectRef } from '@xperimntl/vue-threejs'
import type { Mesh } from 'three'

const cube = useObjectRef<Mesh>()
const segments = ref(1)

// This fires on initial mount AND whenever args change triggers reconstruction
watch(cube.object, (mesh) => {
  if (mesh) console.log('New geometry:', mesh.geometry)
})

function increaseDetail() {
  segments.value++
}
</script>

<template>
  <mesh :ref="cube.ref" @click="increaseDetail">
    <boxGeometry :args="[1, 1, 1, segments, segments, segments]" />
    <meshStandardMaterial color="hotpink" wireframe />
  </mesh>
</template>
```

## Checking mounted state

The `mounted` property tells you whether the object is currently in the scene. This is useful for conditional logic that should only run while the object exists:

```vue
<script setup lang="ts">
import { watch } from 'vue'
import { useObjectRef } from '@xperimntl/vue-threejs'
import type { PointLight } from 'three'

const light = useObjectRef<PointLight>()

watch(light.mounted, (isMounted) => {
  console.log(isMounted ? 'Light added to scene' : 'Light removed from scene')
})
</script>

<template>
  <pointLight :ref="light.ref" :position="[5, 5, 5]" />
</template>
```

## When to use useObjectRef vs template refs

| Scenario                                    | Recommendation |
| ------------------------------------------- | -------------- |
| Reading properties in `useFrame`            | Template ref   |
| Calling methods (`lookAt`, `updateMatrix`)  | Template ref   |
| Passing to external library (physics, etc.) | `useObjectRef` |
| Identity comparison (`===`)                 | `useObjectRef` |
| Reacting to reconstruction                  | `useObjectRef` |
| Checking if mounted                         | `useObjectRef` |

Template refs work well for most in-scene usage because the proxy delegates property access and method calls transparently. Reach for `useObjectRef` when you need the actual THREE object or when you need to respond to object lifecycle events.

## Next steps

- Learn about [demand rendering](/tutorials/demand-rendering) with `watchInvalidate`
- Learn about [DOM overlays](/tutorials/dom-overlays) for mixing HTML and 3D
