# vue-three-fiber Plugin System Spec

**Prepared:** 2026-03-10  
**Status:** Proposed implementation spec  
**Audience:** Team lead / implementers

---

## 1. Executive summary

Implement a **root-scoped plugin system** in `@bluera/vue-threejs` with two integration modes:

1. **App-level registration** via normal Vue plugins (`app.use(...)`) or `registerFiberPlugin(app, entry)`
2. **Canvas-level registration** via a new `<Canvas :plugins="..." />` prop, with local entries overriding app defaults

The plugin system must remain intentionally thin:

- plugin setup runs **once per Canvas root**
- plugin-provided values are exposed through standard Vue `provide/inject`
- plugins may register Three constructors via `extend(...)`
- plugins may register cleanup handlers for root unmount
- plugin state is **not** global singleton state unless the plugin chooses to do that itself
- plugin setup is **synchronous**; async work belongs in plugin components/composables, not root bootstrap

This design is aimed at shipping the first three official ecosystem packages in this monorepo:

- `@bluera/vue-threejs-postprocessing`
- `@bluera/vue-threejs-rapier`
- `@bluera/vue-threejs-drei`

This spec replaces the earlier phased/skeleton approach. No package should land on `master` as a placeholder. Each first-party plugin package must ship with its full defined v1 surface, tests, docs, and examples in the same implementation track.

---

## 2. Why this fits the current repo

The current repo already has the right seams for a root-scoped plugin model:

- the workspace already accepts additional packages through `packages/*` and Preconstruct is configured over `packages/*`
- `Canvas` currently creates a root with `createRoot(canvas)` and configures it before calling `root.render(...)`
- `Canvas` already bridges normal Vue `provide/inject` values into the custom renderer tree with `ContextBridge`
- renderer state is already provided into the custom renderer tree with a dedicated provider using the `context` injection key
- roots are already tracked per-canvas in `_roots`
- `createPortal(...)` already creates a portal-specific state enclave, so the plugin design must preserve plugin injections across portals
- `extend(...)` is already the constructor registration seam and `ThreeElements` is already open for augmentation by downstream packages
- the repo direction document already recommends keeping core lean, preferring normal Vue `provide/inject`, and moving higher-level ergonomics out of the renderer core

This means the plugin system does **not** need reconciler internals or a new service framework. It only needs:

- an app-level registry for installed plugin entries
- a resolver/runtime for root-scoped plugin setup
- one extra provider layer in the rendered tree
- one extra Canvas prop path for local plugin entries

---

## 3. Goals and non-goals

### Goals

- support official first-party packages in this repo
- support third-party plugins outside the repo
- keep the core API small and Vue-native
- use normal `provide/inject` as the plugin distribution mechanism
- allow app-global defaults and per-canvas overrides
- keep plugin runtime lifecycle bound to the Canvas root
- preserve current programmatic `createRoot(...).render(...)` usage
- preserve portal state isolation while sharing plugin services
- define full v1 package scopes for the first-party plugin packages

### Non-goals

- no plugin-specific host hooks in the reconciler
- no hidden global physics world, composer, or controls layer created by plugin boot
- no requirement that packages be installed with `app.use(...)` to function
- no automatic global component registration by default
- no attempt to make plugin changes hot-swappable without remount cost
- no partial package drops, placeholder exports, or skeleton workspaces on the main branch

---

## 4. Core design decisions

### 4.1 Plugin entries belong to `render()`, not `configure()`

Plugin entries must be carried through **`root.render(..., options)`**, not `root.configure(...)`.

Reasoning:

- `configure(...)` is renderer/camera/scene state
- plugin setup is provider-oriented and lives at the Vue tree boundary
- `render(...)` already carries `appContext`, which plugins may inspect
- the plugin runtime should be created at the same point the provider tree is constructed

So:

- keep `RenderProps` focused on GL/root rendering config
- extend `render(..., options)` with `plugins?: FiberPluginEntry[]`
- add `plugins` and `inheritPlugins` to `Canvas` props

### 4.2 Plugin setup is synchronous

`plugin.setup(ctx, options)` is synchronous and may return an optional disposer.

Async work must happen in:

- package components
- composables
- lazy backend/resource loaders

The root plugin runtime must not wait on promises during `Canvas` boot.

Why:

- root setup needs deterministic cleanup ordering
- async bootstrap complicates error handling and root activation
- Vue already has better primitives for async work lower in the tree

### 4.3 Plugin configuration is root-environment config, not reactive app state

