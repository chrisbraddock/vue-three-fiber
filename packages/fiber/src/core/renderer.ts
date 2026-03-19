import {
  defineComponent,
  provide,
  inject,
  getCurrentInstance,
  createVNode,
  isVNode,
  onBeforeUnmount,
  type AppContext,
  type VNode,
  type PropType,
} from 'vue'
import * as THREE from 'three'
import { createStore as createZustandStore } from 'zustand/vanilla'

import type { ThreeElement } from '../three-types'
import { ComputeFunction, EventManager } from './events'
import { advance, invalidate } from './loop'
// The reconciler module will export a Vue custom renderer's `render` function
// This will be provided by the reconciler unit's Vue conversion
import { render as vueRender, createContainerInstance, type VueRenderContainer } from './reconciler'
import {
  context,
  createStore,
  Dpr,
  Frameloop,
  isRenderer,
  Performance,
  Renderer,
  RootState,
  RootStore,
  Size,
} from './store'
import {
  type Properties,
  applyProps,
  calculateDpr,
  Camera,
  dispose,
  EquConfig,
  is,
  prepare,
  updateCamera,
} from './utils'
import type { ResolvedFiberPluginEntry } from '../plugins/types'
import {
  V3FStoreProvider,
  FiberRuntimeProvider,
  FiberInheritedRuntimeProvider,
  FIBER_PLUGIN_RUNTIME,
} from '../plugins/provider'
import { sameResolvedPluginEntries, type PluginRuntime } from '../plugins/runtime'

// Shim for OffscreenCanvas since it was removed from DOM types
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/54988
interface OffscreenCanvas extends EventTarget {}

interface V3FRoot {
  store: RootStore
  vueContainer?: VueRenderContainer
}

export const _roots = new Map<HTMLCanvasElement | OffscreenCanvas, V3FRoot>()

const shallowLoose = { objects: 'shallow', strict: false } as EquConfig

export type DefaultGLProps = Omit<THREE.WebGLRendererParameters, 'canvas'> & {
  canvas: HTMLCanvasElement | OffscreenCanvas
}

export type GLProps =
  | Renderer
  | ((defaultProps: DefaultGLProps) => Renderer)
  | ((defaultProps: DefaultGLProps) => Promise<Renderer>)
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>

export type CameraProps = (
  | Camera
  | Partial<
      ThreeElement<typeof THREE.Camera> &
        ThreeElement<typeof THREE.PerspectiveCamera> &
        ThreeElement<typeof THREE.OrthographicCamera>
    >
) & {
  /** Flags the camera as manual, putting projection into your own hands */
  manual?: boolean
}

export interface RenderProps<TCanvas extends HTMLCanvasElement | OffscreenCanvas> {
  /** A threejs renderer instance or props that go into the default renderer */
  gl?: GLProps
  /** Dimensions to fit the renderer to. Will measure canvas dimensions if omitted */
  size?: Size
  /**
   * Enables shadows (by default PCFsoft). Can accept `gl.shadowMap` options for fine-tuning,
   * but also strings: 'basic' | 'percentage' | 'soft' | 'variance'.
   * @see https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap
   */
  shadows?: boolean | 'basic' | 'percentage' | 'soft' | 'variance' | Partial<THREE.WebGLShadowMap>
  /**
   * Disables three r139 color management.
   * @see https://threejs.org/docs/#manual/en/introduction/Color-management
   */
  legacy?: boolean
  /** Switch off automatic sRGB encoding and gamma correction */
  linear?: boolean
  /** Use `THREE.NoToneMapping` instead of `THREE.ACESFilmicToneMapping` */
  flat?: boolean
  /** Creates an orthographic camera */
  orthographic?: boolean
  /**
   * V3F's render mode. Set to `demand` to only render on state change or `never` to take control.
   */
  frameloop?: Frameloop
  /**
   * V3F performance options for adaptive performance.
   */
  performance?: Partial<Omit<Performance, 'regress'>>
  /** Target pixel ratio. Can clamp between a range: `[min, max]` */
  dpr?: Dpr
  /** Props that go into the default raycaster */
  raycaster?: Partial<THREE.Raycaster>
  /** A `THREE.Scene` instance or props that go into the default scene */
  scene?: THREE.Scene | Partial<THREE.Scene>
  /** A `THREE.Camera` instance or props that go into the default camera */
  camera?: CameraProps
  /** An event manager to manage elements' pointer events */
  events?: (store: RootStore) => EventManager<HTMLElement>
  /** Callback after the canvas has rendered (but not yet committed) */
  onCreated?: (state: RootState) => void
  /** Response for pointer clicks that have missed any target */
  onPointerMissed?: (event: MouseEvent) => void
}

