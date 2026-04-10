import type { VNode } from 'vue'
import { Scene } from 'three'
import * as THREE from 'three'

import { extend, _roots, createRoot, act, events as createPointerEvents, type Instance } from '@xperimntl/vue-threejs'

const mockRoots = _roots

import { toTree } from './helpers/tree'
import { toGraph } from './helpers/graph'

import { createCanvas } from './createTestCanvas'
import { createEventFirer } from './fireEvent'

import type { CreateOptions, Renderer } from './types/public'
import { wrapFiber } from './createTestInstance'
import { waitFor, WaitOptions } from './helpers/waitFor'

// Extend catalogue for render API in tests.
extend(THREE as any)

const create = async (element: VNode, options?: Partial<CreateOptions>): Promise<Renderer> => {
  const canvas = createCanvas(options)

  const _root = createRoot(canvas)
  await _root.configure({
    frameloop: 'never',
    size: {
      width: options?.width ?? 1280,
      height: options?.height ?? 800,
      top: 0,
      left: 0,
    },
    ...options,
    events: options?.events ?? createPointerEvents,
  })

  const _rootEntry = mockRoots.get(canvas)!
  const _store = _rootEntry.store

  await act(async () => _root.render(element))
  const sceneObject: Instance<Scene>['object'] = _store.getState().scene
  const _scene = sceneObject.__v3f!

  // Vue's custom renderer inserts children into the container, not the scene Instance.
  // Bridge the container's children to the scene Instance so test queries work.
  const container = _rootEntry.vueContainer
  if (container) {
    Object.defineProperty(_scene, 'children', {
      get: () => container.children.filter((c) => c.type !== ''),
      configurable: true,
    })
  }

  return {
    scene: wrapFiber(_scene),
    async unmount() {
      await act(async () => {
        _root.unmount()
      })
    },
    getInstance() {
      // Bail if canvas is unmounted
      if (!mockRoots.has(canvas)) return null

      // In Vue, there is no fiber tree. Return the scene instance directly.
      return (_store.getState().scene as Scene & { __v3f?: Instance<Scene> }).__v3f ?? null
    },
    async update(newElement: VNode) {
      if (!mockRoots.has(canvas)) return console.warn('VTTR: attempted to update an unmounted root!')

      await act(async () => {
        _root.render(newElement)
      })
    },
    toTree() {
      return toTree(_scene)
    },
    toGraph() {
      return toGraph(_scene)
    },
    fireEvent: createEventFirer(act, _store),
    async advanceFrames(frames: number, delta: number | number[] = 1) {
      const state = _store.getState()
      const storeSubscribers = state.internal.subscribers

      storeSubscribers.forEach((subscriber) => {
        for (let i = 0; i < frames; i++) {
          if (Array.isArray(delta)) {
            const deltaArr: number[] = delta
            subscriber.ref.current(state, deltaArr[i] || deltaArr[deltaArr.length - 1])
          } else {
            const deltaNum: number = delta
            subscriber.ref.current(state, deltaNum)
          }
        }
      })
    },
  }
}

export { create, act, waitFor }
export type { WaitOptions }

export type {
  MockSyntheticEvent,
  CreateOptions,
  Renderer,
  SceneGraphItem,
  SceneGraph,
  TreeNode,
  Tree,
} from './types/public'
export { VueThreeTestInstance } from './types/public'
export default { create, act, waitFor }
