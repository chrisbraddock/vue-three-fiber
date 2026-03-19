import type { AppContext, InjectionKey } from 'vue'
import type { RootStore } from '../core/store'
import type { Catalogue } from '../core/reconciler'

// ---------------------------------------------------------------------------
// Plugin context — passed to plugin.setup()
// ---------------------------------------------------------------------------

export interface FiberPluginContext {
  /** The Vue app context, if available */
  appContext: AppContext | null
  /** The canvas element this root is bound to */
  canvas: HTMLCanvasElement | OffscreenCanvas
  /** The root store (Zustand) */
  store: RootStore
  /** Register Three.js constructors into the catalogue */
  extend(objects: Catalogue): void
  /** Provide a value into the plugin provider subtree */
  provide<T>(key: InjectionKey<T> | string | symbol, value: T): void
  /** Register a cleanup handler (runs on root unmount, reverse order) */
  onDispose(fn: () => void): void
  /** Request re-render frames */
  invalidate(frames?: number): void
  /** Get current root state snapshot */
  getState(): ReturnType<RootStore['getState']>
}

// ---------------------------------------------------------------------------
// Plugin definition — authored by plugin packages
// ---------------------------------------------------------------------------

export interface FiberPluginDefinition<TOptions = void> {
  /** Globally unique name, e.g. '@bluera/vue-threejs-drei' */
  name: string
  /** Names of plugins that must be set up before this one */
  requires?: readonly string[]
  /** Synchronous setup — may return an optional disposer */
  setup?: (ctx: FiberPluginContext, options: TOptions) => void | (() => void)
}

// ---------------------------------------------------------------------------
// Plugin entry forms — how users pass plugins to Canvas / root.render()
// ---------------------------------------------------------------------------

/** Bare definition (no options) */
type BareEntry<T = any> = FiberPluginDefinition<T>

/** Tuple form: [plugin, options] */
type TupleEntry<T = any> = [FiberPluginDefinition<T>, T]

/** Object form: { plugin, options, key? } — preferred for stable identity */
export interface ObjectEntry<T = any> {
  plugin: FiberPluginDefinition<T>
  options: T
  key?: string
}

export type FiberPluginEntry<T = any> = BareEntry<T> | TupleEntry<T> | ObjectEntry<T>

/** Normalized internal form after resolution */
export interface ResolvedFiberPluginEntry<T = any> {
  plugin: FiberPluginDefinition<T>
  options: T
  key?: string
}

// ---------------------------------------------------------------------------
// Root render options — extends the current { appContext } signature
// ---------------------------------------------------------------------------

export interface FiberRootRenderOptions {
  appContext?: AppContext | null
  plugins?: FiberPluginEntry[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Type-safe plugin definition helper */
export function defineFiberPlugin<TOptions = void>(
  definition: FiberPluginDefinition<TOptions>,
): FiberPluginDefinition<TOptions> {
  return definition
}

/** Create an object-form plugin entry with explicit key for stable identity */
export function withPluginOptions<TOptions>(
  plugin: FiberPluginDefinition<TOptions>,
  options: TOptions,
  key?: string,
): ObjectEntry<TOptions> {
  return { plugin, options, key }
}
