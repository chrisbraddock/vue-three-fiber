import { defineComponent, inject, watch, onBeforeUnmount } from 'vue'
import { DepthOfFieldEffect } from 'postprocessing'
import { useThree } from '@xperimntl/vue-threejs'
import { COMPOSER_CONTEXT } from '../context'

export const DepthOfField = defineComponent({
  name: 'DepthOfField',
  props: {
    focusDistance: { type: Number, default: 0 },
    focalLength: { type: Number, default: 0.1 },
    bokehScale: { type: Number, default: 2 },
  },
  setup(props) {
    const composerCtx = inject(COMPOSER_CONTEXT)
    if (!composerCtx) {
      throw new Error('DepthOfField must be a child of EffectComposer')
    }

    const state = useThree()
    const { camera } = state.value

    const effect = new DepthOfFieldEffect(camera, {
      focusDistance: props.focusDistance,
      focalLength: props.focalLength,
      bokehScale: props.bokehScale,
    })

    const removeEffect = composerCtx.addEffect(effect, 0)

    watch(
      () => props.focusDistance,
      (value) => {
        effect.cocMaterial.focusDistance = value
      },
    )

    watch(
      () => props.focalLength,
      (value) => {
        effect.cocMaterial.focalLength = value
      },
    )

    watch(
      () => props.bokehScale,
      (value) => {
        effect.bokehScale = value
      },
    )

    onBeforeUnmount(() => {
      removeEffect()
      effect.dispose()
    })

    return () => null
  },
})