export interface ReconcilerRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas> {
  configure: (config?: RenderProps<TCanvas>) => Promise<ReconcilerRoot<TCanvas>>
  render: (
    children: VNode | VNode[] | (() => VNode | VNode[]),
    options?: { appContext?: AppContext | null; plugins?: ResolvedFiberPluginEntry[] },
  ) => RootStore
  unmount: () => void
}

// V3FProvider kept as a thin compat alias — now delegates to plugin-aware providers
// (V3FStoreProvider + FiberRuntimeProvider are imported from ../plugins/provider)

function computeInitialSize(canvas: HTMLCanvasElement | OffscreenCanvas, size?: Size): Size {
  if (
    !size &&
    typeof HTMLCanvasElement !== 'undefined' &&
    canvas instanceof HTMLCanvasElement &&
    canvas.parentElement
  ) {
    const { width, height, top, left } = canvas.parentElement.getBoundingClientRect()
    return { width, height, top, left }
  } else if (!size && typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return {
      width: canvas.width,
      height: canvas.height,
      top: 0,
      left: 0,
    }
  }

  return { width: 0, height: 0, top: 0, left: 0, ...size }
}

export function createRoot<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
): ReconcilerRoot<TCanvas> {
  // Check against mistaken use of createRoot
  const prevRoot = _roots.get(canvas)
  const prevStore = prevRoot?.store

  if (prevRoot) console.warn('V3F.createRoot should only be called once!')

  // Create store
  const store = prevStore || createStore(invalidate, advance)
  // Container element for the Vue renderer — a full Instance so nodeOps work
  const vueContainer = prevRoot?.vueContainer || createContainerInstance(store)
  // Map it
  if (!prevRoot) _roots.set(canvas, { store, vueContainer })

  // Locals
  let onCreated: ((state: RootState) => void) | undefined
  let lastCamera: RenderProps<TCanvas>['camera']

  let configured = false
  let pending: Promise<void> | null = null

  return {
    async configure(props: RenderProps<TCanvas> = {}): Promise<ReconcilerRoot<TCanvas>> {
      let resolve!: () => void
      pending = new Promise<void>((_resolve) => (resolve = _resolve))

      let {
        gl: glConfig,
        size: propsSize,
        scene: sceneOptions,
        events,
        onCreated: onCreatedCallback,
        shadows = false,
        linear = false,
        flat = false,
        legacy = false,
        orthographic = false,
        frameloop = 'always',
        dpr = [1, 2],
        performance,
        raycaster: raycastOptions,
        camera: cameraOptions,
        onPointerMissed,
      } = props

      let state = store.getState()

      // Set up renderer (one time only!)
      let gl = state.gl
      if (!state.gl) {
        const defaultProps: DefaultGLProps = {
          canvas: canvas as HTMLCanvasElement,
          powerPreference: 'high-performance',
          antialias: true,
          alpha: true,
        }

        const customRenderer = (
          typeof glConfig === 'function' ? await glConfig(defaultProps) : glConfig
        ) as THREE.WebGLRenderer

        if (isRenderer(customRenderer)) {
          gl = customRenderer
        } else {
          gl = new THREE.WebGLRenderer({
            ...defaultProps,
            ...glConfig,
          })
        }

        state.set({ gl })
      }

      // Set up raycaster (one time only!)
      let raycaster = state.raycaster
      if (!raycaster) state.set({ raycaster: (raycaster = new THREE.Raycaster()) })

      // Set raycaster options
      const { params, ...options } = raycastOptions || {}
      if (!is.equ(options, raycaster, shallowLoose)) applyProps(raycaster, { ...options } as any)
      if (!is.equ(params, raycaster.params, shallowLoose))
        applyProps(raycaster, { params: { ...raycaster.params, ...params } } as any)

      // Create default camera, don't overwrite any user-set state
      if (!state.camera || (state.camera === lastCamera && !is.equ(lastCamera, cameraOptions, shallowLoose))) {
        lastCamera = cameraOptions
        const isCamera = (cameraOptions as unknown as THREE.Camera | undefined)?.isCamera
        const camera = isCamera
          ? (cameraOptions as Camera)
          : orthographic
          ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
          : new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
        if (!isCamera) {
          camera.position.z = 5
          if (cameraOptions) {
            applyProps(camera, cameraOptions as any)
            // Preserve user-defined frustum if possible
            if (!(camera as any).manual) {
              if (
                'aspect' in cameraOptions ||
                'left' in cameraOptions ||
                'right' in cameraOptions ||
                'bottom' in cameraOptions ||
                'top' in cameraOptions
              ) {
                ;(camera as any).manual = true
                camera.updateProjectionMatrix()
              }
            }
          }
          // Always look at center by default
          if (!state.camera && !cameraOptions?.rotation) camera.lookAt(0, 0, 0)
        }
        state.set({ camera })

        // Configure raycaster
        raycaster.camera = camera
      }

      // Set up scene (one time only!)
      if (!state.scene) {
        let scene: THREE.Scene

        if ((sceneOptions as unknown as THREE.Scene | undefined)?.isScene) {
          scene = sceneOptions as THREE.Scene
          prepare(scene, store, '', {})
        } else {
          scene = new THREE.Scene()
          prepare(scene, store, '', {})
          if (sceneOptions) applyProps(scene as any, sceneOptions as any)
        }

        state.set({ scene })
      }
      vueContainer.object = store.getState().scene as unknown as VueRenderContainer['object']

      // Store events internally
      if (events && !state.events.handlers) state.set({ events: events(store) })
      // Check size, allow it to take on container bounds initially
      const size = computeInitialSize(canvas, propsSize)
      if (!is.equ(size, state.size, shallowLoose)) {
        state.setSize(size.width, size.height, size.top, size.left)
      }
      // Check pixelratio
      if (dpr && state.viewport.dpr !== calculateDpr(dpr)) state.setDpr(dpr)
      // Check frameloop
      if (state.frameloop !== frameloop) state.setFrameloop(frameloop)
      // Check pointer missed
      if (!state.onPointerMissed) state.set({ onPointerMissed })
      // Check performance
      if (performance && !is.equ(performance, state.performance, shallowLoose))
        state.set((state) => ({ performance: { ...state.performance, ...performance } }))

      // Set up XR (one time only!)
      if (!state.xr) {
        // Handle frame behavior in WebXR
        const handleXRFrame: XRFrameRequestCallback = (timestamp: number, frame?: XRFrame) => {
          const state = store.getState()
          if (state.frameloop === 'never') return
          advance(timestamp, true, state, frame)
        }

        // Toggle render switching on session
        const handleSessionChange = () => {
          const state = store.getState()
          state.gl.xr.enabled = state.gl.xr.isPresenting

          state.gl.xr.setAnimationLoop(state.gl.xr.isPresenting ? handleXRFrame : null)
          if (!state.gl.xr.isPresenting) invalidate(state)
        }

        // WebXR session manager
        const xr = {
          connect() {
            const gl = store.getState().gl
            gl.xr.addEventListener('sessionstart', handleSessionChange)
            gl.xr.addEventListener('sessionend', handleSessionChange)
          },
          disconnect() {
            const gl = store.getState().gl
            gl.xr.removeEventListener('sessionstart', handleSessionChange)
            gl.xr.removeEventListener('sessionend', handleSessionChange)
          },
        }

        // Subscribe to WebXR session events
        if (typeof gl.xr?.addEventListener === 'function') xr.connect()
        state.set({ xr })
      }

      // Set shadowmap
      if (gl.shadowMap) {
        const oldEnabled = gl.shadowMap.enabled
        const oldType = gl.shadowMap.type
        gl.shadowMap.enabled = !!shadows

        if (is.boo(shadows)) {
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        } else if (is.str(shadows)) {
          const types = {
            basic: THREE.BasicShadowMap,
            percentage: THREE.PCFShadowMap,
            soft: THREE.PCFSoftShadowMap,
            variance: THREE.VSMShadowMap,
          }
          gl.shadowMap.type = types[shadows] ?? THREE.PCFSoftShadowMap
        } else if (is.obj(shadows)) {
          Object.assign(gl.shadowMap, shadows)
        }

        if (oldEnabled !== gl.shadowMap.enabled || oldType !== gl.shadowMap.type) gl.shadowMap.needsUpdate = true
      }

      THREE.ColorManagement.enabled = !legacy

      // Set color space and tonemapping preferences
      if (!configured) {
        gl.outputColorSpace = linear ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
        gl.toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping
      }

      // Update color management state
      if (state.legacy !== legacy) state.set(() => ({ legacy }))
      if (state.linear !== linear) state.set(() => ({ linear }))
      if (state.flat !== flat) state.set(() => ({ flat }))

      // Set gl props
      if (glConfig && !is.fun(glConfig) && !isRenderer(glConfig) && !is.equ(glConfig, gl, shallowLoose))
        applyProps(gl, glConfig as any)

      // Set locals
      onCreated = onCreatedCallback
      configured = true
      resolve()
      return this
    },
    render(
      children: VNode | VNode[] | (() => VNode | VNode[]),
      options?: { appContext?: AppContext | null; plugins?: ResolvedFiberPluginEntry[] },
    ): RootStore {
      // The root has to be configured before it can be rendered
      if (!configured && !pending) this.configure()

      pending!.then(() => {
        const state = store.getState()

        // Flag the canvas active, rendering will now begin
        state.set((state) => ({ internal: { ...state.internal, active: true } }))

        // Notify that init is completed, the scene graph exists, but nothing has yet rendered
        if (onCreated) onCreated(state)

        // Connect events to the targets parent
        if (!store.getState().events.connected) state.events.connect?.(canvas as any)

        // Build the provider tree: V3FStoreProvider → FiberRuntimeProvider → children
        const childContent = typeof children === 'function' ? children : () => children
        const pluginEntries = options?.plugins ?? []

        const vnode = createVNode(
          V3FStoreProvider,
          { store },
          {
            default: () =>
              pluginEntries.length > 0
                ? createVNode(
                    FiberRuntimeProvider,
                    {
                      entries: pluginEntries,
                      appContext: options?.appContext ?? null,
                      canvas,
                      store,
                    },
                    { default: childContent },
                  )
                : childContent(),
          },
        )
        if (options?.appContext) vnode.appContext = options.appContext

        // Render the vnode tree using the Vue custom renderer for Three.js
        vueRender(vnode, vueContainer)
      })

      return store
    },
    unmount(): void {
      unmountComponentAtNode(canvas)
    },
  }
}

