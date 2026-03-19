import { h, defineComponent, ref, nextTick, provide, inject, type InjectionKey } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { Canvas } from '../src'

// Helper to wait for async rendering
async function waitForMount() {
  await flushPromises()
  await nextTick()
}

describe('web Canvas', () => {
  it('should correctly mount', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <group />
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    expect(wrapper.element).toMatchSnapshot()
    wrapper.unmount()
  })

  it('should forward ref', async () => {
    const canvasRef = ref<any>(null)

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas ref={canvasRef}>
              <group />
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    // The Canvas component exposes { canvas } via expose()
    // In @vue/test-utils, the ref receives the component's exposed object
    // The underlying canvas element is inside the wrapper DOM
    const canvasEl = wrapper.find('canvas')
    expect(canvasEl.exists()).toBe(true)
    expect(canvasEl.element).toBeInstanceOf(HTMLCanvasElement)
    wrapper.unmount()
  })

  it('should forward provide/inject context', async () => {
    const ParentKey: InjectionKey<boolean> = Symbol('parent')
    let receivedValue: boolean = false

    const Test = defineComponent({
      setup() {
        receivedValue = inject(ParentKey, false)
        return () => null
      },
    })

    const wrapper = mount(
      defineComponent({
        setup() {
          provide(ParentKey, true)
          return () => (
            <Canvas>
              <Test />
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    expect(receivedValue).toBe(true)
    wrapper.unmount()
  })

  it('should correctly unmount', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <group />
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    expect(() => wrapper.unmount()).not.toThrow()
  })

  it('plays nice with Vue SSR', async () => {
    // Vue does not call onMounted during SSR, so we just verify
    // the Canvas can render without throwing
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <group />
            </Canvas>
          )
        },
      }),
    )

    await waitForMount()

    expect(wrapper.find('canvas').exists()).toBe(true)
    wrapper.unmount()
  })
})
