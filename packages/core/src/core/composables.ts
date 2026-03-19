import * as THREE from 'three'
import {
  inject,
  shallowRef,
  readonly,
  nextTick,
  watch,
  onMounted,
  onBeforeUnmount,
  type ShallowRef,
  type InjectionKey,
  type WatchSource,
  type WatchOptions,
  type WatchHandle,
} from 'vue'
import { context, type RootState, type RenderCallback, type RootStore } from './store'
import { buildGraph, type ObjectMap, isObject3D } from './utils'
import { addAfterEffect, invalidate } from './loop'
import type { Instance, ConstructorRepresentation } from './reconciler'

/** Object3D augmented with an optional V3F instance handle. */
interface Object3DWithInstance extends THREE.Object3D {
  __v3f?: Instance
}

function hasInstanceHandle(object: THREE.Object3D): object is Object3DWithInstance {
  return '__v3f' in object
}

function isErrorEvent(value: unknown): value is ErrorEvent {
  return typeof value === 'object' && value !== null && 'message' in value
}

/** The Vue injection key for the V3F root store. */
const storeKey: InjectionKey<RootStore> = context

/**
 * Exposes an object's {@link Instance}.
 * @see https://docs.pmnd.rs/vue-three-fiber/api/additional-exports#useInstanceHandle
 *
 * **Note**: this is an escape hatch to internal fields. Expect this to change significantly between versions.
 */
export function useInstanceHandle(object: THREE.Object3D): Instance | undefined {
  if (hasInstanceHandle(object)) return object.__v3f
  return undefined
}

/**
 * Returns the V3F Canvas' Zustand store. Useful for transient updates.
 * @see https://docs.pmnd.rs/vue-three-fiber/api/composables#usestore
 */
export function useStore(): RootStore {
  const store = inject(storeKey)
  if (!store) throw new Error('V3F: Composables can only be used within the Canvas component!')
  return store
}

/**
 * Accesses V3F's internal state, containing renderer, canvas, scene, etc.
 * @see https://docs.pmnd.rs/vue-three-fiber/api/composables#usethree
 */
export function useThree(): ShallowRef<RootState>
export function useThree<T>(selector: (state: RootState) => T): ShallowRef<T>
export function useThree<T>(selector?: (state: RootState) => T): ShallowRef<RootState> | ShallowRef<T> {
  const store = useStore()
  if (!selector) {
    const value: ShallowRef<RootState> = shallowRef(store.getState())
    const unsub = store.subscribe((state) => {
      if (value.value !== state) value.value = state
    })
    onBeforeUnmount(unsub)
    return value
  }
  const value: ShallowRef<T> = shallowRef(selector(store.getState()))
  const unsub = store.subscribe((state) => {
    const next = selector(state)
    if (value.value !== next) value.value = next
  })
  onBeforeUnmount(unsub)
  return value
}

/**
 * Executes a callback before render in a shared frame loop.
 * Can order effects with render priority or manually render with a positive priority.
 * @see https://docs.pmnd.rs/vue-three-fiber/api/composables#useframe
 */
export function useFrame(callback: RenderCallback, renderPriority: number = 0): void {
  const store = useStore()
  // Use a mutable ref to avoid stale closures
  const callbackRef = { current: callback }

  let unsub: () => void
  onMounted(() => {
    unsub = store.getState().internal.subscribe(callbackRef, renderPriority, store)
  })
  onBeforeUnmount(() => unsub?.())
}

/**
 * Returns a node graph of an object with named nodes & materials.
 * @see https://docs.pmnd.rs/vue-three-fiber/api/composables#usegraph
 */
export function useGraph(object: THREE.Object3D): ObjectMap {
  return buildGraph(object)
}

/** Return type of {@link useObjectRef}. */
export interface ObjectRef<T extends THREE.Object3D = THREE.Object3D> {
  /** Function ref to bind in template: `:ref="cube.ref"` */
  ref: (value: unknown) => void
  /** The underlying THREE.Object3D, reactively updated */
  object: ShallowRef<T | null>
  /** Whether the object is currently mounted in the scene */
  mounted: Readonly<ShallowRef<boolean>>
}

/**
 * Type guard that checks whether a value is an Instance proxy with a mounted
 * THREE.Object3D. The generic parameter T allows callers to declare the
 * expected subtype — the runtime check verifies Object3D, and T is trusted
 * from the consumer (matching Vue's template ref typing contract).
 */
