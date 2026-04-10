import {
  defineComponent,
  h,
  provide,
  shallowRef,
  inject,
  watch,
  onBeforeUnmount,
  type PropType,
  type ShallowRef,
} from 'vue'
import * as THREE from 'three'
import { useFrame } from '@xperimntl/vue-threejs'
import type RAPIER from '@dimforge/rapier3d-compat'
import {
  PHYSICS_CONTEXT,
  RIGID_BODY_CONTEXT,
  type PhysicsContext,
  type RigidBodyContext,
  type ColliderShape,
} from './context'

type RigidBodyType = 'dynamic' | 'fixed' | 'kinematicPosition' | 'kinematicVelocity'

function createBodyDesc(rapier: typeof RAPIER, type: RigidBodyType): RAPIER.RigidBodyDesc {
  switch (type) {
    case 'dynamic':
      return rapier.RigidBodyDesc.dynamic()
    case 'fixed':
      return rapier.RigidBodyDesc.fixed()
    case 'kinematicPosition':
      return rapier.RigidBodyDesc.kinematicPositionBased()
    case 'kinematicVelocity':
      return rapier.RigidBodyDesc.kinematicVelocityBased()
    default:
      return rapier.RigidBodyDesc.dynamic()
  }
}

function autoGenerateColliders(
  rapier: typeof RAPIER,
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  group: THREE.Group,
  shape: ColliderShape,
): RAPIER.Collider[] {
  const colliders: RAPIER.Collider[] = []

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    if (!child.geometry) return

    child.geometry.computeBoundingBox()
    const bbox = child.geometry.boundingBox
    if (!bbox) return

    let desc: RAPIER.ColliderDesc | null = null

    switch (shape) {
      case 'ball': {
        child.geometry.computeBoundingSphere()
        const sphere = child.geometry.boundingSphere
        if (sphere) {
          desc = rapier.ColliderDesc.ball(sphere.radius)
          const center = sphere.center
          desc.setTranslation(center.x, center.y, center.z)
        }
        break
      }
      case 'cuboid': {
        const size = new THREE.Vector3()
        bbox.getSize(size)
        const center = new THREE.Vector3()
        bbox.getCenter(center)
        desc = rapier.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
        desc.setTranslation(center.x, center.y, center.z)
        break
      }
      case 'trimesh': {
        const posAttr = child.geometry.getAttribute('position')
        if (!posAttr) break
        const vertices = new Float32Array(posAttr.array)
        const indexAttr = child.geometry.getIndex()
        if (indexAttr) {
          const indices = new Uint32Array(indexAttr.array)
          desc = rapier.ColliderDesc.trimesh(vertices, indices)
        }
        break
      }
    }

    if (desc) {
      colliders.push(world.createCollider(desc, body))
    }
  })

  return colliders
}

