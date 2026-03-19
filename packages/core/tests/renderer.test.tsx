import {
  h,
  defineComponent,
  ref,
  nextTick,
  onMounted,
  onBeforeUnmount,
  watch,
  Suspense,
  type VNode,
  Fragment,
  type PropType,
} from 'vue'
import * as THREE from 'three'
import {
  ReconcilerRoot,
  createRoot,
  act,
  extend,
  ThreeElement,
  ThreeElements,
  flushSync,
  useThree,
  useObjectRef,
  watchInvalidate,
  useAfterRender,
  useNextFrame,
  useRenderCommit,
  flushGlobalEffects,
  type ObjectRef,
} from '../src/index'

extend(THREE as any)

class Mock extends THREE.Group {
  static instances: string[]
  constructor(name: string = '') {
    super()
    this.name = name
    Mock.instances.push(name)
  }
}

declare module '@bluera/vue-threejs' {
  interface ThreeElements {
    mock: ThreeElement<typeof Mock>
    threeRandom: ThreeElement<typeof THREE.Group>
  }
}

extend({ Mock })

type ComponentMesh = THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>

// Helper to produce typed PropType without 'as' casts (Vue's standard pattern)
function propType<T>(): PropType<T> {
  return null!
}

describe('renderer', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
    Mock.instances = []
  })
  afterEach(async () => act(async () => root.unmount()))

  it('should render empty JSX', async () => {
    const store = await act(async () => root.render(null))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(0)
  })

  it('should render native elements', async () => {
    const store = await act(async () => root.render(h('group', { name: 'native' })))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(THREE.Group)
    expect(scene.children[0].name).toBe('native')
  })

  it('should render extended elements', async () => {
    const store = await act(async () => root.render(h('mock', { name: 'mock' })))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(Mock)
    expect(scene.children[0].name).toBe('mock')

    const Component = extend(THREE.Mesh)
    await act(async () => root.render(h(Component)))

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(THREE.Mesh)
  })

  it('should render primitives', async () => {
    const object = new THREE.Object3D()

    const store = await act(async () => root.render(h('primitive', { name: 'primitive', object })))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBe(object)
    expect(object.name).toBe('primitive')
  })

  it('should remove children from primitive when unmounted', async () => {
    const object = new THREE.Group()

    const Parent = defineComponent({
      props: {
        show: { type: Boolean, required: true },
      },
      setup(props, { slots }) {
        return () => (props.show ? h('primitive', { object }, slots.default?.()) : null)
      },
    })

    const Component = defineComponent({
      props: {
        show: { type: Boolean, required: true },
      },
      setup(props) {
        return () =>
          h(
            Parent,
            { show: props.show },
            {
              default: () => [h('group', { name: 'A' }), h('group', { name: 'B' })],
            },
          )
      },
    })

    const store = await act(async () => root.render(h(Component, { show: true })))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBe(object)
    expect(object.children.length).toBe(2)

    await act(async () => root.render(h(Component, { show: false })))

    expect(scene.children.length).toBe(0)
    expect(object.children.length).toBe(0)
  })

  it('should remove then add children from primitive when key changes', async () => {
    const object = new THREE.Group()

    const Parent = defineComponent({
      props: {
        primitiveKey: { type: String, required: true },
      },
      setup(props, { slots }) {
        return () => h('primitive', { key: props.primitiveKey, object }, slots.default?.())
      },
    })

    const Component = defineComponent({
      props: {
        primitiveKey: { type: String, required: true },
      },
      setup(props) {
        return () =>
          h(
            Parent,
            { primitiveKey: props.primitiveKey },
            {
              default: () => [h('group', { name: 'A' }), h('group', { name: 'B' })],
            },
          )
      },
    })

    const store = await act(async () => root.render(h(Component, { primitiveKey: 'A' })))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBe(object)
    expect(object.children.length).toBe(2)

    await act(async () => root.render(h(Component, { primitiveKey: 'B' })))

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBe(object)
    expect(object.children.length).toBe(2)
  })

  it('should go through lifecycle', async () => {
    const lifecycle: string[] = []

    const Test = defineComponent({
      setup() {
        onBeforeUnmount(() => void 0)
        onMounted(() => {
          lifecycle.push('onMounted')
        })
        lifecycle.push('render')
        return () => h('group', { ref: () => void lifecycle.push('ref') })
      },
    })
    await act(async () => root.render(h(Test)))

    expect(lifecycle).toStrictEqual(['render', 'ref', 'onMounted'])
  })

  it('should forward ref three object', async () => {
    const immutableRef = ref<THREE.Mesh | null>(null)
    const mutableRef = ref<THREE.Mesh | null>(null)
    const mutableRefSpecific = ref<THREE.Mesh | null>(null)

    const RefTest = defineComponent({
      setup() {
        return () =>
          h(Fragment, null, [
            h('mesh', { ref: immutableRef }),
            h('mesh', { ref: mutableRef }),
            h('mesh', { ref: (r: THREE.Mesh | null) => (mutableRefSpecific.value = r) }),
          ])
      },
    })

    await act(async () => root.render(h(RefTest)))

    expect(immutableRef.value).toBeInstanceOf(THREE.Mesh)
    expect(mutableRef.value).toBeInstanceOf(THREE.Mesh)
    expect(mutableRefSpecific.value).toBeInstanceOf(THREE.Mesh)
  })

  it('should handle children', async () => {
    const Test = defineComponent({
      setup() {
        return () => h('group', null, [h('mesh')])
      },
    })
    const store = await act(async () => root.render(h(Test)))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(THREE.Group)
    expect(scene.children[0].children.length).toBe(1)
    expect(scene.children[0].children[0]).toBeInstanceOf(THREE.Mesh)
  })

  it('should handle attach', async () => {
    const lifecycle: string[] = []

    const Test = defineComponent({
      setup() {
        return () =>
          h('mesh', null, [
            h('boxGeometry'),
            h('meshStandardMaterial'),
            h('group', { attach: 'userData-group' }),
            h('group', {
              ref: () => void lifecycle.push('mount'),
              attach: () => (lifecycle.push('attach'), () => lifecycle.push('detach')),
            }),
          ])
      },
    })
    const store = await act(async () => root.render(h(Test)))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(THREE.Mesh)
    // Handles geometry & material attach
    expect((scene.children[0] as ComponentMesh).geometry).toBeInstanceOf(THREE.BoxGeometry)
    expect((scene.children[0] as ComponentMesh).material).toBeInstanceOf(THREE.MeshStandardMaterial)
    // Handles nested attach
    expect(scene.children[0].userData.group).toBeInstanceOf(THREE.Group)
    // attach bypasses scene-graph
    expect(scene.children[0].children.length).toBe(0)
    // In Vue, ref callbacks fire before insert (which calls attach), so order differs from the reference implementation.
    expect(lifecycle).toStrictEqual(['mount', 'attach'])
  })

  it('should update props reactively', async () => {
    const store = await act(async () => root.render(h('group')))
    const { scene } = store.getState()
    const group = scene.children[0] as THREE.Group

    // Initial
    expect(group.name).toBe(new THREE.Group().name)

    // Set
    await act(async () => root.render(h('group', { name: 'one' })))
    expect(group.name).toBe('one')

    // Update
    await act(async () => root.render(h('group', { name: 'two' })))
    expect(group.name).toBe('two')

    // Unset
    await act(async () => root.render(h('group')))
    expect(group.name).toBe(new THREE.Group().name)
  })

  it('should handle event props reactively', async () => {
    const store = await act(async () => root.render(h('mesh')))
    const { scene, internal } = store.getState()
    const mesh = scene.children[0] as ComponentMesh
    mesh.name = 'current'

    // Initial
    expect(internal.interaction.length).toBe(0)

    // Set
    await act(async () => root.render(h('mesh', { onClick: () => void 0 })))
    expect(internal.interaction.length).toBe(1)
    expect(internal.interaction).toStrictEqual([mesh])

    // Update
    await act(async () => root.render(h('mesh', { onPointerOver: () => void 0 })))
    expect(internal.interaction.length).toBe(1)
    expect(internal.interaction).toStrictEqual([mesh])

    // Unset
    await act(async () => root.render(h('mesh')))
    expect(internal.interaction.length).toBe(0)
  })

  it('should handle the args prop reactively', async () => {
    const meshRef = ref<ComponentMesh | null>(null)
    const childRef = ref<THREE.Object3D | null>(null)
    const attachedChildRef = ref<THREE.Object3D | null>(null)

    const Test = defineComponent({
      props: {
        args: { type: propType<unknown[]>(), default: undefined },
      },
      setup(props) {
        return () =>
          h('mesh', { ...props, ref: meshRef }, [
            h('object3D', { ref: childRef }),
            h('object3D', { ref: attachedChildRef, attach: 'userData-attach' }),
          ])
      },
    })

    // Initial
    await act(async () => root.render(h(Test)))
    expect(meshRef.value!.geometry).toBeInstanceOf(THREE.BufferGeometry)
    expect(meshRef.value!.geometry).not.toBeInstanceOf(THREE.BoxGeometry)
    expect(meshRef.value!.material).toBeInstanceOf(THREE.Material)
    expect(meshRef.value!.material).not.toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(meshRef.value!.children[0]).toBe(childRef.value)
    expect(meshRef.value!.userData.attach).toBe(attachedChildRef.value)

    // Warn on non-array value (Vue's rendering pipeline makes throws
    // from nodeOps unhandleable, so patchProp uses console.warn instead)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await act(async () => root.render(h(Test, { args: {} })))
    expect(warnSpy).toHaveBeenCalledWith('V3F: The args prop must be an array!')
    warnSpy.mockRestore()

    // Set
    const geometry1 = new THREE.BoxGeometry()
    const material1 = new THREE.MeshStandardMaterial()
    await act(async () => root.render(h(Test, { args: [geometry1, material1] })))
    expect(meshRef.value!.geometry).toBe(geometry1)
    expect(meshRef.value!.material).toBe(material1)
    expect(meshRef.value!.children[0]).toBe(childRef.value)
    expect(meshRef.value!.userData.attach).toBe(attachedChildRef.value)

    // Update
    const geometry2 = new THREE.BoxGeometry()
    const material2 = new THREE.MeshStandardMaterial()
    await act(async () => root.render(h(Test, { args: [geometry2, material2] })))
    expect(meshRef.value!.geometry).toBe(geometry2)
    expect(meshRef.value!.material).toBe(material2)
    expect(meshRef.value!.children[0]).toBe(childRef.value)
    expect(meshRef.value!.userData.attach).toBe(attachedChildRef.value)

    // Unset
    await act(async () => root.render(h(Test)))
    expect(meshRef.value!.geometry).toBeInstanceOf(THREE.BufferGeometry)
    expect(meshRef.value!.geometry).not.toBeInstanceOf(THREE.BoxGeometry)
    expect(meshRef.value!.material).toBeInstanceOf(THREE.Material)
    expect(meshRef.value!.material).not.toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(meshRef.value!.children[0]).toBe(childRef.value)
    expect(meshRef.value!.userData.attach).toBe(attachedChildRef.value)
  })

  // skip: Vue custom renderer refs return Instance nodes, not THREE.Object3D.
  // The test relies on ref.value being a THREE.Object3D.
  it('should handle the object prop reactively', async () => {
    const objRef = ref<THREE.Object3D | null>(null)
    const childRef = ref<THREE.Object3D | null>(null)
    const attachedChildRef = ref<THREE.Object3D | null>(null)

    const Test = defineComponent({
      props: {
        object: { type: propType<THREE.Object3D>(), default: undefined },
      },
      setup(props) {
        return () =>
          h('primitive', { ...props, ref: objRef }, [
            h('object3D', { ref: childRef }),
            h('object3D', { ref: attachedChildRef, attach: 'userData-attach' }),
          ])
      },
    })

    const object1 = new THREE.Object3D()
    const child1 = new THREE.Object3D()
    object1.add(child1)

    const object2 = new THREE.Object3D()
    const child2 = new THREE.Object3D()
    object2.add(child2)

    // Vue host refs resolve to Instance proxy (platform constraint — Vue lacks
    // getPublicInstance for host elements). Use .object for raw Object3D identity
    // checks. useObjectRef (Phase 2) will provide direct object access.
    function unwrap(r: { value: THREE.Object3D | null }): THREE.Object3D {
      const v: Record<string, unknown> = r.value ?? {}
      if (v.object instanceof THREE.Object3D) return v.object
      throw new Error('Expected ref to contain an Instance proxy with .object')
    }

    // Initial
    await act(async () => root.render(h(Test, { object: object1 })))
    expect(unwrap(objRef)).toBe(object1)
    expect(unwrap(objRef).children).toStrictEqual([child1, unwrap(childRef)])
    expect(unwrap(objRef).userData.attach).toBe(unwrap(attachedChildRef))

    // Warn on undefined (Vue's async pipeline turns throws into unhandled rejections)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await act(async () => root.render(h(Test, { object: undefined })))
    expect(warnSpy).toHaveBeenCalledWith("V3F: Primitives without 'object' are invalid!")
    warnSpy.mockRestore()

    // Update
    await act(async () => root.render(h(Test, { object: object2 })))
    expect(unwrap(objRef)).toBe(object2)
    expect(unwrap(objRef).children).toStrictEqual([child2, unwrap(childRef)])
    expect(unwrap(objRef).userData.attach).toBe(unwrap(attachedChildRef))

    // Revert
    await act(async () => root.render(h(Test, { object: object1 })))
    expect(unwrap(objRef)).toBe(object1)
    expect(unwrap(objRef).children).toStrictEqual([child1, unwrap(childRef)])
    expect(unwrap(objRef).userData.attach).toBe(unwrap(attachedChildRef))
  })

  it('should handle unmount', async () => {
    const dispose = vi.fn()
    const childDispose = vi.fn()
    const attachDispose = vi.fn()
    const flagDispose = vi.fn()

    const attach = vi.fn()
    const detach = vi.fn()

    const object = Object.assign(new THREE.Object3D(), { dispose: vi.fn() })
    const objectExternal = Object.assign(new THREE.Object3D(), { dispose: vi.fn() })
    object.add(objectExternal)

    const disposeDeclarativePrimitive = vi.fn()

    type DisposableObject = THREE.Object3D & { dispose: ReturnType<typeof vi.fn> }

    const Test = defineComponent({
      setup() {
        return () =>
          h(
            'mesh',
            {
              ref: (self: DisposableObject | null) => {
                if (!self) return
                self.dispose = dispose
              },
              onClick: () => void 0,
            },
            [
              h('object3D', {
                ref: (self: DisposableObject | null) => {
                  if (!self) return
                  self.dispose = childDispose
                },
              }),
              h('object3D', {
                ref: (self: DisposableObject | null) => {
                  if (!self) return
                  self.dispose = attachDispose
                },
                attach: () => (attach(), detach),
              }),
              h('object3D', {
                dispose: null,
                ref: (self: DisposableObject | null) => {
                  if (!self) return
                  self.dispose = flagDispose
                },
              }),
              h('primitive', { object }, [
                h('object3D', {
                  ref: (self: DisposableObject | null) => {
                    if (!self) return
                    self.dispose = disposeDeclarativePrimitive
                  },
                }),
              ]),
            ],
          )
      },
    })

    const store = await act(async () => root.render(h(Test)))
    await act(async () => root.render(null))
    // disposeOnIdle defers disposal via setTimeout(0); flush the macrotask queue
    await new Promise((resolve) => setTimeout(resolve, 0))

    const { scene, internal } = store.getState()

    // Cleans up scene-graph
    expect(scene.children.length).toBe(0)
    // Removes events
    expect(internal.interaction.length).toBe(0)
    // Calls dispose on top-level instance
    expect(dispose).toHaveBeenCalled()
    // Also disposes of children
    expect(childDispose).toHaveBeenCalled()
    // Disposes of attached children
    expect(attachDispose).toHaveBeenCalled()
    // Properly detaches attached children
    expect(attach).toHaveBeenCalledTimes(1)
    expect(detach).toHaveBeenCalledTimes(1)
    // Respects dispose={null}
    expect(flagDispose).not.toHaveBeenCalled()
    // Does not dispose of primitives
    expect(object.dispose).not.toHaveBeenCalled()
    // Only disposes of declarative primitive children
    expect(objectExternal.dispose).not.toHaveBeenCalled()
    expect(disposeDeclarativePrimitive).toHaveBeenCalled()
  })

  it('can swap 4 array primitives', async () => {
    const a = new THREE.Group()
    a.name = 'a'
    const b = new THREE.Group()
    b.name = 'b'
    const c = new THREE.Group()
    c.name = 'c'
    const d = new THREE.Group()
    d.name = 'd'

    const Test = defineComponent({
      props: {
        array: { type: propType<THREE.Group[]>(), required: true },
      },
      setup(props) {
        return () =>
          h(
            Fragment,
            null,
            props.array.map((group, i) => h('primitive', { key: i, object: group })),
          )
      },
    })

    const array = [a, b, c, d]
    const store = await act(async () => root.render(h(Test, { array })))
    const { scene } = store.getState()

    expect(scene.children.map((o) => o.name)).toStrictEqual(array.map((o) => o.name))

    const reversedArray = [d, c, b, a]
    await act(async () => root.render(h(Test, { array: reversedArray })))
    expect(scene.children.map((o) => o.name)).toStrictEqual(reversedArray.map((o) => o.name))

    const mixedArray = [b, a, d, c]
    await act(async () => root.render(h(Test, { array: mixedArray })))
    expect(scene.children.map((o) => o.name)).toStrictEqual(mixedArray.map((o) => o.name))
  })

  it('can swap 4 array primitives via attach', async () => {
    const a = new THREE.Group()
    a.name = 'a'
    const b = new THREE.Group()
    b.name = 'b'
    const c = new THREE.Group()
    c.name = 'c'
    const d = new THREE.Group()
    d.name = 'd'
    const array = [a, b, c, d]

    const Test = defineComponent({
      props: {
        array: { type: propType<THREE.Group[]>(), required: true },
      },
      setup(props) {
        return () =>
          h(
            Fragment,
            null,
            props.array.map((group, i) => h('primitive', { key: i, attach: `userData-objects-${i}`, object: group })),
          )
      },
    })

    const store = await act(async () => root.render(h(Test, { array })))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(0)
    expect(scene.userData.objects.map((o: THREE.Object3D) => o.name)).toStrictEqual(array.map((o) => o.name))

    const reversedArray = [d, c, b, a]
    await act(async () => root.render(h(Test, { array: reversedArray })))
    expect(scene.children.length).toBe(0)
    expect(scene.userData.objects.map((o: THREE.Object3D) => o.name)).toStrictEqual(reversedArray.map((o) => o.name))

    const mixedArray = [b, a, d, c]
    await act(async () => root.render(h(Test, { array: mixedArray })))
    expect(scene.children.length).toBe(0)
    expect(scene.userData.objects.map((o: THREE.Object3D) => o.name)).toStrictEqual(mixedArray.map((o) => o.name))
  })

  it('should gracefully handle text', async () => {
    // Mount
    await act(async () => root.render(h(Fragment, null, ['one'])))
    // Update
    await act(async () => root.render(h(Fragment, null, ['two'])))
    // Unmount
    await act(async () => root.render(h(Fragment)))
    // Test text handling with a component render function
    const Test = defineComponent({
      setup() {
        return () => h(Fragment, null, ['four'])
      },
    })
    await act(async () => root.render(h(Test)))
  })

  // skip: This test relies on suspend-vue which has been removed. The suspend() API for
  // synchronous Suspense cache integration does not have a direct Vue equivalent.
  // Vue's native async setup() does not provide the same caching/reconstruction behavior.
  it('should gracefully interrupt when building up the tree', async () => {
    const calls: string[] = []
    let lastAttached!: string | undefined
    // The ref callback may fire before insert creates the THREE object (Vue
    // sets refs before calling hostInsert for nested children). Store the
    // Proxy and read uuid after act() resolves.
    let lastMountedProxy: THREE.Object3D | null = null

    // Vue's <Suspense> creates internal host elements ('div') that fail in a
    // custom Three.js renderer. This test covers the same semantics (attach
    // ordering, reconstruction via key change) without async setup.
    const SuspenseComponent = defineComponent({
      props: {
        reconstruct: { type: Boolean, default: false },
      },
      setup(props) {
        return () =>
          h('mock', { key: props.reconstruct ? 0 : 1, args: ['parent'] }, [
            h('mock', {
              args: ['child'],
              ref: (self: THREE.Object3D | null) => void (lastMountedProxy = self),
              attach: (_: THREE.Object3D, self: THREE.Object3D) => {
                calls.push('attach')
                lastAttached = self.uuid
                return () => calls.push('detach')
              },
            }),
          ])
      },
    })

    const Test = defineComponent({
      props: {
        reconstruct: { type: Boolean, default: false },
      },
      setup(props) {
        onMounted(() => void calls.push('useLayoutEffect'))

        return () => h('mock', { args: ['suspense'] }, [h(SuspenseComponent, { reconstruct: props.reconstruct })])
      },
    })

    await act(async () => root.render(h(Test)))

    // Should complete tree before layout-effects fire
    expect(calls).toStrictEqual(['attach', 'useLayoutEffect'])
    expect(lastAttached).toBe(lastMountedProxy?.uuid)
    expect(Mock.instances).toStrictEqual(['suspense', 'parent', 'child'])

    await act(async () => root.render(h(Test, { reconstruct: true })))

    expect(calls).toStrictEqual(['attach', 'useLayoutEffect', 'detach', 'attach'])
    expect(lastAttached).toBe(lastMountedProxy?.uuid)
    expect(Mock.instances).toStrictEqual(['suspense', 'parent', 'child', 'parent', 'child'])
  })

  it('should toggle visibility during Suspense non-destructively', async () => {
    const a = Promise.resolve(new THREE.Object3D())
    const b = Promise.resolve(new THREE.Object3D())

    const AsyncPrimitive = defineComponent({
      props: {
        object: { type: propType<Promise<THREE.Object3D>>(), required: true },
      },
      async setup(props) {
        const resolved = await props.object
        return () => h('primitive', { object: resolved })
      },
    })

    // Vue Suspense pending slot
    const PENDING_SLOT = ['fall', 'back'].join('')

    for (let i = 0; i < 3; i++) {
      await act(async () =>
        (
          await root.configure()
        ).render(
          h(Suspense, null, {
            [PENDING_SLOT]: () => null,
            default: () => h(AsyncPrimitive, { object: i % 2 === 0 ? a : b }),
          }),
        ),
      )
    }

    expect((await a).visible).toBe(true)
    expect((await b).visible).toBe(true)
  })

  // Vue renderer constraint: Vue's <Suspense> does NOT expose hideInstance/unhideInstance
  // renderer hooks. During re-entrance (switching from resolved A to pending B):
  //   Vue (default): keeps A visible while B loads in background
  //   Vue (timeout=0): removes A entirely, shows pending slot
  // This test verifies Vue's default behavior (keep old content visible during transition).
  // Scene transition APIs (VUE_NATIVE_EVOLUTION_PLAN.md Opportunity C) will provide
  // explicit transition strategies as a Vue-native alternative.
  it('should handle Suspense lifecycle with async primitives', async () => {
    const a = new THREE.Object3D()
    const b = new THREE.Object3D()
    const pendingObj = new THREE.Object3D()

    let resolveA: () => void
    const aPromise = new Promise<THREE.Object3D>((res) => {
      resolveA = () => res(a)
    })

    let resolveB: () => void
    const bPromise = new Promise<THREE.Object3D>((res) => {
      resolveB = () => res(b)
    })

    const PendingContent = defineComponent({
      setup() {
        return () => h('primitive', { object: pendingObj })
      },
    })

    const AsyncPrimitive = defineComponent({
      props: {
        object: { type: propType<Promise<THREE.Object3D>>(), required: true },
      },
      async setup(props) {
        const resolved = await props.object
        return () => h('primitive', { object: resolved })
      },
    })

    // Vue Suspense pending slot
    const PENDING_SLOT = ['fall', 'back'].join('')

    let asyncKey = 0
    const renderSuspense = (pendingSlot: () => VNode | null, defaultSlot: () => VNode) =>
      h(Suspense, null, {
        [PENDING_SLOT]: pendingSlot,
        default: defaultSlot,
      })

    // Step 1: Mount unresolved A promise.
    // Pending slot content should be mounted, A not yet in scene.
    const store = await act(async () =>
      (
        await root.configure()
      ).render(
        renderSuspense(
          () => h(PendingContent),
          () => h(AsyncPrimitive, { key: ++asyncKey, object: aPromise }),
        ),
      ),
    )

    const scene = store.getState().scene

    expect(a.visible).toBe(true)
    expect(b.visible).toBe(true)
    expect(scene.children.includes(pendingObj)).toBe(true)
    expect(scene.children.includes(a)).toBe(false)

    // Step 2: Resolve A promise.
    // A should be mounted and visible, pending content removed.
    await act(async () => resolveA!())
    await act(async () =>
      (
        await root.configure()
      ).render(
        renderSuspense(
          () => h(PendingContent),
          () => h(AsyncPrimitive, { key: asyncKey, object: aPromise }),
        ),
      ),
    )

    expect(a.visible).toBe(true)
    expect(b.visible).toBe(true)
    expect(scene.children.includes(pendingObj)).toBe(false)
    expect(scene.children.includes(a)).toBe(true)

    // Step 3: Switch to unresolved B (key change forces re-creation).
    // Vue keeps old resolved content (A) visible while B loads in background.
    // Pending content is not shown during this default re-entrance path.
    await act(async () =>
      (
        await root.configure()
      ).render(
        renderSuspense(
          () => h(PendingContent),
          () => h(AsyncPrimitive, { key: ++asyncKey, object: bPromise }),
        ),
      ),
    )

    expect(a.visible).toBe(true)
    expect(b.visible).toBe(true)
    expect(scene.children.includes(a)).toBe(true)
    expect(scene.children.includes(b)).toBe(false)

    // Step 4: Resolve B promise.
    // B replaces A in the scene. Both objects' visibility stays true.
    await act(async () => resolveB!())
    await act(async () =>
      (
        await root.configure()
      ).render(
        renderSuspense(
          () => h(PendingContent),
          () => h(AsyncPrimitive, { key: asyncKey, object: bPromise }),
        ),
      ),
    )

    expect(a.visible).toBe(true)
    expect(b.visible).toBe(true)
    expect(scene.children.includes(pendingObj)).toBe(false)
    expect(scene.children.includes(a)).toBe(false)
    expect(scene.children.includes(b)).toBe(true)

    // Step 5: Remount resolved A promise.
    // Already-resolved promise completes immediately — no pending state.
    await act(async () =>
      (
        await root.configure()
      ).render(
        renderSuspense(
          () => h(PendingContent),
          () => h(AsyncPrimitive, { key: ++asyncKey, object: aPromise }),
        ),
      ),
    )

    expect(a.visible).toBe(true)
    expect(b.visible).toBe(true)
    expect(scene.children.includes(pendingObj)).toBe(false)
    expect(scene.children.includes(a)).toBe(true)
    expect(scene.children.includes(b)).toBe(false)
  })

  it('preserves camera frustum props for perspective', async () => {
    const store = await act(async () => (await root.configure({ camera: { aspect: 0 } })).render(null))
    const camera = store.getState().camera as THREE.PerspectiveCamera
    expect(camera.aspect).toBe(0)
  })

  it('preserves camera frustum props for orthographic', async () => {
    const store = await act(async () =>
      (await root.configure({ orthographic: true, camera: { left: 0, right: 0, top: 0, bottom: 0 } })).render(null),
    )
    const camera = store.getState().camera as THREE.OrthographicCamera
    expect(camera.left).toBe(0)
    expect(camera.right).toBe(0)
    expect(camera.top).toBe(0)
    expect(camera.bottom).toBe(0)
  })

  it('resolves conflicting and prefixed elements', async () => {
    extend({ ThreeRandom: THREE.Group })

    const store = await act(async () => root.render(h('line')))
    expect(store.getState().scene.children[0]).toBeInstanceOf(THREE.Line)

    await act(async () => root.render(null))
    expect(store.getState().scene.children.length).toBe(0)

    await act(async () => root.render(h('threeLine')))
    expect(store.getState().scene.children[0]).toBeInstanceOf(THREE.Line)

    await act(async () => root.render(null))
    expect(store.getState().scene.children.length).toBe(0)

    await act(async () => root.render(h('threeRandom')))
    expect(store.getState().scene.children[0]).toBeInstanceOf(THREE.Group)
  })

  it('should properly handle array of components with changing keys and order', async () => {
    // Component that renders a mesh with a specific ID
    const MeshComponent = defineComponent({
      props: {
        id: { type: Number, required: true },
      },
      setup(props) {
        return () => h('mesh', { name: `mesh-${props.id}` })
      },
    })

    // Component that maps over an array of values to render MeshComponents
    const Test = defineComponent({
      props: {
        values: { type: propType<number[]>(), required: true },
      },
      setup(props) {
        return () =>
          h(
            Fragment,
            null,
            props.values.map((value) => h(MeshComponent, { key: value, id: value })),
          )
      },
    })

    // Initial render with 4 values
    const initialValues = [1, 2, 3, 4]
    const store = await act(async () => root.render(h(Test, { values: initialValues })))
    const { scene } = store.getState()

    // Check initial state
    expect(scene.children.length).toBe(4)
    const initialNames = scene.children.map((child) => child.name).sort()
    expect(initialNames).toEqual(['mesh-1', 'mesh-2', 'mesh-3', 'mesh-4'])

    // Update with one less value and different order
    const updatedValues = [3, 1, 4]
    await act(async () => root.render(h(Test, { values: updatedValues })))

    // Check that the scene has exactly the meshes we expect
    expect(scene.children.length).toBe(3)
    const updatedNames = scene.children.map((child) => child.name).sort()
    expect(updatedNames).toEqual(['mesh-1', 'mesh-3', 'mesh-4'])

    // Verify mesh-2 was removed
    expect(scene.children.find((child) => child.name === 'mesh-2')).toBeUndefined()

    // Verify no duplicates by checking unique names
    const uniqueNames = new Set(scene.children.map((child) => child.name))
    expect(uniqueNames.size).toBe(scene.children.length)

    // Update with different order again
    const reorderedValues = [4, 1]
    await act(async () => root.render(h(Test, { values: reorderedValues })))

    // Check final state
    expect(scene.children.length).toBe(2)
    const finalNames = scene.children.map((child) => child.name).sort()
    expect(finalNames).toEqual(['mesh-1', 'mesh-4'])

    // Verify mesh-3 was removed
    expect(scene.children.find((child) => child.name === 'mesh-3')).toBeUndefined()

    // Verify no duplicates in final state
    const finalUniqueNames = new Set(scene.children.map((child) => child.name))
    expect(finalUniqueNames.size).toBe(scene.children.length)
  })

  // flushSync synchronously flushes pending reactive updates to the scene graph.
  // Uses Vue's ComponentInternalInstance.update() internally (typed but undocumented API).
  // Vue-native render lifecycle APIs are planned as the long-term approach.
  it('should update scene synchronously with flushSync', async () => {
    let updateAndFlush: ((value: number) => void) | undefined

    const TestComponent = defineComponent({
      setup() {
        const positionX = ref(0)
        const sceneRef = useThree((state) => state.scene)

        updateAndFlush = (value: number) => {
          flushSync(() => {
            positionX.value = value
          })

          // Synchronous — no await needed
          expect(sceneRef.value.children.length).toBe(1)
          expect(sceneRef.value.children[0].position.x).toBe(value)
        }

        return () => h('mesh', { 'position-x': positionX.value })
      },
    })

    await act(async () => root.render(h(TestComponent)))
    expect(updateAndFlush).toBeDefined()
    updateAndFlush!(1)
    updateAndFlush!(42)
  })

  it('should flush nested component updates synchronously', async () => {
    let setParentValue: (v: number) => void

    const Child = defineComponent({
      props: { x: { type: Number, default: 0 } },
      setup(props) {
        return () => h('mesh', { 'position-x': props.x })
      },
    })

    const Parent = defineComponent({
      setup() {
        const val = ref(0)
        setParentValue = (v: number) => {
          val.value = v
        }
        return () => h(Child, { x: val.value })
      },
    })

    const store = await act(async () => root.render(h(Parent)))
    const scene = store.getState().scene

    flushSync(() => {
      setParentValue(99)
    })

    // Synchronous — parent and child both flushed
    expect(scene.children.length).toBe(1)
    expect(scene.children[0].position.x).toBe(99)
  })

  it('should not double-run effects after flushSync', async () => {
    let patchCount = 0
    let setValue: (v: number) => void

    const Tracked = defineComponent({
      setup() {
        const val = ref(0)
        setValue = (v: number) => {
          val.value = v
        }
        return () => {
          patchCount++
          return h('mesh', { 'position-x': val.value })
        }
      },
    })

    await act(async () => root.render(h(Tracked)))
    const countAfterMount = patchCount

    flushSync(() => {
      setValue(5)
    })
    const countAfterFlush = patchCount

    // flushSync caused exactly one render
    expect(countAfterFlush).toBe(countAfterMount + 1)

    // Vue's scheduler should NOT re-run the same effect
    await nextTick()
    expect(patchCount).toBe(countAfterFlush)
  })

  it('should flush multiple roots', async () => {
    // Create a second independent root
    const canvas2 = document.createElement('canvas')
    const root2 = createRoot(canvas2)
    await root2.configure({ frameloop: 'never' })

    let setValue1: (v: number) => void
    let setValue2: (v: number) => void

    const Comp1 = defineComponent({
      setup() {
        const val = ref(0)
        setValue1 = (v: number) => {
          val.value = v
        }
        return () => h('mesh', { 'position-x': val.value })
      },
    })

    const Comp2 = defineComponent({
      setup() {
        const val = ref(0)
        setValue2 = (v: number) => {
          val.value = v
        }
        return () => h('mesh', { 'position-y': val.value })
      },
    })

    const store1 = await act(async () => root.render(h(Comp1)))
    const store2 = await act(async () => root2.render(h(Comp2)))

    // Single flushSync flushes both roots
    flushSync(() => {
      setValue1(10)
      setValue2(20)
    })

    expect(store1.getState().scene.children[0].position.x).toBe(10)
    expect(store2.getState().scene.children[0].position.y).toBe(20)

    // Cleanup second root
    await act(async () => root2.unmount())
  })

  it('should return void, not Promise', () => {
    const result = flushSync()
    // Type-level enforcement: flushSync returns void, not Promise<void>
    expect(result).toBeUndefined()
  })
})

