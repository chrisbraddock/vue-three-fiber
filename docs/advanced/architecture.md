---
title: Architecture
description: Internal architecture of the vue-threejs renderer.
---

# Architecture

This page describes the internal structure of vue-threejs. It is intended for contributors and advanced users who want to understand how the renderer works under the hood. All source references point to files in `packages/core/src/`.

## Store

**Source:** `core/store.ts`

The root store is a [Zustand](https://github.com/pmndrs/zustand) vanilla store (`StoreApi<RootState>`) that holds all shared state for a single Canvas. It is the single source of truth for the renderer, scene, camera, and event system.

### What RootState holds

| Field         | Type                              | Description                                             |
| ------------- | --------------------------------- | ------------------------------------------------------- |
| `gl`          | `THREE.WebGLRenderer`             | The WebGL renderer instance                             |
| `scene`       | `THREE.Scene`                     | The root scene                                          |
| `camera`      | `Camera`                          | The active camera (perspective or orthographic)         |
| `raycaster`   | `THREE.Raycaster`                 | Raycaster for pointer events                            |
| `clock`       | `THREE.Clock`                     | Frame timing                                            |
| `size`        | `Size`                            | Canvas pixel dimensions `{ width, height, top, left }`  |
| `viewport`    | `Viewport`                        | Three.js-unit dimensions derived from camera + size     |
| `pointer`     | `THREE.Vector2`                   | Normalized pointer coordinates                          |
| `controls`    | `THREE.EventDispatcher \| null`   | Currently active controls                               |
| `frameloop`   | `'always' \| 'demand' \| 'never'` | Render mode                                             |
| `performance` | `Performance`                     | Adaptive performance state (current, min, max, regress) |
| `events`      | `EventManager`                    | Event handler layer                                     |
| `internal`    | `InternalState`                   | Subscribers, interaction list, frame counter            |

### Reactive updates

The store is created with two callbacks -- `invalidate` and `advance` -- that connect it to the frame loop. A Zustand subscription watches for size, DPR, and camera changes and automatically resizes the renderer and updates the viewport. A second subscription calls `invalidate` on every state change, ensuring the render loop picks up changes in demand mode.

### Injection

The store is exposed to the Vue component tree via `provide(context, store)` using a Symbol injection key (`v3f-store`). Composables like `useThree()` and `useFrame()` call `inject(context)` to access it.

## Reconciler

**Source:** `core/reconciler.ts`

vue-threejs uses Vue's `createRenderer()` API to build a custom renderer whose host nodes are Three.js objects. The renderer is defined by a `nodeOps` object that implements Vue's `RendererOptions<Instance, Instance>` interface.

### Instance

Every node in the Three.js scene graph is wrapped in an `Instance` object:

```ts
interface Instance<O = any> {
  root: RootStore
  type: string // e.g. 'mesh', 'boxGeometry', 'primitive'
  parent: Instance | null
  children: Instance[]
  props: InstanceProps & Record<string, any>
  object: O // the actual THREE.js object
  eventCount: number
  handlers: Partial<EventHandlers>
  attach?: AttachType
  isHidden: boolean
  _onReconstruct?: () => void
}
```

### nodeOps mapping

| nodeOp          | What it does                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------- |
| `createElement` | Looks up the constructor in the catalogue, creates an Instance, wraps it in a Proxy          |
| `insert`        | Links parent/child Instances, creates the THREE.js object, calls `applyProps`, adds to scene |
| `remove`        | Unlinks Instance, removes from scene graph, detaches attached objects, disposes              |
| `patchProp`     | Applies a single prop change to the THREE.js object; handles `args`/`object` reconstruction  |
| `createText`    | Returns an empty Instance (Three.js has no text nodes)                                       |
| `createComment` | Returns an empty Instance                                                                    |

### Catalogue and extend

Three.js constructors are stored in a module-level `catalogue` object keyed by PascalCase name. The `extend()` function populates it:

```ts
import * as THREE from 'three'
import { extend } from '@xperimntl/vue-threejs'

extend(THREE) // registers Mesh, BoxGeometry, MeshStandardMaterial, ...
```

When `createElement` receives a type like `'mesh'`, it converts to `'Mesh'`, looks it up in the catalogue, and uses it to construct the object on insert. Unknown types throw an error telling the user to call `extend`.

### Reconstruction

When `args` or a primitive's `object` prop changes, `patchProp` calls `reconstructInstance`. This disposes the old THREE.js object, creates a new one with the new constructor arguments, re-applies props, reattaches children, and fires the `_onReconstruct` callback so ref holders (like `useObjectRef`) can update.

### Deferred scene graph sync

When multiple siblings swap objects in a single patch cycle (e.g., a primitive list reorder), individual remove+add operations can steal objects from siblings. To handle this, parent scene graph rebuilds are deferred to a microtask via `scheduleParentSync`, which batches all changes and rebuilds the `parentObject.children` array in Instance tree order.

## Instance proxy

**Source:** `core/reconciler.ts` (inside `createElement`)

Every Instance created by `createElement` is wrapped in a JavaScript `Proxy`. This proxy is what Vue refs receive -- since Vue's custom renderer API has no `getPublicInstance` hook, the host element exposed to refs is whatever `createElement` returns.

### Proxy behavior

| Operation          | Route                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `get(prop)`        | Instance props (root, type, parent, children, object, ...) read from Instance; all others delegate to `instance.object` |
| `set(prop)`        | Instance props write to Instance; all others write to `instance.object`                                                 |
| `getPrototypeOf()` | Returns the prototype of `instance.object`, so `instanceof` checks work                                                 |

This means `ref.value.position` returns the THREE.js object's position, `ref.value instanceof THREE.Mesh` returns `true`, and `ref.value.type` returns the Instance's type string (not the THREE.js object's type).

### pendingWrites

Vue may call ref callbacks before `insert()` creates the THREE.js object (when the parent has no root yet). To handle this, the proxy queues set operations into a `pendingWrites` Map when `instance.object` is null. When `object` is assigned (during insert), all pending writes are flushed to the real object.

### V3F value wrapping

When reading properties from the THREE.js object through the proxy, returned values that are themselves V3F-managed Object3Ds are rewrapped in their V3F proxy so that identity comparisons work. Plain objects and arrays get a lightweight view proxy that applies the same rewrapping on nested access.

## Canvas and context bridge

**Source:** `web/Canvas.ts`

The `Canvas` component is the primary entry point for users. It is a standard Vue component (defined with `defineComponent`) that renders a `<div>` containing a `<canvas>` element and an optional overlay div.

### Setup flow

1. **Extend THREE** -- `extend(THREE)` registers all standard Three.js constructors in the catalogue
2. **Collect provides** -- Canvas walks the parent component's provide chain and collects all entries. These are replayed inside a `ContextBridge` component so that `provide`/`inject` works across the DOM/3D boundary
3. **Merge plugins** -- Canvas-level and app-level plugin entries are merged (deduped by name, last wins)
4. **Observe size** -- a `ResizeObserver` tracks the wrapper div's dimensions and writes them to a `size` ref
5. **Watch size** -- when size becomes valid (non-zero), Canvas creates the root and configures it

### Root creation

When size is first valid, Canvas calls `createRoot(canvasElement)`, then `root.configure(props)` to set up the renderer, camera, scene, and event system. It then calls `root.render(vnodes, { appContext, plugins })`.

The render tree is: `V3FStoreProvider` (provides the store) -> `FiberRuntimeProvider` (runs plugins, provides their values) -> `ContextBridge` (replays parent provides) -> user's scene components.

### Slots

- **`#default`** -- rendered inside the Three.js custom renderer
- **`#overlay`** -- rendered as a sibling DOM div with `pointer-events: none`
- **`#error`** -- replaces the entire Canvas output when `onErrorCaptured` fires; receives `{ error, retry }`

## Root lifecycle

**Source:** `core/renderer.ts`

The `createRoot` function returns a `ReconcilerRoot` with three methods:

### configure(props)

Sets up the WebGL renderer, camera, raycaster, scene, shadows, color management, XR, and sizing. This is async because the `gl` prop can be a factory that returns a promise. Configuration is idempotent for most fields (one-time-only for gl, raycaster, scene, XR).

### render(children, options)

Waits for configuration to complete, then:

1. Flags the canvas as active
2. Fires the `onCreated` callback
3. Connects pointer events to the DOM target
4. Builds the provider tree: `V3FStoreProvider` -> `FiberRuntimeProvider` (if plugins) -> children
5. Calls `vueRender(vnode, container)` using the Vue custom renderer

The `container` is a `VueRenderContainer` -- a special Instance with a `_vnode` field for Vue's internal tracking. Its `object` is set to the store's scene, so that child inserts into the container add objects to the scene.

### unmount()

Calls `unmountComponentAtNode`, which:

1. Marks the canvas as inactive
2. Renders `null` into the container to tear down the Vue tree
3. After a 500ms delay, disconnects events, disposes render lists, forces context loss, disconnects XR, disposes the scene, and removes the root from the internal `_roots` map

## Frame loop

**Source:** `core/loop.ts`

The frame loop is a global `requestAnimationFrame` loop shared by all roots.

### Loop structure

Each frame:

1. **Before effects** -- run global effects registered via `addEffect()`
2. **Update** -- for each active root, call `update()` which:
   - Computes delta time from the clock
   - Calls all `useFrame` subscribers in priority order
   - If no subscriber has taken over rendering (priority === 0), calls `gl.render(scene, camera)`
   - Decrements the frame counter
3. **After effects** -- run callbacks registered via `addAfterEffect()`
4. **Stop check** -- if no root requested another frame, run tail effects and cancel the animation frame

### invalidate and advance

`invalidate(state, frames)` sets `state.internal.frames` and starts the loop if it is not running. In `frameloop="always"` mode, the loop never stops. In `frameloop="demand"` mode, it runs only while frames are pending.

`advance(timestamp)` is the manual entry point for `frameloop="never"` mode, allowing external loops (physics engines, XR) to drive rendering.

## Plugin seam

**Source:** `plugins/provider.ts`, `plugins/runtime.ts`, `plugins/types.ts`

The plugin system provides a structured way for ecosystem packages to hook into the renderer without coupling to Canvas internals.

### Components

**V3FStoreProvider** -- a thin component that calls `provide(context, store)` to make the Zustand store available to the component tree. Used by both the main root and portals.

**FiberRuntimeProvider** -- creates the plugin runtime, provides it under the `FIBER_PLUGIN_RUNTIME` injection key, replays all `ctx.provide()` calls into the Vue injection tree, and disposes on unmount.

**FiberInheritedRuntimeProvider** -- used by portals to inherit an existing runtime into their subtree without re-running setup.

### Runtime creation

`createPluginRuntime(entries, appContext, canvas, store)` performs:

1. **Topological sort** -- orders plugins by their `requires` dependencies (cycles and missing deps throw)
2. **Setup** -- calls each plugin's `setup(ctx, options)` in dependency order. The context provides `extend`, `provide`, `onDispose`, `invalidate`, and `getState`
3. **Collect provides** -- all `ctx.provide()` calls are recorded in a Map and replayed by `FiberRuntimeProvider`
4. **Collect disposers** -- cleanup functions (from `ctx.onDispose()` and returned from `setup()`) are stored and run in reverse order on unmount

### Plugin registration

Plugins can be registered at two levels:

- **App level** -- `registerFiberPlugin(app, plugin)` stores entries in a registry provided via Vue's app-level `provide`. Every Canvas inherits these.
- **Canvas level** -- the `plugins` prop on Canvas. Merged with app-level entries, deduped by name (last wins).

The `inheritPlugins` prop (default `true`) controls whether a Canvas inherits app-level plugins.
