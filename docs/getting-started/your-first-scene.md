---
title: Your first scene
description: This guide will help you setup your first vue-threejs scene and introduce you to its core concepts.
---

This tutorial will assume some Vue knowledge.

## Setting up the Canvas

We'll start by importing the `<Canvas />` component from `@xperimntl/vue-threejs` and putting it in our Vue component.

```vue
<script setup>
import { Canvas } from '@xperimntl/vue-threejs'
</script>

<template>
  <div id="canvas-container">
    <Canvas />
  </div>
</template>
```

The Canvas component does some important setup work behind the scenes:

- It sets up a **Scene** and a **Camera**, the basic building blocks necessary for rendering
- It renders our scene every frame, you do not need a traditional render-loop

> [!NOTE]
> Canvas is responsive to fit the parent node, so you can control how big it is by changing the parents width and height, in this case #canvas-container.

## Adding a Mesh Component

To actually see something in our scene, we'll add a lowercase `<mesh />` native element, which is the direct equivalent to new THREE.Mesh().

```vue
<template>
  <Canvas>
    <mesh />
  </Canvas>
</template>
```

> [!NOTE]
> Note that we don't need to import anything, All three.js objects will be treated as native elements, just like you can just write &lt;div /&gt; or &lt;span /&gt; in regular Vue DOM rendering. The general rule is that Fiber components are available under the camel-case version of their name in three.js.

A [`Mesh`](https://threejs.org/docs/#api/en/objects/Mesh) is a basic scene object in three.js, and it's used to hold the geometry and the material needed to represent a shape in 3D space.
We'll create a new mesh using a **BoxGeometry** and a **MeshStandardMaterial** which [automatically attach](/API/objects#attach) to their parent.

```vue
<template>
  <Canvas>
    <mesh>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  </Canvas>
</template>
```

Let's pause for a moment to understand exactly what is happening here. The code we just wrote is the equivalent to this three.js code:

```js
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(width, height)
document.querySelector('#canvas-container').appendChild(renderer.domElement)

const mesh = new THREE.Mesh()
mesh.geometry = new THREE.BoxGeometry()
mesh.material = new THREE.MeshStandardMaterial()

scene.add(mesh)

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

animate()
```

### Constructor arguments

According to the [docs for `BoxGeometry`](https://threejs.org/docs/#api/en/geometries/BoxGeometry) we can optionally pass three arguments for: width, length and depth:

```js
new THREE.BoxGeometry(2, 2, 2)
```

In order to do this in Fiber we use the `args` prop, which _always_ takes an array whose items represent the constructor arguments.

```vue
<template>
  <boxGeometry :args="[2, 2, 2]" />
</template>
```

> [!NOTE]
> Note that every time you change args, the object must be re-constructed!

## Adding lights

Next, we will add some lights to our scene, by putting these components into our canvas.

```vue
<template>
  <Canvas>
    <ambientLight :intensity="0.1" />
    <directionalLight color="red" :position="[0, 0, 5]" />
  </Canvas>
</template>
```

### Props

This introduces us to the last fundamental concept of Fiber, how Vue `props` work on three.js objects. When you set any prop on a Fiber component, it will set the property of the same name on the three.js instance.

Let's focus on our `ambientLight`, whose [documentation](https://threejs.org/docs/#api/en/lights/AmbientLight) tells us that we can optionally construct it with a color, but it can also receive props.

```vue
<template>
  <ambientLight :intensity="0.1" />
</template>
```

Which is the equivalent to:

```js
const light = new THREE.AmbientLight()
light.intensity = 0.1
```

### Shortcuts

There are a few shortcuts for props that have a `.set()` method (colors, vectors, etc).

```js
const light = new THREE.DirectionalLight()
light.position.set(0, 0, 5)
light.color.set('red')
```

Which is the same as the following in a Vue template:

```vue
<template>
  <directionalLight :position="[0, 0, 5]" color="red" />
</template>
```

Please refer to the API for [a deeper explanation](/API/objects).

## The result

```vue
<script setup>
import { Canvas } from '@xperimntl/vue-threejs'
</script>

<template>
  <Canvas>
    <mesh>
      <boxGeometry :args="[2, 2, 2]" />
      <meshPhongMaterial />
    </mesh>
    <ambientLight :intensity="0.1" />
    <directionalLight :position="[0, 0, 5]" color="red" />
  </Canvas>
</template>
```

> [!TIP]
> You can live-edit the code above:
>
> - try different materials, like [`MeshNormalMaterial`](https://threejs.org/docs/#api/en/materials/MeshNormalMaterial) or [`MeshBasicMaterial`](https://threejs.org/docs/#api/en/materials/MeshBasicMaterial), give them a color
> - try different geometries, like [`SphereGeometry`](https://threejs.org/docs/#api/en/geometries/SphereGeometry) or [`OctahedronGeometry`](https://threejs.org/docs/#api/en/geometries/OctahedronGeometry)
> - try changing the `position` on our `mesh` component, by setting the prop with the same name
> - try extracting our mesh to a new component
