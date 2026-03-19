# Vue-Native Evolution Plan

Status date: March 7, 2026

Purpose: define the next phase of `vue-three-fiber` now that the parity audit is largely complete and the remaining exact mismatches are constrained by unmodified Vue core.

This document is internal engineering guidance. It is not part of the public docs site.

## Executive Summary

The project has reached the point where continued value will not come from forcing Vue to imitate React in the last few edge cases.

The renderer already has solid foundations:

- a working custom renderer
- real event coverage
- a credible test renderer
- composable access to scene state
- loader caching
- portals
- demand-based rendering
- Canvas context bridging into the Three subtree

The highest-leverage move now is to treat `vue-three-fiber` as a Vue-first 3D renderer with strong API overlap, not as an exact behavioral clone in areas where Vue does not expose the required hooks.

In practical terms:

- keep the overlapping API where it is genuinely compatible
- stop hiding platform divergences behind clever wrappers
- add Vue-native APIs for the workflows that are awkward under a strict parity mindset
- move higher-level ergonomics into a Vue-native layer rather than contorting the renderer

Recommended product positioning:

`vue-three-fiber` should aim to be "fiber-style Three.js authoring for Vue" and "R3F-compatible where practical, Vue-native where stronger."

## Current Baseline

The current codebase already has several strengths that are worth building on instead of replacing:

### 1. Vue composables are already the main integration surface

Evidence:

- `useThree` returns `ShallowRef<T>` values and subscribes reactively to the store
- `useFrame` is scoped by component lifecycle
- `useLoader` and `useLoaderAsync` already fit Vue's async/composable model

Relevant code:

- `packages/fiber/src/core/composables.ts`

### 2. Canvas already bridges Vue app context into the Three subtree

This is a meaningful Vue advantage. The current `Canvas` implementation copies inherited `provide` values into the renderer tree, which means scene components can participate in normal Vue dependency injection.

Relevant code:

- `packages/fiber/src/web/Canvas.ts`

### 3. The renderer already supports "managed scene graph + imperative escape hatches"

This is a healthy model for Vue:

- declarative scene structure
- direct mutation in `useFrame`
- explicit internal escape hatch via `useInstanceHandle`

Relevant docs:

- `docs/API/hooks.md`
- `docs/API/additional-exports.md`

### 4. The repo already has a public-facing examples site

This matters because the next phase is not only API design. It is teaching better patterns:

- DOM + scene composition
- scene transitions
- loader orchestration
- stable imperative access
- demand rendering

Relevant code:

- `example/src/**`

## Strategic Shift

The early mandate was "faithful Vue conversion."

That achieved the right thing operationally: it forced the renderer, tests, and docs to become credible.

It is no longer the right optimization target.

The next mandate should be:

"Preserve meaningful compatibility. Use Vue's strengths to provide a better experience where exact parity is structurally weak or impossible."

## Design Principles

### 1. Additive beats breaking

Do not throw away the current API surface. Keep the familiar surface where it works:

- `Canvas`
- `extend`
- `useThree`
- `useFrame`
- `useLoader`
- `createPortal`

Add Vue-native APIs beside it.

### 2. Explicit contracts beat magical behavior

If a ref is a handle, call it a handle.
If a render commit is async, expose an async commit API.
If a transition keeps previous content visible, make that an explicit strategy rather than an accidental mismatch.

### 3. Use Vue primitives before inventing renderer-specific ones

Prefer:

- composables
- slots
- `provide` / `inject`
- async components
- watchers
- app-level state managers

Only add renderer-specific APIs when Vue primitives are not sufficient on their own.

### 4. Separate public stable APIs from internal renderer state

`useInstanceHandle` should remain an escape hatch.

Public APIs should expose:

- stable object access
- render lifecycle coordination
- scene transition policies
- overlay composition

without requiring consumers to understand `Instance` internals.

### 5. DOM and 3D should be treated as a single Vue app, not as separate worlds

This is an area where Vue can be stronger than the reference implementation.

The app should be able to coordinate:

- DOM overlays
- loading UI
- scene state
- controls
- selected objects
- debugging panels

using normal Vue composition patterns.

### 6. Keep core lean; put higher-level ergonomics in an extras layer when appropriate

Not every improvement belongs in `@bluera/vue-threejs`.

Recommended split:

- core: renderer, store, events, lifecycle primitives, stable low-level Vue-native APIs
- extras: transitions, resource boundaries, overlay helpers, inspectors, controls, scene tools

If an API is opinionated, demo-driven, or mostly ergonomic, default to `@vue-three/extras` rather than core.

## Where Vue Can Be Better

## Opportunity A: Stable Object Access Instead of Pretend Raw Refs

### Problem

Trying to make host-element refs behave exactly like raw `THREE.Object3D` refs fights Vue.

Even when proxy-based behavior is convenient, it is still confusing because users cannot tell whether they hold:

- the raw object
- a wrapper
- renderer state
- something that is "object-like but not identical"

### Vue-native direction

Ship an explicit object-ref composable instead of overloading Vue's host ref contract.

### Recommended API

#### `useObjectRef<T>()`

Purpose:

- Vue-native, explicit replacement for imperative access to a Three object

Proposed shape:

```ts
interface ObjectRef<T extends THREE.Object3D> {
  ref: (value: unknown) => void
  object: ShallowRef<T | null>
  mounted: Readonly<ShallowRef<boolean>>
}

declare function useObjectRef<T extends THREE.Object3D>(): ObjectRef<T>
```

Usage:

```vue
<script setup lang="ts">
import { useObjectRef, useFrame } from '@bluera/vue-threejs'
import type { Mesh } from 'three'

const cube = useObjectRef<Mesh>()

useFrame((state) => {
  if (cube.object.value) {
    cube.object.value.rotation.y = state.clock.elapsedTime
  }
})
</script>

<template>
  <mesh :ref="cube.ref">
    <boxGeometry />
    <meshStandardMaterial color="tomato" />
  </mesh>
</template>
```

Why this is better:

- no ambiguity about what the user gets
- works naturally in templates and JSX via function refs
- does not pretend Vue host refs are something they are not
- keeps raw object access available where it matters most

### Optional second-layer API

#### `useThreeHandle<T>()`

Only add this if there is clear demand for a richer public handle.

Proposed shape:

```ts
interface ThreeHandle<T extends THREE.Object3D> {
  ref: (value: unknown) => void
  object: ShallowRef<T | null>
  mounted: Readonly<ShallowRef<boolean>>
  invalidate(): void
  dispose(): void
}
```

This should expose stable public behavior only. It should not leak raw `Instance` fields.

### Keep / change

Keep:

- `useInstanceHandle(object)` as an advanced internal escape hatch

Change:

- stop teaching raw template refs as the main imperative access pattern
- update examples and docs to use `useObjectRef`

### Acceptance criteria

- add `useObjectRef` to core
- examples that currently use host refs for imperative mutation switch to `useObjectRef`
- docs stop claiming plain Vue refs are guaranteed raw Three objects
- `useInstanceHandle` remains documented as unstable/internal

### Size

- `M`

## Opportunity B: Render Lifecycle APIs Instead of Fighting for Synchronous Semantics

### Problem

Exact `flushSync` parity is a bad long-term center of gravity for a Vue renderer.

The real user need is usually one of these:

- "I need the next rendered frame before taking a screenshot"
- "I need scene changes committed before reading back state"
- "I need to coordinate demand rendering with async work"

Vue is naturally good at explicit async coordination.

### Vue-native direction

Define a clear render lifecycle API that embraces async commit and frame boundaries.

### Recommended APIs

#### `useRenderCommit()`

Purpose:

- wait until Vue updates and the scene have committed

Proposed shape:

```ts
interface RenderCommit {
  commit: () => Promise<void>
}

declare function useRenderCommit(): RenderCommit
```

Usage:

```ts
const { commit } = useRenderCommit()

state.value = nextState
await commit()
```

#### `useNextFrame()`

Purpose:

- wait for one rendered frame
- useful for demand mode, screenshots, measurement, and tests

Proposed shape:

```ts
declare function useNextFrame(): () => Promise<void>
```

#### `useAfterRender(callback, priority?)`

Purpose:

- Vue-scoped equivalent of "run after render" without wiring events by hand

This can likely be built on top of existing global after-effect support.

### Compatibility strategy

`flushSync` can remain for overlap, but it should stop being the preferred mental model.

Recommended policy:

- keep `flushSync` only as a compatibility export
- document `useRenderCommit` and `useNextFrame` as the preferred Vue-native approach
- if synchronous `flushSync` proves maintainable for the supported Vue range, treat that as a bonus, not as the main design center

