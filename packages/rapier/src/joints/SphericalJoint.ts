import { defineComponent, inject, onBeforeUnmount, watch, type PropType, type ShallowRef } from 'vue'
import type RAPIER from '@dimforge/rapier3d-compat'
import { PHYSICS_CONTEXT } from '../context'

export const SphericalJoint = defineComponent({
  name: 'SphericalJoint',
  props: {
    body1: {
      type: Object as PropType<ShallowRef<RAPIER.RigidBody>>,
      required: true,
    },
    body2: {
      type: Object as PropType<ShallowRef<RAPIER.RigidBody>>,
      required: true,
    },
    anchor1: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: () => [0, 0, 0],
    },
    anchor2: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: () => [0, 0, 0],
    },
  },
  setup(props) {
    const physics = inject(PHYSICS_CONTEXT)
    if (!physics) {
      throw new Error('@xperimntl/vue-threejs-rapier: <SphericalJoint> must be placed inside a <Physics> component')
    }

    const { world, rapier } = physics
    let joint: RAPIER.ImpulseJoint | null = null

    function createJoint() {
      if (!props.body1.value || !props.body2.value) return

      const jointData = rapier.JointData.spherical(
        { x: props.anchor1[0], y: props.anchor1[1], z: props.anchor1[2] },
        { x: props.anchor2[0], y: props.anchor2[1], z: props.anchor2[2] },
      )

      joint = world.value.createImpulseJoint(jointData, props.body1.value, props.body2.value, true)
    }

    function destroyJoint() {
      if (joint && world.value) {
        world.value.removeImpulseJoint(joint, true)
        joint = null
      }
    }

    watch(
      [() => props.body1.value, () => props.body2.value],
      () => {
        destroyJoint()
        createJoint()
      },
      { immediate: true },
    )

    onBeforeUnmount(() => {
      destroyJoint()
    })

    return () => null
  },
})
