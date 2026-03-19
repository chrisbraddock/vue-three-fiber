import { defineComponent, inject, watch, onBeforeUnmount } from 'vue'
import { BloomEffect, KernelSize } from 'postprocessing'
import { COMPOSER_CONTEXT } from '../context'

export const Bloom = defineComponent({
  name: 'Bloom',
  props: {
    intensity: { type: Number, default: 1 },
    luminanceThreshold: { type: Number, default: 0.9 },
    luminanceSmoothing: { type: Number, default: 0.025 },
    mipmapBlur: { type: Boolean, default: true },
  },
  setup(props) {
    const composerCtx = inject(COMPOSER_CONTEXT)
    if (!composerCtx) {
      throw new Error('Bloom must be a child of EffectComposer')
    }

    const effect = new BloomEffect({
      intensity: props.intensity,
      luminanceThreshold: props.luminanceThreshold,
      luminanceSmoothing: props.luminanceSmoothing,
      mipmapBlur: props.mipmapBlur,
    })

    const removeEffect = composerCtx.addEffect(effect, 0)

    watch(
      () => props.intensity,
      (value) => {
        effect.intensity = value
      },
    )

    watch(
      () => props.luminanceThreshold,
      (value) => {
        effect.luminanceMaterial.threshold = value
      },
    )

    watch(
      () => props.luminanceSmoothing,
      (value) => {
        effect.luminanceMaterial.smoothing = value
      },
    )

    watch(
      () => props.mipmapBlur,
      (value) => {
        effect.mipmapBlurPass.enabled = value
      },
    )

    onBeforeUnmount(() => {
      removeEffect()
      effect.dispose()
    })

    return () => null
  },
})
