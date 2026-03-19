# vue-three-fiber — Vue-First Product Plan

**Status:** Draft  
**Date:** 2026-03-13  
**Audience:** Maintainers / implementers  
**Scope:** Turn `vue-three-fiber` into the default serious way to build Three.js apps in Vue by emphasizing Vue-native strengths, explicit contracts, runtime confidence, and a focused ecosystem.

---

## 1. Executive summary

The project should stop optimizing for the headline **"R3F for Vue"** and instead optimize for the outcome **"the best way to author Three.js scenes in Vue."**

That implies four decisions:

1. **Keep high-value Fiber overlap** where the model is genuinely compatible.
2. **Expose Vue differences clearly** instead of hiding them behind clever compatibility layers.
3. **Invest in Vue-native leverage** where Vue is actually stronger: composables, lifecycle coordination, `provide/inject`, DOM/scene composition, and reactive render control.
4. **Earn trust through execution**: browser event confidence, published benchmarks, a canonical demo, tight docs, and a lean but high-quality ecosystem.

This plan assumes npm publishing can happen quietly and early as pipeline plumbing, not as a public launch event.

---

## 2. Product vision

### North star

> **Fiber-style Three.js authoring for Vue. R3F-compatible where practical. Vue-native where stronger.**

### Product promise

A Vue developer should choose `vue-three-fiber` because it gives them:

- familiar declarative Three.js authoring
- a stable escape hatch to raw Three objects
- first-class Vue composition patterns
- trustworthy runtime behavior under real interaction load
- a focused ecosystem that feels designed for Vue, not translated from React

### Non-goals

- exact parity in areas blocked by Vue renderer internals
- cargo-culting every R3F or Drei abstraction into Vue
- shipping placeholder packages to imply breadth
- making performance claims without public methodology
- bloating core to avoid creating an ergonomic layer on top

---

## 3. Inputs from the current repo

This plan builds on what the repo already appears to establish:

- **High Fiber overlap plus Vue-native APIs** in core (`Canvas`, `useFrame`, `useThree`, `useLoader`, `createPortal`, plus `useObjectRef`, render lifecycle helpers, and reactive invalidation patterns).
- **Documented platform divergences** around proxy-backed refs, Suspense re-entrance behavior, and event semantics.
- **A stated internal direction** toward a Vue-first renderer rather than an exact React behavioral clone.
- **A proposed root-scoped plugin model** intended to keep core lean while enabling packages such as postprocessing, rapier, and drei.

### Current strengths to preserve

- declarative scene graph + imperative escape hatches
- Vue composables as the main integration surface
- Canvas context bridging into the Three subtree
- demand rendering and loader caching
- portals and a test renderer
- examples/docs site already serving as a real product surface

### Current constraints to accept and design around

- template refs are not raw `THREE.Object3D` identity
- some loading semantics differ because Vue Suspense differs
- event behavior needs explicit documentation and confidence-building tests
- advanced ergonomics belong in higher-level packages, not renderer contortions

---

## 4. Product contract

This should become the public operating contract for the project.

### Stable guarantees

`vue-three-fiber` guarantees:

- declarative Three.js scene authoring in Vue
- a familiar Fiber mental model for core scene composition
- explicit raw object access through `useObjectRef`
- composable lifecycle primitives for render coordination
- DOM and 3D composition inside one Vue app
- demand-based rendering and cache-aware loading
- portals, testing support, and a lean extension surface

### Explicit divergences

`vue-three-fiber` explicitly documents and supports these differences instead of hiding them:

- **Refs:** template refs are proxy-backed handles; raw object identity uses `useObjectRef`
- **Suspense:** re-entrance keeps previous content visible until the next branch resolves
- **Events:** current semantics follow the existing event docs, including known limitations such as `pointerenter`/`pointerleave` behavior and any current pointer capture constraints

### Contract rules

- Do not claim strict parity where the runtime contract differs.
- Do not add compatibility shims that obscure behavior unless they simplify without hiding semantics.
- Do not add undocumented behavior that users must discover by reading source.
- Every divergence must have:
  - a documented explanation
  - a recommended pattern
  - at least one test
  - at least one runnable example when practical

---

## 5. Success criteria

The project has achieved the intended direction when all of the following are true.

### Product-level outcomes