The resolved plugin set is part of the Canvas environment contract.

Rules:

- changing the resolved plugin set intentionally remounts the plugin provider subtree
- consumers must not treat plugin options as high-frequency reactive state
- docs must explicitly teach stable plugin entry references

### 4.4 Plugin identity and remount behavior must be explicit

The earlier design underspecified equality and would remount too easily.

To make provider remount semantics predictable, support three entry forms:

- bare definition: `plugin`
- tuple form: `[plugin, options]`
- object form: `{ plugin, options, key? }`

`withPluginOptions(plugin, options, key?)` should create the object form.

Equality rules:

- resolved plugin order matters
- plugin identity is `plugin.name`
- if an entry provides an explicit `key`, compare `plugin.name + key`
- otherwise compare `plugin.name + Object.is(options)`

Guidance:

- inline object literals in templates are unsupported for stable plugin config
- package docs must show either:
  - `withPluginOptions(...)` created once in setup, or
  - explicit `key` values when options are recreated

### 4.5 Setup errors must be wrapped with plugin identity

Any failure in:

- resolution
- dependency sorting
- setup
- dispose

must include the plugin name in the thrown error.

Examples:

- `[@bluera/vue-threejs-postprocessing] Missing dependency "@bluera/vue-threejs-drei"`
- `[@bluera/vue-threejs-rapier] setup failed: ...`
- `[@bluera/vue-threejs-postprocessing] dispose failed: ...`

This is required for supportability once multiple plugins are active in the same root.

### 4.6 Portals inherit plugin runtime, not plugin store state

Portal behavior remains:

- portal gets its own `RootState`
- portal inherits plugin-provided injections from the parent runtime
- `useThree()` inside the portal resolves to the portal store, not the parent store

### 4.7 `extend(...)` remains global and must be treated as idempotent

Plugins may call `ctx.extend(...)`.

But:

- the catalogue remains global
- registration is not root-local mutable state
- plugins must treat registration as safe/idempotent

---

## 5. Public API

### 5.1 Plugin types

Public types exported from `@bluera/vue-threejs`:

- `FiberPluginContext`
- `FiberPluginDefinition`
- `FiberPluginEntry`
- `ResolvedFiberPluginEntry`
- `FiberRootRenderOptions`
- `defineFiberPlugin`
- `withPluginOptions`
- `registerFiberPlugin`
- `ensureFiberPluginRegistry`

### 5.2 `FiberPluginContext`

`FiberPluginContext` must expose:

- `appContext: AppContext | null`
- `canvas: HTMLCanvasElement | OffscreenCanvas`
- `store: RootStore`
- `extend(objects)`
- `provide(key, value)`
- `onDispose(fn)`
- `invalidate(frames?)`
- `getState()`

It must not expose reconciler internals or raw container internals.

### 5.3 `FiberPluginDefinition`

Required fields:

- `name: string`

Optional fields:

- `requires?: readonly string[]`
- `setup?(ctx, options): void | (() => void)`

Requirements:

- `name` must be globally unique and package-like, e.g. `@bluera/vue-threejs-drei`
- `setup` must be synchronous
- `setup` may call `ctx.provide`, `ctx.extend`, `ctx.invalidate`, and `ctx.onDispose`

### 5.4 `FiberPluginEntry`

Supported forms:

- `plugin`
- `[plugin, options]`
- `{ plugin, options, key? }`

The object form is the preferred durable form because it gives explicit remount semantics.

### 5.5 `withPluginOptions`

`withPluginOptions(plugin, options, key?)` returns the object entry form and should be the primary helper shown in docs and examples.

### 5.6 `Canvas` props

Add to `CanvasProps`:

- `plugins?: FiberPluginEntry[]`
- `inheritPlugins?: boolean` defaulting to `true`

### 5.7 Programmatic root API

Extend `root.render(children, options)` to accept:

- `appContext?: AppContext | null`
- `plugins?: FiberPluginEntry[]`

No changes are required to `configure(...)`.

---

## 6. Resolution and lifecycle semantics

### 6.1 Merge order

Plugin entries resolve in this order:

1. app-level registered entries
2. `<Canvas :plugins="..." />` entries

Rules:

- dedupe by `plugin.name`
- later entries win
- Canvas-local entries override app-level defaults
- if `inheritPlugins === false`, app entries are ignored

### 6.2 Dependency resolution

Dependency resolution happens **after dedupe**.

Algorithm:

