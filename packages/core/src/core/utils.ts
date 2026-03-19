import * as THREE from 'three'
import { nextTick } from 'vue'
import { Instance } from './reconciler'
import type { EventHandlers } from './events'
import type { Dpr, RootStore, Size } from './store'

export type NonFunctionKeys<P> = { [K in keyof P]-?: P[K] extends Function ? never : K }[keyof P]
export type Overwrite<P, O> = Omit<P, NonFunctionKeys<O>> & O
export type Properties<T> = Pick<T, NonFunctionKeys<T>>
export type Mutable<P> = { [K in keyof P]: P[K] | Readonly<P[K]> }
export type IsOptional<T> = undefined extends T ? true : false
export type IsAllOptional<T extends any[]> = T extends [infer First, ...infer Rest]
  ? IsOptional<First> extends true
    ? IsAllOptional<Rest>
    : false
  : true

/**
 * Returns the instance's initial (outmost) root.
 */
export function findInitialRoot<T>(instance: Instance<T>): RootStore {
  let root = instance.root
  while (root.getState().previousRoot) root = root.getState().previousRoot!
  return root
}

export type Camera = (THREE.OrthographicCamera | THREE.PerspectiveCamera) & { manual?: boolean }
export const isOrthographicCamera = (def: Camera): def is THREE.OrthographicCamera =>
  def && (def as THREE.OrthographicCamera).isOrthographicCamera

export const isRef = (obj: unknown): obj is { current: unknown } =>
  obj != null && typeof obj === 'object' && 'current' in obj

export const isColorRepresentation = (value: unknown): value is THREE.ColorRepresentation =>
  value != null && (typeof value === 'string' || typeof value === 'number' || (value as THREE.Color).isColor)

export interface ObjectMap {
  nodes: { [name: string]: THREE.Object3D }
  materials: { [name: string]: THREE.Material }
  meshes: { [name: string]: THREE.Mesh }
}

export function calculateDpr(dpr: Dpr): number {
  // Err on the side of progress by assuming 2x dpr if we can't detect it
  // This will happen in workers where window is defined but dpr isn't.
  const target = typeof window !== 'undefined' ? window.devicePixelRatio ?? 2 : 1
  return Array.isArray(dpr) ? Math.min(Math.max(dpr[0], target), dpr[1]) : dpr
}

/**
 * Returns instance root state
 */
export function getRootState<T extends THREE.Object3D = THREE.Object3D>(obj: T) {
  return (obj as Instance<T>['object']).__v3f?.root.getState()
}

export interface EquConfig {
  /** Compare arrays by reference equality a === b (default), or by shallow equality */
  arrays?: 'reference' | 'shallow'
  /** Compare objects by reference equality a === b (default), or by shallow equality */
  objects?: 'reference' | 'shallow'
  /** If true the keys in both a and b must match 1:1 (default), if false a's keys must intersect b's */
  strict?: boolean
}

// A collection of compare functions
export const is = {
  obj: (a: unknown) => a === Object(a) && !is.arr(a) && typeof a !== 'function',
  fun: (a: unknown): a is Function => typeof a === 'function',
  str: (a: unknown): a is string => typeof a === 'string',
  num: (a: unknown): a is number => typeof a === 'number',
  boo: (a: unknown): a is boolean => typeof a === 'boolean',
  und: (a: unknown) => a === void 0,
  nul: (a: unknown) => a === null,
  arr: (a: unknown) => Array.isArray(a),
  equ(a: unknown, b: unknown, { arrays = 'shallow', objects = 'reference', strict = true }: EquConfig = {}) {
    // Wrong type or one of the two undefined, doesn't match
    if (typeof a !== typeof b || !!a !== !!b) return false
    // Atomic, just compare a against b
    if (is.str(a) || is.num(a) || is.boo(a)) return a === b
    const isObj = is.obj(a)
    if (isObj && objects === 'reference') return a === b
    const isArr = is.arr(a)
    if (isArr && arrays === 'reference') return a === b
    // Array or Object, shallow compare first to see if it's a match
    if ((isArr || isObj) && a === b) return true
    // Last resort, go through keys
    const ax = a as Record<string, unknown>
    const bx = b as Record<string, unknown>
    let i
    // Check if a has all the keys of b
    for (i in ax) if (!(i in bx)) return false
    // Check if values between keys match
    if (isObj && arrays === 'shallow' && objects === 'shallow') {
      for (i in strict ? bx : ax) if (!is.equ(ax[i], bx[i], { strict, objects: 'reference' })) return false
    } else {
      for (i in strict ? bx : ax) if (ax[i] !== bx[i]) return false
    }
    // If i is undefined
    if (is.und(i)) {
      // If both arrays are empty we consider them equal
      if (isArr && (a as unknown[]).length === 0 && (b as unknown[]).length === 0) return true
      // If both objects are empty we consider them equal
      if (isObj && Object.keys(ax).length === 0 && Object.keys(bx).length === 0) return true
      // Otherwise match them by value
      if (a !== b) return false
    }
    return true
  },
}