- A Vue engineer can install from npm and reach a first meaningful scene without local-linking or repo spelunking.
- The docs clearly explain what is Fiber-like, what is Vue-native, and where the contract differs from R3F.
- The canonical demo shows something Vue can sell better than React parity alone.
- The first-party ecosystem feels intentional, not decorative.

### Technical outcomes

- Browser-level event behavior is tested across Chromium, Firefox, and WebKit.
- Portals, context bridging, demand rendering, async asset transitions, and lifecycle coordination all have regression coverage.
- Performance claims are backed by a public benchmark harness and thresholds.
- No first-party package lands without docs, tests, and examples.

### Launch-level outcomes

- There is a clear package/support matrix.
- There is a known-limitations page.
- There is a demo/reference app that doubles as a repro harness.

---

## 6. Strategic workstreams

## WS1 — Packaging and release plumbing

### Objective

Make npm installation, smoke testing, versioning, and release automation boring.

### Deliverables

- published `@vue-three/fiber`
- clean `exports`, `types`, peer dependency, and engine metadata
- external smoke apps that install from the registry/tarball rather than workspace paths
- release automation through changesets or equivalent
- clear dist-tag policy (`latest`, `next`, `canary` if desired)

### Checklist

- [ ] Publish `@vue-three/fiber` to npm.
- [ ] Verify `package.json` fields: `name`, `version`, `type`, `exports`, `types`, `files`, `sideEffects`, `peerDependencies`, `engines`.
- [ ] Ensure type declarations resolve correctly in a clean external app.
- [ ] Add CI step that packs/publishes to a tarball and installs it into a separate smoke app.
- [ ] Add smoke apps for:
  - [ ] Vite + Vue
  - [ ] Nuxt client-only usage (if Nuxt is part of intended support)
- [ ] Ensure examples/docs can optionally consume the published package instead of workspace linking.
- [ ] Define release process:
  - [ ] versioning policy
  - [ ] prerelease policy
  - [ ] changelog generation
  - [ ] rollback procedure
- [ ] Decide whether the first quiet publishes use `next`/`canary` before `latest`.

### Definition of done

- `npm install @vue-three/fiber three vue` works in a clean external project.
- CI proves installability from the packaged artifact.
- Docs no longer describe npm publishing as pending.

---

## WS2 — Positioning, docs, and contract clarity

### Objective

Shift the product story from parity-first to Vue-first without losing Fiber familiarity.

### Required docs set

1. **Homepage / intro**
   - what the project is
   - what it is not
   - the core promise
2. **Installation**
   - normal npm path
   - support matrix
   - minimal starter
3. **Compatibility contract**
   - Fiber overlap
   - Vue-native extensions
   - explicit divergences
4. **Vue-native patterns**
   - `useObjectRef`
   - render lifecycle composables
   - `provide/inject`
   - DOM/scene composition
   - demand rendering patterns
5. **Runtime behaviors and known limitations**
   - refs
   - Suspense
   - events
   - portals
   - custom renderer boundaries
6. **Architecture**
   - store
   - reconciler boundary
   - Canvas/context bridge
   - root lifecycle
   - plugin seam

### Checklist

- [ ] Rewrite homepage copy around the Vue-first positioning.
- [ ] Add a prominent compatibility contract block near the top of the docs.
- [ ] Add a dedicated **Vue-native patterns** guide.
- [ ] Add a **Known limitations / runtime behaviors** page.
- [ ] Add architecture docs with diagrams.
- [ ] Add "choose this, not that" examples for:
  - [ ] raw refs vs `useObjectRef`
  - [ ] direct mutation in `useFrame`
  - [ ] waiting for render commit
  - [ ] Suspense transitions
  - [ ] event bubbling and capture
- [ ] Add a docs lint pass that checks for stale local-link/install instructions.

### Copy policy

- Prefer **"high overlap"** over **"exact parity"**.
- Prefer **"Vue-native where stronger"** over **"compatible workaround"**.
- Do not promise **"no limitations"** if limitations are already documented.
- Do not make absolute performance claims unless benchmarks are published.

### Definition of done

- A user can understand the project contract without reading source.
- An R3F user can see exactly what ports cleanly and what needs adaptation.
- Every major divergence has a doc page, example, and recommended pattern.

---

## WS3 — Runtime confidence and hardening

### Objective

Make the renderer boring under real interaction and async scene load conditions.

### Subsystem priorities

#### A. Events

This is the most important runtime trust surface.

