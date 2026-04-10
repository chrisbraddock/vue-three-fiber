import { defineComponent, provide, shallowRef, watch, onBeforeUnmount, type PropType } from 'vue'
import { EffectComposer as PostprocessingEffectComposer, EffectPass, RenderPass, type Effect } from 'postprocessing'
import { useThree, useFrame } from '@xperimntl/vue-threejs'
import { COMPOSER_CONTEXT, type ComposerContext } from './context'

interface EffectEntry {
  effect: Effect
  priority: number
}

export const EffectComposer = defineComponent({
  name: 'EffectComposer',
  props: {
    enabled: { type: Boolean, default: true },
    multisampling: { type: Number, default: 8 },
    autoClear: { type: Boolean, default: true },
    resolutionScale: { type: Number, default: 1 },
    depthBuffer: { type: Boolean, default: true },
    stencilBuffer: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const state = useThree()
    const composerRef = shallowRef<PostprocessingEffectComposer | null>(null)

    // Ordered list of registered effects
    const effects: EffectEntry[] = []

    // Track the current EffectPass so we can dispose/replace it
    let currentEffectPass: EffectPass | null = null
    let currentRenderPass: RenderPass | null = null

    // Store the original autoClear value so we can restore on unmount
    let originalAutoClear: boolean | null = null

    function disposeComposer() {
      // Dispose composer
      if (composerRef.value) {
        composerRef.value.dispose()
        composerRef.value = null
      }

      currentEffectPass = null
      currentRenderPass = null
    }

    function createComposer() {
      const { gl, scene, camera } = state.value
      if (!gl || !scene || !camera) return null

      // Dispose previous composer if it exists
      disposeComposer()

      const composer = new PostprocessingEffectComposer(gl, {
        multisampling: props.multisampling > 0 ? props.multisampling : 0,
        depthBuffer: props.depthBuffer,
        stencilBuffer: props.stencilBuffer,
      })

      // Create render pass
      currentRenderPass = new RenderPass(scene, camera)
      composer.addPass(currentRenderPass)

      // Create effect pass if we already have effects
      if (effects.length > 0) {
        const sortedEffects = [...effects].sort((a, b) => a.priority - b.priority).map((e) => e.effect)
        currentEffectPass = new EffectPass(camera, ...sortedEffects)
        composer.addPass(currentEffectPass)
      }

      composerRef.value = composer

      // Disable default renderer autoClear
      if (originalAutoClear === null) {
        originalAutoClear = gl.autoClear
      }
      gl.autoClear = false

      return composer
    }

    function rebuildEffectPass() {
      const composer = composerRef.value
      if (!composer) return

      const { camera } = state.value

      // Remove old effect pass
      if (currentEffectPass) {
        composer.removePass(currentEffectPass)
        currentEffectPass.dispose()
        currentEffectPass = null
      }

      // Build new effect pass with current effects
      if (effects.length > 0) {
        const sortedEffects = [...effects].sort((a, b) => a.priority - b.priority).map((e) => e.effect)
        currentEffectPass = new EffectPass(camera, ...sortedEffects)
        composer.addPass(currentEffectPass)
      }
    }

    watch(
      () => [state.value.gl, state.value.scene, state.value.camera] as const,
      ([gl, scene, camera]) => {
        if (!gl || !scene || !camera) {
          disposeComposer()
          return
        }

        createComposer()
      },
      { immediate: true },
    )

    // Provide the context so child effect components can register
    const composerContext: ComposerContext = {
      addEffect(effect: Effect, priority: number = 0) {
        effects.push({ effect, priority })
        rebuildEffectPass()
        return () => composerContext.removeEffect(effect)
      },
      removeEffect(effect: Effect) {
        const index = effects.findIndex((e) => e.effect === effect)
        if (index !== -1) {
          effects.splice(index, 1)
          rebuildEffectPass()
        }
      },
      composer: composerRef,
    }

    provide(COMPOSER_CONTEXT, composerContext)

    // Watch for camera changes — update render pass and effect pass
    watch(
      () => state.value.camera,
      (camera) => {
        if (currentRenderPass) {
          currentRenderPass.mainCamera = camera
        }
        if (currentEffectPass) {
          currentEffectPass.mainCamera = camera
        }
      },
    )

    // Watch for size changes — update composer size
    watch(
      () => state.value.size,
      (size) => {
        const composer = composerRef.value
        if (composer) {
          composer.setSize(size.width, size.height, false)
        }
      },
    )

    // Watch for multisampling changes — recreate composer
    watch(
      () => props.multisampling,
      () => {
        if (createComposer()) rebuildEffectPass()
      },
    )

    // Use useFrame with priority 1 to take over rendering
    useFrame((_frameState, delta) => {
      if (!props.enabled || !composerRef.value) return
      composerRef.value.render(delta)
    }, 1)

    // Cleanup on unmount
    onBeforeUnmount(() => {
      const { gl } = state.value

      // Restore original autoClear
      if (originalAutoClear !== null) {
        gl.autoClear = originalAutoClear
      }

      disposeComposer()
      effects.length = 0
    })

    return () => slots.default?.()
  },
})