// Collects nodes and materials from a THREE.Object3D
export function buildGraph(object: THREE.Object3D): ObjectMap {
  const data: ObjectMap = { nodes: {}, materials: {}, meshes: {} }
  if (object) {
    object.traverse((obj: THREE.Object3D) => {
      if (obj.name) data.nodes[obj.name] = obj
      if ((obj as THREE.Mesh).material) {
        const mat = (obj as THREE.Mesh).material as THREE.Material
        if (!data.materials[mat.name]) data.materials[mat.name] = mat
      }
      if ((obj as THREE.Mesh).isMesh && !data.meshes[obj.name]) data.meshes[obj.name] = obj as THREE.Mesh
    })
  }
  return data
}

export interface Disposable {
  type?: string
  dispose?: () => void
}

// Disposes an object and all its properties
export function dispose<T extends Disposable>(obj: T): void {
  if (obj.type !== 'Scene') obj.dispose?.()
  for (const p in obj) {
    const prop = obj[p] as Disposable | undefined
    if (prop?.type !== 'Scene') prop?.dispose?.()
  }
}

// Vue handles key/ref/children internally in the renderer
export const VUE_INTERNAL_PROPS = ['children', 'key', 'ref']

// Gets only instance props from reconciler fibers
export function getInstanceProps<T = any>(pendingProps: Record<string, unknown>): Instance<T>['props'] {
  const props = {} as Instance<T>['props']

  for (const key in pendingProps) {
    if (!VUE_INTERNAL_PROPS.includes(key)) props[key] = pendingProps[key]
  }

  return props
}

// Each object in the scene carries a small LocalState descriptor
export function prepare<T = any>(target: T, root: RootStore, type: string, props: Instance<T>['props']): Instance<T> {
  const object = target as unknown as Instance['object']

  // Create instance descriptor
  let instance = object?.__v3f
  if (!instance) {
    instance = {
      root,
      type,
      parent: null,
      children: [],
      props: getInstanceProps(props),
      object,
      eventCount: 0,
      handlers: {},
      isHidden: false,
    }

    if (object) object.__v3f = instance
  }

  return instance as Instance<T>
}

export function resolve(
  root: Record<string, any>,
  key: string,
): { root: Record<string, any>; key: string; target: any } {
  if (!key.includes('-')) return { root, key, target: root[key] }

  // First try the entire key as a single property (e.g., 'foo-bar')
  if (key in root) {
    return { root, key, target: root[key] }
  }

  // Try piercing (e.g., 'material-color' -> material.color)
  let target: any = root
  const parts = key.split('-')

  for (const part of parts) {
    if (typeof target !== 'object' || target === null) {
      if (target !== undefined) {
        // Property exists but has unexpected shape
        const remaining = parts.slice(parts.indexOf(part)).join('-')
        return { root: target, key: remaining, target: undefined }
      }
      // Property doesn't exist - use original key as-is
      return { root, key, target: undefined }
    }
    key = part
    root = target
    target = target[key]
  }

  return { root, key, target }
}

// Checks if a dash-cased string ends with an integer
const INDEX_REGEX = /-\d+$/

export function attach(parent: Instance, child: Instance): void {
  const parentObject = parent.object ?? parent.root?.getState?.().scene
  if (!parentObject) return

  if (is.str(child.props.attach)) {
    // If attaching into an array (foo-0), create one
    if (INDEX_REGEX.test(child.props.attach)) {
      const index = child.props.attach.replace(INDEX_REGEX, '')
      const { root, key } = resolve(parentObject as Record<string, any>, index)
      if (!Array.isArray(root[key])) root[key] = []
    }

    const { root, key } = resolve(parentObject as Record<string, any>, child.props.attach)
    child.previousAttach = root[key]
    root[key] = child.object
  } else if (is.fun(child.props.attach)) {
    child.previousAttach = child.props.attach(parentObject, child.object)
  }
}

