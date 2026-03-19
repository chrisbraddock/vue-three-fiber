import { defineComponent, inject, watch, onBeforeUnmount } from 'vue'
import { HueSaturationEffect } from 'postprocessing'
import { COMPOSER_CONTEXT } from '../context'

export const HueSaturation = defineComponent({
  name: 'HueSaturation',
  props: {
    hue: { type: Number, default: 0 },
    saturation: { type: Number, default: 0 },
  },
  setup(props) {
    const composerCtx = inject(COMPOSER_CONTEXT)
    if (!composerCtx) {
      throw new Error('HueSaturation must be a child of EffectComposer')
    }

    const effect = new HueSaturationEffect({
      hue: props.hue,
      saturation: props.saturation,
    })

    const removeEffect = composerCtx.addEffect(effect, 0)

    watch(
      () => props.hue,
      (value) => {
        effect.hue = value
      },
    )

    watch(
      () => props.saturation,
      (value) => {
        effect.saturation = value
      },
    )

    onBeforeUnmount(() => {
      removeEffect()
      effect.dispose()
    })

    return () => null
  },
})
