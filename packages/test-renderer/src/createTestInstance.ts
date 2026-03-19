import type { Object3D } from 'three'
import type { Instance } from '@bluera/vue-threejs'

interface WithV3FInstance {
  __v3f?: Instance
}

function hasV3FInstance(obj: object): obj is WithV3FInstance {
  return '__v3f' in obj
}

import type { Obj, TestInstanceChildOpts } from './types/internal'

import { expectOne, matchProps, findAll } from './helpers/testInstance'

// Helper to create a minimal wrapper for Object3D children of primitives
const createVirtualInstance = (object: Object3D, parent: Instance<Object3D>): Instance<Object3D> => {
  // Create the virtual instance for this object
  // we can't import the prepare method from packages/core/src/core/utils.tsx so we do what we can
  const instance: Instance<Object3D> = {
    root: parent.root,
    type: object.type.toLowerCase(), // Convert to lowercase to match V3F convention
    parent,
    children: [],
    props: { args: [], object },
    object,
    eventCount: 0,
    handlers: {},
    isHidden: false,
  }

  // Recursively process children if they exist
  if (object.children && object.children.length > 0) {
    const objectChildren = object.children
    instance.children = Array.from(objectChildren).map((child) => createVirtualInstance(child, instance))
  }

  return instance
}

export class VueThreeTestInstance<TObject extends Object3D = Object3D> {
  _fiber: Instance<TObject>

  constructor(fiber: Instance<TObject>) {
    this._fiber = fiber
  }

  public get fiber(): Instance<TObject> {
    return this._fiber
  }

  public get instance(): TObject {
    return this._fiber.object
  }

  public get type(): string {
    return this._fiber.object.type
  }

  public get props(): Obj {
    return this._fiber.props
  }

  public get parent(): VueThreeTestInstance | null {
    const parent = this._fiber.parent
    if (parent !== null) {
      // If parent is the container, return the scene wrapper instead
      if (parent.type === '__container') {
        const state = this._fiber.root?.getState()
        if (state && hasV3FInstance(state.scene) && state.scene.__v3f) {
          return wrapFiber(state.scene.__v3f)
        }
        return null
      }
      return wrapFiber(parent)
    }
    return null
  }

  public get children(): VueThreeTestInstance[] {
    return this.getChildren(this._fiber)
  }

  public get allChildren(): VueThreeTestInstance[] {
    return this.getChildren(this._fiber, { exhaustive: true })
  }

  private getChildren = (
    fiber: Instance,
    opts: TestInstanceChildOpts = { exhaustive: false },
  ): VueThreeTestInstance[] => {
    // Get standard V3F children
    const v3fChildren = fiber.children
      .filter((child) => !child.props.attach || opts.exhaustive)
      .map((fib) => wrapFiber(fib))

    // For primitives, also add THREE.js object children
    if (fiber.type === 'primitive' && fiber.object.children?.length) {
      const threeChildren = fiber.object.children.map((child: Object3D) => {
        // Create a virtual instance that wraps the THREE.js child
        const virtualInstance = createVirtualInstance(child, fiber)
        return wrapFiber(virtualInstance)
      })

      v3fChildren.push(...threeChildren)

      return v3fChildren
    }

    return v3fChildren
  }

  public findAll = (decider: (node: VueThreeTestInstance) => boolean): VueThreeTestInstance[] =>
    findAll(this, decider, { includeRoot: false })

  public find = (decider: (node: VueThreeTestInstance) => boolean): VueThreeTestInstance =>
    expectOne(this.findAll(decider), `matching custom checker: ${decider.toString()}`)

  public findByType = (type: string): VueThreeTestInstance =>
    expectOne(
      this.findAll((node) => Boolean(node.type && node.type === type)),
      `with node type: "${type || 'Unknown'}"`,
    )

  public findAllByType = (type: string): VueThreeTestInstance[] =>
    this.findAll((node) => Boolean(node.type && node.type === type))

  public findByProps = (props: Obj): VueThreeTestInstance =>
    expectOne(this.findAllByProps(props), `with props: ${JSON.stringify(props)}`)

  public findAllByProps = (props: Obj): VueThreeTestInstance[] =>
    this.findAll((node: VueThreeTestInstance) => Boolean(node.props && matchProps(node.props, props)))
}

const fiberToWrapper = new WeakMap<Instance>()
export const wrapFiber = (fiber: Instance): VueThreeTestInstance => {
  let wrapper = fiberToWrapper.get(fiber)
  if (wrapper === undefined) {
    wrapper = new VueThreeTestInstance(fiber)
    fiberToWrapper.set(fiber, wrapper)
  }
  return wrapper
}