export function detach(parent: Instance, child: Instance): void {
  const parentObject = parent.object ?? parent.root?.getState?.().scene
  if (!parentObject) return

  if (is.str(child.props.attach)) {
    const { root, key } = resolve(parentObject as Record<string, any>, child.props.attach)
    const previous = child.previousAttach
    // When the previous value was undefined, it means the value was never set to begin with
    if (previous === undefined) delete root[key]
    // Otherwise set the previous value
    else root[key] = previous
  } else {
    ;(child.previousAttach as (() => void) | undefined)?.()
  }

  delete child.previousAttach
}

export const RESERVED_PROPS = [
  // Instance props
  'args',
  'dispose',
  'attach',
  'object',
  'onUpdate',
]

const MEMOIZED_PROTOTYPES = new Map()

function getMemoizedPrototype(root: Record<string, any>) {
  let ctor = MEMOIZED_PROTOTYPES.get(root.constructor)
  try {
    if (!ctor) {
      ctor = new (root.constructor as { new (): any })()
      MEMOIZED_PROTOTYPES.set(root.constructor, ctor)
    }
  } catch (e) {
    // ...
  }
  return ctor
}

// This function prepares a set of changes to be applied to the instance
export function diffProps<T = any>(instance: Instance<T>, newProps: Instance<T>['props']): Instance<T>['props'] {
  const changedProps = {} as Instance<T>['props']

  // Sort through props
  for (const prop in newProps) {
    // Skip reserved keys
    if (RESERVED_PROPS.includes(prop)) continue
    // Skip if props match
    if (is.equ(newProps[prop], instance.props[prop])) continue

    // Props changed, add them
    changedProps[prop] = newProps[prop]

    // Reset pierced props
    for (const other in newProps) {
      if (other.startsWith(`${prop}-`)) changedProps[other] = newProps[other]
    }
  }

  // Reset removed props for HMR
  for (const prop in instance.props) {
    if (RESERVED_PROPS.includes(prop) || newProps.hasOwnProperty(prop)) continue

    const { root, key } = resolve(instance.object, prop)

    // https://github.com/mrdoob/three.js/issues/21209
    // HMR/fast-refresh relies on the ability to cancel out props, but threejs
    // has no means to do this. Hence we curate a small collection of value-classes
    // with their respective constructor/set arguments
    // For removed props, try to set default values, if possible
    if (root.constructor && root.constructor.length === 0) {
      // create a blank slate of the instance and copy the particular parameter.
      const ctor = getMemoizedPrototype(root)
      if (!is.und(ctor)) changedProps[key] = ctor[key]
    } else {
      // instance does not have constructor, just set it to 0
      changedProps[key] = 0
    }
  }

  return changedProps
}

// https://github.com/mrdoob/three.js/pull/27042
// https://github.com/mrdoob/three.js/pull/22748
const colorMaps = ['map', 'emissiveMap', 'sheenColorMap', 'specularColorMap', 'envMap']

const EVENT_REGEX = /^on(Pointer|Click|DoubleClick|ContextMenu|Wheel)/

type ClassConstructor = { new (): void }

