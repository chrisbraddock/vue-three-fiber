import { defineFiberPlugin, withPluginOptions } from '@xperimntl/vue-threejs'
import { RAPIER_DEFAULTS, type RapierPluginOptions } from './context'

export const rapierFiberPlugin = defineFiberPlugin<RapierPluginOptions | void>({
  name: '@xperimntl/vue-threejs-rapier',
  setup(ctx, options) {
    if (options) {
      ctx.provide(RAPIER_DEFAULTS, options)
    }
  },
})

export function createRapierPlugin(options?: RapierPluginOptions) {
  return withPluginOptions(rapierFiberPlugin, options)
}
