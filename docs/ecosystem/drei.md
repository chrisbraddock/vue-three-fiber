---
title: Drei
description: Vue-native helpers and abstractions for vue-threejs.
---

# @xperimntl/vue-threejs-drei

A growing collection of useful helpers and abstractions for vue-threejs.

> Ported from [`@react-three/drei`](https://github.com/pmndrs/drei) — the essential companion library for React Three Fiber. The Vue version provides the same component and composable patterns, adapted to Vue's reactivity system and composition API.

## Availability

`@xperimntl/vue-threejs-drei` is included in the monorepo. Install the core package to use it:

## Plugin registration

Drei can be registered as a [fiber plugin](/ecosystem/plugins) to set global defaults:

```ts
import { createDreiPlugin } from '@xperimntl/vue-threejs-drei'

// On Canvas
<Canvas :plugins="[createDreiPlugin({ dracoPath: '/draco/' })]">
```

```ts
// Or app-wide
import { registerFiberPlugin } from '@xperimntl/vue-threejs'
import { dreiFiberPlugin } from '@xperimntl/vue-threejs-drei'

registerFiberPlugin(app, dreiFiberPlugin)
```

### Plugin options

| Option            | Type     | Description                       |
| ----------------- | -------- | --------------------------------- |
| `dracoPath`       | `string` | Path to Draco decoder files       |
| `environmentPath` | `string` | Default path for environment maps |

## Controls

### OrbitControls

Camera orbit controls that work with the fiber event system.

```vue
<script setup>
import { OrbitControls } from '@xperimntl/vue-threejs-drei'
</script>

<template>
  <Canvas>
    <OrbitControls :enable-damping="true" />
    <!-- scene -->
  </Canvas>
</template>
```

### TransformControls

Attach to an object to enable translate/rotate/scale gizmos.

```vue
<script setup>
import { TransformControls } from '@xperimntl/vue-threejs-drei'
</script>

<template>
  <TransformControls mode="translate">
    <mesh>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  </TransformControls>
</template>
```

## Loading

### useGLTF

Load GLTF/GLB models with optional Draco compression.

```vue
<script setup>
import { useGLTF } from '@xperimntl/vue-threejs-drei'

const gltf = useGLTF('/model.glb', { draco: true })
</script>

<template>
  <primitive v-if="gltf" :object="gltf.scene" />
</template>
```

Returns a `ShallowRef<GLTF | null>` that populates when loading completes.

### useTexture

Load a texture with automatic disposal.

```vue
<script setup>
import { useTexture } from '@xperimntl/vue-threejs-drei'

const map = useTexture('/texture.jpg')
</script>

<template>
  <meshStandardMaterial :map="map" />
</template>
```

Returns a `ShallowRef<THREE.Texture | null>`.

## Staging

### Environment

Set up image-based lighting with HDR environment maps.

```vue
<script setup>
import { Environment } from '@xperimntl/vue-threejs-drei'
</script>

<template>
  <Environment :files="'/studio_1k.hdr'" />
</template>
```

| Prop         | Type      | Description                                  |
| ------------ | --------- | -------------------------------------------- |
| `files`      | `string`  | Path to HDR/EXR environment map              |
| `background` | `boolean` | Also set as scene background (default false) |

### Lightformer

Declarative area lights for use inside an `Environment`.

```vue
<Environment :files="'/studio.hdr'">
  <Lightformer :intensity="2" :position="[0, 5, -5]" />
</Environment>
```

## Materials

### MeshTransmissionMaterial

Physically-based transmission material for glass, water, and gems.

```vue
<mesh>
  <sphereGeometry />
  <MeshTransmissionMaterial
    :transmission="1"
    :roughness="0.1"
    :thickness="0.5"
    :ior="1.5"
    :chromaticAberration="0.02"
  />
</mesh>
```

## DOM

### Html

Project HTML content into the 3D scene, tracking an object's screen position.

```vue
<mesh>
  <Html :position="[0, 1, 0]" center>
    <div class="label">Hello</div>
  </Html>
</mesh>
```

### Text

High-quality SDF text rendering via [Troika](https://github.com/protectwise/troika/tree/main/packages/troika-three-text).

```vue
<Text text="Hello World" :font-size="0.5" color="white" :position="[0, 1, 0]" />
```

## Helpers

### Grid

An infinite-style reference grid.

```vue
<Grid :cell-size="1" :cell-thickness="0.5" :section-size="5" />
```

### Center

Centers its children at the origin based on their bounding box.

```vue
<Center>
  <mesh>
    <torusKnotGeometry />
    <meshStandardMaterial />
  </mesh>
</Center>
```

### Bounds

Fits the camera to the bounding box of its children.

```vue
<Bounds fit clip observe>
  <mesh>
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
</Bounds>
```

## See also

- [Original `@react-three/drei`](https://github.com/pmndrs/drei) — full API reference for the React version
- [Plugin system](/ecosystem/plugins) — how fiber plugins work
- [Loading Models tutorial](/tutorials/loading-models) — using `useGLTF` and `Environment` in practice
- [Loading Textures tutorial](/tutorials/loading-textures) — using `useTexture` in practice