### Good migration targets

The screenshot demo is a strong candidate for migration from ad hoc timing to a real render lifecycle API.

Relevant example:

- `example/src/demos/FlushSync.tsx`

### Acceptance criteria

- add `useRenderCommit`
- add `useNextFrame`
- add `useAfterRender`
- update the screenshot demo to use the new lifecycle primitives
- add tests proving:
  - commit waits for scene application
  - nextFrame resolves after a rendered frame
  - after-render callbacks are cleaned up on unmount

### Size

- `M`

## Opportunity C: Resource-Driven Scene Transitions Instead of Suspense Emulation

### Problem

Trying to perfectly recreate React Suspense visibility semantics inside Vue's renderer is the wrong abstraction battle.

The real product need is better scene loading and transition behavior.

In 3D, Vue's default "keep previous content visible while new content loads" behavior is often better UX anyway.

### Vue-native direction

Make async scene transitions first-class and policy-driven instead of relying on renderer-level Suspense tricks.

### Recommended split

#### Core

Keep `useLoader` and `useLoaderAsync`.

Potential core addition:

- `useResource` or `useAssetResource` only if the team wants a stable low-level status API

Example shape:

```ts
interface ResourceState<T> {
  data: ShallowRef<T | null>
  status: ShallowRef<'idle' | 'loading' | 'ready' | 'error'>
  error: ShallowRef<Error | null>
  reload: () => Promise<void>
}
```

#### Extras

Put higher-level async scene orchestration in `@vue-three/extras`.

Recommended candidates:

- `SceneTransition`
- `ResourceBoundary`
- `ScenePlaceholder`
- `useProgress` / `useResourceProgress`

### Proposed transition strategies

These should be explicit props or composable policies, not hidden renderer behavior.

- `keep-previous`
  - keep previous 3D content visible until the next resource is ready
- `replace`
  - remove previous content and show fallback
- `manual`
  - expose loading state and let the app decide
- optional later:
  - `crossfade`
  - `blend`

### Why this is better than parity-chasing Suspense

- easier to explain
- easier to test
- better aligned with actual 3D app UX
- usable from templates and DOM overlays
- does not depend on renderer hide/unhide hooks Vue does not expose

### Acceptance criteria

- at least one Vue-native transition primitive is implemented in extras or formally scoped there
- docs explain recommended async scene strategies without implying exact renderer-level Suspense parity
- examples include one scene-swap demo and one loader/fallback demo using explicit strategies

### Size

- `L`

## Opportunity D: First-Class DOM/Scene Composition

### Problem

The current public examples still treat the canvas and the rest of the Vue app as mostly separate concerns.

That misses one of Vue's strongest advantages: composing UI, state, and 3D scene behavior inside one coherent app.

### Vue-native direction

Make DOM overlays and scene-aware UI a first-class pattern.

### Recommended API

#### `Canvas` named slots

Recommended slot structure:

```vue
<Canvas>
  <Scene />

  <template #overlay>
    <SceneHud />
  </template>

  <template #error="{ error }">
    <SceneError :error="error" />
  </template>
</Canvas>
```

Behavior:

- default slot remains the scene subtree rendered by the custom renderer
- `overlay` renders normal DOM siblings inside the canvas wrapper
- `error` renders a customizable DOM fallback

Optional slot props:

- current root state
- invalidate function
- loading/progress state if a resource boundary is active

### Why this is a good Vue fit

- slots are a native way to compose DOM and 3D concerns
- better than pushing DOM concerns through Three or portals
- enables scene-aware toolbars, inspectors, and loaders without extra packages

### Related API

#### `useCanvasRoot()`

If overlay content needs scene state outside the rendered 3D subtree, provide a public composable for the current root store or a read-only facade.

This should be designed carefully so it does not duplicate `useThree` unnecessarily.

### Acceptance criteria

- `Canvas` supports at least an `overlay` slot
- error display is customizable via slot rather than hard-coded DOM
- one example demonstrates DOM controls and scene state in one component tree

### Size

- `M`

## Opportunity E: Official Scene Service Patterns

### Problem

The renderer already bridges parent `provide` values into the scene, but the docs do not yet treat this as a first-class architecture pattern.

That is a missed opportunity.

### Vue-native direction

Lean into app-level composition patterns instead of inventing renderer-specific global state tools.

### Recommended focus

