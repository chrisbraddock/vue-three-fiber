import { Color, type ColorRepresentation, type Object3D } from 'three'
import { createRenderer, markRaw, toRaw, type RendererOptions } from 'vue'
import {
  applyProps,
  resolve,
  invalidateInstance,
  attach,
  detach,
  isObject3D,
  findInitialRoot,
  IsAllOptional,
  Disposable,
} from './utils'
import type { RootStore } from './store'
import { removeInteractivity, type EventHandlers } from './events'

export interface Root {
  store: RootStore
}

export type AttachFnType<O = any> = (parent: any, self: O) => (() => void) | void
export type AttachType<O = unknown> = string | AttachFnType<O>

export type ConstructorRepresentation<T = any> = new (...args: any[]) => T

export interface Catalogue {
  [name: string]: ConstructorRepresentation<any>
}

// TODO: handle constructor overloads
// https://github.com/pmndrs/vue-three-fiber/pull/2931
// https://github.com/microsoft/TypeScript/issues/37079
export type Args<T> = T extends ConstructorRepresentation<any>
  ? T extends typeof Color
    ? [r: number, g: number, b: number] | [color: ColorRepresentation]
    : ConstructorParameters<T>
  : any[]

type ArgsProp<P> = {
  args?: P extends ConstructorRepresentation<any> ? Args<P> : any[]
}

export type InstanceProps<T = any, P = any> = ArgsProp<P> & {
  object?: T
  dispose?: null
  attach?: AttachType<T>
  onUpdate?: (self: T) => void
}

export interface Instance<O = any> {
  root: RootStore
  type: string
  parent: Instance | null
  children: Instance[]
  props: InstanceProps<O> & Record<string, any>
  object: (O & { __v3f?: Instance<O> }) | any
  eventCount: number
  handlers: Partial<EventHandlers>
  attach?: AttachType<O>
  previousAttach?: unknown
  isHidden: boolean
  _onReconstruct?: () => void
}

/** Vue render() container — a full Instance with _vnode for Vue's internal tracking */
export interface VueRenderContainer extends Instance {
  _vnode: unknown
}

export function createContainerInstance(root: RootStore): VueRenderContainer {
  return {
    _vnode: null,
    root,
    type: '__container',
    parent: null,
    children: [],
    props: Object.freeze({ args: [] }),
    object: null!,
    eventCount: 0,
    handlers: {},
    isHidden: false,
  }
}

const catalogue: Catalogue = {}

const PREFIX_REGEX = /^three(?=[A-Z])/

const toPascalCase = (type: string): string => `${type[0].toUpperCase()}${type.slice(1)}`

// Properties that belong to Instance (not delegated to the THREE object).
// Overlapping names (type, parent, children) route to Instance so that
// Vue's internal nodeOps and the test-renderer work correctly.
const INSTANCE_PROPS = new Set([
  'root',
  'type',
  'parent',
  'children',
  'props',
  'object',
  'eventCount',
  'handlers',
  'isHidden',
  'attach',
  'previousAttach',
  '_onReconstruct',
  '_vnode',
  '__proxy',
  // Vue reactive flags — must route to Instance so markRaw() prevents
  // Vue's ref() from wrapping the Proxy in another reactive layer.
  '__v_skip',
  '__v_raw',
  '__v_isReactive',
  '__v_isReadonly',
  '__v_isShallow',
])

/**
 * When the Proxy delegates property access to the THREE object, returned
 * values that are themselves V3F-managed Object3Ds are rewrapped in their
 * V3F Proxy so that `toBe(ref.value)` identity comparisons work.
 *
 * Plain objects (like `userData`) and arrays are wrapped in a lightweight
 * view Proxy that applies the same rewrapping on nested access.
 */
interface V3FManaged {
  __v3f?: Instance & { __proxy?: Instance }
}

function isV3FManaged(value: object): value is V3FManaged {
  return '__v3f' in value
}

function wrapV3FValue(value: unknown): unknown {
  if (value == null || typeof value !== 'object') return value
  // V3F-managed Object3D → return its Proxy
  if (isV3FManaged(value) && value.__v3f?.__proxy) {
    return value.__v3f.__proxy
  }
  // Plain object or array → create view Proxy for nested V3F lookups
  if (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype) {
    return new Proxy(value, v3fViewHandler)
  }
  return value
}

const v3fViewHandler: ProxyHandler<object> = {
  get(target, prop) {
    const value: unknown = Reflect.get(target, prop)
    if (typeof value === 'function') return value.bind(target)
    return wrapV3FValue(value)
  },
}

