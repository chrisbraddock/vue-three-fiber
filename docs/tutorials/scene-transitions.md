---
title: Scene Transitions
description: Manage scene loading and transitions with Vue-native patterns
---

3D applications often need to swap between scenes or display loading states while heavy assets are prepared. Vue's reactivity and component model handle these transitions naturally, without special libraries or wrapper components.

## Scene swapping with reactive state

The simplest approach is a reactive ref that controls which scene component is rendered. Use `v-if` to toggle between scene components:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Canvas } from '@xperimntl/vue-threejs'
import SceneA from './SceneA.vue'
import SceneB from './SceneB.vue'

const activeScene = ref<'a' | 'b'>('a')
</script>

<template>
  <Canvas>
    <ambientLight :intensity="0.5" />
    <directionalLight :position="[5, 5, 5]" />

    <SceneA v-if="activeScene === 'a'" />
    <SceneB v-if="activeScene === 'b'" />
  </Canvas>

  <button @click="activeScene = activeScene === 'a' ? 'b' : 'a'">Switch Scene</button>
</template>
```

When `activeScene` changes, Vue unmounts one scene component and mounts the other. Three.js objects from the old scene are disposed and new ones are created.

## Keep-previous pattern

Vue naturally keeps the previous content visible while new content mounts. This means users see the old scene until the new one is ready, avoiding a blank frame. You can also use `<component :is>` for dynamic scene selection with caching via `<KeepAlive>`:

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import SceneA from './SceneA.vue'
import SceneB from './SceneB.vue'

const scenes = { SceneA, SceneB }
const current = shallowRef(SceneA)

function swap() {
  current.value = current.value === SceneA ? SceneB : SceneA
}
</script>

<template>
  <Canvas>
    <ambientLight />
    <KeepAlive>
      <component :is="current" />
    </KeepAlive>
  </Canvas>

  <button @click="swap">Swap Scene</button>
</template>
```

With `<KeepAlive>`, Vue caches the deactivated scene's component state. When the user switches back, the scene restores instantly without re-creating Three.js objects from scratch.

## Explicit loading state

For full control, manage loading state manually. Track a `status` ref and show a wireframe placeholder while assets load:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const status = ref<'loading' | 'ready'>('loading')

onMounted(async () => {
  // Simulate loading heavy assets
  await loadModelData('/models/environment.glb')
  status.value = 'ready'
})

async function loadModelData(url: string) {
  // Your asset loading logic here
}
</script>

<template>
  <!-- Wireframe placeholder while loading -->
  <mesh v-if="status === 'loading'">
    <boxGeometry :args="[2, 2, 2]" />
    <meshBasicMaterial color="#444" wireframe />
  </mesh>

  <!-- Real content when ready -->
  <group v-if="status === 'ready'">
    <mesh>
      <sphereGeometry :args="[1, 32, 32]" />
      <meshStandardMaterial color="royalblue" />
    </mesh>
  </group>
</template>
```

This pattern gives you precise control over what appears at each stage of loading.

## Combining with overlays

Connect your loading state to a DOM overlay to display progress information above the scene. The Canvas `#overlay` slot renders HTML on top of the 3D canvas:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Canvas } from '@xperimntl/vue-threejs'
import HeavyScene from './HeavyScene.vue'

const progress = ref(0)
const loaded = ref(false)

function onProgress(pct: number) {
  progress.value = pct
  if (pct >= 100) loaded.value = true
}
</script>

<template>
  <Canvas>
    <ambientLight />
    <HeavyScene @progress="onProgress" />

    <template #overlay>
      <div
        v-if="!loaded"
        style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center">
        <div style="width: 200px; background: rgba(255,255,255,0.2); border-radius: 4px">
          <div
            :style="{
              width: progress + '%',
              height: '4px',
              background: '#4488ff',
              borderRadius: '4px',
              transition: 'width 0.3s',
            }" />
        </div>
      </div>
    </template>
  </Canvas>
</template>
```

See the [DOM Overlays](/tutorials/dom-overlays) tutorial for more on the overlay slot.

## Transition strategies

| Strategy        | How                                                 | When to use                    |
| --------------- | --------------------------------------------------- | ------------------------------ |
| `keep-previous` | Vue's default -- old stays visible until new mounts | Scene swaps, model changes     |
| `replace`       | Remove old content immediately, show placeholder    | When old content is misleading |
| `manual`        | Track loading state yourself                        | Full control over UX           |

The **keep-previous** strategy works out of the box. For **replace**, unmount the old scene first and mount a placeholder, then swap to the new scene when ready. For **manual**, use a `status` ref to drive every stage of the transition.

## What about Suspense?

Vue's `<Suspense>` works with `useLoader` and async `setup()` to defer rendering until assets are ready. However, for explicit transition control -- choosing when to hide the old scene, what placeholder to display, and how to animate the swap -- the manual patterns above give you more flexibility.

For details on Vue's renderer-specific Suspense behavior in a Three.js context, see [Vue Divergences](/advanced/vue-divergences).

## Future: @xperimntl/vue-threejs-extras

Higher-level components like `SceneTransition` and `ResourceBoundary` are planned for the `@xperimntl/vue-threejs-extras` package. These will formalize the patterns shown in this tutorial into reusable components with explicit transition strategy props (`keep-previous`, `replace`, `crossfade`), built-in progress tracking, and optional enter/leave animations for scene content.

## Next steps

- Learn about [DOM Overlays](/tutorials/dom-overlays) for mixing HTML and 3D
- See [Object Handles](/tutorials/object-handles) for typed access to Three.js objects
- Read about [Demand Rendering](/tutorials/demand-rendering) to optimize idle scenes
