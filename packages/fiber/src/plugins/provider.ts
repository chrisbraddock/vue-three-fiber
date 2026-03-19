import { defineComponent, provide, onBeforeUnmount, type InjectionKey, type PropType, type AppContext } from 'vue'
import { context, type RootStore } from '../core/store'
import type { ResolvedFiberPluginEntry } from './types'
import { createPluginRuntime, type PluginRuntime } from './runtime'

// ---------------------------------------------------------------------------
// Injection key for the plugin runtime (used by portals)
// ---------------------------------------------------------------------------

export const FIBER_PLUGIN_RUNTIME: InjectionKey<PluginRuntime> = Symbol('v3f-plugin-runtime')

// ---------------------------------------------------------------------------
// V3FStoreProvider — provides only the V3F store
// ---------------------------------------------------------------------------

export const V3FStoreProvider = defineComponent({
  name: 'V3FStoreProvider',
  props: {
    store: { type: Object as PropType<RootStore>, required: true },
  },
  setup(props, { slots }) {
    provide(context, props.store)
    return () => slots.default?.()
  },
})

// ---------------------------------------------------------------------------
// FiberRuntimeProvider — creates runtime, replays provides, disposes on unmount
// ---------------------------------------------------------------------------

export const FiberRuntimeProvider = defineComponent({
  name: 'FiberRuntimeProvider',
  props: {
    entries: { type: Array as PropType<ResolvedFiberPluginEntry[]>, required: true },
    appContext: { type: Object as PropType<AppContext | null>, default: null },
    canvas: { type: Object as PropType<HTMLCanvasElement | OffscreenCanvas>, required: true },
    store: { type: Object as PropType<RootStore>, required: true },
  },
  setup(props, { slots }) {
    const runtime = createPluginRuntime(props.entries, props.appContext, props.canvas, props.store)

    // Provide the runtime itself so portals can inherit it
    provide(FIBER_PLUGIN_RUNTIME, runtime)

    // Replay all plugin-provided values into the Vue injection tree
    for (const [key, value] of runtime.provides) {
      provide(key, value)
    }

    onBeforeUnmount(() => {
      runtime.dispose()
    })

    return () => slots.default?.()
  },
})

// ---------------------------------------------------------------------------
// FiberInheritedRuntimeProvider — replays existing runtime into portal subtree
// ---------------------------------------------------------------------------

export const FiberInheritedRuntimeProvider = defineComponent({
  name: 'FiberInheritedRuntimeProvider',
  props: {
    runtime: { type: Object as PropType<PluginRuntime>, required: true },
  },
  setup(props, { slots }) {
    // Provide the inherited runtime reference
    provide(FIBER_PLUGIN_RUNTIME, props.runtime)

    // Replay plugin-provided values so portal children can inject them
    for (const [key, value] of props.runtime.provides) {
      provide(key, value)
    }

    return () => slots.default?.()
  },
})
