import { Scene } from 'three'
import type { Instance } from '@xperimntl/vue-threejs'
import type { TreeNode, Tree } from '../types/public'
import { lowerCaseFirstLetter } from './strings'

const treeObjectFactory = (
  type: TreeNode['type'],
  props: TreeNode['props'],
  children: TreeNode['children'],
): TreeNode => ({
  type,
  props,
  children,
})

const toTreeBranch = (children: Instance[]): TreeNode[] =>
  children
    .filter((child) => child.object != null)
    .map((child) => {
      return treeObjectFactory(
        lowerCaseFirstLetter(child.object.type || child.object.constructor.name),
        child.props,
        toTreeBranch(child.children),
      )
    })

export const toTree = (root: Instance<Scene>): Tree => toTreeBranch(root.children)
