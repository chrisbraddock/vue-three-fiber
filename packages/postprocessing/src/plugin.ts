import { defineFiberPlugin, withPluginOptions } from '@xperimntl/vue-threejs'
import { POSTPROCESSING_DEFAULTS, type PostprocessingDefaults } from './context'

export interface PostprocessingPluginOptions {
  multisampling?: number
  resolutionScale?: number
  enabled?: boolean
}

export const postprocessingFiberPlugin = defineFiberPlugin<PostprocessingPluginOptions | void>({
  name: '@xperimntl/vue-threejs-postprocessing',
  setup(ctx, options) {
    if (options) {
      ctx.provide(POSTPROCESSING_DEFAULTS, options satisfies PostprocessingDefaults)
    }
  },
})

export function createPostprocessingPlugin(options?: PostprocessingPluginOptions) {
  return withPluginOptions(postprocessingFiberPlugin, options)
}
