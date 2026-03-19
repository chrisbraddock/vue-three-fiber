import { defineComponent, inject, watch, onBeforeUnmount, type PropType } from 'vue'
import { ToneMappingEffect, ToneMappingMode } from 'postprocessing'
import { COMPOSER_CONTEXT } from '../context'

export const ToneMapping = defineComponent({
  name: 'ToneMapping',
  props: {
    mode: {
      type: Number as PropType<ToneMappingMode>,
      default: ToneMappingMode.AGX,
    },
    resolution: { type: Number, default: 256 },
    whitePoint: { type: Number, default: 4 },
    middleGrey: { type: Number, default: 0.6 },
  },
  setup(props) {
    const composerCtx = inject(COMPOSER_CONTEXT)
    if (!composerCtx) {
      throw new Error('ToneMapping must be a child of EffectComposer')
    }

    const effect = new ToneMappingEffect({
      mode: props.mode,
      resolution: props.resolution,
      whitePoint: props.whitePoint,
      middleGrey: props.middleGrey,
    })

    const removeEffect = composerCtx.addEffect(effect, 0)

    watch(
      () => props.mode,
      (value) => {
        effect.mode = value
      },
    )

    watch(
      () => props.resolution,
      (value) => {
        effect.resolution.width = value
        effect.resolution.height = value
      },
    )

    watch(
      () => props.whitePoint,
      (value) => {
        effect.whitePoint = value
      },
    )

    watch(
      () => props.middleGrey,
      (value) => {
        effect.middleGrey = value
      },
    )

    onBeforeUnmount(() => {
      removeEffect()
      effect.dispose()
    })

    return () => null
  },
})