export function unmountComponentAtNode<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
  callback?: (canvas: TCanvas) => void,
): void {
  const root = _roots.get(canvas)
  if (root) {
    const state = root.store.getState()
    if (state) state.internal.active = false

    // Unmount by rendering null into the container
    if (root.vueContainer) {
      vueRender(null, root.vueContainer)
    }

    setTimeout(() => {
      try {
        state.events.disconnect?.()
        state.gl?.renderLists?.dispose?.()
        state.gl?.forceContextLoss?.()
        if (state.gl?.xr) state.xr.disconnect()
        dispose(state.scene)
        _roots.delete(canvas)
        if (callback) callback(canvas)
      } catch (e) {
        /* ... */
      }
    }, 500)
  }
}

export type InjectState = Partial<
  Omit<RootState, 'events'> & {
    events?: {
      enabled?: boolean
      priority?: number
      compute?: ComputeFunction
      connected?: any
    }
  }
>

/**
 * Creates a portal that renders children into a different Three.js container
 * with its own state derived from the parent store.
 */
export function createPortal(
  children: VNode | VNode[] | (() => VNode | VNode[]),
  container: THREE.Object3D,
  state?: InjectState,
): VNode {
  const renderChildren = typeof children === 'function' ? children : () => children

  return createVNode(Portal, { container, state }, { default: renderChildren })
}

