import { Canvas, useFrame, useObjectRef } from '@xperimntl/vue-threejs'
import { defineComponent, ref, h, watch } from 'vue'
import type { Mesh } from 'three'

/** Wireframe box that slowly rotates while content is loading */
const Placeholder = defineComponent({
  setup() {
    const mesh = useObjectRef<Mesh>()

    useFrame((_, delta) => {
      if (mesh.object.value) {
        mesh.object.value.rotation.x += delta * 0.5
        mesh.object.value.rotation.y += delta * 0.3
      }
    })

    return () => (
      <mesh ref={mesh.ref}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshBasicMaterial color="#666666" wireframe />
      </mesh>
    )
  },
})

/** Torus knot shown once loading completes */
const LoadedContent = defineComponent({
  setup() {
    const mesh = useObjectRef<Mesh>()

    useFrame((_, delta) => {
      if (mesh.object.value) {
        mesh.object.value.rotation.y += delta * 0.4
      }
    })

    return () => (
      <mesh ref={mesh.ref}>
        <torusKnotGeometry args={[1, 0.35, 128, 32]} />
        <meshStandardMaterial color="#4488ff" roughness={0.3} metalness={0.6} />
      </mesh>
    )
  },
})

const Scene = defineComponent({
  props: {
    loadKey: { type: Number, default: 0 },
  },
  setup(props) {
    const status = ref<'loading' | 'ready'>('loading')

    watch(
      () => props.loadKey,
      () => {
        status.value = 'loading'
        setTimeout(() => {
          status.value = 'ready'
        }, 2000)
      },
      { immediate: true },
    )

    return () => [status.value === 'loading' ? h(Placeholder) : h(LoadedContent)]
  },
})

export default defineComponent({
  setup() {
    const loadKey = ref(0)

    return () =>
      h(Canvas, null, {
        default: () => [
          h('ambientLight', { intensity: 0.5 }),
          h('directionalLight', { position: [5, 5, 5] }),
          h(Scene, { loadKey: loadKey.value }),
        ],
        overlay: () =>
          h(
            'div',
            {
              style: {
                position: 'absolute',
                top: '20px',
                left: '20px',
                pointerEvents: 'auto',
                background: 'rgba(0,0,0,0.7)',
                padding: '16px',
                borderRadius: '8px',
                color: 'white',
                fontFamily: 'sans-serif',
                fontSize: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              },
            },
            [
              h('div', null, 'Manual loading state management — no Suspense'),
              h(
                'button',
                {
                  onClick: () => {
                    loadKey.value++
                  },
                  style: {
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#4488ff',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                  },
                },
                'Reload',
              ),
            ],
          ),
      })
  },
})
