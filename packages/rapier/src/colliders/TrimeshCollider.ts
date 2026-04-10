import { defineComponent, inject, onBeforeUnmount, type PropType } from 'vue'
import type RAPIER from '@dimforge/rapier3d-compat'
import { PHYSICS_CONTEXT, RIGID_BODY_CONTEXT } from '../context'

export const TrimeshCollider = defineComponent({
  name: 'TrimeshCollider',
  props: {
    args: {
      type: Array as unknown as PropType<[vertices: Float32Array, indices: Uint32Array]>,
      required: true,
    },
    position: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
    rotation: {
      type: Array as unknown as PropType<[number, number, number]>,
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
    density: {
      type: Number,
      default: undefined,
    },
    mass: {
      type: Number,
      default: undefined,
    },
  },
  setup(props) {
    const physics = inject(PHYSICS_CONTEXT)
    if (!physics) {
      throw new Error('@xperimntl/vue-threejs-rapier: <TrimeshCollider> must be placed inside a <Physics> component')
    }

    const rigidBody = inject(RIGID_BODY_CONTEXT)
    if (!rigidBody) {
      throw new Error('@xperimntl/vue-threejs-rapier: <TrimeshCollider> must be placed inside a <RigidBody> component')
    }

    const { rapier } = physics
    const desc = rapier.ColliderDesc.trimesh(props.args[0], props.args[1])

    if (!desc) {
      throw new Error('@xperimntl/vue-threejs-rapier: Failed to create trimesh collider descriptor')
    }

    if (props.position) {
      desc.setTranslation(props.position[0], props.position[1], props.position[2])
    }
    if (props.rotation) {
      const [x, y, z] = props.rotation
      const cx = Math.cos(x / 2),
        sx = Math.sin(x / 2)
      const cy = Math.cos(y / 2),
        sy = Math.sin(y / 2)
      const cz = Math.cos(z / 2),
        sz = Math.sin(z / 2)
      desc.setRotation({
        x: sx * cy * cz - cx * sy * sz,
        y: cx * sy * cz + sx * cy * sz,
        z: cx * cy * sz - sx * sy * cz,
        w: cx * cy * cz + sx * sy * sz,
      })
    }
    if (props.restitution !== undefined) desc.setRestitution(props.restitution)
    if (props.friction !== undefined) desc.setFriction(props.friction)
    if (props.sensor) desc.setSensor(true)
    if (props.density !== undefined) desc.setDensity(props.density)
    if (props.mass !== undefined) desc.setMass(props.mass)

    let collider: RAPIER.Collider | null = rigidBody.addCollider(desc)

    onBeforeUnmount(() => {
      if (collider) {
        rigidBody.removeCollider(collider)
        collider = null
      }
    })

    return () => null
  },
})
