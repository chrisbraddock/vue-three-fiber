import { Canvas, useFrame } from '@xperimntl/vue-threejs'
import { defineComponent, onMounted, ref } from 'vue'
import { Mesh } from 'three'

const CanvasStyle = {
  width: '100%',
  height: '50%',
}

const SpinningObject = defineComponent({
  setup() {
    const meshRef = ref<Mesh | null>(null)

    useFrame(() => {
      if (meshRef.value) {
        meshRef.value.rotation.y += 0.03
      }
    })

    return () => (
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshNormalMaterial />
      </mesh>
    )
  },
})

const SpinningScene = defineComponent({
  setup() {
    return () => (
      <div style={CanvasStyle}>
        <Canvas>{{ default: () => <SpinningObject /> }}</Canvas>
      </div>
    )
  },
})

const StaticScene = defineComponent({
  setup() {
    return () => (
      <div style={CanvasStyle}>
        <Canvas>
          {{
            default: () => (
              <mesh>
                <boxGeometry args={[1, 1, 1]} />
                <meshNormalMaterial />
              </mesh>
            ),
          }}
        </Canvas>
      </div>
    )
  },
})

export default defineComponent({
  setup() {
    const secondScene = ref(false)

    onMounted(() => {
      setTimeout(() => (secondScene.value = true), 500)
    })

    return () => (
      <div style={{ width: '100%', height: '100%' }}>
        <SpinningScene />
        {secondScene.value && <StaticScene />}
      </div>
    )
  },
})
