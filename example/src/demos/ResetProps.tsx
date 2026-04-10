import { Canvas, useFrame, useThree } from '@xperimntl/vue-threejs'
import { defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { Group } from 'three'

const AdaptivePixelRatio = defineComponent({
  setup() {
    const gl = useThree((state) => state.gl)
    const current = useThree((state) => state.performance.current)
    const initialDpr = useThree((state) => state.viewport.initialDpr)
    const setDpr = useThree((state) => state.setDpr)

    onMounted(() => {
      const domElement = gl.value.domElement
      return () => {
        setDpr.value(initialDpr.value)
        domElement.style.imageRendering = 'auto'
      }
    })

    return () => null
  },
})

const Scene = defineComponent({
  setup() {
    const groupRef = ref<Group | null>(null)
    const showCube = ref(false)
    const hovered = ref(false)
    let interval: ReturnType<typeof setInterval>

    onMounted(() => {
      interval = setInterval(() => (showCube.value = !showCube.value), 1000)
    })
    onUnmounted(() => clearInterval(interval))

    useFrame(({ clock }) => {
      if (groupRef.value) groupRef.value.rotation.set(Math.sin(clock.elapsedTime), 0, 0)
    })

    return () => (
      <>
        <ambientLight intensity={0.5 * Math.PI} />
        <pointLight decay={0} position={[10, 10, 10]} intensity={2} />
        <pointLight decay={0} position={[-10, -10, -10]} color="red" intensity={4} />
        <mesh
          scale={hovered.value ? 1.25 : 1}
          onPointerOver={() => (hovered.value = true)}
          onPointerOut={() => (hovered.value = false)}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={showCube.value ? 'white' : 'red'} />
        </mesh>
        <group ref={groupRef}>
          {showCube.value ? (
            <mesh position={[1.5, 0, 0]}>
              <boxGeometry args={[1, 1]} />
              <meshNormalMaterial transparent opacity={0.5} />
            </mesh>
          ) : (
            <mesh>
              <icosahedronGeometry args={[1]} />
              <meshStandardMaterial color="orange" transparent opacity={0.5} />
            </mesh>
          )}
          <mesh position={[-2, -2, 0]}>
            <sphereGeometry args={[0.2, 32, 32]} />
            <meshPhongMaterial>
              {showCube.value ? <color attach="color" args={[0, 0, 1]} /> : <color attach="color" args={[1, 0, 0]} />}
            </meshPhongMaterial>
          </mesh>
        </group>
        <AdaptivePixelRatio />
      </>
    )
  },
})

export default defineComponent({
  setup() {
    return () => (
      <Canvas dpr={[1, 2]} frameloop="always" performance={{ min: 0.1 }}>
        {{ default: () => <Scene /> }}
      </Canvas>
    )
  },
})