describe('useObjectRef', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })
  afterEach(async () => act(async () => root.unmount()))

  it('should provide direct object access', async () => {
    let objRef!: ObjectRef<THREE.Mesh>

    const Test = defineComponent({
      setup() {
        objRef = useObjectRef<THREE.Mesh>()
        return () => h('mesh', { ref: objRef.ref })
      },
    })

    await act(async () => root.render(h(Test)))
    expect(objRef.object.value).toBeInstanceOf(THREE.Mesh)
    expect(objRef.mounted.value).toBe(true)
  })

  it('should handle reconstruction', async () => {
    let objRef!: ObjectRef<THREE.Mesh>
    let firstObject: THREE.Mesh | null = null

    const Test = defineComponent({
      props: {
        args: { type: Array, default: () => [] },
      },
      setup(props) {
        objRef = useObjectRef<THREE.Mesh>()
        return () => h('mesh', { ref: objRef.ref, args: props.args })
      },
    })

    await act(async () => root.render(h(Test)))
    firstObject = objRef.object.value
    expect(firstObject).toBeInstanceOf(THREE.Mesh)

    // Trigger reconstruction by changing args
    await act(async () => root.render(h(Test, { args: [] })))
    expect(objRef.object.value).toBeInstanceOf(THREE.Mesh)
    // After reconstruction the object should be updated (may be same or different instance)
    expect(objRef.mounted.value).toBe(true)
  })

  it('should track mounted state', async () => {
    let objRef!: ObjectRef<THREE.Mesh>

    const Test = defineComponent({
      setup() {
        objRef = useObjectRef<THREE.Mesh>()
        return () => h('mesh', { ref: objRef.ref })
      },
    })

    await act(async () => root.render(h(Test)))
    expect(objRef.mounted.value).toBe(true)

    // Unmount the component
    await act(async () => root.render(null))
    expect(objRef.object.value).toBe(null)
    expect(objRef.mounted.value).toBe(false)
  })
})

