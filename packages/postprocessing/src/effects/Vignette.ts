import { defineComponent, inject, watch, onBeforeUnmount } from 'vue'
import { VignetteEffect } from 'postprocessing'
import { COMPOSER_CONTEXT } from '../context'

export const Vignette = defineComponent({
  name: 'Vignette',
  props: {
    offset: { type: Number, default: 0.5 },
    darkness: { type: Number, default: 0.5 },
  },
  setup(props) {
    const composerCtx = inject(COMPOSER_CONTEXT)
    if (!composerCtx) {
      throw new Error('Vignette must be a child of EffectComposer')
    }

    const effect = new VignetteEffect({
      offset: props.offset,
      darkness: props.darkness,
    })

    const removeEffect = composerCtx.addEffect(effect, 0)

    watch(
      () => props.offset,
      (value) => {
        effect.offset = value
      },
    )

    watch(
      () => props.darkness,
      (value) => {
        effect.darkness = value
      },
    )

    onBeforeUnmount(() => {
      removeEffect()
      effect.dispose()
    })

    return () => null
  },
})
