import { Canvas } from '@xperimntl/vue-threejs'
import { computed, defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { DoubleSide, Mesh, MeshBasicMaterial, SphereGeometry } from 'three'

const redMaterial = new MeshBasicMaterial({ color: 'aquamarine', toneMapped: false })

const ReuseMaterial = defineComponent({
  props: {
    position: { type: Array, default: () => [0, 0, 0] },
  },
  setup(props) {
    return () => (
      <mesh position={props.position}>
        <sphereGeometry args={[0.25, 64, 64]} />
        <primitive attach="material" object={redMaterial} />
      </mesh>
    )
  },
})

const TestReuse = defineComponent({
  setup() {
    const okay = ref(true)
    let interval: ReturnType<typeof setInterval>

    onMounted(() => {
      interval = setInterval(() => (okay.value = !okay.value), 1000)
    })
    onUnmounted(() => clearInterval(interval))

    return () => (
      <>
        {okay.value && <ReuseMaterial position={[-1.5, 0, 0]} />}
        <ReuseMaterial position={[1.5, 0, 0]} />
      </>
    )
  },
})

const TestMultiMaterial = defineComponent({
  props: {
    position: { type: Array, default: () => [0, 0, 0] },
  },
  setup(props) {
    const meshRef = ref<Mesh | null>(null)
    const okay = ref(true)
    let interval: ReturnType<typeof setInterval>

    onMounted(() => {
      interval = setInterval(() => (okay.value = !okay.value), 1000)
    })
    onUnmounted(() => clearInterval(interval))

    return () => (
      <mesh ref={meshRef} position={props.position}>
        <boxGeometry args={[0.75, 0.75, 0.75]} />
        <meshBasicMaterial attach="material-0" color="hotpink" toneMapped={false} />
        <meshBasicMaterial attach="material-1" color="lightgreen" toneMapped={false} />
        {okay.value ? (
          <meshBasicMaterial attach="material-2" color="lightblue" toneMapped={false} />
        ) : (
          <meshNormalMaterial attach="material-2" />
        )}
        <meshBasicMaterial attach="material-3" color="pink" toneMapped={false} />
        <meshBasicMaterial attach="material-4" color="orange" toneMapped={false} />
        <meshBasicMaterial attach="material-5" color="lavender" toneMapped={false} />
      </mesh>
    )
  },
})

const TestMultiDelete = defineComponent({
  props: {
    position: { type: Array, default: () => [0, 0, 0] },
  },
  setup(props) {
    const meshRef = ref<Mesh | null>(null)
    const okay = ref(true)
    let interval: ReturnType<typeof setInterval>

    onMounted(() => {
      interval = setInterval(() => (okay.value = !okay.value), 1000)
    })
    onUnmounted(() => clearInterval(interval))

    return () => (
      <mesh ref={meshRef} position={props.position}>
        <boxGeometry args={[0.75, 0.75, 0.75]} />
        <meshBasicMaterial attach="material-0" color="hotpink" side={DoubleSide} toneMapped={false} />
        <meshBasicMaterial attach="material-1" color="lightgreen" side={DoubleSide} toneMapped={false} />
        {okay.value && <meshBasicMaterial attach="material-2" color="lightblue" side={DoubleSide} toneMapped={false} />}
        <meshBasicMaterial attach="material-3" color="pink" side={DoubleSide} toneMapped={false} />
        <meshBasicMaterial attach="material-4" color="orange" side={DoubleSide} toneMapped={false} />
        <meshBasicMaterial attach="material-5" color="lavender" side={DoubleSide} toneMapped={false} />
      </mesh>
    )
  },
})

const TestMix = defineComponent({
  props: {
    position: { type: Array, default: () => [0, 0, 0] },
  },
  setup(props) {
    const size = ref(0.1)
    const geometry = computed(() => new SphereGeometry(size.value, 64, 64))
    let interval: ReturnType<typeof setInterval>

    onMounted(() => {
      interval = setInterval(() => {
        size.value = size.value < 0.4 ? size.value + 0.025 : 0
      }, 1000)
    })
    onUnmounted(() => clearInterval(interval))

    return () => (
      <mesh args={[geometry.value]} position={props.position}>
        <meshBasicMaterial color="hotpink" toneMapped={false} />
      </mesh>
    )
  },
})

export default defineComponent({
  setup() {
    return () => (
      <Canvas camera={{ position: [2, 2, 2] }}>
        {{
          default: () => [
            <TestMultiMaterial position={[0, 0, 0.5]} />,
            <TestMultiDelete position={[0, 0, -0.5]} />,
            <TestReuse />,
            <TestMix position={[0, 1, 0]} />,
          ],
        }}
      </Canvas>
    )
  },
})
