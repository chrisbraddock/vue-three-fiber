import type { VNode } from 'vue'
import type { Camera, RenderProps } from '@xperimntl/vue-threejs'

import { VueThreeTestInstance } from '../createTestInstance'

import type { MockEventData, CreateCanvasParameters } from './internal'

export { VueThreeTestInstance }

export type MockSyntheticEvent = {
  camera: Camera
  stopPropagation: () => void
  target: unknown
  currentTarget: VueThreeTestInstance
  sourceEvent: MockEventData
  [key: string]: unknown
}

export type CreateOptions = CreateCanvasParameters & RenderProps<HTMLCanvasElement>

export type Renderer = {
  scene: VueThreeTestInstance
  unmount: () => Promise<void>
  getInstance: () => null | unknown
  update: (el: VNode) => Promise<void>
  toTree: () => Tree | undefined
  toGraph: () => SceneGraph | undefined
  fireEvent: (element: VueThreeTestInstance, handler: string, data?: MockEventData) => Promise<unknown>
  advanceFrames: (frames: number, delta: number | number[]) => Promise<void>
}

export interface SceneGraphItem {
  type: string
  name: string
  children: SceneGraphItem[] | null
}

export type SceneGraph = SceneGraphItem[]

export interface TreeNode {
  type: string
  props: {
    [key: string]: unknown
  }
  children: TreeNode[]
}

export type Tree = TreeNode[]

export type { Act } from '@xperimntl/vue-threejs'
