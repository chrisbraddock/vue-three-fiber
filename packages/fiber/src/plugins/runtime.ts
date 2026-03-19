import type { AppContext, InjectionKey } from 'vue'
import type { RootStore } from '../core/store'
import { extend } from '../core/reconciler'
import { invalidate as loopInvalidate } from '../core/loop'
import type {
  FiberPluginContext,
  FiberPluginEntry,
  FiberPluginDefinition,
  ResolvedFiberPluginEntry,
  ObjectEntry,
} from './types'

// ---------------------------------------------------------------------------
// Entry normalization
// ---------------------------------------------------------------------------

function isObjectEntry(entry: FiberPluginEntry): entry is ObjectEntry {
  return entry != null && typeof entry === 'object' && !Array.isArray(entry) && 'plugin' in entry
}

function isDefinition(entry: FiberPluginEntry): entry is FiberPluginDefinition {
  return entry != null && typeof entry === 'object' && !Array.isArray(entry) && 'name' in entry && !('plugin' in entry)
}

/** Normalize any entry form to the resolved object form */
export function normalizeEntry(entry: FiberPluginEntry): ResolvedFiberPluginEntry {
  if (Array.isArray(entry)) {
    return { plugin: entry[0], options: entry[1] }
  }
  if (isObjectEntry(entry)) {
    return { plugin: entry.plugin, options: entry.options, key: entry.key }
  }
  if (isDefinition(entry)) {
    return { plugin: entry, options: undefined as never }
  }
  throw new Error('V3F: Invalid plugin entry')
}

// ---------------------------------------------------------------------------
// Merge & dedupe
// ---------------------------------------------------------------------------

/** Merge app-level and canvas-level entries, dedupe by name (last wins) */
export function mergePluginEntries(
  appEntries: ResolvedFiberPluginEntry[],
  localEntries: FiberPluginEntry[],
  inheritPlugins: boolean,
): ResolvedFiberPluginEntry[] {
  const map = new Map<string, ResolvedFiberPluginEntry>()

  if (inheritPlugins) {
    for (const entry of appEntries) {
      map.set(entry.plugin.name, entry)
    }
  }

  for (const raw of localEntries) {
    const entry = normalizeEntry(raw)
    map.set(entry.plugin.name, entry)
  }

  return Array.from(map.values())
}

// ---------------------------------------------------------------------------
// Topological sort by requires
// ---------------------------------------------------------------------------

function topologicalSort(entries: ResolvedFiberPluginEntry[]): ResolvedFiberPluginEntry[] {
  const nameToEntry = new Map<string, ResolvedFiberPluginEntry>()
  for (const entry of entries) nameToEntry.set(entry.plugin.name, entry)

  const visited = new Set<string>()
  const visiting = new Set<string>()
  const sorted: ResolvedFiberPluginEntry[] = []

  function visit(name: string, trail: string[]) {
    if (visited.has(name)) return
    if (visiting.has(name)) {
      throw new Error(`[${name}] Cyclic plugin dependency: ${[...trail, name].join(' -> ')}`)
    }

    const entry = nameToEntry.get(name)
    if (!entry) return

    visiting.add(name)

    for (const dep of entry.plugin.requires ?? []) {
      if (dep === name) {
        throw new Error(`[${name}] Plugin cannot depend on itself`)
      }
      if (!nameToEntry.has(dep)) {
        throw new Error(`[${name}] Missing dependency "${dep}"`)
      }
      visit(dep, [...trail, name])
    }

    visiting.delete(name)
    visited.add(name)
    sorted.push(entry)
  }

  for (const entry of entries) {
    visit(entry.plugin.name, [])
  }

  return sorted
}

// ---------------------------------------------------------------------------
// Equality comparison
// ---------------------------------------------------------------------------

/** Compare two resolved plugin arrays for equality (order + identity) */
export function sameResolvedPluginEntries(a: ResolvedFiberPluginEntry[], b: ResolvedFiberPluginEntry[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].plugin.name !== b[i].plugin.name) return false
    if (a[i].key != null || b[i].key != null) {
      if (a[i].key !== b[i].key) return false
    }
    if (!Object.is(a[i].options, b[i].options)) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Plugin runtime
// ---------------------------------------------------------------------------

export interface PluginRuntime {
  /** Resolved + sorted plugin entries */
  entries: ResolvedFiberPluginEntry[]
  /** Values provided by plugins via ctx.provide() */
  provides: Map<InjectionKey<unknown> | string | symbol, unknown>
  /** Dispose all plugins (reverse order) */
  dispose(): void
}

export function createPluginRuntime(
  entries: ResolvedFiberPluginEntry[],
  appContext: AppContext | null,
  canvas: HTMLCanvasElement | OffscreenCanvas,
  store: RootStore,
): PluginRuntime {
  // Sort by dependency order
  const sorted = topologicalSort(entries)

  const provides = new Map<InjectionKey<unknown> | string | symbol, unknown>()
  const disposers: Array<{ pluginName: string; fn: () => void }> = []

  for (const entry of sorted) {
    const { plugin, options } = entry
    if (!plugin.setup) continue

    const ctx: FiberPluginContext = {
      appContext,
      canvas,
      store,
      extend(objects) {
        extend(objects)
      },
      provide(key, value) {
        provides.set(key, value)
      },
      onDispose(fn) {
        disposers.push({ pluginName: plugin.name, fn })
      },
      invalidate(frames) {
        loopInvalidate(store.getState(), frames)
      },
      getState() {
        return store.getState()
      },
    }

    try {
      const disposer = plugin.setup(ctx, options)
      if (typeof disposer === 'function') {
        disposers.push({ pluginName: plugin.name, fn: disposer })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`[${plugin.name}] setup failed: ${message}`)
    }
  }

  return {
    entries: sorted,
    provides,
    dispose() {
      const errors: Error[] = []

      // Reverse order: last registered disposer runs first
      for (let i = disposers.length - 1; i >= 0; i--) {
        const { pluginName, fn } = disposers[i]
        try {
          fn()
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          errors.push(new Error(`[${pluginName}] dispose failed: ${message}`))
        }
      }

      if (errors.length === 1) throw errors[0]
      if (errors.length > 1) {
        throw new AggregateError(errors, `Multiple plugin dispose failures: ${errors.map((e) => e.message).join('; ')}`)
      }
    },
  }
}
