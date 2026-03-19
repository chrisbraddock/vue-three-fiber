import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp, type InjectionKey } from 'vue'
import {
  defineFiberPlugin,
  withPluginOptions,
  registerFiberPlugin,
  ensureFiberPluginRegistry,
  type FiberPluginDefinition,
  type FiberPluginContext,
  type ResolvedFiberPluginEntry,
} from '../src/plugins'
import {
  normalizeEntry,
  mergePluginEntries,
  createPluginRuntime,
  sameResolvedPluginEntries,
} from '../src/plugins/runtime'
import type { RootStore } from '../src/core/store'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makePlugin(name: string, opts?: Partial<FiberPluginDefinition>): FiberPluginDefinition {
  return { name, ...opts }
}

function makeMockStore(): RootStore {
  const state = { internal: {} } as any
  const store = {
    getState: () => state,
    setState: vi.fn(),
    subscribe: vi.fn(),
  }
  return store as unknown as RootStore
}

// ---------------------------------------------------------------------------
// defineFiberPlugin / withPluginOptions
// ---------------------------------------------------------------------------

describe('defineFiberPlugin', () => {
  it('returns the same definition object', () => {
    const def = { name: 'test-plugin' }
    expect(defineFiberPlugin(def)).toBe(def)
  })

  it('preserves typed options', () => {
    const def = defineFiberPlugin<{ intensity: number }>({
      name: 'typed-plugin',
      setup(_ctx, options) {
        // Type check: options.intensity should be number
        const _n: number = options.intensity
        void _n
      },
    })
    expect(def.name).toBe('typed-plugin')
  })
})

describe('withPluginOptions', () => {
  it('creates object entry form', () => {
    const plugin = makePlugin('my-plugin')
    const entry = withPluginOptions(plugin, { debug: true })
    expect(entry).toEqual({ plugin, options: { debug: true } })
  })

  it('supports explicit key', () => {
    const plugin = makePlugin('my-plugin')
    const entry = withPluginOptions(plugin, { debug: true }, 'v2')
    expect(entry).toEqual({ plugin, options: { debug: true }, key: 'v2' })
  })
})

// ---------------------------------------------------------------------------
// normalizeEntry
// ---------------------------------------------------------------------------

describe('normalizeEntry', () => {
  it('normalizes bare definition', () => {
    const plugin = makePlugin('bare')
    const resolved = normalizeEntry(plugin)
    expect(resolved.plugin).toBe(plugin)
    expect(resolved.options).toBeUndefined()
  })

  it('normalizes tuple entry', () => {
    const plugin = makePlugin('tuple')
    const opts = { debug: true }
    const resolved = normalizeEntry([plugin, opts])
    expect(resolved.plugin).toBe(plugin)
    expect(resolved.options).toBe(opts)
  })

  it('normalizes object entry', () => {
    const plugin = makePlugin('obj')
    const opts = { debug: true }
    const resolved = normalizeEntry({ plugin, options: opts, key: 'k1' })
    expect(resolved.plugin).toBe(plugin)
    expect(resolved.options).toBe(opts)
    expect(resolved.key).toBe('k1')
  })

  it('throws on invalid entry', () => {
    expect(() => normalizeEntry(42 as any)).toThrow('Invalid plugin entry')
  })
})

// ---------------------------------------------------------------------------
// mergePluginEntries
// ---------------------------------------------------------------------------

describe('mergePluginEntries', () => {
  const pluginA = makePlugin('a')
  const pluginB = makePlugin('b')
  const pluginC = makePlugin('c')

  it('merges app and local entries', () => {
    const appEntries: ResolvedFiberPluginEntry[] = [{ plugin: pluginA, options: undefined }]
    const merged = mergePluginEntries(appEntries, [pluginB], true)
    expect(merged.map((e) => e.plugin.name)).toEqual(['a', 'b'])
  })

  it('local entry overrides app entry with same name', () => {
    const appEntries: ResolvedFiberPluginEntry[] = [{ plugin: pluginA, options: { v: 1 } }]
    const localOverride = withPluginOptions(pluginA, { v: 2 })
    const merged = mergePluginEntries(appEntries, [localOverride], true)
    expect(merged).toHaveLength(1)
    expect(merged[0].options).toEqual({ v: 2 })
  })

  it('ignores app entries when inheritPlugins=false', () => {
    const appEntries: ResolvedFiberPluginEntry[] = [
      { plugin: pluginA, options: undefined },
      { plugin: pluginB, options: undefined },
    ]
    const merged = mergePluginEntries(appEntries, [pluginC], false)
    expect(merged.map((e) => e.plugin.name)).toEqual(['c'])
  })
})

