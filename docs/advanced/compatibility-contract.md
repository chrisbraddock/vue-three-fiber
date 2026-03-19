---
title: Compatibility Contract
description: What overlaps with React Three Fiber, what's Vue-native, and where the contract differs
---

Vue Three Fiber keeps high API overlap with [React Three Fiber](https://github.com/pmndrs/react-three-fiber) where the model is genuinely compatible, and adds Vue-native APIs where Vue offers a better fit.

## Fiber overlap

These APIs work the same way as their R3F counterparts:

| API                                                | Purpose                                                  |
| -------------------------------------------------- | -------------------------------------------------------- |
| `Canvas`                                           | Sets up renderer, scene, camera, events, and render loop |
| `useFrame(callback, priority?)`                    | Run logic on each rendered frame                         |
| `useThree(selector?)`                              | Access renderer state (gl, scene, camera, size, etc.)    |
| `useLoader(loader, url, extensions?, onProgress?)` | Load and cache assets                                    |
| `createPortal(children, container, state?)`        | Render into another scene container                      |
| `extend(catalog)`                                  | Register custom Three.js classes for declarative use     |
| `<primitive object={...} />`                       | Render pre-instantiated Three.js objects                 |

Scene composition, prop mapping, auto-attach, and the `args` convention all follow the Fiber model.

## Vue-native extensions

These APIs exist because Vue's composition model enables patterns that React doesn't support natively:

| API                                 | Purpose                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `useObjectRef<T>()`                 | Typed access to the raw THREE object, not the proxy ref              |
| `useRenderCommit()`                 | Wait for Vue flush + one rendered frame                              |
| `useNextFrame()`                    | Returns a promise that resolves after one rendered frame             |
| `useAfterRender(callback)`          | Vue-scoped post-render hook with automatic cleanup                   |
| `watchInvalidate(source, options?)` | Connect Vue reactivity to `frameloop="demand"`                       |
| Canvas `#overlay` slot              | DOM content rendered as a sibling overlay on the canvas              |
| Canvas `#error` slot                | Error boundary with retry function                                   |
| `provide` / `inject`                | Standard Vue injection works across the DOM/Three boundary           |
| Plugin system                       | `defineFiberPlugin` / `withPluginOptions` for root-scoped extensions |

## Explicit divergences

These are areas where behavior intentionally differs from R3F:

### Refs

Template refs are **proxy-backed handles**. Property access, method calls, and `instanceof` work directly, but `===` identity comparison against the raw Three.js object will fail.

Use `useObjectRef` when you need the actual object. See [Object Handles](/tutorials/object-handles).

### Suspense

Vue's `<Suspense>` keeps **previous content visible** during re-entrance. R3F/React Suspense can show a fallback immediately. Design loading transitions accordingly — see [Scene Transitions](/tutorials/scene-transitions).

### Events

Pointer events are raycaster-based. `pointerenter`/`pointerleave` semantics and pointer capture behavior differ from DOM events. See [Known Limitations](/advanced/known-limitations#pointer-event-semantics).

### `flushSync`

Exported for compatibility but is a synchronous shim. Prefer `useRenderCommit` and `useNextFrame` for async render coordination.

## Contract rules

- Divergences are documented, tested, and have recommended patterns.
- No compatibility shims that hide behavior. If the runtime contract differs, it's explicit.
- Vue-native APIs are preferred over R3F workarounds where Vue's model is stronger.
