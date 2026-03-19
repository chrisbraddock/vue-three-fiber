import {
  defineComponent,
  ref,
  onMounted,
  onBeforeUnmount,
  watch,
  h,
  onErrorCaptured,
  provide,
  inject,
  getCurrentInstance,
  type PropType,
} from 'vue'
import * as THREE from 'three'
import { extend } from '../core/reconciler'
import { createRoot, unmountComponentAtNode, type RenderProps } from '../core/renderer'
import { createPointerEvents } from './events'
import type { DomEvent } from '../core/events'
import type { FiberPluginEntry } from '../plugins/types'
import { FIBER_APP_PLUGIN_REGISTRY, type FiberAppPluginRegistry } from '../plugins/registry'
import { mergePluginEntries } from '../plugins/runtime'

export interface CanvasProps extends Omit<RenderProps<HTMLCanvasElement>, 'size'> {
  /** The target where events are being subscribed to, default: the div that wraps canvas */
  eventSource?: HTMLElement
  /** The event prefix that is cast into canvas pointer x/y events, default: "offset" */
  eventPrefix?: 'offset' | 'client' | 'page' | 'layer' | 'screen'
  /** Canvas-level plugin entries (merged with app-level registry) */
  plugins?: FiberPluginEntry[]
  /** Whether to inherit app-level plugins (default: true) */
  inheritPlugins?: boolean
}

/**
 * A DOM canvas which accepts threejs elements as children.
 * @see https://docs.pmnd.rs/vue-three-fiber/api/canvas
 */
