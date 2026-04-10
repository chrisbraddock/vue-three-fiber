import { defineComponent, h, type PropType } from 'vue'
import { extend } from '@xperimntl/vue-threejs'
// @ts-ignore - troika-three-text types may not be available
import { Text as TroikaText } from 'troika-three-text'

// Register TroikaText with the fiber catalogue so it can be rendered declaratively
const TroikaTextElement = extend(TroikaText)

export const Text = defineComponent({
  name: 'DreiText',
  props: {
    text: { type: String, default: '' },
    fontSize: { type: Number, default: 1 },
    color: {
      type: [String, Number] as PropType<string | number>,
      default: 'black',
    },
    maxWidth: { type: Number, default: undefined },
    lineHeight: { type: Number, default: undefined },
    letterSpacing: { type: Number, default: 0 },
    textAlign: {
      type: String as PropType<'left' | 'right' | 'center' | 'justify'>,
      default: 'left',
    },
    font: { type: String, default: undefined },
    anchorX: {
      type: [String, Number] as PropType<string | number>,
      default: 'center',
    },
    anchorY: {
      type: [String, Number] as PropType<string | number>,
      default: 'middle',
    },
    outlineWidth: { type: Number, default: undefined },
    outlineColor: {
      type: [String, Number] as PropType<string | number>,
      default: undefined,
    },
    outlineBlur: { type: Number, default: undefined },
    outlineOpacity: { type: Number, default: undefined },
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
      default: undefined,
    },
  },
  setup(props) {
    return () => {
      const troikaProps: Record<string, unknown> = {
        text: props.text,
        fontSize: props.fontSize,
        color: props.color,
        letterSpacing: props.letterSpacing,
        textAlign: props.textAlign,
        anchorX: props.anchorX,
        anchorY: props.anchorY,
      }

      if (props.maxWidth !== undefined) troikaProps.maxWidth = props.maxWidth
      if (props.lineHeight !== undefined) troikaProps.lineHeight = props.lineHeight
      if (props.font !== undefined) troikaProps.font = props.font
      if (props.outlineWidth !== undefined) troikaProps.outlineWidth = props.outlineWidth
      if (props.outlineColor !== undefined) troikaProps.outlineColor = props.outlineColor
      if (props.outlineBlur !== undefined) troikaProps.outlineBlur = props.outlineBlur
      if (props.outlineOpacity !== undefined) troikaProps.outlineOpacity = props.outlineOpacity
      if (props.position) troikaProps.position = props.position
      if (props.rotation) troikaProps.rotation = props.rotation
      if (props.scale !== undefined) troikaProps.scale = props.scale

      return h(TroikaTextElement, troikaProps)
    }
  },
})
