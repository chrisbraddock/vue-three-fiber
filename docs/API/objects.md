---
title: Objects, properties and constructor arguments
description: All the effective ways of using vue-threejs
---

## Declaring objects

You can use [three.js's entire object catalogue and all properties](https://threejs.org/docs). When in doubt, always consult the docs.

You could lay out an object like this:

```vue
<template>
  <mesh
    visible
    :userData="{ hello: 'world' }"
    :position="new THREE.Vector3(1, 2, 3)"
    :rotation="new THREE.Euler(Math.PI / 2, 0, 0)"
    :geometry="new THREE.SphereGeometry(1, 16, 16)"
    :material="new THREE.MeshBasicMaterial({ color: new THREE.Color('hotpink'), transparent: true })" />
</template>
```

The problem is that all of these properties will always be re-created. Instead, you should define properties declaratively.

```vue
<template>
  <mesh visible :userData="{ hello: 'world' }" :position="[1, 2, 3]" :rotation="[Math.PI / 2, 0, 0]">
    <sphereGeometry :args="[1, 16, 16]" />
    <meshStandardMaterial color="hotpink" transparent />
  </mesh>
</template>
```

## Constructor arguments

In three.js objects are classes that are instantiated. These classes can receive one-time constructor arguments (`new THREE.SphereGeometry(1, 32)`), and properties (`someObject.visible = true`). In vue-threejs, constructor arguments are always passed as an array via `args`. If args change later on, the object must naturally get reconstructed from scratch!

```vue
<template>
  <sphereGeometry :args="[1, 32]" />
</template>
```

## Shortcuts

### Set

All properties whose underlying object has a `.set()` method can directly receive the same arguments that `set` would otherwise take. For example [`THREE.Color.set`](https://threejs.org/docs/#api/en/math/Color.set) can take a color string, so instead of `:color="new THREE.Color('hotpink')"` you can simply write `color="hotpink"`. Some `set` methods take multiple arguments, for instance [`THREE.Vector3`](https://threejs.org/docs/#api/en/math/Vector3.set), give it an array in that case `:position="[100, 0, 0]"`.

```vue
<template>
  <mesh :position="[1, 2, 3]">
    <meshStandardMaterial color="hotpink" />
  </mesh>
</template>
```

> [!NOTE]
> If you do link up an existing object to a property, for instance a THREE.Vector3() to a position, be aware that this will end up copying the object in most cases as it calls .copy() on the target. This only applies to objects that expose both .set() and .copy() (Vectors, Eulers, Matrix, ...). If you link up an existing material or geometry on the other hand, it will overwrite, because these objects do not have a .set() method.

### SetScalar

Properties that have a `setScalar` method (for instance `Vector3`) can be set like so:

```vue
<!-- Translates to <mesh :scale="[1, 1, 1]" /> -->
<template>
  <mesh :scale="1" />
</template>
```

## Piercing into nested properties

If you want to reach into nested attributes (for instance: `mesh.rotation.x`), just use dash-case.

```vue
<template>
  <mesh :rotation-x="1" :material-uniforms-resolution-value="[512, 512]" />
</template>
```

## Dealing with non-scene objects

You can put non-Object3D primitives (geometries, materials, etc) into the render tree as well. They take the same properties and constructor arguments they normally would.

You might be wondering why you would want to put something in the "scene" that normally would not be part of it, in a vanilla three.js app at least. For the same reason you declare any object: it becomes managed, reactive and auto-disposes. These objects are not technically part of the scene, but they "attach" to a parent which is.

### Attach

Use `attach` to bind objects to their parent. If you unmount the attached object it will be taken off its parent automatically.

The following attaches a material to the `material` property of a mesh and a geometry to the `geometry` property:

```vue
<template>
  <mesh>
    <meshBasicMaterial attach="material" />
    <boxGeometry attach="geometry" />
  </mesh>
</template>
```

> [!NOTE]
> All objects extending `THREE.Material` receive `attach="material"`, and all objects extending `THREE.BufferGeometry` receive `attach="geometry"`. You do not have to type it out!

```vue
<template>
  <mesh>
    <meshBasicMaterial />
    <boxGeometry />
  </mesh>
</template>
```

You can also deeply nest attach through piercing. The following adds a buffer-attribute to `geometry.attributes.position` and then adds the buffer geometry to `mesh.geometry`.

```vue
<template>
  <mesh>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" :args="[v, 3]" />
    </bufferGeometry>
  </mesh>
</template>
```

#### More examples

```vue
<template>
  <!-- Attach bar to foo.a -->
  <foo>
    <bar attach="a" />
  </foo>

  <!-- Attach bar to foo.a.b and foo.a.b.c (nested object attach) -->
  <foo>
    <bar attach="a-b" />
    <bar attach="a-b-c" />
  </foo>

  <!-- Attach bar to foo.a[0] and foo.a[1] (array attach is just object attach) -->
  <foo>
    <bar attach="a-0" />
    <bar attach="a-1" />
  </foo>
</template>
```

#### Real-world use-cases:

Attaching to nested objects, for instance a shadow-camera:

```vue
<template>
  <directionalLight castShadow :position="[2.5, 8, 5]" :shadow-mapSize="[1024, 1024]">
    <orthographicCamera attach="shadow-camera" :args="[-10, 10, 10, -10]" />
  </directionalLight>
</template>
```

Arrays must have explicit order, for instance multi-materials:

```vue
<template>
  <mesh>
    <meshBasicMaterial v-for="(color, index) in colors" :key="index" :attach="`material-${index}`" :color="color" />
  </mesh>
</template>
```

## Putting already existing objects into the scene-graph

You can use the `primitive` placeholder for that. You can still give it properties or attach nodes to it. Never add the same object multiple times, this is not allowed in three.js! Primitives will not dispose of the object they carry on unmount, you are responsible for disposing of it!

```vue
<script setup>
const mesh = new THREE.Mesh(geometry, material)
</script>

<template>
  <primitive :object="mesh" :position="[10, 0, 0]" />
</template>
```

> [!NOTE]
> Scene objects can only ever be added once in Threejs. If you attempt to add one and the same object in two places Threejs will remove the first instance automatically. This will also happen with primitive! If you want to re-use an existing object, you must clone it first.

## Using 3rd-party objects declaratively

The `extend` function extends vue-threejs's catalogue of elements. Components added this way can then be referenced in the scene-graph using camel casing similar to other primitives.

```js
import { extend } from '@xperimntl/vue-threejs'
import { OrbitControls, TransformControls } from 'three-stdlib'
extend({ OrbitControls, TransformControls })
```

```vue
<template>
  <orbitControls />
  <transformControls />
</template>
```

If you're using TypeScript, you'll also need to [extend the element namespace](/API/typescript).

## Disposal

Freeing resources is a [manual chore in `three.js`](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects), but Vue is aware of object-lifecycles, hence vue-threejs will attempt to free resources for you by calling `object.dispose()`, if present, on all unmounted objects.

If you manage assets by yourself, globally or in a cache, this may _not_ be what you want. You can switch it off by placing `dispose={null}` onto meshes, materials, etc, or even on parent containers like groups, it is now valid for the entire tree.

```vue
<script setup>
const globalGeometry = new THREE.BoxGeometry()
const globalMaterial = new THREE.MeshBasicMaterial()
</script>

<template>
  <group :dispose="null">
    <mesh :geometry="globalGeometry" :material="globalMaterial" />
  </group>
</template>
```
