import type { Instance } from '@xperimntl/vue-threejs'
import type { SceneGraphItem } from '../types/public'
import type { Object3D } from 'three'

const graphObjectFactory = (
  type: SceneGraphItem['type'],
  name: SceneGraphItem['name'],
  children: SceneGraphItem['children'],
): SceneGraphItem => ({
  type,
  name,
  children,
})

// Helper function to process raw THREE.js children objects
function processThreeChildren(children: Object3D[]): SceneGraphItem[] {
  return children.map((object) =>
    graphObjectFactory(
      object.type,
      object.name || '',
      object.children && object.children.length > 0 ? processThreeChildren(object.children) : [],
    ),
  )
}

export const toGraph = (object: Instance): SceneGraphItem[] => {
  return object.children.map((child) => {
    // Process standard V3F children
    const children = toGraph(child)

    // For primitives, also include THREE.js object children
    if (child.type === 'primitive' && child.object.children?.length) {
      const threeChildren = processThreeChildren(child.object.children)
      children.push(...threeChildren)
    }

    return graphObjectFactory(child.object.type, child.object.name ?? '', children)
  })
}
