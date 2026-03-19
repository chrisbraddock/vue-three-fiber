import type { App, InjectionKey } from 'vue'
import type { FiberPluginEntry, ResolvedFiberPluginEntry } from './types'
import { normalizeEntry } from './runtime'

// ---------------------------------------------------------------------------
// App-level plugin registry
// ---------------------------------------------------------------------------

export interface FiberAppPluginRegistry {
  entries: ResolvedFiberPluginEntry[]
}

/** Injection key for the app-level plugin registry */
export const FIBER_APP_PLUGIN_REGISTRY: InjectionKey<FiberAppPluginRegistry> = Symbol('v3f-plugin-registry')

const registries = new WeakMap<App, FiberAppPluginRegistry>()

/** Get or create the plugin registry for an app */
export function ensureFiberPluginRegistry(app: App): FiberAppPluginRegistry {
  let registry = registries.get(app)
  if (!registry) {
    registry = { entries: [] }
    registries.set(app, registry)
    app.provide(FIBER_APP_PLUGIN_REGISTRY, registry)
  }
  return registry
}

/** Register a plugin entry at the app level */
export function registerFiberPlugin(app: App, entry: FiberPluginEntry): void {
  const registry = ensureFiberPluginRegistry(app)
  registry.entries.push(normalizeEntry(entry))
}
