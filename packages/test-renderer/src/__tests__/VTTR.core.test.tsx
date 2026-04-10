import { useFrame, type Instance } from '@xperimntl/vue-threejs'
import { defineComponent, ref, h, Fragment } from 'vue'
import { Group, Mesh, BoxGeometry, MeshBasicMaterial, SphereGeometry, Object3D, Material } from 'three'

import VueThreeTestRenderer from '../index'

interface MeshLike {
  isMesh: boolean
}

function hasMeshFlag(obj: object): obj is MeshLike {
  return 'isMesh' in obj
}

function asMeshInstance(obj: Object3D): Mesh<BoxGeometry, Material> {
  if (!hasMeshFlag(obj) || !obj.isMesh) throw new Error('Expected a Mesh instance')
  return obj
}

describe('VueThreeTestRenderer Core', () => {
  it('renders h() elements', async () => {
    const MeshComp = defineComponent({
      setup() {
        return () => h('mesh', null, [h('boxGeometry', { args: [2, 2] }), h('meshBasicMaterial')])
      },
    })

    const renderer = await VueThreeTestRenderer.create(h(MeshComp))
    expect(renderer.scene.children[0].type).toEqual('Mesh')
    await renderer.update(h(MeshComp))
    expect(renderer.scene.children[0].type).toEqual('Mesh')
  })

  it('renders a simple component with hooks', async () => {
    const MeshComp = defineComponent({
      setup() {
        const meshRef = ref<InstanceType<typeof Mesh> | null>(null)
        useFrame(() => void (meshRef.value!.position.x += 0.01))
        return () => h('mesh', null, [h('boxGeometry', { args: [2, 2] }), h('meshBasicMaterial')])
      },
    })

    const renderer = await VueThreeTestRenderer.create(h(MeshComp))
    expect(renderer.scene.children[0].type).toEqual('Mesh')
    await renderer.update(h(MeshComp))
    expect(renderer.scene.children[0].type).toEqual('Mesh')
  })

  it('renders an empty scene', async () => {
    const Empty = defineComponent({
      setup() {
        return () => null
      },
    })
    const renderer = await VueThreeTestRenderer.create(h(Empty))

    expect(renderer.scene.type).toEqual('Scene')
    expect(renderer.scene.children).toEqual([])
    expect(renderer.toGraph()).toEqual([])
  })

  it('can render a composite component & correctly build simple graph', async () => {
    const Child = defineComponent({
      setup() {
        return () => h('mesh', null, [h('boxGeometry', { args: [2, 2] }), h('meshBasicMaterial')])
      },
    })

    const Parent = defineComponent({
      setup() {
        return () => h('group', null, [h('color', { attach: 'background', args: [0, 0, 0] }), h(Child)])
      },
    })

    const renderer = await VueThreeTestRenderer.create(h(Parent))

    expect(renderer.toGraph()).toMatchSnapshot()
  })

  it('updates types & names', async () => {
    const renderer = await VueThreeTestRenderer.create(
      h('mesh', null, [
        h('meshBasicMaterial', { name: 'basicMat' }, [h('color', { attach: 'color', args: [0, 0, 0] })]),
      ]),
    )

    let childInstance = asMeshInstance(renderer.scene.children[0].instance)

    expect(childInstance.material.type).toEqual('MeshBasicMaterial')
    expect(childInstance.material.name).toEqual('basicMat')

    await renderer.update(
      h('mesh', null, [
        h('meshStandardMaterial', { name: 'standardMat' }, [h('color', { attach: 'color', args: [255, 255, 255] })]),
      ]),
    )

    childInstance = asMeshInstance(renderer.scene.children[0].instance)

    expect(childInstance.material.type).toEqual('MeshStandardMaterial')
    expect(childInstance.material.name).toEqual('standardMat')
  })

  it('updates children', async () => {
    const renderer = await VueThreeTestRenderer.create(
      h('group', null, [
        h('mesh', { key: 'a', 'position-z': 12 }, [h('boxGeometry', { args: [2, 2] }), h('meshBasicMaterial')]),
        h('mesh', { key: 'b', 'position-y': 12 }, [h('boxGeometry', { args: [4, 4] }), h('meshBasicMaterial')]),
        h('mesh', { key: 'c', 'position-x': 12 }, [h('boxGeometry', { args: [6, 6] }), h('meshBasicMaterial')]),
      ]),
    )

    expect(renderer.toTree()).toMatchSnapshot()

    await renderer.update(
      h('group', null, [
        h('mesh', { key: 'd', 'rotation-x': 1 }, [h('boxGeometry', { args: [6, 6] }), h('meshBasicMaterial')]),
        h('mesh', { key: 'b', 'position-y': 12 }, [h('boxGeometry', { args: [4, 4] }), h('meshBasicMaterial')]),
        h('mesh', { key: 'c', 'position-x': 12 }, [h('boxGeometry', { args: [2, 2] }), h('meshBasicMaterial')]),
      ]),
    )

    expect(renderer.toTree()).toMatchSnapshot()
  })

  // In Vue's custom renderer, refs receive Instance nodes (not Object3D).
  // The vnode must be created inside a render function for Vue refs to work.
  it('gives a ref to native components', async () => {
    const log: Instance[] = []
    const Wrapper = defineComponent({
      setup() {
        return () => h('mesh', { ref: (r: Instance) => log.push(r) })
      },
    })
    await VueThreeTestRenderer.create(h(Wrapper))
    expect(log.length).toEqual(1)

    expect(log[0].object.type).toEqual('Mesh')
  })

  it('toTree() handles nested Fragments', async () => {
    const Component = defineComponent({
      setup() {
        return () => h(Fragment, null, [h(Fragment, null, [h('group')])])
      },
    })
    const renderer = await VueThreeTestRenderer.create(h(Component))

    expect(renderer.toTree()).toMatchSnapshot()
  })

  it('correctly builds a tree', async () => {
    const vertices = new Float32Array([
      -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0,
    ])

    const MeshComp = defineComponent({
      setup() {
        return () =>
          h('mesh', null, [
            h('bufferGeometry', { attach: 'geometry' }, [
              h('bufferAttribute', { attach: 'attributes-position', args: [vertices, 3] }),
            ]),
            h('meshBasicMaterial', { attach: 'material', color: 'hotpink' }),
          ])
      },
    })

    const Child = defineComponent({
      props: { col: { type: Array, required: true } },
      setup(props) {
        return () => h('color', { attach: 'background', args: props.col })
      },
    })

    const Null = defineComponent({
      setup() {
        return () => null
      },
    })

    const Component = defineComponent({
      setup() {
        return () => h('group', { position: [1, 2, 3] }, [h(Child, { col: [0, 0, 255] }), h(MeshComp), h(Null)])
      },
    })

    const renderer = await VueThreeTestRenderer.create(h(Component))

    expect(renderer.toTree()).toMatchSnapshot()
  })

  it('toTree() handles complicated tree of fragments', async () => {
    const renderer = await VueThreeTestRenderer.create(
      h(Fragment, null, [
        h(Fragment, null, [
          h('group', null, [h('color', { attach: 'background', args: [0, 0, 0] })]),
          h(Fragment, null, [h('group', null, [h('color', { attach: 'background', args: [0, 0, 255] })])]),
        ]),
        h('group', null, [h('color', { attach: 'background', args: [255, 0, 0] })]),
      ]),
    )

    expect(renderer.toTree()).toMatchSnapshot()
  })

  it('correctly searches through multiple levels in regular objects', async () => {
    const renderer = await VueThreeTestRenderer.create(
      h('group', { name: 'root-group' }, [
        h('mesh', { name: 'level1-mesh' }, [
          h('boxGeometry'),
          h('meshBasicMaterial', { color: 'red' }),
          h('mesh', { name: 'level2-mesh' }, [
            h('boxGeometry'),
            h('meshBasicMaterial', { color: 'green' }),
            h('mesh', { name: 'level3-mesh' }, [h('boxGeometry'), h('meshBasicMaterial', { color: 'blue' })]),
          ]),
        ]),
      ]),
    )

    const allMeshes = renderer.scene.findAllByType('Mesh')
    expect(allMeshes.length).toBe(3)

    const topMesh = renderer.scene.find((node) => node.props.name === 'level1-mesh')
    const nestedMeshes = topMesh.findAllByType('Mesh')
    expect(nestedMeshes.length).toBe(2)

    const level3 = topMesh.find((node) => node.props.name === 'level3-mesh')
    expect(level3).toBeDefined()
    expect(level3.type).toBe('Mesh')
  })

  it('Can search from retrieved primitive Instance', async () => {
    const group = new Group()
    group.name = 'PrimitiveGroup'

    const childMesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 'red' }))
    childMesh.name = 'PrimitiveChildMesh'
    group.add(childMesh)

    const nestedMesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 'red' }))
    nestedMesh.name = 'PrimitiveNestedChildMesh'
    childMesh.add(nestedMesh)

    const renderer = await VueThreeTestRenderer.create(h('primitive', { object: group }))

    const foundGroup = renderer.scene.findByType('Group')
    const foundMesh = foundGroup.children[0]
    const foundNestedMesh = foundMesh.findByType('Mesh')
    expect(foundNestedMesh).toBeDefined()
  })

  it('handles primitive objects and their children correctly in toGraph', async () => {
    const PrimitiveTestComponent = defineComponent({
      setup() {
        const group = new Group()
        group.name = 'PrimitiveGroup'

        const childMesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 'red' }))
        childMesh.name = 'PrimitiveChildMesh'
        group.add(childMesh)

        const nestedGroup = new Group()
        nestedGroup.name = 'NestedGroup'
        const nestedMesh = new Mesh(new SphereGeometry(0.5), new MeshBasicMaterial({ color: 'blue' }))
        nestedMesh.name = 'NestedMesh'
        nestedGroup.add(nestedMesh)
        group.add(nestedGroup)

        return () =>
          h(Fragment, null, [
            h('mesh', { name: 'RegularMesh' }, [h('boxGeometry', { args: [2, 2] }), h('meshBasicMaterial')]),
            h('primitive', { object: group }),
          ])
      },
    })

    const renderer = await VueThreeTestRenderer.create(h(PrimitiveTestComponent))

    expect(renderer.toGraph()).toMatchSnapshot()
  })
})
