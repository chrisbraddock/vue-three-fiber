import { defineFiberPlugin, withPluginOptions } from '@xperimntl/vue-threejs'
import type { InjectionKey } from 'vue'

export interface DreiPluginOptions {
  dracoPath?: string
  environmentPath?: string
}

export const DREI_DEFAULTS: InjectionKey<DreiPluginOptions> = Symbol('drei-defaults')

export const dreiFiberPlugin = defineFiberPlugin<DreiPluginOptions | void>({
  name: '@xperimntl/vue-threejs-drei',
  setup(ctx, options) {
    if (options) {
      ctx.provide(DREI_DEFAULTS, options)
    }
  },
})

export function createDreiPlugin(options?: DreiPluginOptions) {
  return withPluginOptions(dreiFiberPlugin, options)
}