export const Canvas = defineComponent({
  name: 'V3FCanvas',
  props: {
    gl: Object,
    camera: Object,
    scene: Object,
    shadows: [Boolean, String, Object],
    linear: Boolean,
    flat: Boolean,
    legacy: Boolean,
    orthographic: Boolean,
    frameloop: String as PropType<'always' | 'demand' | 'never'>,
    dpr: [Number, Array] as PropType<number | [number, number]>,
    performance: Object,
    raycaster: Object,
    events: Function,
    eventSource: Object as PropType<HTMLElement>,
    eventPrefix: String as PropType<'offset' | 'client' | 'page' | 'layer' | 'screen'>,
    onCreated: Function,
    onPointerMissed: Function,
    plugins: { type: Array as PropType<FiberPluginEntry[]>, default: () => [] },
    inheritPlugins: { type: Boolean, default: true },
  },
  setup(props, { slots, attrs, expose }) {
    const owner = getCurrentInstance()
    // Create a known catalogue of Threejs-native elements
    extend(THREE as any)

    // Inject app-level plugin registry and compute merged entries
    const appRegistry = inject<FiberAppPluginRegistry | undefined>(FIBER_APP_PLUGIN_REGISTRY, undefined)
    const getMergedPlugins = () =>
      mergePluginEntries(appRegistry?.entries ?? [], props.plugins ?? [], props.inheritPlugins !== false)

    const collectProvideEntries = (
      source?: Record<PropertyKey, unknown>,
      stop?: Record<PropertyKey, unknown>,
    ): Array<[PropertyKey, unknown]> => {
      const entries = new Map<PropertyKey, unknown>()
      let current = source

      while (current && current !== stop) {
        for (const key of Reflect.ownKeys(current)) {
          if (key !== '__v_skip' && !entries.has(key)) entries.set(key, current[key])
        }
        current = Object.getPrototypeOf(current) as Record<PropertyKey, unknown> | undefined
      }

      if (stop) {
        for (const key of Reflect.ownKeys(stop)) {
          if (key !== '__v_skip' && !entries.has(key)) entries.set(key, stop[key])
        }
      }

      return Array.from(entries.entries())
    }

    const inheritedProvideEntries = collectProvideEntries(
      (owner as { provides?: Record<PropertyKey, unknown> } | null)?.provides,
      owner?.appContext.provides as Record<PropertyKey, unknown> | undefined,
    )

    const ContextBridge = defineComponent({
      name: 'V3FContextBridge',
      setup(_, { slots }) {
        for (const [key, value] of inheritedProvideEntries) {
          provide(key as any, value as any)
        }

        return () => slots.default?.()
      },
    })

    const divRef = ref<HTMLDivElement>()
    const canvasRef = ref<HTMLCanvasElement>()
    let root: ReturnType<typeof createRoot> | null = null

    // Capture renderer errors and surface them in the DOM wrapper.
    const error = ref<Error | null>(null)
    onErrorCaptured((err) => {
      error.value = err instanceof Error ? err : new Error(String(err))
      return false
    })

    // Expose canvas ref and error state for testing
    expose({ canvas: canvasRef, error })

    // Track the host element bounds for renderer configuration.
    const size = ref({ width: 0, height: 0, top: 0, left: 0 })
    let resizeObserver: ResizeObserver | null = null

    onMounted(() => {
      if (!divRef.value || !canvasRef.value) return

      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const { width, height } = entry.contentRect
        const { top, left } = entry.target.getBoundingClientRect()
        size.value = { width, height, top, left }
      })
      resizeObserver.observe(divRef.value)

      if (size.value.width <= 0 || size.value.height <= 0) {
        const { width, height, top, left } = divRef.value.getBoundingClientRect()
        size.value = { width, height, top, left }
      }
    })

    onBeforeUnmount(() => {
      resizeObserver?.disconnect()
      if (canvasRef.value) unmountComponentAtNode(canvasRef.value)
    })

    // Watch size and configure/render
    watch(
      size,
      (s) => {
        if (s.width <= 0 || s.height <= 0 || !canvasRef.value) return

        if (!root) {
          root = createRoot(canvasRef.value)
        }

        root.configure({
          gl: props.gl,
          scene: props.scene,
          events: (props.events as any) ?? createPointerEvents,
          shadows: props.shadows as RenderProps<HTMLCanvasElement>['shadows'],
          linear: props.linear,
          flat: props.flat,
          legacy: props.legacy,
          orthographic: props.orthographic,
          frameloop: props.frameloop,
          dpr: props.dpr,
          performance: props.performance,
          raycaster: props.raycaster,
          camera: props.camera,
          size: s,
          onPointerMissed: (...args: any[]) => (props.onPointerMissed as any)?.(...args),
          onCreated: (state: any) => {
            // Connect to event source (guard divRef — may be null if error occurred during configure)
            const target = props.eventSource ?? divRef.value
            if (target) state.events.connect?.(target)
            // Set up compute function
            if (props.eventPrefix) {
              const prefix = props.eventPrefix
              state.setEvents({
                compute: (event: DomEvent, state: any) => {
                  const x = event[(prefix + 'X') as keyof DomEvent] as number
                  const y = event[(prefix + 'Y') as keyof DomEvent] as number
                  state.pointer.set((x / state.size.width) * 2 - 1, -(y / state.size.height) * 2 + 1)
                  state.raycaster.setFromCamera(state.pointer, state.camera)
                },
              })
            }
            // Call onCreated callback
            ;(props.onCreated as any)?.(state)
          },
        })

        root.render(h(ContextBridge, null, { default: () => slots.default?.() }), {
          appContext: owner?.appContext ?? null,
          plugins: getMergedPlugins(),
        })
      },
      { deep: true },
    )

    return () => {
      if (error.value) {
        if (slots.error) {
          return h(
            'div',
            { style: { position: 'relative', width: '100%', height: '100%' } },
            slots.error({
              error: error.value,
              retry: () => {
                error.value = null
              },
            }),
          )
        }
        return h('div', { style: { position: 'relative', width: '100%', height: '100%' } }, String(error.value))
      }

      const children = [
        h('canvas', {
          ref: canvasRef,
          style: { display: 'block', width: '100%', height: '100%' },
        }),
      ]

      if (slots.overlay) {
        children.push(
          h(
            'div',
            {
              style: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              },
            },
            slots.overlay(),
          ),
        )
      }

      return h(
        'div',
        {
          ref: divRef,
          style: {
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            ...(props.eventSource ? { pointerEvents: 'none' } : {}),
          },
          ...attrs,
        },
        children,
      )
    }
  },
})
