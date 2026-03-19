import type { InjectionKey, ShallowRef } from 'vue'
import type { EffectComposer, Effect } from 'postprocessing'

export interface ComposerContext {
  /** Register an effect with the composer. Returns a removal function. */
  addEffect(effect: Effect, priority: number): () => void
  /** Remove a previously registered effect from the composer. */
  removeEffect(effect: Effect): void
  /** The underlying EffectComposer instance. */
  composer: ShallowRef<EffectComposer | null>
}

/** Injection key for the EffectComposer context. */
export const COMPOSER_CONTEXT: InjectionKey<ComposerContext> = Symbol('v3f-composer-context')

export interface PostprocessingDefaults {
  multisampling?: number
  resolutionScale?: number
  enabled?: boolean
}

/** Injection key for plugin-level defaults. */
export const POSTPROCESSING_DEFAULTS: InjectionKey<PostprocessingDefaults> = Symbol('v3f-postprocessing-defaults')