1. normalize entries
2. validate `plugin.name`
3. dedupe last-write-wins
4. topologically sort by `requires`
5. throw descriptive errors for:
   - missing dependency
   - cyclic dependency
   - self-dependency

### 6.3 Remount behavior

Provider remount is triggered when the resolved plugin sequence changes by the equality rules in section 4.4.

This is intentional and acceptable.

The spec must explicitly document:

- plugin configuration belongs in setup/bootstrap
- changing plugin configuration remounts the plugin provider subtree

### 6.4 Setup/cleanup ordering

- setup runs in resolved dependency order
- disposers run in reverse order
- `ctx.onDispose(fn)` disposers run in reverse registration order after the setup-returned disposer for the same plugin, in LIFO order

### 6.5 Error handling

All errors must be wrapped with plugin identity.

Dispose behavior:

- if one disposer throws, continue running the remaining disposers
- throw a single aggregated error at the end with all plugin-tagged failures

### 6.6 Portals

- portals inherit the parent plugin runtime
- portal children receive the same plugin-provided injections as root children
- portal store semantics remain unchanged

---

## 7. Internal implementation plan

## 7.1 New files

Create:

- `packages/fiber/src/plugins/types.ts`
- `packages/fiber/src/plugins/registry.ts`
- `packages/fiber/src/plugins/runtime.ts`
- `packages/fiber/src/plugins/provider.ts`
- `packages/fiber/src/plugins/index.ts`

### `types.ts`

Responsibilities:

- define public plugin types
- define the normalized object entry form with optional `key`
- implement `defineFiberPlugin(...)`
- implement `withPluginOptions(...)`
- define `FiberRootRenderOptions`

### `registry.ts`

Responsibilities:

- maintain app-level plugin entries in a `WeakMap<App, FiberAppPluginRegistry>`
- expose `ensureFiberPluginRegistry(app)`
- expose `registerFiberPlugin(app, entry)`
- `app.provide(...)` the registry so `Canvas` can inject it

Rules:

- no reactivity requirement after mount
- installation is expected before app mount

### `runtime.ts`

Responsibilities:

- normalize entries
- resolve dependencies
- compare resolved plugin sets
- create the root runtime
- expose `dispose()`

Implementation requirements:

- normalize all entry forms to `{ plugin, options, key? }`
- dedupe by `plugin.name` with last-write-wins
- topologically sort by `requires`
- `sameResolvedPluginEntries(...)` must compare ordered lists by:
  - `plugin.name`
  - explicit `key` when present
  - otherwise `Object.is(options)`
- runtime must maintain:
  - `provides: Map<InjectionKey | string | symbol, unknown>`
  - `disposers: Array<{ pluginName: string; fn: () => void }>`

### `provider.ts`

Responsibilities:

- `V3FStoreProvider`
- `FiberRuntimeProvider`
- `FiberInheritedRuntimeProvider`
- `FIBER_PLUGIN_RUNTIME` injection key

Implementation requirements:

- `V3FStoreProvider` only provides the V3F store
- `FiberRuntimeProvider` creates the runtime, provides the runtime, replays plugin `provides`, and disposes on unmount
- `FiberInheritedRuntimeProvider` replays an existing runtime into a portal subtree without creating a new runtime

### `index.ts`

Responsibilities:

- re-export only the public plugin API
- do not export runtime/provider internals

---

## 8. Core patches

## 8.1 `packages/fiber/src/web/Canvas.ts`

Required changes:

- add `plugins` and `inheritPlugins` props
- inject `FIBER_APP_PLUGIN_REGISTRY`
- compute merged plugin entries from:
  - app-level registry entries when `inheritPlugins !== false`
  - Canvas-local entries
- pass merged entries into `root.render(..., { appContext, plugins })`

No other Canvas behavior should change.

Keep:

- `ContextBridge`
- existing parent `provide/inject` forwarding
- current event and overlay behavior

## 8.2 `packages/fiber/src/core/renderer.ts`

Required changes:

- replace the current provider-only store wrapper with:
  - `V3FStoreProvider`
  - `FiberRuntimeProvider`
  - `FiberInheritedRuntimeProvider`
- update `ReconcilerRoot.render(...)` signature to use `FiberRootRenderOptions`
- track:
  - `resolvedPlugins`
  - `pluginProviderRevision`
- resolve plugins at render time
- remount the plugin provider when the resolved set changes
- update portal rendering so portals replay the inherited runtime

Implementation requirements:

