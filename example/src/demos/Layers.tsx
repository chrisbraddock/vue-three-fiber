import { Canvas } from '@xperimntl/vue-threejs'
import { defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { Layers } from 'three'

const invisibleLayer = new Layers()
invisibleLayer.set(4)

const visibleLayers = new Layers()
visibleLayers.enableAll()
visibleLayers.disable(4)

const Box = defineComponent({
  props: {
    position: { type: Array, default: () => [0, 0, 0] },
    layers: { type: Object, default: undefined },
  },
  setup(props) {
    return () => (
      <mesh position={props.position} layers={props.layers}>
        <boxGeometry />
        <meshBasicMaterial color="lightblue" toneMapped={false} />
      </mesh>
    )
  },
})

const Sphere = defineComponent({
  props: {
    position: { type: Array, default: () => [0, 0, 0] },
    layers: { type: Object, default: undefined },
  },
  setup(props) {
    return () => (
      <mesh position={props.position} layers={props.layers}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="aquamarine" toneMapped={false} />
      </mesh>
    )
  },
})

export default defineComponent({
  setup() {
    const visible = ref(false)
    let interval: ReturnType<typeof setInterval>

    onMounted(() => {
      interval = setInterval(() => (visible.value = !visible.value), 1000)
    })

    onUnmounted(() => {
      clearInterval(interval)
    })

    return () => (
      <Canvas camera={{ layers: visibleLayers }}>
        {{
          default: () => [
            <Box position={[-0.5, 0, 0]} layers={!visible.value ? invisibleLayer : visibleLayers} />,
            <Sphere position={[0.5, 0, 0]} layers={visible.value ? invisibleLayer : visibleLayers} />,
          ],
        }}
      </Canvas>
    )
  },
})
