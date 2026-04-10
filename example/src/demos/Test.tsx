import { Canvas, useFrame } from '@xperimntl/vue-threejs'
import { defineComponent, onMounted, ref } from 'vue'
import { Mesh } from 'three'

const Box = defineComponent({
  props: {
    color: { type: String, default: 'orange' },
    position: { type: Array, default: () => [0, 0, 0] },
  },
  setup(props) {
    const meshRef = ref<Mesh | null>(null)
    const hovered = ref(false)
    const clicked = ref(false)

    useFrame((_, delta) => {
      if (meshRef.value) meshRef.value.rotation.x += delta
    })

    return () => (
      <mesh
        position={props.position}
        ref={meshRef}
        scale={clicked.value ? 1.5 : 1}
        onClick={() => (clicked.value = !clicked.value)}
        onPointerOver={(event: { stopPropagation: () => void }) => (event.stopPropagation(), (hovered.value = true))}
        onPointerOut={() => (hovered.value = false)}>
        <boxGeometry />
        <meshStandardMaterial color={hovered.value ? 'hotpink' : props.color} />
      </mesh>
    )
  },
})

export default defineComponent({
  setup() {
    const visible = ref(true)

    onMounted(() => {
      setTimeout(() => (visible.value = false), 2000)
      setTimeout(() => (visible.value = true), 4000)
    })

    return () => (
      <Canvas>
        {{
          default: () => [
            <ambientLight intensity={Math.PI / 2} />,
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />,
            <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />,
            <Box position={[-1.2, 0, 0]} />,
            visible.value && <Box color="skyblue" position={[1.2, 0, 0]} />,
          ],
        }}
      </Canvas>
    )
  },
})