##### Checklist

- [ ] Build browser-level event integration tests with Playwright or equivalent.
- [ ] Test on Chromium, Firefox, WebKit.
- [ ] Cover:
  - [ ] nearest-hit delivery
  - [ ] ancestor bubbling
  - [ ] occlusion order
  - [ ] `stopPropagation()` behavior
  - [ ] `onPointerMissed`
  - [ ] drag/capture scenarios
  - [ ] unmount during pointer interaction
  - [ ] nested groups with handlers
  - [ ] canvas `eventSource` / `eventPrefix` variations if supported
  - [ ] portals interacting with event ownership rules
- [ ] Add a maintained limitations table for:
  - [ ] `pointerenter` / `pointerleave` semantics
  - [ ] pointer capture constraints
  - [ ] any edge cases involving missed intersections / stale event data
- [ ] Add one polished docs example each for:
  - [ ] dragging
  - [ ] occlusion blocking
  - [ ] click-through prevention
  - [ ] overlay interaction

#### B. Lifecycle and render coordination

##### Checklist

- [ ] Add regression coverage for `useRenderCommit`, `useNextFrame`, and post-render hooks.
- [ ] Test Vue flush timing vs rendered scene timing.
- [ ] Verify callbacks clean up correctly on unmount.
- [ ] Document the recommended pattern for "after state changes, when is the scene actually updated?"

#### C. Portals and context bridging

##### Checklist

- [ ] Add regression tests for plugin/context availability across portals.
- [ ] Verify portal state isolation where intended.
- [ ] Verify normal app `provide/inject` values survive into scene subtrees and portals.
- [ ] Add docs examples for multi-scene composition.

#### D. Async loading and scene transitions

##### Checklist

- [ ] Add regression tests for `useLoader` + Suspense re-entrance behavior.
- [ ] Test rapid asset switching.
- [ ] Test error + retry paths.
- [ ] Test disposal/cleanup behavior on replaced scenes.
- [ ] Document the expected user experience during re-entrance.

#### E. Demand rendering

##### Checklist

- [ ] Add tests for `frameloop="demand"` and invalidation helpers.
- [ ] Verify no unexpected perpetual renders.
- [ ] Verify reactive invalidation patterns under nested component updates.
- [ ] Add a profiling recipe for diagnosing over-rendering.

### Definition of done

- Browser-level event matrix is green.
- All documented runtime behaviors are covered by tests.
- Known limitations are explicit and stable.

---

## WS4 — Benchmarks and performance discipline

### Objective

Replace hand-wavy performance language with a repeatable benchmark story.

### Benchmark policy

Until public benchmark results exist, copy should avoid absolute claims like:

- "no overhead"
- "outperforms plain Three.js"

Those claims may be directionally true in some scenarios, but they should not be top-line product copy without public evidence.

### Benchmark suite

Create a benchmark harness with published methodology and reproducible scenarios.

#### Required scenarios

- [ ] cold mount of a representative static scene
- [ ] large scene mount (many nodes)
- [ ] high-frequency prop updates across many nodes
- [ ] demand-render idle cost
- [ ] raycast-heavy interaction/event dispatch
- [ ] async asset swap / scene replacement
- [ ] portal update overhead
- [ ] imperative mutation in `useFrame` vs reactive prop updates

#### Process

- [ ] Publish methodology, hardware notes, browser versions, and scene descriptions.
- [ ] Compare at least:
  - [ ] plain Three baseline
  - [ ] V3F scenario implementation
  - [ ] optionally equivalent R3F scenario for context
- [ ] Track regressions in CI with a threshold-based alerting policy.
- [ ] Publish results in docs or repo reports.

### Definition of done

- Performance-related claims link to published benchmark methodology.
- Maintainers can detect regressions before release.

---

## WS5 — Vue-native ergonomic layer (`@vue-three/extras`)

### Objective

Put high-level ergonomics in an explicit layer built on public APIs rather than inflating core.

### Principles

- extras must use public/stable renderer APIs where possible
- extras must explain semantics, not hide them
- extras should feel like idiomatic Vue components/composables
- extras should focus on problems Vue developers actually hit, not parity theater

### Proposed v1 scope

Keep v1 intentionally narrow.

#### Candidate components/composables

- [ ] `ResourceBoundary`
  - explicit loading/error/success boundaries for scene resources
  - works with Vue Suspense rather than pretending Suspense behaves differently
