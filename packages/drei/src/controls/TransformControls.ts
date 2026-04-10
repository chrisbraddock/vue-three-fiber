import { defineComponent, onBeforeUnmount, shallowRef, watch, type PropType } from 'vue'
import { useThree } from '@xperimntl/vue-threejs'
import { TransformControls as TransformControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

export const TransformControls = defineComponent({
  name: 'DreiTransformControls',
  props: {
    object: {
      type: Object as PropType<THREE.Object3D>,
      required: true,
    },
    mode: {
      type: String as PropType<'translate' | 'rotate' | 'scale'>,
      default: 'translate',
    },
    space: {
      type: String as PropType<'world' | 'local'>,
      default: 'world',
    },
    size: { type: Number, default: 1 },
    showX: { type: Boolean, default: true },
    showY: { type: Boolean, default: true },
    showZ: { type: Boolean, default: true },
    enabled: { type: Boolean, default: true },
  },
  emits: ['change', 'dragging-changed', 'objectChange'],
  setup(props, { emit }) {
    const camera = useThree((state) => state.camera)
    const gl = useThree((state) => state.gl)
    const scene = useThree((state) => state.scene)
    const state = useThree()
    const controls = shallowRef<TransformControlsImpl | null>(null)

    watch(
      [camera, gl, scene, () => props.object],
      ([cam, renderer, scn, obj]) => {
        if (!cam || !renderer || !scn || !obj) return

        // Dispose previous controls
        if (controls.value) {
          scn.remove(controls.value as unknown as THREE.Object3D)
          controls.value.dispose()
        }

        const ctrl = new TransformControlsImpl(
          cam as THREE.PerspectiveCamera | THREE.OrthographicCamera,
          renderer.domElement,
        )

        ctrl.setMode(props.mode)
        ctrl.setSpace(props.space)
        ctrl.setSize(props.size)
        ctrl.showX = props.showX
        ctrl.showY = props.showY
        ctrl.showZ = props.showZ
        ctrl.enabled = props.enabled
        ctrl.attach(obj)

        const onChange = () => emit('change')
        const onObjectChange = () => emit('objectChange')
        const onDraggingChanged = (event: { value: boolean }) => {
          emit('dragging-changed', event.value)
          // Disable orbit controls during drag
          const currentControls = state.value.controls
          if (currentControls && 'enabled' in currentControls) {
            ;(currentControls as { enabled: boolean }).enabled = !event.value
          }
        }

        ctrl.addEventListener('change', onChange)
        ctrl.addEventListener('objectChange', onObjectChange)
        ctrl.addEventListener('dragging-changed', onDraggingChanged as any)

        scn.add(ctrl as unknown as THREE.Object3D)
        controls.value = ctrl
      },
      { immediate: true },
    )

    watch(
      () => props.mode,
      (val) => controls.value?.setMode(val),
    )
    watch(
      () => props.space,
      (val) => controls.value?.setSpace(val),
    )
    watch(
      () => props.size,
      (val) => controls.value?.setSize(val),
    )
    watch(
      () => props.showX,
      (val) => {
        if (controls.value) controls.value.showX = val
      },
    )
    watch(
      () => props.showY,
      (val) => {
        if (controls.value) controls.value.showY = val
      },
    )
    watch(
      () => props.showZ,
      (val) => {
        if (controls.value) controls.value.showZ = val
      },
    )
    watch(
      () => props.enabled,
      (val) => {
        if (controls.value) controls.value.enabled = val
      },
    )

    onBeforeUnmount(() => {
      if (controls.value) {
        const scn = scene.value
        if (scn) {
          scn.remove(controls.value as unknown as THREE.Object3D)
        }
        controls.value.detach()
        controls.value.dispose()
        controls.value = null
      }
    })

    return () => null
  },
})
