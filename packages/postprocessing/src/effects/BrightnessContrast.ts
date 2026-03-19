import { defineComponent, inject, watch, onBeforeUnmount } from 'vue'
import { BrightnessContrastEffect } from 'postprocessing'
import { COMPOSER_CONTEXT } from '../context'

export const BrightnessContrast = defineComponent({
  name: 'BrightnessContrast',
  props: {
    brightness: { type: Number, default: 0 },
    contrast: { type: Number, default: 0 },
  },
  setup(props) {
    const composerCtx = inject(COMPOSER_CONTEXT)
    if (!composerCtx) {
      throw new Error('BrightnessContrast must be a child of EffectComposer')
    }

    const effect = new BrightnessContrastEffect({
      brightness: props.brightness,
      contrast: props.contrast,
    })

    const removeEffect = composerCtx.addEffect(effect, 0)

    watch(
      () => props.brightness,
      (value) => {
        effect.brightness = value
      },
    )

    watch(
      () => props.contrast,
      (value) => {
        effect.contrast = value
      },
    )

    onBeforeUnmount(() => {
      removeEffect()
      effect.dispose()
    })

    return () => null
  },
})