- if `options?.appContext` is present, preserve current vnode `appContext` behavior
- provider cleanup must rely on Vue lifecycle, not manual `_roots` disposal logic

## 8.3 `packages/fiber/src/core/index.ts`

Re-export:

- `FiberRootRenderOptions`
- plugin public types if desired

## 8.4 `packages/fiber/src/index.ts`

Export the plugin public API from the main entrypoint.

## 8.5 `packages/fiber/src/three-types.ts`

No required change.

The current augmentation surface is sufficient for downstream plugin packages.

---

## 9. Test plan

Add a dedicated file:

- `packages/fiber/tests/plugin-system.test.tsx`

Required test cases:

### App-level registration

- `registerFiberPlugin(app, plugin)`
- mount `<Canvas><Child /></Canvas>`
- assert injected plugin value is available

### Canvas-local override

- app registers plugin with defaults
- Canvas passes a local override
- assert local wins

### `inheritPlugins={false}`

- app plugin installed
- Canvas disables inheritance
- assert no plugin injection

### Duplicate-name last-write-wins

- two entries with same `plugin.name`
- assert later one wins

### Missing dependency

- assert descriptive plugin-tagged error

### Cyclic dependency

- assert descriptive plugin-tagged error

### Setup error wrapping

- plugin setup throws
- assert thrown error includes plugin name

### Cleanup order

- multiple plugins register disposers
- unmount
- assert reverse order

### Dispose error aggregation

- multiple plugin disposers throw
- assert all disposers still run
- assert aggregated error includes plugin names

### Equality/remount semantics

- stable keyed entries do not remount on re-render
- changed key remounts
- changed options reference without explicit key remounts

### Programmatic root API

- `createRoot(canvas).render(children, { plugins: [...] })`
- assert plugin injection without `<Canvas>`

### Multi-root isolation

- two Canvas roots use same plugin definition with different options
- assert injected values differ per root
- assert cleanup is per root

### Portal inheritance

- root plugin provides a symbol
- normal child and portal child both receive it
- `useThree()` inside portal still resolves to portal store

### Nested portal inheritance

- portal inside portal still resolves plugin injections and local store correctly

### Existing Canvas behavior preservation

Add a targeted case in `canvas.test.tsx` that asserts:

- plugin injection works
- normal parent `provide/inject` forwarding still works

---

## 10. Packaging and rollout rules

These packages must not land as placeholders.

For each first-party package:

- no empty package directory on `master`
- no exported symbols without working runtime behavior
- no docs pages claiming availability before the package exists
- no examples depending on unpublished package APIs

Each package is considered done only when all of the following are true:

- runtime API implemented
- type surface complete
- tests present and passing
- docs present and accurate
- at least one example/demo present
- package integrated into workspace build/test/typecheck/docs flows

---

## 11. Full implementation plan: `@bluera/vue-threejs-postprocessing`

### 11.1 Purpose

Provide Vue-native wrappers around the `postprocessing` library for declarative composer/effect authoring.

This package must be complete enough to replace the manual postprocessing workaround currently used in [GlassFlower.tsx](/Users/chris/repos/personal/vue-three-fiber/example/src/demos/GlassFlower.tsx).

### 11.2 Dependencies

Peer deps:

- `vue`
- `three`
- `@bluera/vue-threejs`
- `postprocessing`

### 11.3 Full v1 public surface

The v1 package must ship all of the following together:

- `<EffectComposer>`
- `<Bloom>`
- `<BrightnessContrast>`
- `<HueSaturation>`
- `<LUT>`
- `<ToneMapping>`
- `<DepthOfField>`
- `<Noise>`
- `<Vignette>`
- `postprocessingFiberPlugin`
- `createPostprocessingPlugin(options?)`

No package release before the full list is implemented.

### 11.4 Component behavior

#### `<EffectComposer>`

Responsibilities:

- create one composer bound to the current V3F root
- read `gl`, `scene`, `camera`, `size`, `viewport`, and `frameloop` from `useThree`
- manage resize automatically
- own pass/effect registration order
- render through a positive-priority `useFrame` callback
- dispose the composer on unmount

Required props:

- `enabled?: boolean`
- `multisampling?: number`
- `autoClear?: boolean`
- `resolutionScale?: number`
- `depthBuffer?: boolean`
- `stencilBuffer?: boolean`
- `frameBufferType?: TextureDataType`

Required behavior:

- render nothing when disabled
- preserve demand-frameloop correctness by invalidating when effect graph changes
- update cleanly on camera/size changes

#### Effect components

Each effect component must:

- register with the nearest composer via provide/inject
- create/update its underlying effect object from props
- preserve order based on template order
- dispose on unmount

### 11.5 Plugin role

The plugin must remain optional and thin.

Allowed plugin responsibilities:

- provide package defaults such as:
  - default multisampling
  - default resolution scale
  - default enabled state
- optionally globally register selected effect components when explicitly configured

Not allowed:

- auto-create a composer at Canvas boot
- auto-insert effects without a declarative component

### 11.6 Required examples

The package is not complete until it ships:

1. a basic composer/effects example
2. a selective grading example using `LUT` + `BrightnessContrast` + `HueSaturation`
3. a rebuilt glass-flower example using the package instead of manual Three add-ons

### 11.7 Required tests

- composer mount/unmount/dispose
- pass/effect order stability
- resize behavior
- camera switch behavior
- enabled/disabled toggling
- demand frameloop invalidation
- plugin default injection

---

## 12. Full implementation plan: `@bluera/vue-threejs-rapier`

### 12.1 Purpose

Provide Vue-native physics primitives centered on an explicit `<Physics>` owner.

### 12.2 Dependencies

Peer deps:

- `vue`
- `three`
- `@bluera/vue-threejs`
- `@dimforge/rapier3d-compat`

### 12.3 Full v1 public surface

The v1 package must ship all of the following together:

- `<Physics>`
- `<RigidBody>`
- `<Debug>`
- collider components:
  - `<BallCollider>`
  - `<CuboidCollider>`
  - `<CapsuleCollider>`
  - `<CylinderCollider>`
  - `<ConeCollider>`
  - `<TrimeshCollider>`
  - `<HeightfieldCollider>`
- joint components:
  - `<FixedJoint>`
  - `<SphericalJoint>`
  - `<RevoluteJoint>`
  - `<PrismaticJoint>`
  - `<RopeJoint>`
  - `<SpringJoint>`
- composables:
  - `useRapier()`
  - `useRigidBody()`
  - `useCollider()`
  - `useBeforePhysicsStep()`
  - `useAfterPhysicsStep()`
- `rapierFiberPlugin`
- `createRapierPlugin(options?)`

No release before the full list is implemented.

### 12.4 Package architecture

#### `<Physics>`

Responsibilities:

- own one Rapier world
- step the world in `useFrame`
- support fixed timestep stepping
- provide world access through Vue injection
- manage broadphase/narrowphase/event queue ownership
- dispose world resources on unmount

Required props:

- `gravity`
- `paused`
- `timeStep`
- `interpolate`
- `colliders`
- `debug`

#### `<RigidBody>`

Responsibilities:

- own one rigid body descriptor + runtime body
- sync body transforms to the scene object
- expose typed refs/composables for imperative body access
- support collision/sensor/sleep/wake events

Required behavior:

- body cleanup on unmount
- collider ownership cleanup
- parent `<Physics>` requirement error if misused

### 12.5 Plugin role

Allowed plugin responsibilities:

- provide package defaults:
  - gravity
  - debug defaults
  - time-step defaults
- optionally provide lazy backend-loading helpers

Not allowed:

- auto-create a world at Canvas boot
- inject hidden simulation side effects without `<Physics>`

### 12.6 Required examples

1. stacked rigid bodies
2. joints demo
3. sensor/collision events demo
4. debug overlay demo

### 12.7 Required tests

- world ownership
- rigid body mount/unmount
- collider cleanup
- joint lifecycle
- collision/sensor events
- fixed timestep stepping
- debug toggling
- plugin default injection

---

## 13. Full implementation plan: `@bluera/vue-threejs-drei`

### 13.1 Purpose

Provide a curated but production-usable helper layer for common scene authoring patterns.

The package is curated, but the curated v1 surface is complete. It is not a placeholder subset.

### 13.2 Dependencies

Peer deps:

- `vue`
- `three`
- `@bluera/vue-threejs`

Runtime deps as needed:

- `three-stdlib`
- `troika-three-text`
- any selected helper libs needed by the chosen v1 surface

### 13.3 Full v1 public surface

The v1 package must ship all of the following together:

- controls:
  - `<OrbitControls>`
  - `<TransformControls>`
- loading:
  - `useGLTF()`
  - `useTexture()`
- staging / lighting:
  - `<Environment>`
  - `<Lightformer>`
