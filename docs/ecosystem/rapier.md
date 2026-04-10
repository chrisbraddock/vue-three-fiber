---
title: Rapier Physics
description: Vue-native physics simulation for vue-threejs using Rapier.
---

# @xperimntl/vue-threejs-rapier

Declarative rigid-body physics for vue-threejs, powered by [Rapier](https://rapier.rs/).

> Ported from [`@react-three/rapier`](https://github.com/pmndrs/react-three-rapier) — the React Three Fiber integration for the Rapier physics engine. The Vue version provides the same component and composable API adapted for Vue's reactivity system.

## Availability

`@xperimntl/vue-threejs-rapier` is included in the monorepo. Install the core package to use it:

## Plugin registration

Register as a [fiber plugin](/ecosystem/plugins) to set global defaults:

```ts
import { createRapierPlugin } from '@xperimntl/vue-threejs-rapier'

<Canvas :plugins="[createRapierPlugin({ gravity: [0, -9.81, 0] })]">
```

```ts
// Or app-wide
import { registerFiberPlugin } from '@xperimntl/vue-threejs'
import { rapierFiberPlugin } from '@xperimntl/vue-threejs-rapier'

registerFiberPlugin(app, rapierFiberPlugin)
```

## Usage

Wrap physics objects in a `Physics` world and add `RigidBody` components:

```vue
<script setup>
import { Canvas } from '@xperimntl/vue-threejs'
import { Physics, RigidBody, CuboidCollider } from '@xperimntl/vue-threejs-rapier'
</script>

<template>
  <Canvas>
    <ambientLight />
    <Physics>
      <!-- Dynamic falling box -->
      <RigidBody>
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="orange" />
        </mesh>
      </RigidBody>

      <!-- Static ground plane -->
      <RigidBody type="fixed">
        <CuboidCollider :args="[10, 0.1, 10]" />
        <mesh>
          <boxGeometry :args="[20, 0.2, 20]" />
          <meshStandardMaterial color="green" />
        </mesh>
      </RigidBody>
    </Physics>
  </Canvas>
</template>
```

## Components

### Physics

The physics world container. All rigid bodies and colliders must be descendants of `Physics`.

| Prop          | Type       | Default         | Description                       |
| ------------- | ---------- | --------------- | --------------------------------- |
| `gravity`     | `number[]` | `[0, -9.81, 0]` | World gravity vector              |
| `timestep`    | `number`   | `1/60`          | Fixed timestep                    |
| `interpolate` | `boolean`  | `true`          | Interpolate between physics steps |
| `paused`      | `boolean`  | `false`         | Pause the simulation              |
| `debug`       | `boolean`  | `false`         | Render debug wireframes           |

### RigidBody

A physics-enabled rigid body. Children meshes are automatically synced to the body's transform.

| Prop           | Type       | Default   | Description                                                  |
| -------------- | ---------- | --------- | ------------------------------------------------------------ |
| `type`         | `string`   | `dynamic` | `dynamic`, `fixed`, `kinematicPosition`, `kinematicVelocity` |
| `position`     | `number[]` | `[0,0,0]` | Initial position                                             |
| `rotation`     | `number[]` | `[0,0,0]` | Initial rotation (Euler)                                     |
| `gravityScale` | `number`   | `1`       | Per-body gravity multiplier                                  |
| `restitution`  | `number`   | `0`       | Bounciness (0 = no bounce, 1 = full bounce)                  |
| `friction`     | `number`   | `0.5`     | Surface friction                                             |

### Debug

Renders wireframe outlines for all colliders in the physics world.

```vue
<Physics>
  <Debug />
  <!-- bodies -->
</Physics>
```

## Colliders

Collider components define the physics shape. Place them inside a `RigidBody`.

| Component             | Shape         | Args                           |
| --------------------- | ------------- | ------------------------------ |
| `BallCollider`        | Sphere        | `[radius]`                     |
| `CuboidCollider`      | Box           | `[halfX, halfY, halfZ]`        |
| `CapsuleCollider`     | Capsule       | `[halfHeight, radius]`         |
| `CylinderCollider`    | Cylinder      | `[halfHeight, radius]`         |
| `ConeCollider`        | Cone          | `[halfHeight, radius]`         |
| `TrimeshCollider`     | Triangle mesh | `[vertices, indices]`          |
| `HeightfieldCollider` | Heightfield   | `[rows, cols, heights, scale]` |

If no explicit collider is provided, `RigidBody` auto-generates colliders from child mesh geometries.

```vue
<RigidBody>
  <BallCollider :args="[0.5]" />
  <mesh>
    <sphereGeometry :args="[0.5]" />
    <meshStandardMaterial />
  </mesh>
</RigidBody>
```

## Joints

Connect two rigid bodies with a constraint.

| Component        | Description                            |
| ---------------- | -------------------------------------- |
| `FixedJoint`     | Locks bodies together rigidly          |
| `SphericalJoint` | Ball-and-socket joint                  |
| `RevoluteJoint`  | Hinge joint (single axis rotation)     |
| `PrismaticJoint` | Slider joint (single axis translation) |
| `RopeJoint`      | Max-distance constraint                |
| `SpringJoint`    | Damped spring between bodies           |

```vue
<RigidBody ref="bodyA">
  <!-- ... -->
</RigidBody>
<RigidBody ref="bodyB">
  <!-- ... -->
</RigidBody>
<SphericalJoint :body-a="bodyA" :body-b="bodyB" :anchor-a="[0, 1, 0]" :anchor-b="[0, -1, 0]" />
```

## Composables

### useRapier

Access the Rapier world and API from any descendant of `Physics`.

```ts
import { useRapier } from '@xperimntl/vue-threejs-rapier'

const { world, rapier } = useRapier()
```

### useRigidBody

Access the rigid body API from within a `RigidBody`.

```ts
import { useRigidBody } from '@xperimntl/vue-threejs-rapier'

const { rigidBody, api } = useRigidBody()
// api.applyImpulse([0, 5, 0])
```

### useCollider

Access collider data from within a collider component.

```ts
import { useCollider } from '@xperimntl/vue-threejs-rapier'

const { collider } = useCollider()
```

### useBeforePhysicsStep / useAfterPhysicsStep

Run logic before or after each physics step.

```ts
import { useBeforePhysicsStep, useAfterPhysicsStep } from '@xperimntl/vue-threejs-rapier'

useBeforePhysicsStep((world) => {
  // apply forces, read positions, etc.
})

useAfterPhysicsStep((world) => {
  // read results after simulation
})
```

## See also

- [Rapier documentation](https://rapier.rs/docs/) — full physics engine reference
- [Original `@react-three/rapier`](https://github.com/pmndrs/react-three-rapier) — React integration reference
- [Plugin system](/ecosystem/plugins) — how fiber plugins work
