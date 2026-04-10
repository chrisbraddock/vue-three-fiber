---
title: TypeScript
description: Common scenarios and how to approach them with TypeScript
---

## Typing with `ref()`

Vue's `ref()` creates a reactive reference. You can type it by passing a type through the generic:

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Mesh } from 'three'

const meshRef = ref<Mesh | null>(null)

onMounted(() => {
  console.log(Boolean(meshRef.value))
})
</script>

<template>
  <mesh ref="meshRef">
    <boxGeometry />
    <meshBasicMaterial />
  </mesh>
</template>
```

> [!NOTE]
> Template refs in the custom renderer receive a proxy-backed handle, not the raw `THREE.Mesh`. Property access and `instanceof` work transparently. If you need the actual Three.js object — for identity comparison or passing to external libraries — use [`useObjectRef<T>()`](/API/hooks#useobjectref) instead.

## Accessing typed three-elements

Whenever you want to type components that rely on three elements, you can use the `ThreeElements` interface to extract the mesh, group, or any other three element, including custom elements.

```ts
import { ThreeElements } from '@xperimntl/vue-threejs'

type FooProps = ThreeElements['mesh'] & { bar: boolean }
```

## Extend usage

vue-threejs can also accept third-party elements and extend them into its internal catalogue.

```ts
import { ref } from 'vue'
import { GridHelper } from 'three'
import { extend } from '@xperimntl/vue-threejs'

// Create our custom element
class CustomElement extends GridHelper {}

// Extend so the reconciler will learn about it
extend({ CustomElement })
```

```vue
<template>
  <customElement />
</template>
```

The catalogue teaches the underlying reconciler how to create fibers for these elements and treat them within the scene.

You can then declaratively create custom elements with primitives, but TypeScript won't know about them nor their props.

```html
<!-- error: 'customElement' does not exist on type 'IntrinsicElements' -->
<customElement />
```

### Extending ThreeElements

To define our element, we'll use the `ThreeElement` interface to extend `ThreeElements`. This interface describes three.js classes that are available in the V3F catalog and can be used as native elements.

```ts
import { ref } from 'vue'
import { GridHelper } from 'three'
import { extend, ThreeElement } from '@xperimntl/vue-threejs'

// Create our custom element
class CustomElement extends GridHelper {}

// Extend so the reconciler will learn about it
extend({ CustomElement })

// Add types to ThreeElements elements so primitives pick up on it
declare module '@xperimntl/vue-threejs' {
  interface ThreeElements {
    customElement: ThreeElement<typeof CustomElement>
  }
}
```

```vue
<!-- vue-threejs will create your custom component and TypeScript will understand it -->
<template>
  <customElement />
</template>
```

You can shorten element definition by using the `extend` factory signature, which will automatically extend the element locally. This will also prevent namespace bleeding.

```ts
// Create our custom element
class CustomElement extends GridHelper {}

// Extend so the reconciler will learn about it, types will be inferred
const Element = extend(CustomElement)
```

```vue
<!-- vue-threejs will create your custom component and TypeScript will understand it -->
<template>
  <Element />
</template>
```

## Extending three default elements

If you open your own root instead of using `<Canvas>`, you can extend the default elements with `extend`. But keep in mind that the `* as THREE` namespace contains classes, functions, numbers, strings. At the moment we suggest you use `any` or `@ts-ignore` unless you extract the exact classes you need (`extend({ Mesh, Group, ... })`).

```ts
import * as THREE from 'three'
import { extend, createRoot, events } from '@xperimntl/vue-threejs'

// Register the THREE namespace as native elements.
extend(THREE as any)

// Create a root
const root = createRoot(document.querySelector('canvas'))
```

## Exported types

vue-threejs is extensible and exports types for its internals, such as render props, canvas props, and events:

```ts
// Event raycaster intersection
Intersection

// `useFrame` internal subscription and render callback
Subscription
RenderCallback

// `useThree`'s returned internal state
RootState
Performance
Dpr
Size
Viewport
Camera

// Canvas props
CanvasProps

// Supported events
Events

// Event manager signature (is completely modular)
EventManager

// Wraps a platform event as it's passed through the event manager
ThreeEvent
```
