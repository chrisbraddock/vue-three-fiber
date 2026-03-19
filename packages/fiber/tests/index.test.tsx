import { h, defineComponent } from 'vue'
import * as THREE from 'three'
import ts from 'typescript'
import * as path from 'path'
import { createCanvas } from '@bluera/vue-threejs-test-renderer/src/createTestCanvas'
import {
  ReconcilerRoot,
  createRoot as createRootImpl,
  act,
  useFrame,
  useThree,
  createPortal,
  RootState,
  RootStore,
  extend,
} from '../src/index'

extend(THREE as any)
let root: ReconcilerRoot<HTMLCanvasElement> = null!
const roots: ReconcilerRoot<HTMLCanvasElement>[] = []

function createRoot() {
  const canvas = createCanvas()
  const root = createRootImpl(canvas)
  roots.push(root)
  return root
}

beforeEach(() => (root = createRoot()))

afterEach(async () => {
  for (const root of roots) {
    await act(async () => root.unmount())
  }
  roots.length = 0
})

describe('createRoot', () => {
  it('should return a Zustand store', async () => {
    const store = await act(async () => root.render(null))
    expect(() => store.getState()).not.toThrow()
  })

  it('will make an Orthographic Camera & set the position', async () => {
    const store = await act(async () =>
      (await root.configure({ orthographic: true, camera: { position: [0, 0, 5] } })).render(<group />),
    )
    const { camera } = store.getState()

    expect(camera).toBeInstanceOf(THREE.OrthographicCamera)
    expect(camera.position.z).toEqual(5)
  })

  // TODO: deprecate
  it('should handle an performance changing functions', async () => {
    let store: RootStore = null!
    await act(async () => {
      store = (await root.configure({ dpr: [1, 2], performance: { min: 0.2 } })).render(<group />)
    })

    expect(store.getState().viewport.initialDpr).toEqual(window.devicePixelRatio)
    expect(store.getState().performance.min).toEqual(0.2)
    expect(store.getState().performance.current).toEqual(1)

    await act(async () => {
      store.getState().setDpr(0.1)
    })

    expect(store.getState().viewport.dpr).toEqual(0.1)

    vi.useFakeTimers()

    await act(async () => {
      store.getState().performance.regress()
      vi.advanceTimersByTime(100)
    })

    expect(store.getState().performance.current).toEqual(0.2)

    await act(async () => {
      vi.advanceTimersByTime(200)
    })

    expect(store.getState().performance.current).toEqual(1)

    vi.useRealTimers()
  })

  it('should handle the DPR prop reactively', async () => {
    // Initial clamp
    const store = await act(async () => (await root.configure({ dpr: [1, 2] })).render(<group />))
    expect(store.getState().viewport.dpr).toEqual(window.devicePixelRatio)

    // Reactive update
    await act(async () => store.getState().setDpr(0.1))
    expect(store.getState().viewport.dpr).toEqual(0.1)

    // Reactive clamp
    await act(async () => store.getState().setDpr([1, 2]))
    expect(store.getState().viewport.dpr).toEqual(window.devicePixelRatio)
  })

  it('should set PCFSoftShadowMap as the default shadow map', async () => {
    const store = await act(async () => (await root.configure({ shadows: true })).render(<group />))
    const { gl } = store.getState()

    expect(gl.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
  })

  it('should set tonemapping to ACESFilmicToneMapping and outputColorSpace to SRGBColorSpace if linear is false', async () => {
    const store = await act(async () => (await root.configure({ linear: false })).render(<group />))
    const { gl } = store.getState()

    expect(gl.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(gl.outputColorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('should toggle render mode in xr', async () => {
    let state: RootState = null!

    await act(async () => {
      state = root.render(<group />).getState()
      state.gl.xr.isPresenting = true
      state.gl.xr.dispatchEvent({ type: 'sessionstart' })
    })

    expect(state.gl.xr.enabled).toEqual(true)

    await act(async () => {
      state.gl.xr.isPresenting = false
      state.gl.xr.dispatchEvent({ type: 'sessionend' })
    })

    expect(state.gl.xr.enabled).toEqual(false)
  })

  it('should respect frameloop="never" in xr', async () => {
    let respected = true

    const Test = defineComponent({
      setup() {
        useFrame(() => (respected = false))
        return () => null
      },
    })

    await act(async () => {
      const state = (await root.configure({ frameloop: 'never' })).render(<Test />).getState()
      state.gl.xr.isPresenting = true
      state.gl.xr.dispatchEvent({ type: 'sessionstart' })
    })

    expect(respected).toEqual(true)
  })

  it('should set renderer props via gl prop', async () => {
    const store = await act(async () =>
      (await root.configure({ gl: { logarithmicDepthBuffer: true } })).render(<group />),
    )
    const { gl } = store.getState()

    expect(gl.capabilities.logarithmicDepthBuffer).toBe(true)
  })

  it('should update scene via scene prop', async () => {
    let scene: THREE.Scene = null!

    await act(async () => {
      scene = (await root.configure({ scene: { name: 'test' } })).render(<group />).getState().scene
    })

    expect(scene.name).toBe('test')
  })

  it('should set a custom scene via scene prop', async () => {
    let scene: THREE.Scene = null!

    const prop = new THREE.Scene()

    await act(async () => {
      scene = (await root.configure({ scene: prop })).render(<group />).getState().scene
    })

    expect(prop).toBe(scene)
  })

  it('should set a renderer via gl callback', async () => {
    class Renderer extends THREE.WebGLRenderer {}

    let gl: Renderer = null!
    await act(async () => {
      gl = (await root.configure({ gl: (props) => new Renderer(props) })).render(<group />).getState().gl
    })

    expect(gl instanceof Renderer).toBe(true)
  })

  it('should respect color management preferences via gl', async () => {
    let gl: THREE.WebGLRenderer & { outputColorSpace?: string } = null!
    let texture: THREE.Texture & { colorSpace?: string } = null!

    let key = 0
    const Test = defineComponent({
      setup() {
        gl = useThree((state) => state.gl).value
        texture = new THREE.Texture()
        return () => h('meshBasicMaterial', { key: key++, map: texture })
      },
    })

    await act(async () => (await createRoot().configure({ linear: true })).render(<Test />))
    expect(gl.outputColorSpace).toBe(THREE.LinearSRGBColorSpace)
    expect(texture.colorSpace).toBe(THREE.NoColorSpace)

    await act(async () => (await createRoot().configure({ linear: false })).render(<Test />))
    expect(gl.outputColorSpace).toBe(THREE.SRGBColorSpace)
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('should respect legacy prop', async () => {
    THREE.ColorManagement.enabled = true

    await act(async () => {
      ;(await root.configure({ legacy: true })).render(<group />)
    })
    expect(THREE.ColorManagement.enabled).toBe(false)

    await act(async () => {
      ;(await root.configure({ legacy: false })).render(<group />)
    })
    expect(THREE.ColorManagement.enabled).toBe(true)
  })
})

describe('createPortal', () => {
  it('should create a state enclave', async () => {
    const scene = new THREE.Scene()

    let state: RootState = null!
    let portalState: RootState = null!

    const Normal = defineComponent({
      setup() {
        state = useThree().value

        return () => h('group')
      },
    })

    const Portal = defineComponent({
      setup() {
        portalState = useThree().value

        return () => h('group')
      },
    })

    await act(async () => {
      root.render(h('group', [h(Normal), createPortal(h(Portal), scene, { scene })]))
    })

    // Renders into portal target
    expect(scene.children.length).not.toBe(0)

    // Creates an isolated state enclave
    expect(state.scene).not.toBe(scene)
    expect(portalState.scene).toBe(scene)
  })

  it('should handle unmounted containers', async () => {
    const store = await act(async () => root.render(h('group', { key: 0 })))
    const firstGroup = store.getState().scene.children.find((c): c is THREE.Group => c.type === 'Group') ?? null

    expect(firstGroup).toBeDefined()

    await act(async () => root.render(h('group', { key: 1 })))
    const nextGroup = store.getState().scene.children.find((c): c is THREE.Group => c.type === 'Group') ?? null

    expect(nextGroup).toBeDefined()
    expect(firstGroup!.uuid).not.toBe(nextGroup!.uuid)
  })
})

function getExports(source: string): string[] {
  const program = ts.createProgram([source], { jsx: ts.JsxEmit.Preserve })
  const checker = program.getTypeChecker()
  const sourceFile = program.getSourceFile(source)!

  const sourceFileSymbol = checker.getSymbolAtLocation(sourceFile)!
  const moduleExports = checker.getExportsOfModule(sourceFileSymbol)

  return moduleExports.map(({ escapedName }) => escapedName).sort() as unknown as string[]
}

describe('exports', () => {
  it('matches public API', () => {
    const webExports = getExports(path.resolve(__dirname, '../src/index.ts'))
    expect(webExports).toMatchSnapshot()
  })

  // Vue port does not have a separate native entry point
  it.skip('are consistent between targets', () => {
    // No native.tsx in vue-three-fiber
  })
})