function isInstanceWithObject<T extends THREE.Object3D = THREE.Object3D>(
  value: unknown,
): value is Instance & { object: T } {
  if (typeof value !== 'object' || value === null || !('object' in value)) return false
  const candidate: { object: unknown } = value
  return candidate.object instanceof THREE.Object3D
}

/**
 * Provides a typed ref callback that extracts the raw THREE.Object3D from the
 * Vue custom renderer's Instance proxy. Handles reconstruction automatically.
 */
export function useObjectRef<T extends THREE.Object3D = THREE.Object3D>(): ObjectRef<T> {
  const object: ShallowRef<T | null> = shallowRef<T | null>(null)
  const mounted = shallowRef(false)
  let currentInstance: Instance | null = null

  const refCallback = (value: unknown) => {
    // Cleanup previous instance
    if (currentInstance) {
      currentInstance._onReconstruct = undefined
    }

    if (value == null) {
      object.value = null
      mounted.value = false
      currentInstance = null
      return
    }

    // value is the Instance proxy — access .object for the THREE object
    if (isInstanceWithObject<T>(value)) {
      object.value = value.object
      mounted.value = true
      currentInstance = value

      // Handle reconstruction (args/object prop changes)
      value._onReconstruct = () => {
        if (isInstanceWithObject<T>(value)) {
          object.value = value.object
        }
      }
    }
  }

  onBeforeUnmount(() => {
    if (currentInstance) {
      currentInstance._onReconstruct = undefined
      currentInstance = null
    }
    object.value = null
    mounted.value = false
  })

  return {
    ref: refCallback,
    object,
    mounted: readonly(mounted),
  }
}

type InputLike = string | string[] | string[][] | Readonly<string | string[] | string[][]>
type LoaderLike = THREE.Loader<unknown, InputLike>
type GLTFLike = { scene: THREE.Object3D }

type LoaderInstance<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> =
  T extends ConstructorRepresentation<LoaderLike> ? InstanceType<T> : T

export type LoaderResult<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> = Awaited<
  ReturnType<LoaderInstance<T>['loadAsync']>
> extends infer R
  ? R extends GLTFLike
    ? R & ObjectMap
    : R
  : never

export type Extensions<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> = (
  loader: LoaderInstance<T>,
) => void

const memoizedLoaders = new WeakMap<ConstructorRepresentation<LoaderLike>, LoaderLike>()

const isConstructor = <T>(
  value: unknown,
): value is ConstructorRepresentation<THREE.Loader<T, string | string[] | string[][]>> =>
  typeof value === 'function' && value?.prototype?.constructor === value

function isLoaderLike(value: unknown): value is LoaderLike {
  return typeof value === 'object' && value !== null && 'load' in value
}

function isLoaderInstance<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  value: unknown,
): value is LoaderInstance<L> {
  return typeof value === 'object' && value !== null && 'load' in value
}

function getErrorMessage(error: unknown): string {
  if (isErrorEvent(error)) return error.message
  if (error instanceof Error) return error.message
  return String(error)
}

// Module-level cache for loaded assets
const loaderCache = new Map<string, Promise<unknown[]>>()

function getCacheKey(Proto: LoaderLike | ConstructorRepresentation<LoaderLike>, urls: string[]): string {
  const protoId = typeof Proto === 'function' ? Proto.name : String(Proto)
  return `${protoId}:${urls.join(',')}`
}

function loadResources<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  Proto: L,
  urls: string[],
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): Promise<unknown[]> {
  let loader: LoaderLike | undefined

  // Construct and cache loader if constructor was passed
  if (isConstructor(Proto)) {
    loader = memoizedLoaders.get(Proto)
    if (!loader) {
      loader = new Proto()
      memoizedLoaders.set(Proto, loader)
    }
  } else if (isLoaderLike(Proto)) {
    loader = Proto
  }

  if (!loader) throw new Error('V3F: Invalid loader passed to useLoader')

  // Apply loader extensions
  if (extensions && isLoaderInstance<L>(loader)) extensions(loader)

  const resolvedLoader = loader

  // Go through the urls and load them
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<LoaderResult<L>>((res, reject) =>
          resolvedLoader.load(
            url,
            (data) => {
              const loaded = data as (LoaderResult<L> & Partial<GLTFLike>) | null
              if (loaded && isObject3D(loaded.scene)) Object.assign(loaded, buildGraph(loaded.scene))
              res(loaded)
            },
            onProgress,
            (error) => reject(new Error(`Could not load ${url}: ${getErrorMessage(error)}`)),
          ),
        ),
    ),
  )
}