const Portal = defineComponent({
  name: 'V3FPortal',
  props: {
    state: {
      type: Object as () => InjectState,
      default: () => ({}),
    },
    container: {
      type: Object as () => THREE.Object3D,
      required: true,
    },
  },
  setup(props, { slots }) {
    const owner = getCurrentInstance()
    const { events, size, ...rest } = props.state || {}
    const previousRoot = inject(context) as RootStore
    const parentRuntime = inject(FIBER_PLUGIN_RUNTIME, undefined) as PluginRuntime | undefined
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const viewportTarget = new THREE.Vector3()

    function mergeStates(rootState: RootState, portalState: RootState): RootState {
      let viewport = undefined
      if (portalState.camera && size) {
        const camera = portalState.camera
        viewport = rootState.viewport.getCurrentViewport(camera, viewportTarget, size)
        if (camera !== rootState.camera) updateCamera(camera, size)
      }

      return {
        ...rootState,
        ...portalState,
        scene: props.container as THREE.Scene,
        raycaster,
        pointer,
        mouse: pointer,
        previousRoot,
        events: { ...rootState.events, ...portalState.events, ...events },
        size: { ...rootState.size, ...size },
        viewport: { ...rootState.viewport, ...viewport },
        setEvents: (evts: Partial<EventManager<any>>) =>
          portalState.set((state) => ({ ...state, events: { ...state.events, ...evts } })),
      } as RootState
    }

    // Create a mirrored store, based on the previous root with overrides
    const portalStore = createZustandStore<RootState>()(((set, get) => {
      return Object.assign({}, rest, { set, get }) as RootState
    }) as any)
    const portalContainer = createContainerInstance(portalStore)
    portalContainer.object = props.container as unknown as typeof portalContainer.object

    // Subscribe to previous root-state and copy changes over to the mirrored portal-state
    const onMutate = (prev: RootState) => portalStore.setState((state) => mergeStates(prev, state))
    onMutate(previousRoot.getState())
    const unsubscribe = previousRoot.subscribe(onMutate)

    let unmounted = false

    onBeforeUnmount(() => {
      unmounted = true
      unsubscribe()
      vueRender(null, portalContainer)
    })

    // Invoke slots.default() inside the render function so Vue can track
    // reactive dependencies (avoids "Slot invoked outside render" warning).
    // Defer vueRender to a microtask to avoid nested render operations.
    return () => {
      const children = slots.default ? slots.default() : []

      Promise.resolve().then(() => {
        if (unmounted) return

        // Build portal provider tree: store provider → optional inherited runtime → children
        const childContent = () => children
        const innerContent = parentRuntime
          ? () => createVNode(FiberInheritedRuntimeProvider, { runtime: parentRuntime }, { default: childContent })
          : childContent

        const vnode = createVNode(V3FStoreProvider, { store: portalStore }, { default: innerContent })
        vnode.appContext = owner?.appContext ?? null
        vueRender(vnode, portalContainer)
      })

      return null
    }
  },
})