let i = 0

const isConstructor = (object: unknown): object is ConstructorRepresentation => typeof object === 'function'

export function extend(objects: ConstructorRepresentation): string
export function extend(objects: Catalogue): void
export function extend(objects: Catalogue | ConstructorRepresentation): string | void {
  if (isConstructor(objects)) {
    const Component = `${i++}`
    catalogue[Component] = objects
    // Return the catalogue key so it can be used with h(): h(extend(THREE.Mesh))
    return Component
  } else {
    Object.assign(catalogue, objects)
  }
}

function validateInstance(type: string, props: InstanceProps & Record<string, unknown>): void {
  const name = toPascalCase(type)
  const target = catalogue[name]

  if (type !== 'primitive' && !target)
    throw new Error(
      `V3F: ${name} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/vue-three-fiber/api/objects#using-3rd-party-objects-declaratively`,
    )

  if (type === 'primitive' && !props.object) throw new Error(`V3F: Primitives without 'object' are invalid!`)

  if (props.args !== undefined && !Array.isArray(props.args)) throw new Error('V3F: The args prop must be an array!')
}

function disposeOnIdle(object: Disposable) {
  if (typeof object.dispose === 'function') {
    const handleDispose = () => {
      try {
        object.dispose()
      } catch {
        // no-op
      }
    }

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(handleDispose)
    } else {
      setTimeout(handleDispose, 0)
    }
  }
}

function setSubtreeHidden(instance: Instance, hidden: boolean): void {
  instance.isHidden = hidden
  if (isObject3D(instance.object)) {
    instance.object.visible = !hidden
  }
  for (const child of instance.children) {
    setSubtreeHidden(child, hidden)
  }
}

function removeChild(parent: Instance, child: Instance, dispose?: boolean): void {
  if (!child) return

  // Skip empty instances (text/comment nodes)
  if (!child.type) {
    child.parent = null
    const childIndex = parent.children.indexOf(child)
    if (childIndex !== -1) parent.children.splice(childIndex, 1)
    return
  }

  // Unlink instances
  child.parent = null
  const childIndex = parent.children.indexOf(child)
  if (childIndex !== -1) parent.children.splice(childIndex, 1)

  // Eagerly tear down tree
  // When parent is the container, use the scene as the Object3D parent
  const isContainer = parent.type === '__container'
  const state = child.root?.getState()
  const parentObject = isContainer && state ? state.scene : parent.object
  if (child.props.attach) {
    detach(parent, child)
  } else if (isObject3D(child.object) && isObject3D(parentObject)) {
    parentObject.remove(child.object)
    removeInteractivity(findInitialRoot(child), child.object)
  }

  // Allow objects to bail out of unmount disposal with dispose={null}
  const shouldDispose = child.props.dispose !== null && dispose !== false

  // Recursively remove instance children
  for (let idx = child.children.length - 1; idx >= 0; idx--) {
    const node = child.children[idx]
    removeChild(child, node, shouldDispose)
  }
  child.children.length = 0

  // Unlink instance object
  delete child.object.__v3f

  // Dispose object whenever the renderer feels like it.
  // Never dispose of primitives because their state may be kept outside of Vue!
  // In order for an object to be able to dispose it
  //   - has a dispose method
  //   - cannot be a <primitive object={...} />
  //   - cannot be a Scene, because three has broken its own API
  if (shouldDispose && child.type !== 'primitive' && (child.object as { type?: string }).type !== 'Scene') {
    disposeOnIdle(child.object as Disposable)
  }

  // Tree was updated, request a frame for top-level instance
  if (dispose === undefined) invalidateInstance(child)
}

const EMPTY_PROPS: InstanceProps & Record<string, any> = Object.freeze({})

function createEmptyInstance(): Instance {
  return {
    root: null!,
    type: '',
    parent: null,
    children: [],
    props: EMPTY_PROPS,
    object: null!,
    eventCount: 0,
    handlers: {},
    isHidden: false,
  }
}

