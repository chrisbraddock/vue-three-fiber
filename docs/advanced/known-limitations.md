---
title: Known Limitations
description: Runtime behaviors and constraints to be aware of when using vue-threejs
---

## Refs are proxy-backed

Template refs in vue-threejs are **proxy-backed handles**, not raw `THREE.Object3D` instances. Property access, method calls, and `instanceof` all work transparently through the proxy.

However, strict identity comparison (`===`) against the raw Three.js object will fail because the ref is a proxy wrapper, not the underlying object.

**When you need the raw object**, use [`useObjectRef`](/tutorials/object-handles):

```ts
import { useObjectRef } from '@xperimntl/vue-threejs'
import type { Mesh } from 'three'

const mesh = useObjectRef<Mesh>()
// mesh.object.value is the raw THREE.Mesh
// mesh.ref is the template ref callback
// mesh.mounted tracks lifecycle
```

## Vue Suspense keeps previous content visible

When a `<Suspense>` boundary re-enters the pending state (e.g., swapping async components), Vue keeps the **previous content visible** until the new branch resolves. This differs from React Suspense which can show a fallback immediately.

This means during async scene transitions, the old scene remains rendered — there is no automatic blank/loading state between scenes.

For explicit control over loading transitions, use manual loading patterns instead of relying on Suspense behavior:

```vue
<template>
  <Canvas>
    <LoadingPlaceholder v-if="loading" />
    <SceneContent v-else :data="loadedData" />
  </Canvas>
</template>
```

See the [Scene Transitions](/tutorials/scene-transitions) tutorial for more patterns.

## Pointer event semantics

vue-threejs's pointer events are raycaster-based, not DOM-based. Some differences from standard DOM pointer events:

### `pointerenter` / `pointerleave`

These fire based on raycaster intersection, not DOM hover semantics. The behavior may differ from browser pointer events in edge cases involving:

- Objects partially behind other objects
- Objects at glancing angles to the camera
- Very thin or small geometries

### Pointer capture

The renderer does not implement full [DOM pointer capture](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events#pointer_capture) semantics. `setPointerCapture` and `releasePointerCapture` on the canvas element will not redirect Three.js-level pointer events.

For drag interactions, track pointer state manually:

```ts
const dragging = ref(false)

// In your mesh handlers:
onPointerDown={() => { dragging.value = true }}
onPointerUp={() => { dragging.value = false }}
onPointerMove={(e) => {
  if (dragging.value) {
    // handle drag
  }
}}
```

### `onPointerMissed`

Fires when a pointer event occurs on the canvas but misses all interactive objects. This is a Canvas-level prop, not per-object:

```vue
<Canvas :onPointerMissed="() => { selection.value = null }">
```

## SSR and `<ClientOnly>`

Three.js requires browser APIs (`WebGLRenderingContext`, `document`, `window`). In SSR environments (VitePress, Nuxt SSR), wrap Canvas and Three.js components in `<ClientOnly>`:

```vue
<ClientOnly>
  <Canvas>
    <MyScene />
  </Canvas>
</ClientOnly>
```

Components that import Three.js at module scope may also need dynamic imports to avoid SSR crashes.

## Custom renderer boundary

vue-threejs uses Vue's `createRenderer` API to render into Three.js instead of the DOM. This means:

- **Standard DOM components** (e.g., `<div>`, `<span>`) cannot be rendered inside `<Canvas>`. Use the `#overlay` slot for DOM content that overlays the scene.
- **Vue DevTools** may not inspect the Three.js component tree the same way as DOM components.
- **Transition components** (`<Transition>`, `<TransitionGroup>`) do not work inside the Canvas tree because Three.js objects don't support CSS transitions.

## `flushSync` is synchronous

The `flushSync` export is a compatibility shim. For new code, prefer `useRenderCommit` and `useNextFrame` which integrate properly with Vue's async scheduling:

```ts
import { useRenderCommit } from '@xperimntl/vue-threejs'

const { commit } = useRenderCommit()
await commit() // waits for Vue flush + one rendered frame
```