// ---------------------------------------------------------------------------
// sameResolvedPluginEntries
// ---------------------------------------------------------------------------

describe('sameResolvedPluginEntries', () => {
  const plugin = makePlugin('x')
  const opts = { a: 1 }

  it('returns true for identical arrays', () => {
    const entries: ResolvedFiberPluginEntry[] = [{ plugin, options: opts }]
    expect(sameResolvedPluginEntries(entries, entries)).toBe(true)
  })

  it('returns false for different length', () => {
    const a: ResolvedFiberPluginEntry[] = [{ plugin, options: opts }]
    const b: ResolvedFiberPluginEntry[] = []
    expect(sameResolvedPluginEntries(a, b)).toBe(false)
  })

  it('returns false for different plugin names', () => {
    const a: ResolvedFiberPluginEntry[] = [{ plugin: makePlugin('a'), options: undefined }]
    const b: ResolvedFiberPluginEntry[] = [{ plugin: makePlugin('b'), options: undefined }]
    expect(sameResolvedPluginEntries(a, b)).toBe(false)
  })

  it('detects key mismatch', () => {
    const a: ResolvedFiberPluginEntry[] = [{ plugin, options: opts, key: 'k1' }]
    const b: ResolvedFiberPluginEntry[] = [{ plugin, options: opts, key: 'k2' }]
    expect(sameResolvedPluginEntries(a, b)).toBe(false)
  })

  it('detects options identity change', () => {
    const a: ResolvedFiberPluginEntry[] = [{ plugin, options: { a: 1 } }]
    const b: ResolvedFiberPluginEntry[] = [{ plugin, options: { a: 1 } }]
    // Different object references — Object.is fails
    expect(sameResolvedPluginEntries(a, b)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// createPluginRuntime — setup, provide, dispose
// ---------------------------------------------------------------------------

describe('createPluginRuntime', () => {
  const canvas = {} as HTMLCanvasElement
  let store: RootStore

  beforeEach(() => {
    store = makeMockStore()
  })

  it('runs setup in dependency order', () => {
    const order: string[] = []

    const pluginA = defineFiberPlugin({
      name: 'a',
      setup() {
        order.push('a')
      },
    })
    const pluginB = defineFiberPlugin({
      name: 'b',
      requires: ['a'],
      setup() {
        order.push('b')
      },
    })

    const entries: ResolvedFiberPluginEntry[] = [
      { plugin: pluginB, options: undefined },
      { plugin: pluginA, options: undefined },
    ]

    createPluginRuntime(entries, null, canvas, store)
    expect(order).toEqual(['a', 'b'])
  })

  it('passes options to setup', () => {
    const received: unknown[] = []
    const plugin = defineFiberPlugin<{ intensity: number }>({
      name: 'opts-test',
      setup(_ctx, options) {
        received.push(options)
      },
    })

    const opts = { intensity: 5 }
    createPluginRuntime([{ plugin, options: opts }], null, canvas, store)
    expect(received).toEqual([opts])
  })

  it('collects provided values', () => {
    const KEY: InjectionKey<string> = Symbol('test-key')
    const plugin = defineFiberPlugin({
      name: 'provider',
      setup(ctx) {
        ctx.provide(KEY, 'hello')
      },
    })

    const runtime = createPluginRuntime([{ plugin, options: undefined }], null, canvas, store)
    expect(runtime.provides.get(KEY)).toBe('hello')
  })

  it('disposes in reverse order', () => {
    const order: string[] = []

    const pluginA = defineFiberPlugin({
      name: 'a',
      setup(ctx) {
        ctx.onDispose(() => order.push('dispose-a'))
      },
    })
    const pluginB = defineFiberPlugin({
      name: 'b',
      requires: ['a'],
      setup() {
        return () => order.push('dispose-b')
      },
    })

    const entries: ResolvedFiberPluginEntry[] = [
      { plugin: pluginA, options: undefined },
      { plugin: pluginB, options: undefined },
    ]

    const runtime = createPluginRuntime(entries, null, canvas, store)
    runtime.dispose()
    expect(order).toEqual(['dispose-b', 'dispose-a'])
  })

  it('wraps setup errors with plugin name', () => {
    const plugin = defineFiberPlugin({
      name: 'bad-plugin',
      setup() {
        throw new Error('boom')
      },
    })

    expect(() => createPluginRuntime([{ plugin, options: undefined }], null, canvas, store)).toThrow(
      '[bad-plugin] setup failed: boom',
    )
  })

  it('wraps dispose errors with plugin name', () => {
    const plugin = defineFiberPlugin({
      name: 'bad-dispose',
      setup() {
        return () => {
          throw new Error('cleanup-fail')
        }
      },
    })

    const runtime = createPluginRuntime([{ plugin, options: undefined }], null, canvas, store)
    expect(() => runtime.dispose()).toThrow('[bad-dispose] dispose failed: cleanup-fail')
  })

  it('throws AggregateError when multiple disposers fail', () => {
    const pluginA = defineFiberPlugin({
      name: 'a',
      setup() {
        return () => {
          throw new Error('fail-a')
        }
      },
    })
    const pluginB = defineFiberPlugin({
      name: 'b',
      setup() {
        return () => {
          throw new Error('fail-b')
        }
      },
    })

    const entries: ResolvedFiberPluginEntry[] = [
      { plugin: pluginA, options: undefined },
      { plugin: pluginB, options: undefined },
    ]

    const runtime = createPluginRuntime(entries, null, canvas, store)
    expect(() => runtime.dispose()).toThrow('Multiple plugin dispose failures')
  })

  it('detects cyclic dependencies', () => {
    const pluginA = defineFiberPlugin({ name: 'a', requires: ['b'] })
    const pluginB = defineFiberPlugin({ name: 'b', requires: ['a'] })

    const entries: ResolvedFiberPluginEntry[] = [
      { plugin: pluginA, options: undefined },
      { plugin: pluginB, options: undefined },
    ]

    expect(() => createPluginRuntime(entries, null, canvas, store)).toThrow('Cyclic plugin dependency')
  })

  it('detects missing dependency', () => {
    const plugin = defineFiberPlugin({ name: 'x', requires: ['missing'] })

    expect(() => createPluginRuntime([{ plugin, options: undefined }], null, canvas, store)).toThrow(
      '[x] Missing dependency "missing"',
    )
  })

  it('detects self-dependency', () => {
    const plugin = defineFiberPlugin({ name: 'self', requires: ['self'] })

    expect(() => createPluginRuntime([{ plugin, options: undefined }], null, canvas, store)).toThrow(
      '[self] Plugin cannot depend on itself',
    )
  })

  it('skips plugins without setup', () => {
    const plugin = defineFiberPlugin({ name: 'no-setup' })
    const runtime = createPluginRuntime([{ plugin, options: undefined }], null, canvas, store)
    expect(runtime.entries).toHaveLength(1)
    // dispose should be a no-op
    runtime.dispose()
  })

  it('exposes store and canvas through context', () => {
    let capturedCtx: FiberPluginContext | null = null
    const plugin = defineFiberPlugin({
      name: 'ctx-test',
      setup(ctx) {
        capturedCtx = ctx
      },
    })

    createPluginRuntime([{ plugin, options: undefined }], null, canvas, store)
    expect(capturedCtx!.canvas).toBe(canvas)
    expect(capturedCtx!.store).toBe(store)
    expect(capturedCtx!.getState()).toBe(store.getState())
  })
})

// ---------------------------------------------------------------------------
// App-level registry
// ---------------------------------------------------------------------------

describe('app-level registry', () => {
  it('ensureFiberPluginRegistry creates and reuses a registry', () => {
    const app = createApp({ render: () => null })
    const reg1 = ensureFiberPluginRegistry(app)
    const reg2 = ensureFiberPluginRegistry(app)
    expect(reg1).toBe(reg2)
    expect(reg1.entries).toEqual([])
  })

  it('registerFiberPlugin adds entries to app registry', () => {
    const app = createApp({ render: () => null })
    const plugin = makePlugin('app-plugin')
    registerFiberPlugin(app, plugin)
    const registry = ensureFiberPluginRegistry(app)
    expect(registry.entries).toHaveLength(1)
    expect(registry.entries[0].plugin.name).toBe('app-plugin')
  })

  it('registerFiberPlugin accepts all entry forms', () => {
    const app = createApp({ render: () => null })
    const p1 = makePlugin('bare')
    const p2 = makePlugin('tuple')
    const p3 = makePlugin('obj')

    registerFiberPlugin(app, p1)
    registerFiberPlugin(app, [p2, { x: 1 }])
    registerFiberPlugin(app, { plugin: p3, options: { y: 2 }, key: 'k' })

    const registry = ensureFiberPluginRegistry(app)
    expect(registry.entries).toHaveLength(3)
    expect(registry.entries.map((e) => e.plugin.name)).toEqual(['bare', 'tuple', 'obj'])
  })
})