- [ ] `SceneTransition`
  - explicit transition modes such as `keep-previous`, `replace`, `manual`
  - scene swap orchestration with predictable lifecycle semantics
- [ ] invalidation helpers
  - a higher-level API built on `watchInvalidate`
  - common demand-render triggers for controls/state stores
- [ ] scene readiness helpers
  - utilities wrapping render-commit timing for common UI coordination patterns

### Explicit non-goals for extras v1

- not a random bucket of helpers
- not a direct clone of every Drei abstraction
- not a place to hide renderer bugs

### Definition of done

- each extras feature solves a clearly documented Vue-specific pain point
- each feature has docs, tests, and a real demo scene
- none of the features require private renderer internals unless deliberately promoted into core later

---

## WS6 — Plugin system and first-party ecosystem

### Objective

Use a thin root-scoped plugin seam to support real packages while keeping the renderer core lean.

### Plugin model requirements

- plugin setup runs once per Canvas root
- values are exposed via standard Vue `provide/inject`
- plugins may register Three constructors through `extend(...)`
- plugins can register root cleanup
- plugin state is root-scoped by default, not global singleton state
- async work belongs in plugin components/composables, not plugin bootstrap

### Package quality bar

No package lands unless it ships all of the following together:

- defined v1 surface
- tests
- docs
- examples
- versioning/release setup

### Priority order

#### 1. `@vue-three/postprocessing`

Start here first. It is high-value, visually demonstrable, and a good fit for a root/plugin model.

##### Suggested v1 surface

- [ ] composer root setup
- [ ] common effect components
- [ ] enable/disable and ordering support
- [ ] lifecycle + cleanup behavior
- [ ] docs for reactive configuration
- [ ] example scenes

#### 2. `@vue-three/rapier`

Physics is also high-value, but the initial surface should be intentionally small and coherent.

##### Suggested v1 surface

- [ ] `Physics` root
- [ ] rigid body components
- [ ] collider components
- [ ] world stepping integration
- [ ] collision/callback events
- [ ] docs + examples + tests

Do **not** force a huge v1 just because the underlying engine is broad.

#### 3. `@vue-three/drei`

This should be a curated Vue-native helper package, not a parity dump.

##### Principles

- start with helpers that are obviously useful and low-ambiguity in Vue
- avoid abstractions whose value in React came mainly from React limitations that Vue does not share
- defer helpers that need a new Vue-native design rather than a straight port

##### Good early candidates

- [ ] `OrbitControls`
- [ ] `TransformControls`
- [ ] environment/light helpers
- [ ] common loader wrappers where they add value beyond `useLoader`
- [ ] bounds/camera fit helpers

##### Likely defer candidates

- [ ] anything DOM-heavy that needs a distinct Vue story
- [ ] helpers that duplicate straightforward Vue composition patterns
- [ ] large ports with weak testability or unclear semantics in Vue

### Definition of done

- the plugin API is documented and tested
- plugin injections survive expected tree boundaries, including portals where intended
- at least one first-party plugin package is production-grade before broadening package count

---

## WS7 — Canonical demo / reference app

### Objective

Build one flagship app that proves the project story better than a thousand isolated examples.

### Purpose

The demo should be simultaneously:

- a showcase
- a docs source
- a regression harness
- a benchmark scene input
- a public explanation of why Vue-native composition matters

### Demo requirements

The app should show all of the following in one coherent product:

- [ ] real 3D scene with asset loading
- [ ] DOM inspector/control panel beside the scene
- [ ] object selection and property inspection
- [ ] async scene/resource transitions
- [ ] overlay/error/loading states
- [ ] demand rendering when idle
- [ ] optional postprocessing toggles
- [ ] optional physics mode
- [ ] route/state transitions without awkward scene teardown behavior

### Demo design rules

- use normal Vue state and composition, not demo-specific hacks
- prefer real app structure over a toy scene
- use it as the basis for screenshots, docs snippets, and issue reproductions
- keep assets legally distributable and reasonably small

### Suggested concept

A **Scene Lab / Configurator**:

- left pane: scene tree / selection / component controls
- center: 3D viewport
- right pane: material/postprocessing/physics toggles
- bottom/status: loading, render mode, frame metrics, error states

### Definition of done

- at least 8 core product features appear naturally in the app
- the same app is used in docs and regression workflows
- the app demonstrates a distinctly Vue-native DOM/scene workflow