export const RigidBody = defineComponent({
  name: 'RigidBody',
  props: {
    type: {
      type: String as PropType<RigidBodyType>,
      default: 'dynamic',
    },
    position: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
    rotation: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
    linearVelocity: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
    angularVelocity: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
    gravityScale: {
      type: Number,
      default: 1,
    },
    canSleep: {
      type: Boolean,
      default: true,
    },
    ccd: {
      type: Boolean,
      default: false,
    },
    lockTranslations: {
      type: Boolean,
      default: false,
    },
    lockRotations: {
      type: Boolean,
      default: false,
    },
    enabledTranslations: {
      type: Array as unknown as PropType<[boolean, boolean, boolean]>,
      default: undefined,
    },
    enabledRotations: {
      type: Array as unknown as PropType<[boolean, boolean, boolean]>,
      default: undefined,
    },
    linearDamping: {
      type: Number,
      default: undefined,
    },
    angularDamping: {
      type: Number,
      default: undefined,
    },
    restitution: {
      type: Number,
      default: undefined,
    },
    friction: {
      type: Number,
      default: undefined,
    },
    sensor: {
      type: Boolean,
      default: false,
    },
    colliders: {
      type: [String, Boolean] as PropType<ColliderShape | false>,
      default: undefined,
    },
  },
  emits: ['collision-enter', 'collision-exit', 'contact-force', 'sleep', 'wake'],
  setup(props, { slots, emit }) {
    const physics = inject(PHYSICS_CONTEXT)
    if (!physics) {
      throw new Error('@xperimntl/vue-threejs-rapier: <RigidBody> must be placed inside a <Physics> component')
    }

    const { world, rapier } = physics
    const bodyRef: ShallowRef<RAPIER.RigidBody> = shallowRef(null!) as ShallowRef<RAPIER.RigidBody>
    const groupRef = shallowRef<THREE.Group | null>(null)
    const childColliders: RAPIER.Collider[] = []
    const autoColliders: RAPIER.Collider[] = []

    // Euler helper for rotation conversion
    const _euler = new THREE.Euler()
    const _quat = new THREE.Quaternion()

    // Create the rigid body
    const desc = createBodyDesc(rapier, props.type)

    if (props.position) {
      desc.setTranslation(props.position[0], props.position[1], props.position[2])
    }
    if (props.rotation) {
      _euler.set(props.rotation[0], props.rotation[1], props.rotation[2])
      _quat.setFromEuler(_euler)
      desc.setRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w })
    }
    if (props.linearVelocity) {
      desc.setLinvel(props.linearVelocity[0], props.linearVelocity[1], props.linearVelocity[2])
    }
    if (props.angularVelocity) {
      desc.setAngvel({ x: props.angularVelocity[0], y: props.angularVelocity[1], z: props.angularVelocity[2] })
    }

    desc.setGravityScale(props.gravityScale)
    desc.setCanSleep(props.canSleep)
    desc.setCcdEnabled(props.ccd)

    if (props.linearDamping !== undefined) {
      desc.setLinearDamping(props.linearDamping)
    }
    if (props.angularDamping !== undefined) {
      desc.setAngularDamping(props.angularDamping)
    }

    const body = world.value.createRigidBody(desc)
    bodyRef.value = body

    // Apply lock/enabled constraints
    if (props.lockTranslations) body.lockTranslations(true, true)
    if (props.lockRotations) body.lockRotations(true, true)
    if (props.enabledTranslations) {
      body.setEnabledTranslations(
        props.enabledTranslations[0],
        props.enabledTranslations[1],
        props.enabledTranslations[2],
        true,
      )
    }
    if (props.enabledRotations) {
      body.setEnabledRotations(props.enabledRotations[0], props.enabledRotations[1], props.enabledRotations[2], true)
    }

    // Provide RigidBody context for child colliders
    const rigidBodyContext: RigidBodyContext = {
      body: bodyRef,
      addCollider(colliderDesc: RAPIER.ColliderDesc): RAPIER.Collider {
        const collider = world.value.createCollider(colliderDesc, body)
        childColliders.push(collider)
        return collider
      },
      removeCollider(collider: RAPIER.Collider) {
        const idx = childColliders.indexOf(collider)
        if (idx !== -1) childColliders.splice(idx, 1)
        if (world.value) {
          world.value.removeCollider(collider, true)
        }
      },
    }
    provide(RIGID_BODY_CONTEXT, rigidBodyContext)

    // Determine effective collider shape
    const effectiveColliders = (): ColliderShape | false => {
      if (props.colliders !== undefined) return props.colliders
      return physics.colliders.value
    }

    // Set up collision events via the event queue
    // We handle these in the after-step callback
    let eventQueue: RAPIER.EventQueue | null = null
    const activeCollisions = new Set<number>()

    if (emit) {
      eventQueue = new rapier.EventQueue(true)
    }

    // Sync body transform to group each frame
    const afterStepUnsub = physics.onAfterStep((w) => {
      if (!groupRef.value || !bodyRef.value) return

      const pos = bodyRef.value.translation()
      const rot = bodyRef.value.rotation()

      // Check interpolation
      const ctx = physics as any
      if (ctx._getInterpolationAlpha && ctx._bodyTransforms) {
        const alpha: number = ctx._getInterpolationAlpha()
        const transforms = ctx._bodyTransforms as Map<number, any>
        const entry = transforms.get(bodyRef.value.handle)

        if (entry && alpha < 1) {
          // Lerp position
          groupRef.value.position.set(
            entry.prevPosition.x + (entry.currPosition.x - entry.prevPosition.x) * alpha,
            entry.prevPosition.y + (entry.currPosition.y - entry.prevPosition.y) * alpha,
            entry.prevPosition.z + (entry.currPosition.z - entry.prevPosition.z) * alpha,
          )
          // Slerp rotation
          const prevQ = _quat.set(
            entry.prevRotation.x,
            entry.prevRotation.y,
            entry.prevRotation.z,
            entry.prevRotation.w,
          )
          const currQ = new THREE.Quaternion(
            entry.currRotation.x,
            entry.currRotation.y,
            entry.currRotation.z,
            entry.currRotation.w,
          )
          prevQ.slerp(currQ, alpha)
          groupRef.value.quaternion.copy(prevQ)
          return
        }
      }

      groupRef.value.position.set(pos.x, pos.y, pos.z)
      groupRef.value.quaternion.set(rot.x, rot.y, rot.z, rot.w)
    })

    // Watch for body property changes
    watch(
      () => props.gravityScale,
      (v) => {
        if (bodyRef.value) bodyRef.value.setGravityScale(v, true)
      },
    )
    watch(
      () => props.ccd,
      (v) => {
        if (bodyRef.value) bodyRef.value.enableCcd(v)
      },
    )
    watch(
      () => props.linearDamping,
      (v) => {
        if (bodyRef.value && v !== undefined) bodyRef.value.setLinearDamping(v)
      },
    )
    watch(
      () => props.angularDamping,
      (v) => {
        if (bodyRef.value && v !== undefined) bodyRef.value.setAngularDamping(v)
      },
    )

    // Handle auto-colliders after mount via useFrame (one-time)
    let autoCollidersGenerated = false
    useFrame(() => {
      if (autoCollidersGenerated || !groupRef.value) return
      autoCollidersGenerated = true

      const shape = effectiveColliders()
      if (shape) {
        const generated = autoGenerateColliders(rapier, world.value, body, groupRef.value, shape)
        autoColliders.push(...generated)

        // Apply common collider props to auto-generated colliders
        for (const collider of autoColliders) {
          if (props.restitution !== undefined) collider.setRestitution(props.restitution)
          if (props.friction !== undefined) collider.setFriction(props.friction)
          if (props.sensor) collider.setSensor(true)
        }
      }
    })

    // Cleanup
    onBeforeUnmount(() => {
      afterStepUnsub()

      // Remove auto-generated colliders
      for (const collider of autoColliders) {
        if (world.value) world.value.removeCollider(collider, true)
      }
      autoColliders.length = 0

      // Remove manually-added child colliders
      for (const collider of childColliders) {
        if (world.value) world.value.removeCollider(collider, true)
      }
      childColliders.length = 0

      // Remove the body itself
      if (world.value && bodyRef.value) {
        world.value.removeRigidBody(body)
      }

      if (eventQueue) {
        eventQueue.free()
        eventQueue = null
      }
    })

    return () => {
      return h(
        'group',
        {
          ref: (el: any) => {
            if (el && el.object) {
              groupRef.value = el.object as THREE.Group
            } else if (el instanceof THREE.Group) {
              groupRef.value = el
            } else {
              groupRef.value = null
            }
          },
          position: props.position ?? [0, 0, 0],
          rotation: props.rotation ?? [0, 0, 0],
        },
        slots.default?.(),
      )
    }
  },
})
