import { Canvas, useFrame, useObjectRef } from '@xperimntl/vue-threejs'
import { defineComponent, ref, h } from 'vue'
import type { Mesh } from 'three'

const SceneA = defineComponent({
  setup() {
    const mesh = useObjectRef<Mesh>()

    useFrame((_, delta) => {
      if (mesh.object.value) {
        mesh.object.value.rotation.x += delta
        mesh.object.value.rotation.y += delta * 0.6
      }
    })

    return () => (
      <mesh ref={mesh.ref}>
        <boxGeometry />
        <meshStandardMaterial color="royalblue" />
      </mesh>
    )
  },
})

const SceneB = defineComponent({
  setup() {
    const mesh = useObjectRef<Mesh>()

    useFrame((_, delta) => {
      if (mesh.object.value) {
        mesh.object.value.rotation.x += delta * 0.8
        mesh.object.value.rotation.y += delta
      }
    })

    return () => (
      <mesh ref={mesh.ref}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    )
  },
})

export default defineComponent({
  setup() {
    const showA = ref(true)

    return () =>
      h(Canvas, null, {
        default: () => [
          h('ambientLight', { intensity: 0.5 }),
          h('directionalLight', { position: [5, 5, 5] }),
          showA.value ? h(SceneA) : h(SceneB),
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
              },
            },
            [
              h(
                'button',
                {
                  onClick: () => {
                    showA.value = !showA.value
                  },
                  style: {
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '6px',
                    fontFamily: 'sans-serif',
                  },
                },
                showA.value ? 'Switch to Sphere' : 'Switch to Cube',
              ),
            ],
          ),
      })
  },
})
