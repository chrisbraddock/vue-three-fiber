---
title: Plugin System
description: Extend vue-threejs with a composable, dependency-aware plugin system.
---

# Plugin System

vue-threejs includes a root-scoped plugin system that lets packages hook into the renderer lifecycle, provide values to the component tree, and register Three.js extensions — all without tight coupling to Canvas internals.

> [!TIP]
> The plugin system is the recommended way to integrate ecosystem packages like [`@xperimntl/vue-threejs-drei`](/ecosystem/drei), [`@xperimntl/vue-threejs-postprocessing`](/ecosystem/postprocessing), and [`@xperimntl/vue-threejs-rapier`](/ecosystem/rapier).

## Defining a plugin

Use `defineFiberPlugin` to create a type-safe plugin definition:

```ts
import { defineFiberPlugin } from '@xperimntl/vue-threejs'

export const myPlugin = defineFiberPlugin({
  name: 'my-plugin',
  setup(ctx) {
    // ctx exposes: appContext, canvas, store, extend, provide,
    //              onDispose, invalidate, getState
    ctx.extend({ MyCustomObject })
    ctx.provide(MY_KEY, { hello: 'world' })

    ctx.onDispose(() => {
      // cleanup when the Canvas unmounts
    })
  },
})
```

### Plugin context

The `setup` function receives a `FiberPluginContext` with:

| Property     | Description                                         |
| ------------ | --------------------------------------------------- |
| `appContext` | The Vue app context (or `null`)                     |
| `canvas`     | The `HTMLCanvasElement` or `OffscreenCanvas`        |
| `store`      | The root Zustand store                              |
| `extend`     | Register Three.js constructors into the catalogue   |
| `provide`    | Inject a value into the plugin provider subtree     |
| `onDispose`  | Register a cleanup callback (runs in reverse order) |
| `invalidate` | Request re-render frames (for demand rendering)     |
| `getState`   | Get a snapshot of the current root state            |

### Options

Plugins can accept typed options:

```ts
import { defineFiberPlugin, withPluginOptions } from '@xperimntl/vue-threejs'

export interface MyPluginOptions {
  debug?: boolean
  quality?: 'low' | 'medium' | 'high'
}

export const myPlugin = defineFiberPlugin<MyPluginOptions>({
  name: 'my-plugin',
  setup(ctx, options) {
    if (options?.debug) console.log('debug mode')
    ctx.provide(MY_DEFAULTS, options)
  },
})

// Convenience factory
export function createMyPlugin(options?: MyPluginOptions) {
  return withPluginOptions(myPlugin, options)
}
```

### Dependencies

Declare dependencies with `requires` for guaranteed initialization order:

```ts
export const effectsPlugin = defineFiberPlugin({
  name: 'my-effects',
  requires: ['@xperimntl/vue-threejs-postprocessing'],
  setup(ctx) {
    // postprocessing plugin is guaranteed to have run first
  },
})
```

Missing or circular dependencies throw at runtime with clear error messages.

## Registering plugins

### Canvas-level

Pass plugins directly to a `Canvas`:

```vue
<script setup>
import { Canvas } from '@xperimntl/vue-threejs'
import { createDreiPlugin } from '@xperimntl/vue-threejs-drei'
import { createPostprocessingPlugin } from '@xperimntl/vue-threejs-postprocessing'

const plugins = [createDreiPlugin({ dracoPath: '/draco/' }), createPostprocessingPlugin({ multisampling: 4 })]
</script>

<template>
  <Canvas :plugins="plugins">
    <!-- scene content -->
  </Canvas>
</template>
```

### App-level

Register plugins once for every Canvas in the app:

```ts
import { createApp } from 'vue'
import { registerFiberPlugin } from '@xperimntl/vue-threejs'
import { dreiFiberPlugin } from '@xperimntl/vue-threejs-drei'

const app = createApp(App)
registerFiberPlugin(app, dreiFiberPlugin)
app.mount('#app')
```

App-level and Canvas-level plugins are merged automatically. Canvas plugins override app plugins with the same name (last-write-wins).

### Plugin entry forms

Plugins can be passed in three forms:

```ts
// 1. Bare definition (no options)
[myPlugin]

// 2. Tuple
[myPlugin, { debug: true }]

// 3. Object (preferred for stable identity)
{ plugin: myPlugin, options: { debug: true }, key: 'my-unique-key' }
```

### Inheritance

By default, Canvas inherits app-level plugins. Disable with:

```vue
<Canvas :inherit-plugins="false" :plugins="[myPlugin]">
  <!-- only myPlugin, no app-level plugins -->
</Canvas>
```

## Lifecycle

1. **Normalize** — all entry forms are resolved to a uniform shape
2. **Deduplicate** — plugins with the same name are deduped (last wins)
3. **Sort** — topological sort based on `requires` dependencies
4. **Setup** — `plugin.setup()` called in dependency order
5. **Dispose** — cleanup functions run in reverse order on unmount

## Official plugins

- [`@xperimntl/vue-threejs-drei`](/ecosystem/drei) — controls, loaders, staging, helpers
- [`@xperimntl/vue-threejs-postprocessing`](/ecosystem/postprocessing) — GPU postprocessing effects
- [`@xperimntl/vue-threejs-rapier`](/ecosystem/rapier) — physics simulation
