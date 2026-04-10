import { defineComponent, onBeforeUnmount, shallowRef, watch, type PropType } from 'vue'
import { useThree, useFrame } from '@xperimntl/vue-threejs'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

export const OrbitControls = defineComponent({
  name: 'DreiOrbitControls',
  props: {
    makeDefault: { type: Boolean, default: false },
    enableDamping: { type: Boolean, default: true },
    dampingFactor: { type: Number, default: 0.05 },
    autoRotate: { type: Boolean, default: false },
    autoRotateSpeed: { type: Number, default: 2 },
    enableZoom: { type: Boolean, default: true },
    enablePan: { type: Boolean, default: true },
    minDistance: { type: Number, default: undefined },
    maxDistance: { type: Number, default: undefined },
    minPolarAngle: { type: Number, default: 0 },
    maxPolarAngle: { type: Number, default: Math.PI },
    target: {
      type: [Array, Object] as PropType<[number, number, number] | THREE.Vector3>,
      default: undefined,
    },
  },
  emits: ['change', 'start', 'end'],
  setup(props, { emit }) {
    const camera = useThree((state) => state.camera)
    const gl = useThree((state) => state.gl)
    const state = useThree()
    const controls = shallowRef<OrbitControlsImpl | null>(null)

    watch(
      [camera, gl],
      ([cam, renderer]) => {
        if (!cam || !renderer) return

        // Dispose previous controls
        if (controls.value) {
          controls.value.dispose()
        }

        const ctrl = new OrbitControlsImpl(
          cam as THREE.PerspectiveCamera | THREE.OrthographicCamera,
          renderer.domElement,
        )
        ctrl.enableDamping = props.enableDamping
        ctrl.dampingFactor = props.dampingFactor
        ctrl.autoRotate = props.autoRotate
        ctrl.autoRotateSpeed = props.autoRotateSpeed
        ctrl.enableZoom = props.enableZoom
        ctrl.enablePan = props.enablePan
        if (props.minDistance !== undefined) ctrl.minDistance = props.minDistance
        if (props.maxDistance !== undefined) ctrl.maxDistance = props.maxDistance
        ctrl.minPolarAngle = props.minPolarAngle
        ctrl.maxPolarAngle = props.maxPolarAngle

        if (props.target) {
          if (Array.isArray(props.target)) {
            ctrl.target.set(props.target[0], props.target[1], props.target[2])
          } else {
            ctrl.target.copy(props.target)
          }
        }

        const onChange = () => emit('change')
        const onStart = () => emit('start')
        const onEnd = () => emit('end')
        ctrl.addEventListener('change', onChange)
        ctrl.addEventListener('start', onStart)
        ctrl.addEventListener('end', onEnd)

        controls.value = ctrl

        if (props.makeDefault) {
          state.value.set({ controls: ctrl as unknown as THREE.EventDispatcher })
        }
      },
      { immediate: true },
    )

    // Watch prop changes
    watch(
      () => props.enableDamping,
      (val) => {
        if (controls.value) controls.value.enableDamping = val
      },
    )
    watch(
      () => props.dampingFactor,
      (val) => {
        if (controls.value) controls.value.dampingFactor = val
      },
    )
    watch(
      () => props.autoRotate,
      (val) => {
        if (controls.value) controls.value.autoRotate = val
      },
    )
    watch(
      () => props.autoRotateSpeed,
      (val) => {
        if (controls.value) controls.value.autoRotateSpeed = val
      },
    )
    watch(
      () => props.enableZoom,
      (val) => {
        if (controls.value) controls.value.enableZoom = val
      },
    )
    watch(
      () => props.enablePan,
      (val) => {
        if (controls.value) controls.value.enablePan = val
      },
    )
    watch(
      () => props.minDistance,
      (val) => {
        if (controls.value && val !== undefined) controls.value.minDistance = val
      },
    )
    watch(
      () => props.maxDistance,
      (val) => {
        if (controls.value && val !== undefined) controls.value.maxDistance = val
      },
    )
    watch(
      () => props.minPolarAngle,
      (val) => {
        if (controls.value) controls.value.minPolarAngle = val
      },
    )
    watch(
      () => props.maxPolarAngle,
      (val) => {
        if (controls.value) controls.value.maxPolarAngle = val
      },
    )
    watch(
      () => props.target,
      (val) => {
        if (!controls.value || !val) return
        if (Array.isArray(val)) {
          controls.value.target.set(val[0], val[1], val[2])
        } else {
          controls.value.target.copy(val)
        }
      },
    )

    useFrame(() => {
      if (controls.value && (props.enableDamping || props.autoRotate)) {
        controls.value.update()
      }
    })

    onBeforeUnmount(() => {
      if (controls.value) {
        controls.value.dispose()
        controls.value = null
      }
    })

    return () => null
  },
})