- materials:
  - `<MeshTransmissionMaterial>`
- DOM / text:
  - `<Html>`
  - `<Text>`
- helpers:
  - `<Grid>`
  - `<Center>`
  - `<Bounds>`
- plugin exports:
  - `dreiFiberPlugin`
  - `createDreiPlugin(options?)`

No release before the full list is implemented.

### 13.4 Key implementation requirements

#### `useGLTF()`

Must wrap `useLoader(GLTFLoader, ...)` and support:

- Draco configuration
- Meshopt configuration if adopted
- cache reuse
- typed node/material access consistent with current loader behavior

#### `<Environment>`

Must support:

- local file loading
- presets if the package decides to vendor them
- `background`
- `files`
- `resolution`

It must set scene environment/background predictably and clean up on unmount.

#### `<Lightformer>`

Must provide the studio-light primitives required for realistic environment rigs.

This component is required because it is central to reproducing the quality of the glass-flower demo.

#### `<MeshTransmissionMaterial>`

This is mandatory for v1.

It is the single most important missing visual helper for parity with the source glass-flower demo.

Implementation requirements:

- offscreen buffer/sample strategy appropriate for V3F
- configurable samples/resolution/thickness/anisotropy/clearcoat/iridescence behavior
- clean disposal
- stable updates from reactive props

#### `<Html>`

Must integrate with the existing Canvas overlay/DOM composition strategy and not assume React portal semantics.

This package should lean into Vue strengths rather than clone React internals.

### 13.5 Plugin role

Allowed responsibilities:

- provide defaults for helpers like:
  - environment asset paths
  - draco decoder paths
  - HTML overlay defaults
- optional global component registration when explicitly requested

Not allowed:

- hidden environment creation
- hidden controls instantiation
- renderer-core hooks beyond standard plugin context

### 13.6 Required examples

1. GLTF loading with `useGLTF`
2. controls demo
3. environment/lightformer studio rig demo
4. HTML overlay demo
5. text demo
6. rebuilt glass-flower demo using:
   - `useGLTF`
   - `Environment`
   - `Lightformer`
   - `MeshTransmissionMaterial`

### 13.7 Required tests

- controls lifecycle/disposal
- GLTF loader configuration
- environment mount/unmount behavior
- lightformer output structure
- HTML overlay composition
- text lifecycle
- transmission material updates/disposal
- plugin default injection

---

## 14. Cross-package acceptance target

The plugin system and first-party packages are not fully successful until the ecosystem can rebuild the desktop glass-flower demo without manual workaround code.

Acceptance example:

- scene authored with `@bluera/vue-threejs`
- helper/material loading via `@bluera/vue-threejs-drei`
- grading/composer via `@bluera/vue-threejs-postprocessing`
- no manual fallback implementation of:
  - transmission material
  - environment lightformers
  - composer pipeline

This is the clearest real-world proof that the plugin system is enabling the right package layer rather than just creating more infrastructure.

---

## 15. Docs and examples policy

Current repo issue: some docs already mention packages that do not actually exist yet.

Required policy:

- do not publish docs pages that present a package as available before it exists
- if a planned package is mentioned, label it clearly as planned
- examples in `example/src` must only import packages that are actually in the workspace

This policy applies especially to:

- `@bluera/vue-threejs-drei`
- `@bluera/vue-threejs-postprocessing`
- `@bluera/vue-threejs-rapier`

---

## 16. Implementation order

1. plugin infrastructure in `packages/fiber/src/plugins/*`
2. `Canvas` and `renderer.ts` integration
3. plugin test suite and targeted existing-test updates
4. `packages/postprocessing` full v1 implementation
5. `packages/rapier` full v1 implementation
6. `packages/drei` full v1 implementation
7. cross-package glass-flower rebuild using the shipped package surfaces
8. docs cleanup so public docs match shipped packages

---

## 17. Final recommendation

Implement the plugin system as a **provider-layer extension** on top of the current root/render architecture, not as a reconciler feature.

Then use it to ship complete first-party packages, not placeholders.

That gives the repo:

- a clean way to land the ecosystem layer the project now needs
- a public contract that third parties can use
- minimal churn in core renderer internals
- alignment with the repo’s Vue-native direction
- a credible path to closing the current gap in helpers/materials/effects versus the React ecosystem

The plugin system is necessary infrastructure. It is not the finish line.

The finish line is a real package ecosystem with enough depth to replace the current manual workarounds in examples like GlassFlower.
