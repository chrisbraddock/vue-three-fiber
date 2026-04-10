---
title: Scaling performance
description: Practical performance strategies for vue-threejs scenes.
---

Rendering 3D content continuously is expensive. The main performance levers in vue-threejs are render cadence, object allocation, draw-call count, asset lifecycle, and adaptive quality. This page keeps the guidance focused on those concerns.

## On-demand rendering

Use `frameloop="demand"` when your scene can become idle. Instead of rendering every frame, the renderer only schedules work when something changes.

```ts
import { h } from 'vue'
import { Canvas } from '@xperimntl/vue-threejs'

export default () => h(Canvas, { frameloop: 'demand' })
```

This is especially useful for product viewers, editors, and scenes driven by user input rather than continuous animation.

## Manual invalidation

Imperative mutations are invisible to Vue's change detection. If controls or external systems mutate Three.js objects directly, request a frame manually.

```ts
import { onMounted, ref } from 'vue'
import { useThree } from '@xperimntl/vue-threejs'

const controlsRef = ref<any>(null)
const invalidate = useThree((state) => state.invalidate)

onMounted(() => {
  controlsRef.value?.addEventListener('change', invalidate.value)
})
```

`invalidate()` schedules the next frame. It does not render immediately.

## Re-use materials and geometries

Repeated allocation of geometries and materials adds CPU overhead and GPU memory pressure. Re-use long-lived resources whenever possible.

```ts
import * as THREE from 'three'

const sharedMaterial = new THREE.MeshLambertMaterial({ color: 'red' })
const sharedGeometry = new THREE.SphereGeometry(1, 28, 28)
```

When resources are created outside the canvas lifecycle, make sure your color-management assumptions stay consistent with your Three.js version and renderer settings.

## Cache loaded assets

`useLoader` caches by input URL. Re-use cached assets instead of reloading and reconstructing them in multiple components.

```ts
import { useLoader } from '@xperimntl/vue-threejs'
import { TextureLoader } from 'three'

const colorMap = useLoader(TextureLoader, '/albedo.png')
```

If the loaded payload contains a scene, vue-threejs also builds named node and material maps for selective access.

## Reduce draw calls

Large numbers of individual meshes usually bottleneck before raw triangle count does. Preferred strategies:

- Merge static geometry when objects never need independent transforms.
- Use `InstancedMesh` for repeated objects that share geometry and material.
- Avoid deep component trees that generate many tiny draw calls.

## Level of detail

Show cheaper representations as objects move farther from the camera. Lowering geometric complexity at distance reduces vertex processing and overdraw without obvious quality loss.

Good candidates:

- Dense decorative props
- Repeated environment objects
- High-resolution imported meshes

## Nested loading

Load something cheap first, then refine. Suspense boundaries are useful when you want a low-cost placeholder or lower-resolution asset to appear before the final asset is ready.

Typical progression:

1. Loading indicator
2. Cheap placeholder or low-quality asset
3. Full-quality asset

## Adaptive quality

Quality does not need to be fixed. You can adapt resolution, effects, and post-processing based on current performance.

Typical knobs:

- `dpr`
- shadow quality
- post-processing passes
- SSAO / bloom / transmission quality
- texture resolution

Example logic:

```ts
import { ref } from 'vue'

const dpr = ref(1.5)

function onPerformanceDrop() {
  dpr.value = 1
}

function onPerformanceRecovery() {
  dpr.value = 2
}
```

If you prefer gradual changes, map a normalized performance factor into a quality range and lerp toward it instead of jumping between two presets.

## Movement regression

Another useful strategy is temporary regression during interaction. While the camera moves, lower expensive settings. When the scene settles, restore them.

This keeps interaction smooth on weaker devices without permanently degrading quality.

Common toggles during movement:

- lower pixel ratio
- cheaper shadows
- fewer effect passes
- lower sample counts

## General pitfalls

- Do not create materials, geometries, vectors, or colors inside hot paths unless they are intentionally short-lived.
- Avoid routing per-frame animation through Vue reactive state.
- Prefer direct object mutation inside `useFrame`.
- Keep expensive post-processing optional.
- Measure before optimizing: many problems are draw-call bound, not triangle bound.

## Checklist

- Use `frameloop="demand"` when idle rendering is wasteful.
- Call `invalidate()` after imperative mutations.
- Re-use geometry, materials, and loaded assets.
- Prefer instancing or merging for repeated content.
- Reduce quality dynamically when performance drops.
- Restore quality when interaction ends.