/**
 * Loads and caches assets with a three loader. Returns a shallowRef that is populated when loading completes.
 * @see https://docs.pmnd.rs/vue-three-fiber/api/composables#useloader
 */
export function useLoader<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: string,
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): ShallowRef<LoaderResult<L> | null>
export function useLoader<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: string[],
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): ShallowRef<LoaderResult<L>[] | null>
export function useLoader<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: string | string[],
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): ShallowRef<LoaderResult<L> | LoaderResult<L>[] | null> {
  const keys = Array.isArray(input) ? input : [input]
  const result: ShallowRef<LoaderResult<L> | LoaderResult<L>[] | null> = shallowRef(null)
  const cacheKey = getCacheKey(loader, keys)

  // Check cache or start loading
  let promise = loaderCache.get(cacheKey)
  if (!promise) {
    promise = loadResources(loader, keys, extensions, onProgress)
    loaderCache.set(cacheKey, promise)
  }

  promise.then((results) => {
    result.value = Array.isArray(input) ? (results as LoaderResult<L>[]) : (results[0] as LoaderResult<L>)
  })

  return result
}

/**
 * Async version of useLoader for use with Vue Suspense.
 */
export async function useLoaderAsync<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: string,
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): Promise<LoaderResult<L>>
export async function useLoaderAsync<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: string[],
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): Promise<LoaderResult<L>[]>
export async function useLoaderAsync<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: string | string[],
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): Promise<LoaderResult<L> | LoaderResult<L>[]> {
  const keys = Array.isArray(input) ? input : [input]
  const cacheKey = getCacheKey(loader, keys)

  let promise = loaderCache.get(cacheKey)
  if (!promise) {
    promise = loadResources(loader, keys, extensions, onProgress)
    loaderCache.set(cacheKey, promise)
  }

  const results = await promise
  return Array.isArray(input) ? (results as LoaderResult<L>[]) : (results[0] as LoaderResult<L>)
}

/**
 * Preloads an asset into cache as a side-effect.
 */
useLoader.preload = function <L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: InputLike,
  extensions?: Extensions<L>,
): void {
  const keys = Array.isArray(input) ? (input as string[]) : [input as string]
  const cacheKey = getCacheKey(loader, keys)
  if (!loaderCache.has(cacheKey)) {
    loaderCache.set(cacheKey, loadResources(loader, keys, extensions))
  }
}

/**
 * Removes a loaded asset from cache.
 */
useLoader.clear = function <L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  _loader: L,
  input: InputLike,
): void {
  const keys = Array.isArray(input) ? (input as string[]) : [input as string]
  const cacheKey = getCacheKey(_loader, keys)
  loaderCache.delete(cacheKey)
}

/**
 * Watch reactive Vue sources and invalidate the current root on change.
 * Useful with `frameloop='demand'` to trigger re-renders when reactive data changes.
 * @see https://docs.pmnd.rs/vue-three-fiber/api/composables#watchinvalidate
 */
export function watchInvalidate(source: WatchSource | WatchSource[], options?: WatchOptions): WatchHandle {
  const store = useStore()
  return watch(
    source,
    () => {
      invalidate(store.getState())
    },
    options,
  )
}

// ---------------------------------------------------------------------------
// Render lifecycle composables
// ---------------------------------------------------------------------------

/**
 * Registers a callback that runs after each rendered frame.
 * Automatically subscribes on mount and unsubscribes on unmount.
 */
export function useAfterRender(callback: (timestamp: number) => void): void {
  let unsub: (() => void) | undefined

  onMounted(() => {
    unsub = addAfterEffect(callback)
  })

  onBeforeUnmount(() => {
    unsub?.()
  })
}

/**
 * Returns a function that resolves after one rendered frame.
 * Must be called during component setup (uses inject).
 */
export function useNextFrame(): () => Promise<void> {
  const store = useStore()

  return () =>
    new Promise<void>((resolve) => {
      const unsub = addAfterEffect(() => {
        unsub()
        resolve()
      })
      invalidate(store.getState())
    })
}

/** Return type of {@link useRenderCommit}. */
export interface RenderCommit {
  commit: () => Promise<void>
}

/**
 * Returns an object with a `commit` method that waits until Vue updates
 * and the scene have been committed (nextTick + one rendered frame).
 * Must be called during component setup (uses inject).
 */
export function useRenderCommit(): RenderCommit {
  const store = useStore()

  return {
    commit: () =>
      new Promise<void>((resolve) => {
        nextTick(() => {
          const unsub = addAfterEffect(() => {
            unsub()
            resolve()
          })
          invalidate(store.getState())
        })
      }),
  }
}
