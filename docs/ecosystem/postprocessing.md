---
title: Postprocessing
description: Vue-native GPU postprocessing effects for vue-threejs.
---

# @xperimntl/vue-threejs-postprocessing

Declarative postprocessing for vue-threejs, built on the [`postprocessing`](https://github.com/pmndrs/postprocessing) library.

> Ported from [`@react-three/postprocessing`](https://github.com/pmndrs/react-postprocessing) — the React Three Fiber integration for the postprocessing library by vanruesc. The Vue version provides the same declarative component API adapted for Vue's composition patterns.

## Availability

`@xperimntl/vue-threejs-postprocessing` is included in the monorepo. Install the core package to use it:

## Plugin registration

Register as a [fiber plugin](/ecosystem/plugins) to set global defaults:

```ts
import { createPostprocessingPlugin } from '@xperimntl/vue-threejs-postprocessing'

<Canvas :plugins="[createPostprocessingPlugin({ multisampling: 4 })]">
```

```ts
// Or app-wide
import { registerFiberPlugin } from '@xperimntl/vue-threejs'
import { postprocessingFiberPlugin } from '@xperimntl/vue-threejs-postprocessing'

registerFiberPlugin(app, postprocessingFiberPlugin)
```

### Plugin options

| Option            | Type      | Description                                |
| ----------------- | --------- | ------------------------------------------ |
| `multisampling`   | `number`  | MSAA sample count (default: renderer)      |
| `resolutionScale` | `number`  | Resolution multiplier (default: 1)         |
| `enabled`         | `boolean` | Enable/disable all effects (default: true) |

## Usage

Wrap your scene with `EffectComposer` and add effect components as children:

```vue
<script setup>
import { Canvas } from '@xperimntl/vue-threejs'
import { EffectComposer, Bloom, Noise, Vignette } from '@xperimntl/vue-threejs-postprocessing'
</script>

<template>
  <Canvas>
    <ambientLight />
    <mesh>
      <boxGeometry />
      <meshStandardMaterial color="hotpink" />
    </mesh>

    <EffectComposer>
      <Bloom :intensity="1.5" :luminance-threshold="0.9" />
      <Noise :opacity="0.02" />
      <Vignette :offset="0.3" :darkness="0.7" />
    </EffectComposer>
  </Canvas>
</template>
```

## EffectComposer

Manages the render pipeline. Renders the scene, then applies all child effects in order.

| Prop              | Type      | Description                 |
| ----------------- | --------- | --------------------------- |
| `enabled`         | `boolean` | Enable/disable the composer |
| `multisampling`   | `number`  | MSAA sample count           |
| `resolutionScale` | `number`  | Resolution multiplier       |

## Effects

### Bloom

HDR bloom with configurable luminance threshold and smoothing.

```vue
<Bloom :intensity="1.5" :luminance-threshold="0.9" :luminance-smoothing="0.025" />
```

| Prop                 | Type     | Default |
| -------------------- | -------- | ------- |
| `intensity`          | `number` | `1`     |
| `luminanceThreshold` | `number` | `0.9`   |
| `luminanceSmoothing` | `number` | `0.025` |

### BrightnessContrast

Adjust brightness and contrast.

```vue
<BrightnessContrast :brightness="0.1" :contrast="0.2" />
```

### HueSaturation

Shift hue and adjust saturation.

```vue
<HueSaturation :hue="0.1" :saturation="0.5" />
```

### ToneMapping

Apply tone mapping as a post-effect.

```vue
<ToneMapping :adaptive="true" :resolution="256" />
```

### DepthOfField

Bokeh depth-of-field effect.

```vue
<DepthOfField :focus-distance="0.01" :focal-length="0.02" :bokeh-scale="2" />
```

| Prop            | Type     | Default |
| --------------- | -------- | ------- |
| `focusDistance` | `number` | `0.01`  |
| `focalLength`   | `number` | `0.02`  |
| `bokehScale`    | `number` | `2`     |

### LUT

Color grading with a lookup table.

```vue
<script setup>
import { useLoader } from '@xperimntl/vue-threejs'
import { LUTCubeLoader } from 'three/examples/jsm/loaders/LUTCubeLoader.js'

const lut = useLoader(LUTCubeLoader, '/my-lut.cube')
</script>

<LUT v-if="lut" :lut="lut.texture3D" />
```

### Noise

Film grain noise overlay.

```vue
<Noise :opacity="0.02" />
```

### Vignette

Darkened screen edges.

```vue
<Vignette :offset="0.3" :darkness="0.7" />
```

## See also

- [Original `postprocessing` library](https://github.com/pmndrs/postprocessing) — full effect documentation and demos
- [Original `@react-three/postprocessing`](https://github.com/pmndrs/react-postprocessing) — React integration reference
- [Plugin system](/ecosystem/plugins) — how fiber plugins work
- [Interactive Showcase](/getting-started/examples) — the GlassFlower demo uses Bloom and LUT effects