---

## WS8 — Support matrix, launch prep, and governance

### Objective

Make the eventual public launch credible and low-noise.

### Support matrix

Define explicitly:

- supported Vue versions
- supported Three.js range
- supported bundlers/frameworks tested in CI
- browser support level
- SSR/Nuxt support level
- experimental vs stable packages/features

### Governance checklist

- [ ] issue templates
- [ ] bug repro template
- [ ] docs contribution guide
- [ ] release notes format
- [ ] package deprecation policy
- [ ] experimental feature labeling policy
- [ ] known-limitations tracking policy

### Launch assets

- [ ] landing page / homepage copy
- [ ] canonical demo
- [ ] benchmark report
- [ ] architecture overview
- [ ] first plugin package(s)
- [ ] examples gallery

### Definition of done

- a public visitor can understand what the project is, how stable it is, and how to adopt it
- support expectations are explicit before broad announcement

---

## 7. Recommended sequencing

The ordering below is optimized for leverage, not marketing.

## Phase 0 — Quiet npm plumbing

**Goal:** make package distribution boring.

- publish core package quietly
- validate packaging in external smoke apps
- fix install/docs drift

**Exit gate:** package installs cleanly from npm/tarball.

## Phase 1 — Contract clarity

**Goal:** align the public story with the actual product.

- rewrite intro/install/docs copy
- add compatibility contract
- add known-limitations page

**Exit gate:** users can understand the contract without reading source.

## Phase 2 — Runtime confidence

**Goal:** make hard runtime surfaces predictable.

- browser event test suite
- portal/context tests
- lifecycle/render-commit tests
- async transition tests
- demand-render regression tests

**Exit gate:** all documented runtime behaviors are tested.

## Phase 3 — Benchmarks + canonical demo

**Goal:** prove the value proposition with evidence and a product-shaped example.

- benchmark harness + published methodology
- canonical demo app
- docs/examples pull from the same reference app patterns

**Exit gate:** performance copy is evidence-backed and the demo sells the Vue story.

## Phase 4 — Vue-native extras

**Goal:** add ergonomic leverage without bloating core.

- `@vue-three/extras` v1
- resource boundaries
- scene transitions
- higher-level invalidation/render helpers

**Exit gate:** at least one extras feature solves a real Vue pain point with docs/tests/demo.

## Phase 5 — Plugin system + first ecosystem package

**Goal:** validate the ecosystem architecture.

- implement root-scoped plugin system
- ship `postprocessing` first
- ship `rapier` second if the first package is solid
- defer `drei` breadth until there is clear package discipline

**Exit gate:** plugin API is stable enough to support one production-grade first-party package.

## Phase 6 — Public launch

**Goal:** announce only when the product story is coherent.

- canonical demo live
- benchmark report live
- docs coherent
- support matrix clear
- one or more polished ecosystem packages

**Exit gate:** the project can be evaluated as a product, not a promising repo.

---

## 8. Detailed acceptance criteria by area

## Core package acceptance criteria

- [ ] installable from npm in clean external apps
- [ ] examples do not depend on workspace-only behavior
- [ ] all core APIs documented
- [ ] all known divergences documented
- [ ] CI covers build, typecheck, lint, unit, browser integration, packaging smoke

## Event system acceptance criteria

- [ ] bubbling/occlusion documented and tested
- [ ] capture behavior documented and tested
- [ ] limitations table present and current
- [ ] at least three real interaction demos exist

## Docs acceptance criteria

- [ ] install docs correct
- [ ] homepage copy aligned with product contract
- [ ] Vue-native patterns guide exists
- [ ] architecture guide exists
- [ ] known-limitations page exists

## Performance acceptance criteria

- [ ] benchmark suite published
- [ ] methodology published
- [ ] regression thresholds defined
- [ ] claims in copy match measured evidence

## Ecosystem acceptance criteria

- [ ] plugin API documented
- [ ] first package ships with tests/docs/examples
- [ ] no placeholder packages on main branch
- [ ] curated package scopes are explicit

## Reference app acceptance criteria

- [ ] shows DOM/scene composition clearly
- [ ] exercises async loading and transitions
- [ ] exercises interaction and selection
- [ ] exercises demand rendering
- [ ] serves as a repro harness

---

## 9. Explicit "do not do this" list

