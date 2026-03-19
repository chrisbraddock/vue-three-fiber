import { defineComponent, h, nextTick, onMounted, shallowRef, watch, type PropType } from 'vue'
import * as THREE from 'three'

export const Center = defineComponent({
  name: 'DreiCenter',
  props: {
    top: { type: Boolean, default: false },
    right: { type: Boolean, default: false },
    bottom: { type: Boolean, default: false },
    left: { type: Boolean, default: false },
    front: { type: Boolean, default: false },
    back: { type: Boolean, default: false },
    precise: { type: Boolean, default: false },
    disableX: { type: Boolean, default: false },
    disableY: { type: Boolean, default: false },
    disableZ: { type: Boolean, default: false },
    position: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
  },
  emits: ['centered'],
  setup(props, { slots, emit }) {
    const outerGroup = shallowRef<THREE.Group | null>(null)
    const innerGroup = shallowRef<THREE.Group | null>(null)

    function computeCenter() {
      const inner = innerGroup.value
      const outer = outerGroup.value
      if (!inner || !outer) return

      // Compute bounding box of children
      const box = new THREE.Box3()
      if (props.precise) {
        // Force world matrix update for precise measurement
        inner.updateWorldMatrix(true, true)
      }
      box.setFromObject(inner)

      if (box.isEmpty()) return

      const center = new THREE.Vector3()
      const size = new THREE.Vector3()
      box.getCenter(center)
      box.getSize(size)

      const offset = new THREE.Vector3()

      // X axis
      if (!props.disableX) {
        if (props.left) {
          offset.x = -box.min.x
        } else if (props.right) {
          offset.x = -box.max.x
        } else {
          offset.x = -center.x
        }
      }

      // Y axis
      if (!props.disableY) {
        if (props.top) {
          offset.y = -box.max.y
        } else if (props.bottom) {
          offset.y = -box.min.y
        } else {
          offset.y = -center.y
        }
      }

      // Z axis
      if (!props.disableZ) {
        if (props.front) {
          offset.z = -box.min.z
        } else if (props.back) {
          offset.z = -box.max.z
        } else {
          offset.z = -center.z
        }
      }

      inner.position.copy(offset)
      emit('centered', { box, size, center, offset })
    }

    onMounted(() => {
      nextTick(() => {
        computeCenter()
      })
    })

    // Recompute when alignment props change
    watch(
      () => [
        props.top,
        props.right,
        props.bottom,
        props.left,
        props.front,
        props.back,
        props.disableX,
        props.disableY,
        props.disableZ,
        props.precise,
      ],
      () => {
        nextTick(() => computeCenter())
      },
    )

    return () => {
      const outerProps: Record<string, unknown> = {
        ref: (instance: any) => {
          if (instance && instance.object) {
            outerGroup.value = instance.object
          } else if (instance instanceof THREE.Group) {
            outerGroup.value = instance
          }
        },
      }

      if (props.position) outerProps.position = props.position

      return h('group', outerProps, [
        h(
          'group',
          {
            ref: (instance: any) => {
              if (instance && instance.object) {
                innerGroup.value = instance.object
              } else if (instance instanceof THREE.Group) {
                innerGroup.value = instance
              }
            },
          },
          slots.default?.(),
        ),
      ])
    }
  },
})
