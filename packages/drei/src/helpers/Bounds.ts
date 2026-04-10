import { defineComponent, h, nextTick, onMounted, shallowRef, watch, type PropType } from 'vue'
import { useThree, useFrame } from '@xperimntl/vue-threejs'
import * as THREE from 'three'

const _box = new THREE.Box3()
const _center = new THREE.Vector3()
const _sphere = new THREE.Sphere()
const _targetPosition = new THREE.Vector3()
const _currentPosition = new THREE.Vector3()

function isOrthographic(camera: THREE.Camera): camera is THREE.OrthographicCamera {
  return 'isOrthographicCamera' in camera && (camera as THREE.OrthographicCamera).isOrthographicCamera === true
}

export const Bounds = defineComponent({
  name: 'DreiBounds',
  props: {
    fit: { type: Boolean, default: false },
    clip: { type: Boolean, default: false },
    margin: { type: Number, default: 1.2 },
    observe: { type: Boolean, default: false },
    damping: { type: Number, default: 6 },
    position: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const camera = useThree((state) => state.camera)
    const size = useThree((state) => state.size)
    const groupRef = shallowRef<THREE.Group | null>(null)
    const animating = shallowRef(false)

    function fitCamera() {
      const group = groupRef.value
      const cam = camera.value
      if (!group || !cam) return

      // Compute bounding box
      _box.setFromObject(group)
      if (_box.isEmpty()) return

      _box.getCenter(_center)
      _box.getBoundingSphere(_sphere)

      const radius = _sphere.radius * props.margin

      if (isOrthographic(cam)) {
        // For orthographic cameras, adjust zoom
        const maxSize = Math.max(_box.max.x - _box.min.x, _box.max.y - _box.min.y)
        const width = size.value.width
        const height = size.value.height
        const aspect = width / height
        const zoom = Math.min(width / (maxSize * props.margin), height / (maxSize * props.margin))
        cam.zoom = zoom
        cam.updateProjectionMatrix()
        _targetPosition.copy(_center)
        _targetPosition.z = cam.position.z
      } else {
        // For perspective cameras, compute distance
        const fov = ((cam as THREE.PerspectiveCamera).fov * Math.PI) / 180
        const distance = radius / Math.sin(fov / 2)
        const direction = cam.position.clone().sub(_center).normalize()
        _targetPosition.copy(_center).add(direction.multiplyScalar(distance))
      }

      if (props.damping > 0) {
        animating.value = true
      } else {
        cam.position.copy(_targetPosition)
        cam.lookAt(_center)
        cam.updateProjectionMatrix()

        if (props.clip) {
          cam.near = radius / 100
          cam.far = radius * 100
          cam.updateProjectionMatrix()
        }
      }
    }

    // Animate camera when damping is enabled
    useFrame((_, delta) => {
      if (!animating.value || props.damping <= 0) return

      const cam = camera.value
      if (!cam) return

      const t = 1 - Math.exp(-props.damping * delta)
      _currentPosition.copy(cam.position)
      _currentPosition.lerp(_targetPosition, t)
      cam.position.copy(_currentPosition)
      cam.lookAt(_center)
      cam.updateProjectionMatrix()

      // Stop animating when close enough
      if (cam.position.distanceTo(_targetPosition) < 0.001) {
        cam.position.copy(_targetPosition)
        cam.lookAt(_center)
        cam.updateProjectionMatrix()
        animating.value = false

        if (props.clip) {
          const group = groupRef.value
          if (group) {
            _box.setFromObject(group)
            _box.getBoundingSphere(_sphere)
            const radius = _sphere.radius * props.margin
            cam.near = radius / 100
            cam.far = radius * 100
            cam.updateProjectionMatrix()
          }
        }
      }
    })

    // Fit on mount if fit prop is true
    onMounted(() => {
      if (props.fit) {
        nextTick(() => fitCamera())
      }
    })

    // Refit when fit or clip props change
    watch(
      () => [props.fit, props.clip],
      ([fit]) => {
        if (fit) {
          nextTick(() => fitCamera())
        }
      },
    )

    // Observe children changes if requested
    watch(
      () => props.observe,
      (observe) => {
        if (observe && props.fit) {
          nextTick(() => fitCamera())
        }
      },
    )

    return () => {
      const groupProps: Record<string, unknown> = {
        ref: (instance: any) => {
          if (instance && instance.object) {
            groupRef.value = instance.object
          } else if (instance instanceof THREE.Group) {
            groupRef.value = instance
          }
        },
      }

      if (props.position) groupProps.position = props.position

      return h('group', groupProps, slots.default?.())
    }
  },
})
