---
title: Canvas
description: The Canvas object is your portal into three.js
---

The `Canvas` object is where you start to define your vue-threejs Scene.

```vue
<script setup>
import { Canvas } from '@xperimntl/vue-threejs'
</script>

<template>
  <Canvas>
    <pointLight :position="[10, 10, 10]" />
    <mesh>
      <sphereGeometry />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  </Canvas>
</template>
```

## Properties

| Prop            | Description                                                                                                                              | Default                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| default slot    | three.js elements or regular components                                                                                                  |                                                          |
| fallback        | optional DOM elements or regular components in case GL is not supported                                                                  |                                                          |
| gl              | Props that go into the default renderer. Accepts sync/async callback with default props `gl={defaults => new Renderer({ ...defaults })}` | `{}`                                                     |
| camera          | Props that go into the default camera, or your own `THREE.Camera`                                                                        | `{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 5] }` |
| scene           | Props that go into the default scene, or your own `THREE.Scene`                                                                          | `{}`                                                     |
| shadows         | Props that go into `gl.shadowMap`, can be set true for `PCFsoft` or one of the following: 'basic', 'percentage', 'soft', 'variance'      | `false`                                                  |
| raycaster       | Props that go into the default raycaster                                                                                                 | `{}`                                                     |
| frameloop       | Render mode: always, demand, never                                                                                                       | `always`                                                 |
| resize          | Resize config, see resize observer options                                                                                               | `{ scroll: true, debounce: { scroll: 50, resize: 0 } }`  |
| orthographic    | Creates an orthographic camera                                                                                                           | `false`                                                  |
| dpr             | Pixel-ratio, use `window.devicePixelRatio`, or automatic: [min, max]                                                                     | `[1, 2]`                                                 |
| legacy          | Enables THREE.ColorManagement in three r139 or later                                                                                     | `false`                                                  |
| linear          | Switch off automatic sRGB color space and gamma correction                                                                               | `false`                                                  |
| events          | Configuration for the event manager, as a function of state                                                                              | `import { events } from "@xperimntl/vue-threejs"`        |
| eventSource     | The source where events are being subscribed to, HTMLElement                                                                             | `Ref<HTMLElement>`, `gl.domElement.parentNode`           |
| eventPrefix     | The event prefix that is cast into canvas pointer x/y events                                                                             | `offset`                                                 |
| flat            | Use `THREE.NoToneMapping` instead of `THREE.ACESFilmicToneMapping`                                                                       | `false`                                                  |
| plugins         | Array of [fiber plugins](/ecosystem/plugins) to register on this Canvas                                                                  | `[]`                                                     |
| inheritPlugins  | Whether to inherit app-level plugins (see [plugin system](/ecosystem/plugins))                                                           | `true`                                                   |
| onCreated       | Callback after the canvas has rendered (but not yet committed)                                                                           | `(state) => {}`                                          |
| onPointerMissed | Response for pointer clicks that have missed any target                                                                                  | `(event) => {}`                                          |

## Defaults