// This function applies a set of changes to the instance
export function applyProps<T = any>(object: Instance<T>['object'], props: Instance<T>['props']): Instance<T>['object'] {
  const instance = object.__v3f
  const rootState = instance && findInitialRoot(instance).getState()
  const prevHandlers = instance?.eventCount

  for (const prop in props) {
    let value = props[prop]

    // Don't mutate reserved keys
    if (RESERVED_PROPS.includes(prop)) continue

    // Deal with pointer events, including removing them if undefined
    if (instance && EVENT_REGEX.test(prop)) {
      if (typeof value === 'function') {
        ;(instance.handlers as Record<string, unknown>)[prop] = value
      } else delete (instance.handlers as Record<string, unknown>)[prop]
      instance.eventCount = Object.keys(instance.handlers).length
      continue
    }

    // Ignore setting undefined props
    if (value === undefined) continue

    let { root, key, target } = resolve(object as Record<string, any>, prop)

    // Throw an error if we attempted to set a pierced prop to a non-object
    if (target === undefined && (typeof root !== 'object' || root === null)) {
      throw Error(`V3F: Cannot set "${prop}". Ensure it is an object before setting "${key}".`)
    }

    // Layers must be written to the mask property
    if (target instanceof THREE.Layers && value instanceof THREE.Layers) {
      target.mask = value.mask
    }
    // Set colors if valid color representation for automatic conversion (copy)
    else if (target instanceof THREE.Color && isColorRepresentation(value)) {
      target.set(value)
    }
    // Copy if properties match signatures and implement math interface (likely read-only)
    else if (
      target !== null &&
      typeof target === 'object' &&
      typeof target.set === 'function' &&
      typeof target.copy === 'function' &&
      (value as ClassConstructor | null)?.constructor &&
      (target as ClassConstructor).constructor === (value as ClassConstructor).constructor
    ) {
      target.copy(value)
    }
    // Set array types
    else if (
      target !== null &&
      typeof target === 'object' &&
      typeof target.set === 'function' &&
      Array.isArray(value)
    ) {
      if (typeof target.fromArray === 'function') target.fromArray(value)
      else target.set(...value)
    }
    // Set literal types
    else if (
      target !== null &&
      typeof target === 'object' &&
      typeof target.set === 'function' &&
      typeof value === 'number'
    ) {
      // Allow setting array scalars
      if (typeof target.setScalar === 'function') target.setScalar(value)
      // Otherwise just set single value
      else target.set(value)
    }
    // Else, just overwrite the value
    else {
      root[key] = value

      // Auto-convert sRGB texture parameters for built-in materials
      if (
        rootState &&
        !rootState.linear &&
        colorMaps.includes(key) &&
        (root[key] as unknown as THREE.Texture | undefined)?.isTexture &&
        // sRGB textures must be RGBA8 since r137 https://github.com/mrdoob/three.js/pull/23129
        (root[key] as THREE.Texture).format === THREE.RGBAFormat &&
        (root[key] as THREE.Texture).type === THREE.UnsignedByteType
      ) {
        // NOTE: this cannot be set from the renderer (e.g. sRGB source textures rendered to P3)
        ;(root[key] as THREE.Texture & { colorSpace?: THREE.ColorSpace }).colorSpace = THREE.SRGBColorSpace
      }
    }
  }

  // Register event handlers
  if (
    instance?.parent &&
    rootState?.internal &&
    (instance.object as unknown as THREE.Object3D | undefined)?.isObject3D &&
    prevHandlers !== instance.eventCount
  ) {
    const object = instance.object as unknown as THREE.Object3D
    // Pre-emptively remove the instance from the interaction manager
    const index = rootState.internal.interaction.indexOf(object)
    if (index > -1) rootState.internal.interaction.splice(index, 1)
    // Add the instance to the interaction manager only when it has handlers
    if (instance.eventCount && object.raycast !== null) {
      rootState.internal.interaction.push(object)
    }
  }

  // Auto-attach geometries and materials
  if (instance && instance.props.attach === undefined) {
    if ((instance.object as unknown as THREE.BufferGeometry).isBufferGeometry) instance.props.attach = 'geometry'
    else if ((instance.object as unknown as THREE.Material).isMaterial) instance.props.attach = 'material'
  }

  // Instance was updated, request a frame
  if (instance) invalidateInstance(instance)

  return object
}

export function invalidateInstance(instance: Instance): void {
  if (!instance.parent) return

  instance.props.onUpdate?.(instance.object)

  const state = instance.root?.getState?.()
  if (state && state.internal.frames === 0) state.invalidate()
}

export function updateCamera(camera: Camera, size: Size): void {
  // Do not mess with the camera if it belongs to the user
  if (camera.manual) return

  if (isOrthographicCamera(camera)) {
    camera.left = size.width / -2
    camera.right = size.width / 2
    camera.top = size.height / 2
    camera.bottom = size.height / -2
  } else {
    camera.aspect = size.width / size.height
  }

  camera.updateProjectionMatrix()
}

export const isObject3D = (object: unknown): object is THREE.Object3D => (object as THREE.Object3D)?.isObject3D === true

function isThenable(value: unknown): value is PromiseLike<unknown> {
  if (value == null) return false
  if (value instanceof Promise) return true
  return typeof value === 'object' && 'then' in value && typeof value.then === 'function'
}

/**
 * Vue-compatible act utility for testing.
 * Runs the callback, flushes pending Vue updates, and returns the callback's result.
 */
export async function act<T>(cb: () => Promise<T>): Promise<T>
export async function act<T>(cb: () => T): Promise<T>
export async function act(cb: () => unknown): Promise<unknown> {
  const result = cb()
  const value = isThenable(result) ? await result : result
  // Flush Vue's async rendering pipeline.
  // Multiple nextTick + microtask flushes ensure pending.then() chains resolve.
  // Using Promise.resolve() instead of setTimeout to work with fake timers.
  await nextTick()
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
  return value
}

export type Act = typeof act