/**
 * Synchronously flush pending reactive updates to the scene graph.
 *
 * Uses Vue's ComponentInternalInstance.update() to force-run dirty render effects.
 * These APIs are typed in Vue's .d.ts but not part of the documented public API.
 *
 * Version assumptions:
 * - Vue 3.5+: uses effect.dirty to skip clean effects
 * - Vue 3.3–3.4: calls update() unconditionally (no-op if clean)
 *
 * This is a compatibility export. Vue-native render lifecycle APIs are planned
 * as the long-term approach.
 */
export function flushSync(fn?: () => void): void {
  fn?.()
  for (const [, root] of _roots) {
    const container = root.vueContainer
    const vnode = container?._vnode
    if (isVNode(vnode)) {
      flushDirtyEffects(vnode)
    }
  }
}

function flushDirtyEffects(vnode: VNode): void {
  if (vnode.component) {
    const instance = vnode.component
    const dirty = instance.effect.dirty
    if (dirty === undefined || dirty) {
      instance.update()
    }
    flushDirtyEffects(instance.subTree)
  }
  const { children } = vnode
  if (Array.isArray(children)) {
    for (const child of children) {
      if (isVNode(child)) {
        flushDirtyEffects(child)
      }
    }
  }
  // dynamicChildren is not on VNode's public interface but exists at runtime
  // when Vue's block tracking is active
  if ('dynamicChildren' in vnode && Array.isArray(vnode.dynamicChildren)) {
    for (const child of vnode.dynamicChildren) {
      if (isVNode(child)) {
        flushDirtyEffects(child)
      }
    }
  }
}