Canvas uses [createRoot](#createroot) which will create a translucent `THREE.WebGLRenderer` with the following constructor args:

- antialias=true
- alpha=true
- powerPreference="high-performance"

and with the following properties:

- outputColorSpace = THREE.SRGBColorSpace
- toneMapping = THREE.ACESFilmicToneMapping

It will also create the following scene internals:

- A `THREE.Perspective` camera
- A `THREE.Orthographic` cam if `orthographic` is true
- A `THREE.PCFSoftShadowMap` if `shadows` is true
- A `THREE.Scene` (into which all the content is rendered) and a `THREE.Raycaster`

In recent versions of threejs, `THREE.ColorManagement.enabled` will be set to `true` to enable automatic conversion of colors according to the renderer's configured color space. V3F will handle texture color space conversion. For more on this topic, see [https://threejs.org/docs/#manual/en/introduction/Color-management](https://threejs.org/docs/#manual/en/introduction/Color-management).

## Slots

### overlay

Renders DOM content in an absolutely positioned `div` sibling that sits on top of the canvas. The overlay div has `pointer-events: none` by default. Add `pointer-events: auto` to individual elements that should receive input.

```vue
<template>
  <Canvas>
    <mesh>
      <boxGeometry />
      <meshStandardMaterial color="orange" />
    </mesh>

    <template #overlay>
      <div style="padding: 20px; color: white; pointer-events: auto">
        <h2>HUD Content</h2>
        <button @click="doSomething">Click me</button>
      </div>
    </template>
  </Canvas>
</template>
```

When no overlay slot is provided, no extra DOM element is rendered.

See the [DOM Overlays tutorial](/tutorials/dom-overlays) for detailed patterns.

### error

Renders when a component inside the Canvas throws an error. Receives `error` (the Error object) and `retry` (a function to clear the error and re-render).

```vue
<template>
  <Canvas>
    <SceneContent />

    <template #error="{ error, retry }">
      <div style="padding: 20px; color: white">
        <p>{{ error.message }}</p>
        <button @click="retry">Retry</button>
      </div>
    </template>
  </Canvas>
</template>
```

If no error slot is provided, the error message is displayed as plain text.

## WebGL support

On some systems WebGL may not be supported, you can provide error handling for these cases.

You should also safeguard the canvas against WebGL context crashes, for instance if users have the GPU disabled or GPU drivers are faulty.

## WebGPU

Recent Three.js now includes a WebGPU renderer. While still a work in progress and not fully backward-compatible with all of Three's features, the renderer requires an async initialization method. V3F streamlines this by allowing the gl prop to return a promise.

```vue
<script setup lang="ts">
import * as THREE from 'three/webgpu'
import * as TSL from 'three/tsl'
import { Canvas, extend, useFrame, useThree } from '@xperimntl/vue-threejs'

extend(THREE as any)
</script>

<template>
  <Canvas
    :gl="
      async (props) => {
        const renderer = new THREE.WebGPURenderer(props as any)
        await renderer.init()
        return renderer
      }
    ">
    <mesh>
      <meshBasicNodeMaterial />
      <boxGeometry />
    </mesh>
  </Canvas>
</template>
```

## Custom Canvas

V3F can render to a root, similar to how Vue's `createApp` and all the other Vue renderers work. This allows you to shave off overhead from DOM-related packages.

Roots have the same options and properties as `Canvas`, but you are responsible for resizing it. It requires an existing DOM `<canvas>` object into which it renders.

### CreateRoot

Creates a root targeting a canvas, rendering content.

```js
import * as THREE from 'three'
import { extend, createRoot, events } from '@xperimntl/vue-threejs'

// Register the THREE namespace as native elements.
// See below for notes on tree-shaking
extend(THREE)

// Create a root
const root = createRoot(document.querySelector('canvas'))

async function app() {
  // Configure the root, inject events optionally, set camera, etc
  // This *must* be called before render, and it must be awaited
  await root.configure({ events, camera: { position: [0, 0, 50] } })

  // createRoot by design is not responsive, you have to take care of resize yourself
  window.addEventListener('resize', () => {
    root.configure({ size: { width: window.innerWidth, height: window.innerHeight } })
  })

  // Trigger resize
  window.dispatchEvent(new Event('resize'))

  // Render entry point
  root.render(h(App))

  // Unmount and dispose of memory
  // root.unmount()
}

app()
```

## Tree-shaking

New with v8, the underlying reconciler no longer pulls in the THREE namespace automatically.

This enables a granular catalogue which also enables tree-shaking via the `extend` API:

```js
import { extend, createRoot } from '@xperimntl/vue-threejs'
import { Mesh, BoxGeometry, MeshStandardMaterial } from 'three'

extend({ Mesh, BoxGeometry, MeshStandardMaterial })

createRoot(canvas).render(h('mesh', {}, [h('boxGeometry'), h('meshStandardMaterial')]))
```
