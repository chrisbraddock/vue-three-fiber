---
title: Vue Divergences
description: How vue-threejs differs from react-three-fiber
---

vue-threejs is a Vue port of [`react-three-fiber`](https://github.com/pmndrs/react-three-fiber), but a few behaviors differ because Vue's renderer architecture is different from React's. This page documents the main differences from `react-three-fiber` and what to do about them.

## Refs

Compared with `react-three-fiber`, template refs resolve to a proxy-backed handle instead of a raw `THREE.Object3D` instance.

### What works

- **Property access**: `meshRef.value.position.set(1, 2, 3)` works as expected
- **Method calls**: `meshRef.value.lookAt(target)` works as expected
- **`instanceof`**: `meshRef.value instanceof THREE.Mesh` returns `true`
- **Mutation in `useFrame`**: `meshRef.value.rotation.x += delta` works as expected

### What does not work

- **Identity comparison**: `meshRef.value === someExternalObject` will return `false` even if the ref points to the same underlying Three.js object. This is a Vue platform constraint — Vue's custom renderer binds host-element refs to the internal node returned by `createElement`, and there is no hook to substitute a different public value.

### What to do

For the vast majority of use cases — animating objects in `useFrame`, reading properties, calling methods — refs work transparently. If you need guaranteed raw `THREE.Object3D` identity, use [`useObjectRef`](/API/hooks#useobjectref) which extracts the underlying Three.js object into a typed `ShallowRef`.

## Suspense

Compared with `react-three-fiber`, Vue's `<Suspense>` component works with async `setup()` functions and `useLoader`, but its re-entrance behavior differs when a resolved branch is replaced by a new pending branch.

### How it works

When switching from a resolved async component to a new pending one (re-entrance), Vue keeps the old content visible while the new content loads in the background.

### Why this is often fine for 3D

Vue's behavior avoids jarring visual disappearances during loading transitions. The previous scene stays visible until the new one is ready, which is usually better UX for 3D applications.

### What to do

Use Vue's `<Suspense>` as documented. If you need explicit control over what happens during loading transitions — showing placeholders, fading between scenes, or removing old content — higher-level scene transition components (`SceneTransition`, `ResourceBoundary`) are planned for a `@xperimntl/vue-threejs-extras` package. These will provide explicit transition strategies (`keep-previous`, `replace`, `manual`) as component props rather than hidden renderer behavior.

In the meantime, you can build similar patterns using Vue's built-in tools:

- Use `v-if` / `v-show` with reactive loading state for manual transitions
- Use the [Canvas error slot](/API/canvas#error) for graceful degradation
- Use `provide`/`inject` to share loading state between 3D components and [DOM overlays](/tutorials/dom-overlays)

## flushSync

`flushSync` synchronously flushes pending reactive updates to the Three.js scene graph. After `flushSync(fn)` returns, the scene reflects the state changes made inside `fn`.

```ts
import { flushSync } from '@xperimntl/vue-threejs'

flushSync(() => {
  positionX.value = 42
})
// Scene graph is updated here
```

> [!NOTE]
> This page is specifically about behavior relative to `react-three-fiber`. For new code, prefer the Vue-native render lifecycle APIs — [`useRenderCommit`](/API/hooks#userendercommit) (wait for Vue flush + scene render) and [`useNextFrame`](/API/hooks#usenextframe) (wait for one rendered frame). `flushSync` is kept as a lower-level compatibility utility for imperative scene coordination.
