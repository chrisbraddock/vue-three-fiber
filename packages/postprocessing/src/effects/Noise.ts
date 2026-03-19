import { defineComponent, inject, watch, onBeforeUnmount, type PropType } from 'vue'
import { NoiseEffect, BlendFunction } from 'postprocessing'
import { COMPOSER_CONTEXT } from '../context'

export const Noise = defineComponent({
  name: 'Noise',
  props: {
    premultiply: { type: Boolean, default: false },
    blendFunction: {
      type: Number as PropType<BlendFunction>,
      default: BlendFunction.SCREEN,
    },
  },
  setup(props) {
    const composerCtx = inject(COMPOSER_CONTEXT)
    if (!composerCtx) {
      throw new Error('Noise must be a child of EffectComposer')
    }

    const effect = new NoiseEffect({
      premultiply: props.premultiply,
      blendFunction: props.blendFunction,
    })

    const removeEffect = composerCtx.addEffect(effect, 0)

    watch(
      () => props.premultiply,
      (value) => {
        effect.premultiply = value
      },
    )

    watch(
      () => props.blendFunction,
      (value) => {
        effect.blendMode.blendFunction = value
      },
    )

    onBeforeUnmount(() => {
      removeEffect()
      effect.dispose()
    })

    return () => null
  },
})
