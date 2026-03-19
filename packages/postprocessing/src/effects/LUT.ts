import { defineComponent, inject, watch, onBeforeUnmount, type PropType } from 'vue'
import { LUT3DEffect } from 'postprocessing'
import type { Texture } from 'three'
import { COMPOSER_CONTEXT } from '../context'

export const LUT = defineComponent({
  name: 'LUT',
  props: {
    lut: { type: Object as PropType<Texture>, required: true },
    tetrahedralInterpolation: { type: Boolean, default: false },
  },
  setup(props) {
    const composerCtx = inject(COMPOSER_CONTEXT)
    if (!composerCtx) {
      throw new Error('LUT must be a child of EffectComposer')
    }

    const effect = new LUT3DEffect(props.lut, {
      tetrahedralInterpolation: props.tetrahedralInterpolation,
    })

    const removeEffect = composerCtx.addEffect(effect, 0)

    watch(
      () => props.lut,
      (value) => {
        effect.lut = value
      },
    )

    watch(
      () => props.tetrahedralInterpolation,
      (value) => {
        effect.tetrahedralInterpolation = value
      },
    )

    onBeforeUnmount(() => {
      removeEffect()
      effect.dispose()
    })

    return () => null
  },
})