- Do not spend another cycle trying to make Vue template refs impersonate raw Three identity.
- Do not chase full parity in behavior that depends on Vue internals you do not control.
- Do not announce breadth before depth.
- Do not publish ecosystem placeholders.
- Do not make unqualified performance claims before benchmarks are public.
- Do not move high-level app ergonomics into core just because they are convenient in one demo.
- Do not ship helpers that fight Vue's normal composition model.

---

## 10. Suggested issue/epic breakdown

Use this as an initial tracker structure.

### Epic A — Packaging

- [ ] npm publish pipeline
- [ ] tarball smoke install job
- [ ] external Vite smoke app
- [ ] external Nuxt smoke app (optional but recommended if supported)
- [ ] release process doc

### Epic B — Docs reset

- [ ] intro rewrite
- [ ] installation rewrite
- [ ] compatibility contract page
- [ ] Vue-native patterns guide
- [ ] limitations page
- [ ] architecture page

### Epic C — Event hardening

- [ ] Playwright harness
- [ ] bubbling matrix tests
- [ ] capture tests
- [ ] portal interaction tests
- [ ] docs examples

### Epic D — Lifecycle + async hardening

- [ ] render commit tests
- [ ] next-frame tests
- [ ] Suspense re-entrance tests
- [ ] rapid asset swap tests
- [ ] disposal tests

### Epic E — Benchmarks

- [ ] benchmark harness
- [ ] scenario definitions
- [ ] baseline scenes
- [ ] docs/report publishing
- [ ] CI regression thresholds

### Epic F — Reference app

- [ ] reference app architecture
- [ ] selection inspector
- [ ] scene transitions
- [ ] postprocessing toggle panel
- [ ] physics mode
- [ ] demand-render metrics HUD

### Epic G — Extras

- [ ] `ResourceBoundary`
- [ ] `SceneTransition`
- [ ] invalidation helper layer
- [ ] scene-ready helpers

### Epic H — Plugin ecosystem

- [ ] plugin API implementation
- [ ] plugin API docs
- [ ] portal/plugin tests
- [ ] `postprocessing` v1
- [ ] `rapier` v1
- [ ] curated `drei` proposal

---

## 11. Open decisions to resolve early

These should be decided before broadening scope.

- [ ] What is the exact public support level for Nuxt/SSR?
- [ ] Will the first quiet npm publishes use `latest`, `next`, or `canary`?
- [ ] What is the exact minimum stable surface for `@vue-three/extras` v1?
- [ ] What is the exact minimum stable surface for `@vue-three/postprocessing` v1?
- [ ] What is the exact minimum stable surface for `@vue-three/rapier` v1?
- [ ] Which helpers belong in early `drei`, and which should be deferred pending a Vue-native redesign?
- [ ] What benchmark hardware/browser matrix will be treated as the project baseline?

---

## 12. Minimal first 30-day plan

If you want the shortest path to visible leverage, do this first:

### Week 1

- [ ] publish core package quietly
- [ ] fix install docs
- [ ] create tarball/npm smoke test job
- [ ] define support matrix draft

### Week 2

- [ ] add compatibility contract page
- [ ] add known-limitations page
- [ ] remove/soften absolute performance copy pending benchmarks

### Week 3

- [ ] stand up browser event harness
- [ ] add first event matrix tests
- [ ] add lifecycle/render-commit regression tests
- [ ] define benchmark scenarios

### Week 4

- [ ] scaffold canonical demo
- [ ] publish first benchmark methodology draft
- [ ] decide extras v1 scope
- [ ] decide first ecosystem package scope

This four-week slice does not complete the whole vision, but it creates the right slope.

---

## 13. Final recommendation

The winning move is not **more parity**.

The winning move is:

1. **clear contract**
2. **hard runtime confidence**
3. **evidence-backed performance story**
4. **one canonical demo that proves Vue-native value**
5. **a disciplined ecosystem built on a thin plugin seam**

If the project executes those five things in order, it stops being judged as a port and starts being judged as a product.

---

## Appendix A — Source documents this plan is aligned with

This plan was written to align with the current repo direction indicated by:

- `README.md`
- `docs/getting-started/introduction.md`
- `docs/advanced/vue-divergences.md`
- `docs/API/events.md`
- `VUE_NATIVE_EVOLUTION_PLAN.md`
- `vue-three-fiber-plugin-system-spec.md`
