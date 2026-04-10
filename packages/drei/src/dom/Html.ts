import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  Teleport,
  watch,
  type CSSProperties,
  type PropType,
} from 'vue'
import { useThree, useFrame } from '@xperimntl/vue-threejs'
import * as THREE from 'three'

const v1 = new THREE.Vector3()
const v2 = new THREE.Vector3()

function objectWorldPosition(object: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
  object.updateWorldMatrix(true, false)
  out.setFromMatrixPosition(object.matrixWorld)
  return out
}

export const Html = defineComponent({
  name: 'DreiHtml',
  props: {
    position: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: () => [0, 0, 0],
    },
    center: { type: Boolean, default: false },
    distanceFactor: { type: Number, default: undefined },
    zIndexRange: {
      type: Array as unknown as PropType<[number, number]>,
      default: () => [16777271, 0],
    },
    portal: {
      type: Object as PropType<HTMLElement>,
      default: undefined,
    },
    transform: { type: Boolean, default: false },
    sprite: { type: Boolean, default: false },
    occlude: {
      type: [Boolean, Array] as PropType<boolean | THREE.Object3D[]>,
      default: false,
    },
    style: {
      type: Object as PropType<CSSProperties>,
      default: undefined,
    },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const gl = useThree((state) => state.gl)
    const camera = useThree((state) => state.camera)
    const size = useThree((state) => state.size)

    const portalDiv = ref<HTMLDivElement | null>(null)
    const groupObject = shallowRef<THREE.Group | null>(null)
    const isVisible = ref(true)

    // Create the portal div for DOM content
    onMounted(() => {
      const target = props.portal ?? gl.value?.domElement?.parentElement
      if (!target) return

      const el = document.createElement('div')
      el.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
      `
      target.appendChild(el)
      portalDiv.value = el
    })

    onBeforeUnmount(() => {
      if (portalDiv.value) {
        portalDiv.value.remove()
        portalDiv.value = null
      }
    })

    // Update CSS transform on each frame
    useFrame(() => {
      if (!portalDiv.value || !camera.value || !size.value) return

      const group = groupObject.value
      if (!group) return

      // Get world position
      objectWorldPosition(group, v1)

      // Project to NDC
      v2.copy(v1).project(camera.value)

      // Check if behind camera
      const isBehind = v2.z > 1
      if (isBehind) {
        if (isVisible.value) {
          isVisible.value = false
          portalDiv.value.style.display = 'none'
        }
        return
      }

      if (!isVisible.value) {
        isVisible.value = true
        portalDiv.value.style.display = ''
      }

      // Convert NDC to screen coordinates
      const x = (v2.x * 0.5 + 0.5) * size.value.width
      const y = (v2.y * -0.5 + 0.5) * size.value.height

      // Calculate scale factor based on distance
      let scaleFactor = 1
      if (props.distanceFactor !== undefined) {
        const objectDistance = v1.distanceTo(camera.value.position)
        scaleFactor = props.distanceFactor / objectDistance
      }

      // Calculate z-index based on depth
      const [zMax, zMin] = props.zIndexRange
      const zIndex = Math.round(THREE.MathUtils.lerp(zMax, zMin, THREE.MathUtils.clamp(v2.z * 0.5 + 0.5, 0, 1)))

      if (props.transform) {
        // CSS3D transform mode
        const fov = (camera.value as THREE.PerspectiveCamera).fov
        const cameraDist = size.value.height / (2 * Math.tan((fov * Math.PI) / 360))
        portalDiv.value.style.transform = `
          translate3d(${x}px, ${y}px, 0)
          scale(${scaleFactor})
        `
        portalDiv.value.style.perspective = `${cameraDist}px`
      } else {
        portalDiv.value.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scaleFactor})`
      }

      portalDiv.value.style.zIndex = String(zIndex)

      // Center the content if requested
      if (props.center) {
        portalDiv.value.style.display = 'flex'
        portalDiv.value.style.justifyContent = 'center'
        portalDiv.value.style.alignItems = 'center'
      }
    })

    return () => {
      const children: any[] = []

      // Render the Three.js group to track position
      children.push(
        h('group', {
          position: props.position,
          ref: (instance: any) => {
            if (instance && instance.object) {
              groupObject.value = instance.object
            } else if (instance instanceof THREE.Group) {
              groupObject.value = instance
            }
          },
        }),
      )

      // Render the HTML content via Teleport
      if (portalDiv.value) {
        children.push(
          h(Teleport, { to: portalDiv.value }, [
            h(
              'div',
              {
                class: props.className,
                style: {
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  pointerEvents: 'auto',
                  ...props.style,
                },
              },
              slots.default?.(),
            ),
          ]),
        )
      }

      return children
    }
  },
})