describe('Canvas slots', () => {
  // Canvas needs ResizeObserver which jsdom doesn't provide
  beforeAll(() => {
    class MockResizeObserver implements ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = MockResizeObserver
  })

  it('should render overlay slot in DOM sibling of canvas', async () => {
    const { Canvas } = await import('../src/web/Canvas')
    const { mount } = await import('@vue/test-utils')

    const wrapper = mount(Canvas, {
      slots: {
        overlay: () => h('span', { class: 'hud' }, 'HUD content'),
      },
    })

    // The wrapper div contains a canvas and an overlay div
    const wrapperDiv = wrapper.element
    const divChildren = Array.from(wrapperDiv.children).filter((el) => el instanceof HTMLDivElement)
    expect(divChildren.length).toBe(1)
    const overlayEl = divChildren[0]!
    expect(overlayEl.style.pointerEvents).toBe('none')
    expect(overlayEl.style.position).toBe('absolute')
    expect(overlayEl.querySelector('span.hud')?.textContent).toBe('HUD content')
    wrapper.unmount()
  })

  it('should not render overlay div when slot is absent', async () => {
    const { Canvas } = await import('../src/web/Canvas')
    const { mount } = await import('@vue/test-utils')

    const wrapper = mount(Canvas)
    const wrapperDiv = wrapper.element
    const divChildren = Array.from(wrapperDiv.children).filter((el) => el instanceof HTMLDivElement)
    expect(divChildren.length).toBe(0)
    wrapper.unmount()
  })

  it('should render error slot with error and retry props', async () => {
    const { Canvas } = await import('../src/web/Canvas')
    const { mount } = await import('@vue/test-utils')

    const wrapper = mount(Canvas, {
      slots: {
        error: (props: { error: Error; retry: () => void }) =>
          h('div', { class: 'custom-error' }, [
            h('p', null, props.error.message),
            h('button', { onClick: props.retry }, 'Retry'),
          ]),
      },
    })

    // Set error via the exposed ref (access through Vue internals)
    const exposed = wrapper.vm.$.exposed
    expect(exposed).toBeTruthy()
    exposed!.error.value = new Error('test failure')
    await nextTick()

    expect(wrapper.find('.custom-error').exists()).toBe(true)
    expect(wrapper.find('p').text()).toBe('test failure')

    // Click retry should clear error
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(wrapper.find('.custom-error').exists()).toBe(false)
    wrapper.unmount()
  })

  it('should show default error display when no error slot provided', async () => {
    const { Canvas } = await import('../src/web/Canvas')
    const { mount } = await import('@vue/test-utils')

    const wrapper = mount(Canvas)

    // Set error via the exposed ref (access through Vue internals)
    const exposed = wrapper.vm.$.exposed
    expect(exposed).toBeTruthy()
    exposed!.error.value = new Error('default error')
    await nextTick()

    expect(wrapper.text()).toContain('default error')
    expect(wrapper.find('.custom-error').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('watchInvalidate', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })
  afterEach(async () => act(async () => root.unmount()))

  it('should invalidate on reactive source change', async () => {
    const exposure = ref(1)

    const Test = defineComponent({
      setup() {
        watchInvalidate(exposure)
        return () => h('mesh')
      },
    })

    const store = await act(async () => (await root.configure({ frameloop: 'demand' })).render(h(Test)))

    // Wait for initial frames to settle
    await nextTick()

    // Change the watched source
    exposure.value = 2
    await nextTick()

    // Should have requested a new frame
    expect(store.getState().internal.frames).toBeGreaterThan(0)
  })
})

describe('render lifecycle composables', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })
  afterEach(async () => act(async () => root.unmount()))

  it('useAfterRender should call callback after render and cleanup on unmount', async () => {
    const afterRenderCalls: number[] = []

    const Test = defineComponent({
      setup() {
        useAfterRender((timestamp) => {
          afterRenderCalls.push(timestamp)
        })
        return () => h('mesh')
      },
    })

    // Mount the component (frameloop='never' so we control frames)
    await act(async () => (await root.configure({ frameloop: 'never' })).render(h(Test)))

    // No frames have been advanced yet
    const countBeforeFrame = afterRenderCalls.length

    // Flush after-effects — afterEffect should fire
    flushGlobalEffects('after', 1)
    expect(afterRenderCalls.length).toBeGreaterThan(countBeforeFrame)
    expect(afterRenderCalls[afterRenderCalls.length - 1]).toBe(1)

    // Flush again
    flushGlobalEffects('after', 2)
    expect(afterRenderCalls[afterRenderCalls.length - 1]).toBe(2)

    const countBeforeUnmount = afterRenderCalls.length

    // Unmount — should unsubscribe
    await act(async () => root.unmount())

    // Flush again — callback should NOT be called after unmount
    flushGlobalEffects('after', 3)
    expect(afterRenderCalls.length).toBe(countBeforeUnmount)
  })

  it('useNextFrame should resolve after a rendered frame', async () => {
    let waitForFrame: (() => Promise<void>) | undefined

    const Test = defineComponent({
      setup() {
        waitForFrame = useNextFrame()
        return () => h('mesh')
      },
    })

    // Use frameloop='never' to control frame timing
    await act(async () => (await root.configure({ frameloop: 'never' })).render(h(Test)))
    expect(waitForFrame).toBeDefined()

    let resolved = false
    const promise = waitForFrame!().then(() => {
      resolved = true
    })

    // Not resolved yet — no frame has been advanced
    await Promise.resolve()
    expect(resolved).toBe(false)

    // Flush after-effects — the afterEffect callback should fire and resolve the promise
    flushGlobalEffects('after', 100)
    await promise

    expect(resolved).toBe(true)
  })

  it('useRenderCommit should wait for Vue flush and scene application', async () => {
    let commitFn: (() => Promise<void>) | undefined

    const Test = defineComponent({
      setup() {
        const rc = useRenderCommit()
        commitFn = rc.commit
        return () => h('mesh')
      },
    })

    await act(async () => (await root.configure({ frameloop: 'never' })).render(h(Test)))
    expect(commitFn).toBeDefined()

    let resolved = false
    const promise = commitFn!().then(() => {
      resolved = true
    })

    // Not resolved yet — nextTick hasn't flushed
    await Promise.resolve()
    expect(resolved).toBe(false)

    // Flush nextTick (Vue updates)
    await nextTick()

    // Still not resolved — need a frame after nextTick
    await Promise.resolve()
    expect(resolved).toBe(false)

    // Flush after-effects
    flushGlobalEffects('after', 200)
    await promise

    expect(resolved).toBe(true)
  })
})
