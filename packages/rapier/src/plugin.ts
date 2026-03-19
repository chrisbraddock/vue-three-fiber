import { defineFiberPlugin, withPluginOptions } from '@bluera/vue-threejs'
import { RAPIER_DEFAULTS, type RapierPluginOptions } from './context'

export const rapierFiberPlugin = defineFiberPlugin<RapierPluginOptions | void>({
  name: '@bluera/vue-threejs-rapier',
  setup(ctx, options) {
    if (options) {
      ctx.provide(RAPIER_DEFAULTS, options)
    }
  },
})

export function createRapierPlugin(options?: RapierPluginOptions) {
  return withPluginOptions(rapierFiberPlugin, options)
}
