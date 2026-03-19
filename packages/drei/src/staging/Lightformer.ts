import { defineComponent, h, type PropType } from 'vue'
import * as THREE from 'three'

const _color = new THREE.Color()

export const Lightformer = defineComponent({
  name: 'DreiLightformer',
  props: {
    form: {
      type: String as PropType<'rect' | 'circle' | 'ring'>,
      default: 'rect',
    },
    intensity: { type: Number, default: 1 },
    color: {
      type: [String, Number] as PropType<string | number>,
      default: 'white',
    },
    position: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
    rotation: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
    scale: {
      type: [Array, Number] as PropType<[number, number, number] | number>,
      default: 1,
    },
    target: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
  },
  setup(props) {
    function getGeometryElement() {
      switch (props.form) {
        case 'circle':
          return h('circleGeometry', { args: [1, 64] })
        case 'ring':
          return h('ringGeometry', { args: [0.5, 1, 64] })
        case 'rect':
        default:
          return h('planeGeometry', { args: [1, 1] })
      }
    }

    return () => {
      const meshProps: Record<string, unknown> = {}

      if (props.position) {
        meshProps.position = props.position
      }
      if (props.rotation) {
        meshProps.rotation = props.rotation
      }
      if (props.scale !== undefined) {
        meshProps.scale = typeof props.scale === 'number' ? [props.scale, props.scale, props.scale] : props.scale
      }

      // Scale color by intensity to produce HDR emission with toneMapped: false
      _color.set(props.color as THREE.ColorRepresentation)
      _color.multiplyScalar(props.intensity)

      return h('mesh', meshProps, [
        getGeometryElement(),
        h('meshBasicMaterial', {
          color: _color.clone(),
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      ])
    }
  },
})
