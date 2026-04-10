import { Canvas, useFrame } from '@xperimntl/vue-threejs'
import { defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { Color, Mesh } from 'three'
import { SVGRenderer } from 'three-stdlib'

const TorusKnot = defineComponent({
  setup() {
    const hovered = ref(false)
    const meshRef = ref<Mesh | null>(null)

    useFrame((state) => {
      const t = state.clock.elapsedTime / 2
      if (meshRef.value) meshRef.value.rotation.set(t, t, t)
    })

    return () => (
      <mesh ref={meshRef} onPointerOver={() => (hovered.value = true)} onPointerOut={() => (hovered.value = false)}>
        <torusKnotGeometry args={[10, 3, 128, 16]} />
        <meshBasicMaterial color={hovered.value ? 'orange' : 'hotpink'} />
      </mesh>
    )
  },
})

export default defineComponent({
  setup() {
    const containerRef = ref<HTMLDivElement | null>(null)
    const ready = ref(false)
    const rendererRef = shallowRef<SVGRenderer | null>(null)
    const wrapperRef = shallowRef<HTMLDivElement | null>(null)

    onMounted(() => {
      const container = containerRef.value
      if (!container) return

      const renderer = new SVGRenderer()
      renderer.domElement.style.position = 'absolute'
      renderer.domElement.style.top = '0'
      renderer.domElement.style.left = '0'
      renderer.setClearColor(new Color('#191b24'), 1)

      const wrapper = document.createElement('div')
      wrapper.style.position = 'absolute'
      wrapper.style.top = '0'
      wrapper.style.left = '0'
      wrapper.style.width = '100%'
      wrapper.style.height = '100%'
      wrapper.style.background = '#191b24'
      wrapper.appendChild(renderer.domElement)
      container.appendChild(wrapper)

      rendererRef.value = renderer
      wrapperRef.value = wrapper
      ready.value = true
    })

    onBeforeUnmount(() => {
      if (wrapperRef.value && containerRef.value) {
        containerRef.value.removeChild(wrapperRef.value)
      }
      rendererRef.value = null
      wrapperRef.value = null
      ready.value = false
    })

    return () =>
      h(
        'div',
        {
          ref: containerRef,
          style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#191b24' },
        },
        ready.value && rendererRef.value && wrapperRef.value
          ? [
              h(
                Canvas,
                {
                  gl: rendererRef.value,
                  camera: { position: [0, 0, 50] },
                  eventSource: wrapperRef.value,
                },
                {
                  default: () => [h(TorusKnot)],
                },
              ),
            ]
          : [],
      )
  },
})