// Vue createRenderer node operations
const nodeOps: RendererOptions<Instance, Instance> = {
  createElement(
    type: string,
    _namespace?: unknown,
    _isCustom?: string,
    props?: Record<string, unknown> | null,
  ): Instance {
    // Remove three* prefix from elements if native element not present
    type = toPascalCase(type) in catalogue ? type : type.replace(PREFIX_REGEX, '')

    // Shallow-copy props so instance.props is decoupled from the vnode's
    // props object. Without this, auto-attach (which sets instance.props.attach
    // in applyProps) mutates the vnode, causing Vue to "undo" the attach on
    // re-render by calling patchProp(el, 'attach', 'material', null).
    const instanceProps: InstanceProps & Record<string, unknown> = { ...(props ?? {}) }

    // Vue's <Suspense> creates 'div' elements as hidden containers.
    // Return an empty pass-through instance so Suspense can work in
    // this custom renderer without polluting the Three.js scene graph.
    if (type === 'div') {
      return createEmptyInstance()
    }

    validateInstance(type, instanceProps)

    // Regenerate the V3F instance for primitives to simulate a new object
    if (type === 'primitive' && (instanceProps.object as any)?.__v3f) delete (instanceProps.object as any).__v3f

    // We need a root store. It will be set when inserted into the tree.
    // For now, create a placeholder instance without a real root.
    // The root will be inherited from the parent on insert.
    const instance: Instance = {
      root: null!,
      type,
      parent: null,
      children: [],
      props: instanceProps,
      object: null!,
      eventCount: 0,
      handlers: {},
      isHidden: false,
    }

    // Prevent Vue's ref() from wrapping the Instance in a reactive proxy.
    // Without this, accessing properties through the ref would go through
    // Vue's reactive Proxy AND our V3F Proxy, double-wrapping returned values.
    markRaw(instance)

    // Wrap in a Proxy so that Vue refs (vnode.el) transparently delegate
    // property access to the underlying THREE object. Vue has no
    // getPublicInstance hook, so refs resolve to the raw host element.
    // The Proxy ensures instanceof checks, property reads/writes, and
    // prototype lookups all behave as if the ref were the THREE object.
    const isInstanceProp = (prop: string | symbol): boolean => typeof prop === 'symbol' || INSTANCE_PROPS.has(prop)

    // Vue may call ref callbacks before insert() creates the THREE object
    // (child insert bails when parent has no root). Queue writes for later.
    let pendingWrites: Map<string | symbol, unknown> | null = null

    const proxy: Instance = new Proxy(instance, {
      get(target, prop, receiver) {
        if (isInstanceProp(prop)) return Reflect.get(target, prop, receiver)
        if (target.object != null && prop in target.object) {
          const value: unknown = target.object[prop]
          if (typeof value === 'function') return value.bind(target.object)
          return wrapV3FValue(value)
        }
        return Reflect.get(target, prop, receiver)
      },
      set(target, prop, value, receiver) {
        if (isInstanceProp(prop)) {
          // When 'object' transitions to a real value, flush pending writes
          if (prop === 'object' && value != null && pendingWrites !== null) {
            for (const [key, val] of pendingWrites) {
              value[key] = val
            }
            pendingWrites = null
          }
          return Reflect.set(target, prop, value, receiver)
        }
        if (target.object != null) {
          target.object[prop] = value
          return true
        }
        // Object not yet created — queue write for flush when object is set
        if (pendingWrites === null) pendingWrites = new Map()
        pendingWrites.set(prop, value)
        return true
      },
      getPrototypeOf(target) {
        if (target.object) return Object.getPrototypeOf(target.object)
        return Object.getPrototypeOf(target)
      },
    })
    Object.defineProperty(instance, '__proxy', { value: proxy, writable: false, enumerable: false })
    return proxy
  },

  insert(child: Instance, parent: Instance, anchor?: Instance | null): void {
    if (!child) return

    // Link instances (skip if already linked — subtree re-init)
    const alreadyLinked = child.parent === parent && parent.children.indexOf(child) !== -1
    child.parent = parent
    if (!alreadyLinked) {
      if (anchor) {
        const anchorIndex = parent.children.indexOf(anchor)
        if (anchorIndex !== -1) parent.children.splice(anchorIndex, 0, child)
        else parent.children.push(child)
      } else {
        parent.children.push(child)
      }
    }

    // Inherit root from parent
    if (!child.root && parent.root) {
      child.root = parent.root
    }

    // Bail if tree isn't mounted or parent is not a container.
    // This ensures that the tree is finalized
    const state = child.root?.getState()
    if (!state) return
    const isContainer = parent.type === '__container'

    // Suspense visibility: if a mounted child is moved to an empty-type parent
    // (e.g., a hidden container), hide its Three.js subtree. When moved back
    // to a real parent, restore visibility.
    if (!isContainer && !parent.type && child.object) {
      setSubtreeHidden(child, true)
      return
    }
    if (child.isHidden) {
      setSubtreeHidden(child, false)
    }

    if (!isContainer && !parent.parent && parent.object !== state.scene) return

    // Skip empty instances (text/comment nodes — no Three.js object needed)
    if (!child.type) return

    // Create & link object on first run
    // Use toRaw() to unwrap Vue reactive proxies from args — spreading a
    // reactive array wraps each item, breaking identity checks.
    if (!child.object) {
      const target = catalogue[toPascalCase(child.type)]
      child.object = child.props.object ?? new target(...(toRaw(child.props.args) ?? []))
      child.object.__v3f = child
    }

    // Set initial props
    applyProps(child.object, child.props)

    // Append instance
    // When parent is the container, use the scene as the Object3D parent
    const parentObject = isContainer ? state.scene : parent.object
    if (child.props.attach) {
      attach(parent, child)
    } else if (isObject3D(child.object) && isObject3D(parentObject)) {
      if (anchor && isObject3D(anchor.object)) {
        const childIndex = parentObject.children.indexOf(anchor.object)
        if (childIndex !== -1) {
          const existingIndex = parentObject.children.indexOf(child.object)
          if (existingIndex !== -1) {
            parentObject.children.splice(existingIndex, 1)
            const adjustedIndex = existingIndex < childIndex ? childIndex - 1 : childIndex
            parentObject.children.splice(adjustedIndex, 0, child.object)
          } else {
            child.object.parent = parentObject
            parentObject.children.splice(childIndex, 0, child.object)
            child.object.dispatchEvent({ type: 'added' })
            parentObject.dispatchEvent({ type: 'childadded', child: child.object })
          }
        } else {
          parentObject.add(child.object)
        }
      } else {
        parentObject.add(child.object)
      }
    }

    // Link subtree
    for (const childInstance of child.children) {
      nodeOps.insert(childInstance, child, null)
    }

    // Tree was updated, request a frame
    invalidateInstance(child)
  },

  remove(child: Instance): void {
    if (!child || !child.parent) return
    removeChild(child.parent, child)
  },

  patchProp(el: Instance, key: string, prevValue: unknown, nextValue: unknown): void {
    // Skip Vue internals
    if (key === 'key' || key === 'ref') return

    // Check if args changed — need to reconstruct
    if (key === 'args') {
      if (nextValue !== undefined && !Array.isArray(nextValue)) {
        console.warn('V3F: The args prop must be an array!')
        return
      }

      const oldArgs = Array.isArray(prevValue) ? prevValue : undefined
      const newArgs = Array.isArray(nextValue) ? nextValue : undefined
      const argsChanged =
        newArgs?.length !== oldArgs?.length ||
        newArgs?.some((value: unknown, index: number) => value !== oldArgs?.[index])

      if (argsChanged) {
        reconstructInstance(el, { ...el.props, args: newArgs })
        return
      }
    }

    // Check if primitive object changed — need to reconstruct
    if (key === 'object' && el.type === 'primitive' && prevValue !== nextValue) {
      if (!nextValue) {
        console.warn("V3F: Primitives without 'object' are invalid!")
        return
      }
      reconstructInstance(el, { ...el.props, object: nextValue })
      return
    }

    // Check if attach changed
    if (key === 'attach') {
      if (prevValue && el.parent) {
        detach(el.parent, el)
      }
      el.props.attach = nextValue as AttachType
      el.attach = nextValue as AttachType
      if (nextValue && el.parent) {
        attach(el.parent, el)
      }
      invalidateInstance(el)
      return
    }

    // Update props
    el.props[key] = nextValue

    // Apply prop to the Three.js object (also handles event handler registration)
    if (el.object) {
      if (nextValue != null) {
        applyProps(el.object, { [key]: nextValue } as any)
      } else {
        // Always pass event handler removals through applyProps
        applyProps(el.object, { [key]: undefined } as any)

        // For non-event props, reset to default from a fresh instance
        if (prevValue != null && el.type !== 'primitive') {
          const target = catalogue[toPascalCase(el.type)]
          if (target) {
            const defaultObj = new target(...(el.props.args ?? [])) as Record<string, unknown>
            const defaults = resolve(defaultObj, key)
            if (defaults.root) {
              // Use applyProps to handle read-only THREE.js properties
              // (position, rotation, scale, etc.) that require .copy()/.set()
              const resetProps: Record<string, unknown> = { [key]: defaults.root[defaults.key] }
              applyProps(el.object, resetProps)
            }
            if (
              defaultObj &&
              typeof defaultObj === 'object' &&
              'dispose' in defaultObj &&
              typeof defaultObj.dispose === 'function'
            )
              defaultObj.dispose()
          }
        }
      }
    }
  },

  createText(_text: string): Instance {
    // Three.js doesn't use text nodes; return a no-op instance
    return createEmptyInstance()
  },

  createComment(_text: string): Instance {
    return createEmptyInstance()
  },

  setText(_node: Instance, _text: string): void {
    // no-op for Three.js
  },

  setElementText(_node: Instance, _text: string): void {
    // no-op for Three.js
  },

  parentNode(node: Instance): Instance | null {
    return node.parent
  },

  nextSibling(node: Instance): Instance | null {
    if (!node.parent) return null
    const index = node.parent.children.indexOf(node)
    return node.parent.children[index + 1] ?? null
  },
}

