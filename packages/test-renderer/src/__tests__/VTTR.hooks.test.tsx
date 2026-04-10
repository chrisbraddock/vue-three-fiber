import { defineComponent, h, type ShallowRef } from 'vue'
import { Camera, Scene, Raycaster, Mesh, Loader } from 'three'
import { useFrame, useLoader, useThree } from '@xperimntl/vue-threejs'

import VueThreeTestRenderer from '../index'

describe('VueThreeTestRenderer Hooks', () => {
  it('can handle useThree hook', async () => {
    let result: ShallowRef<{
      camera: Camera
      scene: Scene
      raycaster: Raycaster
      size: { width: number; height: number }
    }> | null = null

    const Component = defineComponent({
      setup() {
        const res = useThree((state) => ({
          camera: state.camera,
          scene: state.scene,
          size: state.size,
          raycaster: state.raycaster,
        }))

        result = res

        return () => h('group')
      },
    })

    await VueThreeTestRenderer.create(h(Component), { width: 1280, height: 800 })

    expect(result).not.toBeNull()
    const data = result!.value
    // Use .type string checks instead of instanceof to avoid multiple THREE.js instance issues
    expect(data.camera.type).toBe('PerspectiveCamera')
    expect(data.scene.type).toBe('Scene')
    expect(data.raycaster).toBeTruthy()
    expect(data.size).toEqual({ height: 800, width: 1280, top: 0, left: 0 })
  })

  it('can handle useLoader hook', async () => {
    const MockMesh = new Mesh()
    class TestLoader extends Loader<Mesh, string> {
      load(url: string, onLoad: (mesh: Mesh) => void): void {
        onLoad(MockMesh)
      }
    }

    const Component = defineComponent({
      setup() {
        const model = useLoader(TestLoader, '/suzanne.glb')

        // model is a ShallowRef; pass model.value (resolved by the time render runs)
        return () => {
          if (model.value) {
            return h('primitive', { object: model.value })
          }
          return h('group')
        }
      },
    })

    const renderer = await VueThreeTestRenderer.create(h(Component))

    // The TestLoader.load calls onLoad synchronously, but the promise .then()
    // is async. We need to wait for it to resolve and the component to re-render.
    await VueThreeTestRenderer.act(async () => {})

    expect(renderer.scene.children[0].instance).toBe(MockMesh)
  })

  it('can handle useFrame hook using test renderers advanceFrames function', async () => {
    const Component = defineComponent({
      setup() {
        useFrame((state, delta) => {
          // Access the mesh from the scene children
          // Use property check instead of instanceof to avoid multiple THREE.js instance issues
          const mesh = state.scene.children[0]
          if (mesh && 'isMesh' in mesh && mesh.rotation) {
            mesh.rotation.x += delta
          }
        })

        return () => h('mesh', null, [h('boxGeometry', { args: [2, 2] }), h('meshBasicMaterial')])
      },
    })

    const renderer = await VueThreeTestRenderer.create(h(Component))

    expect(renderer.scene.children[0].instance.rotation.x).toEqual(0)

    await VueThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(2, 1)
    })

    expect(renderer.scene.children[0].instance.rotation.x).toEqual(2)
  })
})
