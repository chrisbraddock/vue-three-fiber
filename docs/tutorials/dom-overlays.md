---
title: DOM Overlays
description: Layer HTML elements over your 3D scene with Canvas slots
---

Many 3D applications need HTML elements layered on top of the scene — HUDs, labels, control panels, loading indicators. The Canvas component's `overlay` slot makes this straightforward.

## The overlay slot

The overlay slot renders DOM elements in a `div` sibling that sits on top of the canvas. The overlay div has `pointer-events: none` by default, so it does not interfere with 3D interaction.

```vue
<template>
  <Canvas>
    <ambientLight />
    <mesh>
      <boxGeometry />
      <meshStandardMaterial color="orange" />
    </mesh>

    <template #overlay>
      <div style="padding: 20px; color: white; pointer-events: auto">
        <h2>My 3D App</h2>
        <p>Click the cube to interact</p>
      </div>
    </template>
  </Canvas>
</template>
```

The overlay div is absolutely positioned to cover the full canvas area. Add `pointer-events: auto` to individual overlay elements that should receive clicks.

## Connecting overlay UI to scene state

Use Vue's standard reactivity to connect overlay controls to your 3D scene. Since the overlay is a regular Vue slot, it shares the parent component's reactive scope:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Canvas } from '@xperimntl/vue-threejs'

const color = ref('orange')
const scale = ref(1)
</script>

<template>
  <Canvas>
    <ambientLight :intensity="0.5" />
    <directionalLight :position="[5, 5, 5]" />
    <mesh :scale="scale">
      <boxGeometry />
      <meshStandardMaterial :color="color" />
    </mesh>

    <template #overlay>
      <div style="position: absolute; bottom: 20px; left: 20px; pointer-events: auto">
        <label>
          Color:
          <input type="color" :value="color" @input="color = ($event.target as HTMLInputElement).value" />
        </label>
        <label>
          Scale:
          <input type="range" min="0.5" max="3" step="0.1" v-model.number="scale" />
        </label>
      </div>
    </template>
  </Canvas>
</template>
```

## Using provide/inject for scene services

For larger applications, use Vue's `provide`/`inject` to share scene state between the overlay and deeply nested 3D components:

```vue
<!-- App.vue -->
<script setup lang="ts">
import { ref, provide } from 'vue'
import { Canvas } from '@xperimntl/vue-threejs'
import SceneContent from './SceneContent.vue'

// Shared state that both 3D components and overlay can access
const selectedObject = ref<string | null>(null)
const highlightColor = ref('#ff0000')

provide('scene-state', { selectedObject, highlightColor })
</script>

<template>
  <Canvas>
    <ambientLight />
    <SceneContent />

    <template #overlay>
      <div
        style="position: absolute; top: 10px; right: 10px; pointer-events: auto; background: rgba(0,0,0,0.7); padding: 12px; border-radius: 8px; color: white">
        <p v-if="selectedObject">Selected: {{ selectedObject }}</p>
        <p v-else>Click an object to select it</p>
        <label>
          Highlight:
          <input type="color" v-model="highlightColor" />
        </label>
      </div>
    </template>
  </Canvas>
</template>
```

```vue
<!-- SceneContent.vue -->
<script setup lang="ts">
import { inject } from 'vue'

const { selectedObject, highlightColor } = inject('scene-state')!
</script>

<template>
  <mesh :position="[-1.5, 0, 0]" @click="selectedObject = 'Cube'">
    <boxGeometry />
    <meshStandardMaterial :color="selectedObject === 'Cube' ? highlightColor : 'gray'" />
  </mesh>
  <mesh :position="[1.5, 0, 0]" @click="selectedObject = 'Sphere'">
    <sphereGeometry />
    <meshStandardMaterial :color="selectedObject === 'Sphere' ? highlightColor : 'gray'" />
  </mesh>
</template>
```

For a complete runnable example of this pattern, see the **SceneServices** demo in `example/src/demos/`.

## Error handling with the error slot

The Canvas also provides an `error` slot for graceful degradation when something goes wrong during rendering:

```vue
<template>
  <Canvas>
    <SceneContent />

    <template #error="{ error, retry }">
      <div
        style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; background: #1a1a2e">
        <div style="text-align: center">
          <h3>Something went wrong</h3>
          <p>{{ error.message }}</p>
          <button @click="retry" style="pointer-events: auto; padding: 8px 16px; cursor: pointer">Try Again</button>
        </div>
      </div>
    </template>
  </Canvas>
</template>
```

The error slot receives:

- `error` — the captured `Error` object
- `retry` — a function that clears the error state and attempts to re-render

If no error slot is provided, the Canvas displays the error message as plain text.

## Layout tips

The overlay div fills the canvas area with `position: absolute`. Use standard CSS to position your overlay content:

```css
/* Top-left HUD */
.hud {
  position: absolute;
  top: 10px;
  left: 10px;
}

/* Centered loading indicator */
.loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Bottom toolbar */
.toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}
```

Remember to add `pointer-events: auto` to any overlay element that needs to receive mouse/touch input.

## Next steps

- Learn about [object handles](/tutorials/object-handles) with `useObjectRef`
- See [Events & Interaction](/tutorials/events-and-interaction) for 3D input handling