// Deferred scene graph sync — when multiple siblings swap objects in a single
// patch cycle (e.g. primitive list reorder), individual remove+add operations
// steal objects from siblings. Instead, we defer the parent's children rebuild
// to a microtask that runs after all patchProp calls complete.
let _pendingParentSync: Set<Instance> | null = null

function scheduleParentSync(parent: Instance): void {
  if (!_pendingParentSync) {
    _pendingParentSync = new Set()
    Promise.resolve().then(flushParentSync)
  }
  _pendingParentSync.add(parent)
}

function flushParentSync(): void {
  const parents = _pendingParentSync!
  _pendingParentSync = null
  for (const parent of parents) {
    syncSceneChildren(parent)
  }
}

function syncSceneChildren(parent: Instance): void {
  const isContainer = parent.type === '__container'
  const state = parent.root?.getState()
  const parentObject = isContainer && state ? state.scene : parent.object
  if (!isObject3D(parentObject)) return

  // Build expected children from Instance tree order
  const managed = new Set<Object3D>()
  const expected: Object3D[] = []
  for (const child of parent.children) {
    if (!child.props.attach && isObject3D(child.object)) {
      managed.add(child.object)
      expected.push(child.object)
    }
  }

  // Preserve unmanaged children (e.g. pre-existing objects on primitives)
  for (const obj of parentObject.children) {
    if (!managed.has(obj)) {
      expected.push(obj)
    }
  }

  // Rebuild children array
  for (const obj of parentObject.children) {
    obj.parent = null
  }
  parentObject.children.length = 0
  for (const obj of expected) {
    obj.parent = parentObject
    parentObject.children.push(obj)
  }
}

