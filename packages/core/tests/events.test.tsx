import { h, defineComponent, ref, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { Canvas, extend, _roots } from '../src'
import * as THREE from 'three'

extend(THREE as any)

// Helper to wait for async rendering — Canvas init has multiple async steps
// (mount → watch → createRoot → configure → render), so we need several flush cycles
async function waitForMount() {
  await flushPromises()
  await nextTick()
  await flushPromises()
  await nextTick()
}

// Canvas connects events to its inner div (direct parent of <canvas>)
function getContainer(wrapper: ReturnType<typeof mount>): HTMLDivElement | undefined {
  const parent = wrapper.find('canvas').element?.parentNode
  if (parent instanceof HTMLDivElement) return parent
  return undefined
}

describe('events', () => {
  it('Canvas initializes with working event connection', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <mesh>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const canvasEl = wrapper.find('canvas')
    expect(canvasEl.exists()).toBe(true)

    const container = getContainer(wrapper)
    expect(container).toBeDefined()

    const canvasHTMLEl = canvasEl.element
    expect(canvasHTMLEl).toBeInstanceOf(HTMLCanvasElement)
    const rootEntry = _roots.get(canvasHTMLEl)
    expect(rootEntry).toBeDefined()

    const state = rootEntry!.store.getState()
    expect(state.gl).toBeDefined()
    expect(state.scene).toBeDefined()
    expect(state.camera).toBeDefined()
    expect(state.raycaster).toBeDefined()
    expect(state.size.width).toBeGreaterThan(0)
    expect(state.size.height).toBeGreaterThan(0)
    expect(state.scene.children.length).toBeGreaterThan(0)
    expect(state.events.connected).toBeDefined()
    expect(state.internal.active).toBe(true)

    wrapper.unmount()
  })

  it('can handle onPointerDown', async () => {
    const handlePointerDown = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <mesh onPointerDown={handlePointerDown}>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const container = getContainer(wrapper)
    expect(container).toBeDefined()

    const evt = new PointerEvent('pointerdown')
    Object.defineProperty(evt, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt, 'offsetY', { get: () => 480 })

    container!.dispatchEvent(evt)
    await waitForMount()

    expect(handlePointerDown).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('can handle onPointerMissed', async () => {
    const handleClick = vi.fn()
    const handleMissed = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <mesh onPointerMissed={handleMissed} onClick={handleClick}>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const container = getContainer(wrapper)
    const evt = new MouseEvent('click')
    Object.defineProperty(evt, 'offsetX', { get: () => 0 })
    Object.defineProperty(evt, 'offsetY', { get: () => 0 })

    container!.dispatchEvent(evt)
    await waitForMount()

    expect(handleClick).not.toHaveBeenCalled()
    expect(handleMissed).toHaveBeenCalledWith(evt)
    wrapper.unmount()
  })

  it('should not fire onPointerMissed when same element is clicked', async () => {
    const handleClick = vi.fn()
    const handleMissed = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <mesh onPointerMissed={handleMissed} onClick={handleClick}>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const container = getContainer(wrapper)

    const down = new PointerEvent('pointerdown')
    Object.defineProperty(down, 'offsetX', { get: () => 577 })
    Object.defineProperty(down, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(down)

    const evt = new MouseEvent('click')
    Object.defineProperty(evt, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(evt)

    await waitForMount()

    expect(handleClick).toHaveBeenCalled()
    expect(handleMissed).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('should not fire onPointerMissed on parent when child element is clicked', async () => {
    const handleClick = vi.fn()
    const handleMissed = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <group onPointerMissed={handleMissed}>
                <mesh onClick={handleClick}>
                  <boxGeometry args={[2, 2]} />
                  <meshBasicMaterial />
                </mesh>
              </group>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const container = getContainer(wrapper)

    const down = new PointerEvent('pointerdown')
    Object.defineProperty(down, 'offsetX', { get: () => 577 })
    Object.defineProperty(down, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(down)

    const evt = new MouseEvent('click')
    Object.defineProperty(evt, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(evt)

    await waitForMount()

    expect(handleClick).toHaveBeenCalled()
    expect(handleMissed).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('can handle onPointerMissed on Canvas', async () => {
    const handleMissed = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas onPointerMissed={handleMissed}>
              <mesh>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const container = getContainer(wrapper)
    const evt = new MouseEvent('click')
    Object.defineProperty(evt, 'offsetX', { get: () => 0 })
    Object.defineProperty(evt, 'offsetY', { get: () => 0 })

    container!.dispatchEvent(evt)
    await waitForMount()

    expect(handleMissed).toHaveBeenCalledWith(evt)
    wrapper.unmount()
  })

  it('can handle onPointerMove', async () => {
    const handlePointerMove = vi.fn()
    const handlePointerOver = vi.fn()
    const handlePointerEnter = vi.fn()
    const handlePointerOut = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <mesh
                onPointerOut={handlePointerOut}
                onPointerEnter={handlePointerEnter}
                onPointerMove={handlePointerMove}
                onPointerOver={handlePointerOver}>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const container = getContainer(wrapper)

    const evt1 = new PointerEvent('pointermove')
    Object.defineProperty(evt1, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt1, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(evt1)
    await waitForMount()

    expect(handlePointerMove).toHaveBeenCalled()
    expect(handlePointerOver).toHaveBeenCalled()
    expect(handlePointerEnter).toHaveBeenCalled()

    const evt2 = new PointerEvent('pointermove')
    Object.defineProperty(evt2, 'offsetX', { get: () => 0 })
    Object.defineProperty(evt2, 'offsetY', { get: () => 0 })
    container!.dispatchEvent(evt2)
    await waitForMount()

    expect(handlePointerOut).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('should handle stopPropagation', async () => {
    const handlePointerEnter = vi.fn().mockImplementation((e) => {
      expect(() => e.stopPropagation()).not.toThrow()
    })
    const handlePointerLeave = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <mesh onPointerLeave={handlePointerLeave} onPointerEnter={handlePointerEnter}>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
              <mesh position-z={3}>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const container = getContainer(wrapper)

    const evt1 = new PointerEvent('pointermove')
    Object.defineProperty(evt1, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt1, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(evt1)
    await waitForMount()

    expect(handlePointerEnter).toHaveBeenCalled()

    const evt2 = new PointerEvent('pointermove')
    Object.defineProperty(evt2, 'offsetX', { get: () => 0 })
    Object.defineProperty(evt2, 'offsetY', { get: () => 0 })
    container!.dispatchEvent(evt2)
    await waitForMount()

    expect(handlePointerLeave).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('should handle stopPropagation on click events', async () => {
    const handleClickFront = vi.fn((e) => e.stopPropagation())
    const handleClickRear = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <mesh onClick={handleClickFront}>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
              <mesh onClick={handleClickRear} position-z={-3}>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const container = getContainer(wrapper)

    const down = new PointerEvent('pointerdown')
    Object.defineProperty(down, 'offsetX', { get: () => 577 })
    Object.defineProperty(down, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(down)

    const up = new PointerEvent('pointerup')
    Object.defineProperty(up, 'offsetX', { get: () => 577 })
    Object.defineProperty(up, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(up)

    const event = new MouseEvent('click')
    Object.defineProperty(event, 'offsetX', { get: () => 577 })
    Object.defineProperty(event, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(event)

    await waitForMount()

    expect(handleClickFront).toHaveBeenCalled()
    expect(handleClickRear).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  describe('web pointer capture', () => {
    interface PointerCaptureTarget {
      setPointerCapture(id: number): void
      releasePointerCapture(id: number): void
    }
    function hasPointerCapture(target: unknown): target is PointerCaptureTarget {
      if (target == null || typeof target !== 'object') return false
      return 'setPointerCapture' in target && typeof target.setPointerCapture === 'function'
    }
    function capturePointer(ev: { target: unknown; pointerId: number }) {
      if (hasPointerCapture(ev.target)) ev.target.setPointerCapture(ev.pointerId)
    }
    function releasePointer(ev: { target: unknown; pointerId: number }) {
      if (hasPointerCapture(ev.target)) ev.target.releasePointerCapture(ev.pointerId)
    }

    it('should release when the capture target is unmounted', async () => {
      const handlePointerDown = vi.fn(capturePointer)
      const handlePointerMove = vi.fn()

      const hasMesh = ref(true)
      const wrapper = mount(
        defineComponent({
          setup() {
            return () => (
              <Canvas>
                {hasMesh.value && (
                  <mesh onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}>
                    <boxGeometry args={[2, 2]} />
                    <meshBasicMaterial />
                  </mesh>
                )}
              </Canvas>
            )
          },
        }),
        { attachTo: document.body },
      )

      await waitForMount()

      const container = getContainer(wrapper)
      if (!container) throw new Error('Container not found')

      container.setPointerCapture = vi.fn()
      container.releasePointerCapture = vi.fn()

      const pointerId = 1234
      const down = new PointerEvent('pointerdown', { pointerId })
      Object.defineProperty(down, 'offsetX', { get: () => 577 })
      Object.defineProperty(down, 'offsetY', { get: () => 480 })
      container.dispatchEvent(down)
      await waitForMount()

      expect(handlePointerDown).toHaveBeenCalledTimes(1)
      expect(container.setPointerCapture).toHaveBeenCalledWith(pointerId)
      expect(container.releasePointerCapture).not.toHaveBeenCalled()

      // Remove the mesh
      hasMesh.value = false
      await waitForMount()

      expect(container.releasePointerCapture).toHaveBeenCalledWith(pointerId)
      wrapper.unmount()
    })

    it('should not leave when captured', async () => {
      const handlePointerMove = vi.fn()
      const handlePointerDown = vi.fn(capturePointer)
      const handlePointerUp = vi.fn(releasePointer)
      const handlePointerEnter = vi.fn()
      const handlePointerLeave = vi.fn()

      const wrapper = mount(
        defineComponent({
          setup() {
            return () => (
              <Canvas>
                <mesh
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                  onPointerEnter={handlePointerEnter}>
                  <boxGeometry args={[2, 2]} />
                  <meshBasicMaterial />
                </mesh>
              </Canvas>
            )
          },
        }),
        { attachTo: document.body },
      )

      await waitForMount()

      const container = getContainer(wrapper)
      if (!container) throw new Error('Container not found')

      container.setPointerCapture = vi.fn()
      container.releasePointerCapture = vi.fn()

      const pointerId = 1234

      const moveIn = new PointerEvent('pointermove', { pointerId })
      Object.defineProperty(moveIn, 'offsetX', { get: () => 577 })
      Object.defineProperty(moveIn, 'offsetY', { get: () => 480 })

      const moveOut = new PointerEvent('pointermove', { pointerId })
      Object.defineProperty(moveOut, 'offsetX', { get: () => -10000 })
      Object.defineProperty(moveOut, 'offsetY', { get: () => -10000 })

      container.dispatchEvent(moveIn)
      await waitForMount()
      expect(handlePointerEnter).toHaveBeenCalledTimes(1)
      expect(handlePointerMove).toHaveBeenCalledTimes(1)

      const down = new PointerEvent('pointerdown', { pointerId })
      Object.defineProperty(down, 'offsetX', { get: () => 577 })
      Object.defineProperty(down, 'offsetY', { get: () => 480 })
      container.dispatchEvent(down)
      await waitForMount()

      container.dispatchEvent(moveOut)
      await waitForMount()
      expect(handlePointerMove).toHaveBeenCalledTimes(2)
      expect(handlePointerLeave).not.toHaveBeenCalled()

      container.dispatchEvent(moveIn)
      await waitForMount()
      expect(handlePointerMove).toHaveBeenCalledTimes(3)

      const up = new PointerEvent('pointerup', { pointerId })
      Object.defineProperty(up, 'offsetX', { get: () => 577 })
      Object.defineProperty(up, 'offsetY', { get: () => 480 })
      const lostpointercapture = new PointerEvent('lostpointercapture', { pointerId })

      container.dispatchEvent(up)
      await waitForMount()
      container.dispatchEvent(lostpointercapture)
      await waitForMount()

      expect(handlePointerLeave).not.toHaveBeenCalled()

      container.dispatchEvent(moveOut)
      await waitForMount()
      expect(handlePointerEnter).toHaveBeenCalledTimes(1)
      expect(handlePointerLeave).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })
  })

  it('can handle primitives', async () => {
    const handlePointerDownOuter = vi.fn()
    const handlePointerDownInner = vi.fn()

    const object = new THREE.Group()
    object.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2), new THREE.MeshBasicMaterial()))

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas>
              <group onPointerDown={handlePointerDownOuter}>
                <primitive name="test" object={object} onPointerDown={handlePointerDownInner} />
              </group>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const container = getContainer(wrapper)
    const evt = new PointerEvent('pointerdown')
    Object.defineProperty(evt, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(evt)
    await waitForMount()

    expect(handlePointerDownOuter).toHaveBeenCalled()
    expect(handlePointerDownInner).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('can handle a DOM offset canvas', async () => {
    const handlePointerDown = vi.fn()

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => (
            <Canvas
              onCreated={(state: any) => {
                state.size.left = 100
                state.size.top = 100
              }}>
              <mesh onPointerDown={handlePointerDown}>
                <boxGeometry args={[2, 2]} />
                <meshBasicMaterial />
              </mesh>
            </Canvas>
          )
        },
      }),
      { attachTo: document.body },
    )

    await waitForMount()

    const container = getContainer(wrapper)
    const evt = new PointerEvent('pointerdown')
    Object.defineProperty(evt, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt, 'offsetY', { get: () => 480 })
    container!.dispatchEvent(evt)
    await waitForMount()

    expect(handlePointerDown).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('can handle different event prefixes', async () => {
    const prefixes = ['offset', 'client', 'page', 'layer', 'screen'] as const

    for (const prefix of prefixes) {
      const handlePointerDown = vi.fn()

      const wrapper = mount(
        defineComponent({
          setup() {
            return () => (
              <Canvas eventPrefix={prefix}>
                <mesh onPointerDown={handlePointerDown}>
                  <boxGeometry args={[2, 2]} />
                  <meshBasicMaterial />
                </mesh>
              </Canvas>
            )
          },
        }),
        { attachTo: document.body },
      )

      await waitForMount()

      const container = getContainer(wrapper)
      const evt = new PointerEvent('pointerdown')
      // Set the coordinate for the specific prefix
      Object.defineProperty(evt, `${prefix}X`, { get: () => 577 })
      Object.defineProperty(evt, `${prefix}Y`, { get: () => 480 })

      container!.dispatchEvent(evt)
      await waitForMount()

      expect(handlePointerDown).toHaveBeenCalled()
      wrapper.unmount()
    }
  })
})