Document and demonstrate:

- Pinia or app-store driven scene state
- provide/inject services for controls, selection, camera mode, gizmos, debug flags
- DOM overlay + scene sharing the same injected services

### What not to do

Do not add a custom scene-service framework if normal Vue provide/inject already solves the problem.

Only add helpers where the renderer needs to bridge or normalize access.

### Acceptance criteria

- docs include one explicit guide for provide/inject across DOM and scene
- examples include one scene service demo
- internal architecture guidance recommends Vue-native state sharing first

### Size

- `S`

## Opportunity F: Demand Rendering Helpers for Reactive Apps

### Problem

Vue apps often have rich reactive state, but V3F best practice is still to mutate inside `useFrame` and invalidate explicitly when using `frameloop='demand'`.

That is correct, but repetitive.

### Vue-native direction

Add small helpers that connect Vue watchers to invalidation without hiding render costs.

### Recommended API

#### `watchInvalidate(source, options?)`

Purpose:

- watch reactive Vue sources and invalidate the current root on change

Example:

```ts
const exposure = ref(1)
watchInvalidate(exposure)
```

This should remain a thin convenience API over `watch(..., invalidate)`, not a large abstraction.

### Optional later helpers

- `useDemandRender(source)`
- `useManualFrameloop()`

Only add these if `watchInvalidate` proves insufficient.

### Acceptance criteria

- add one thin invalidation helper
- docs show how to combine it with `frameloop='demand'`
- examples demonstrate a reactive settings panel driving demand renders

### Size

- `S`

## Recommended Package Split

### Core candidates

These fit the low-level public surface:

- `useObjectRef`
- `useRenderCommit`
- `useNextFrame`
- `useAfterRender`
- `watchInvalidate`
- `Canvas` overlay and error slots

### Extras candidates

These are higher-level and more opinionated:

- `SceneTransition`
- `ResourceBoundary`
- `ScenePlaceholder`
- progress UI helpers
- scene inspectors
- selection tools
- developer HUDs

## Implementation Order

Recommended order:

### Phase 1: Contract cleanup and public positioning

- stop overstating raw ref semantics in docs
- stop treating strict parity as the only success definition
- decide which divergences are now officially documented

### Phase 2: Stable imperative access

- implement `useObjectRef`
- update examples away from direct template refs for imperative object access

### Phase 3: Render lifecycle APIs

- implement `useRenderCommit`
- implement `useNextFrame`
- implement `useAfterRender`
- migrate screenshot / capture examples

### Phase 4: DOM and scene composition

- add `Canvas` overlay and error slots
- expose root access for overlay-driven tools if needed

### Phase 5: Resource orchestration

- define whether `useResource` belongs in core
- build transition and resource-boundary primitives in extras or scope them there

### Phase 6: Docs and examples overhaul

Add Vue-native examples for:

- object handles
- demand rendering with reactive controls
- DOM overlay + scene state
- scene swapping / keep-previous transitions
- app-level provide/inject scene services

## Non-Goals

This roadmap does not recommend:

- more renderer hacks to mimic unsupported Vue host behavior
- hiding divergences with wrapper objects while documenting them as parity
- making `useInstanceHandle` the public default
- inventing a parallel state-management system instead of using Vue composition
- bloating core with every ergonomic abstraction

## Definition of Success

The project should be able to say all of the following truthfully:

- it provides a solid fiber-style Three.js renderer for Vue
- it preserves the familiar overlap where that overlap is real
- it does not misrepresent platform divergences as parity
- it offers better Vue-native APIs for imperative access, async coordination, and DOM/scene composition
- the examples teach Vue-first patterns, not only parity-era workarounds

## Deliverables

The roadmap is not complete until all of the following exist:

- an approved API decision for `useObjectRef`
- an approved API decision for render lifecycle primitives
- a package-boundary decision for core vs extras
- updated docs language describing the new product direction
- at least three Vue-native examples proving the direction in practice
- tests covering each newly added public API

## Short Version

The next win is not "be more React-like."

The next win is:

- explicit object handles instead of magical refs
- explicit async render coordination instead of faux sync assumptions
- policy-driven scene transitions instead of Suspense emulation
- DOM/3D slot composition as a first-class pattern
- normal Vue provide/inject and store patterns as official scene architecture

That is how `vue-three-fiber` becomes stronger as a Vue library, not merely defensible as a port.