function reconstructInstance(instance: Instance, newProps: InstanceProps & Record<string, any>): void {
  const parent = instance.parent
  if (!parent) return

  // Detach old — use scene when parent is the container
  const isContainer = parent.type === '__container'
  const state = instance.root?.getState()
  const parentObject = isContainer && state ? state.scene : parent.object
  if (instance.props.attach) {
    detach(parent, instance)
  }
  // For non-attach scene graph children, skip remove — deferred sync handles it.
  // Individual remove+add fails when siblings swap objects simultaneously.

  // Detach children from old object
  for (const child of instance.children) {
    if (child.props.attach) {
      detach(instance, child)
    } else if (isObject3D(child.object) && isObject3D(instance.object)) {
      instance.object.remove(child.object)
    }
  }

  // Dispose old object — only clear __v3f if it still belongs to this instance
  // (a sibling's reconstruction may have already claimed the object)
  if (instance.object?.__v3f === instance) delete instance.object.__v3f
  if (instance.type !== 'primitive') disposeOnIdle(instance.object as Disposable)

  // Update props
  instance.props = newProps

  // Create new object (toRaw unwraps Vue reactive proxies from args)
  const target = catalogue[toPascalCase(instance.type)]
  instance.object = instance.props.object ?? new target(...(toRaw(instance.props.args) ?? []))
  instance.object.__v3f = instance

  // Apply props
  applyProps(instance.object, instance.props)

  // Notify ref holders that the underlying object was reconstructed
  instance._onReconstruct?.()

  // Reattach to parent (use scene when parent is the container)
  if (instance.props.attach) {
    attach(parent, instance)
  } else if (isObject3D(instance.object) && isObject3D(parentObject)) {
    // Defer scene graph rebuild — batches correctly when siblings swap
    scheduleParentSync(parent)
  }

  // Reattach children
  for (const child of instance.children) {
    if (child.props.attach) {
      attach(instance, child)
    } else if (isObject3D(child.object) && isObject3D(instance.object)) {
      instance.object.add(child.object)
    }
  }

  // Tree was updated, request a frame
  invalidateInstance(instance)
}

export const { render, createApp } = createRenderer(nodeOps)
export { catalogue, removeChild }
