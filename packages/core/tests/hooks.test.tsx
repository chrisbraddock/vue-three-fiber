import { defineComponent, h } from 'vue'
import * as THREE from 'three'
import { createCanvas } from '@bluera/vue-threejs-test-renderer/src/createTestCanvas'

import {
  ReconcilerRoot,
  createRoot,
  advance,
  useLoader,
  act,
  useThree,
  useGraph,
  useFrame,
  ObjectMap,
  useInstanceHandle,
  extend,
} from '../src'

extend(THREE as any)

describe('hooks', () => {
  let root: ReconcilerRoot<HTMLCanvasElement>

  beforeEach(() => {
    root = createRoot(createCanvas())
  })

  afterEach(async () => {
    await act(async () => root.unmount())
  })

  it('can handle useThree hook', async () => {
    let result = {} as {
      camera: THREE.Camera
      scene: THREE.Scene
      raycaster: THREE.Raycaster
      size: { width: number; height: number }
    }

    const Component = defineComponent({
      setup() {
        const res = useThree((state) => ({
          camera: state.camera,
          scene: state.scene,
          size: state.size,
          raycaster: state.raycaster,
        }))

        result = res.value

        return () => h('group')
      },
    })

    await act(async () => root.render(<Component />))

    expect(result.camera instanceof THREE.Camera).toBeTruthy()
    expect(result.scene instanceof THREE.Scene).toBeTruthy()
    expect(result.raycaster instanceof THREE.Raycaster).toBeTruthy()
    expect(result.size).toEqual({ height: 0, width: 0, top: 0, left: 0 })
  })

  it('can handle useFrame hook', async () => {
    const frameCalls: number[] = []

    const Component = defineComponent({
      setup() {
        useFrame((_, delta) => {
          frameCalls.push(delta)
        })

        return () => h('group')
      },
    })

    const store = await act(async () => (await root.configure({ frameloop: 'never' })).render(<Component />))

    advance(Date.now())
    expect(frameCalls.length).toBeGreaterThan(0)
  })

  it('can handle useLoader hook', async () => {
    const MockMesh = new THREE.Mesh()
    MockMesh.name = 'Scene'

    interface GLTF {
      scene: THREE.Object3D
    }
    class GLTFLoader extends THREE.Loader<GLTF, string> {
      load(_url: string, onLoad: (gltf: GLTF) => void): void {
        onLoad({ scene: MockMesh })
      }
    }

    let gltfRef: ReturnType<typeof useLoader> | null = null
    const Component = defineComponent({
      setup() {
        gltfRef = useLoader(GLTFLoader, '/suzanne.glb')
        return () => {
          const gltf = gltfRef?.value
          if (gltf && typeof gltf === 'object' && 'scene' in gltf) {
            return h('primitive', { object: gltf.scene })
          }
          return null
        }
      },
    })

    await act(async () => root.render(<Component />))

    // useLoader populates the ref asynchronously via the loader's load callback
    const loadedResult = gltfRef?.value
    expect(loadedResult).toBeTruthy()
    if (loadedResult && typeof loadedResult === 'object' && 'scene' in loadedResult) {
      expect(loadedResult.scene).toBe(MockMesh)
    }
  })

  it('can handle useLoader with an existing loader instance', async () => {
    class Loader extends THREE.Loader<null, string> {
      load(_url: string, onLoad: (result: null) => void): void {
        onLoad(null)
      }
    }

    const loader = new Loader()
    let proto!: Loader

    const Test = defineComponent({
      setup() {
        useLoader(loader, '', (loader) => (proto = loader))
        return () => null
      },
    })
    await act(async () => root.render(<Test />))

    expect(proto).toBe(loader)
  })

  it('can handle useLoader with a loader extension', async () => {
    class Loader extends THREE.Loader<null, string> {
      load(_url: string, onLoad: (result: null) => void): void {
        onLoad(null)
      }
    }

    let proto!: Loader

    const Test = defineComponent({
      setup() {
        useLoader(Loader, '', (loader) => (proto = loader))
        return () => null
      },
    })
    await act(async () => root.render(<Test />))

    expect(proto).toBeInstanceOf(Loader)
  })

  it('can handle useGraph hook', async () => {
    const group = new THREE.Group()
    const mat1 = new THREE.MeshBasicMaterial()
    mat1.name = 'Mat 1'
    const mesh1 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat1)
    mesh1.name = 'Mesh 1'
    const mat2 = new THREE.MeshBasicMaterial()
    mat2.name = 'Mat 2'
    const mesh2 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat2)
    mesh2.name = 'Mesh 2'
    const subGroup = new THREE.Group()
    const mat3 = new THREE.MeshBasicMaterial()
    mat3.name = 'Mat 3'
    const mesh3 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat3)
    mesh3.name = 'Mesh 3'
    const mat4 = new THREE.MeshBasicMaterial()
    mat4.name = 'Mat 4'
    const mesh4 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat4)
    mesh4.name = 'Mesh 4'

    subGroup.add(mesh3, mesh4)
    group.add(mesh1, mesh2, subGroup)

    let result = {} as ObjectMap

    const Component = defineComponent({
      setup() {
        const data = useGraph(group)
        result = data
        return () => h('mesh')
      },
    })

    await act(async () => root.render(<Component />))

    expect(result).toEqual({
      nodes: {
        [mesh1.name]: mesh1,
        [mesh2.name]: mesh2,
        [mesh3.name]: mesh3,
        [mesh4.name]: mesh4,
      },
      materials: {
        [mat1.name]: mat1,
        [mat2.name]: mat2,
        [mat3.name]: mat3,
        [mat4.name]: mat4,
      },
      meshes: {
        [mesh1.name]: mesh1,
        [mesh2.name]: mesh2,
        [mesh3.name]: mesh3,
        [mesh4.name]: mesh4,
      },
    })
  })

  it('can handle useInstanceHandle hook', async () => {
    let instance: ReturnType<typeof useInstanceHandle> = undefined

    const Component = defineComponent({
      setup() {
        // Access useThree to get the scene, then find group after render
        const state = useThree().value
        return () =>
          h('group', {
            onUpdate: (self: THREE.Group) => {
              instance = useInstanceHandle(self)
            },
          })
      },
    })

    const store = await act(async () => root.render(<Component />))
    const { scene } = store.getState()
    const group = scene.children[0]

    // The group should have been added to the scene by the custom renderer
    expect(group).toBeTruthy()
    // useInstanceHandle returns the __v3f instance
    if (group) {
      const handle = useInstanceHandle(group)
      // @ts-expect-error - accessing internal __v3f property for test verification
      expect(handle).toBe(group.__v3f)
    }
  })

  it('can handle future hooks without crashing', async () => {
    const Component = defineComponent({
      setup() {
        return () => null
      },
    })
    expect(async () => await act(async () => root.render(<Component />))).not.toThrow()
  })
})
