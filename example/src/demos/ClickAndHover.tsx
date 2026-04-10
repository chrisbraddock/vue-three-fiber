import { Canvas, useFrame } from '@xperimntl/vue-threejs'
import { defineComponent, ref } from 'vue'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three'

const existingMesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial({ color: 'red' }))
const existingGroup = new Group()
existingGroup.add(existingMesh)

const Box = defineComponent({
  props: {
    position: { type: Array, default: () => [0, 0, 0] },
  },
  setup(props) {
    const meshRef = ref<Mesh | null>(null)
    const hovered = ref(false)
    const clicked = ref(false)

    useFrame((state) => {
      if (meshRef.value) meshRef.value.position.y = Math.sin(state.clock.elapsedTime) / 3
    })

    return () => (
      <mesh
        ref={meshRef}
        onPointerOver={() => (hovered.value = true)}
        onPointerOut={() => (hovered.value = false)}
        onClick={() => (clicked.value = !clicked.value)}
        scale={clicked.value ? [1.5, 1.5, 1.5] : [1, 1, 1]}
        position={props.position}>
        <boxGeometry />
        <meshBasicMaterial color={hovered.value ? 'hotpink' : 'aquamarine'} />
      </mesh>
    )
  },
})

const Box2 = defineComponent({
  props: {
    position: { type: Array, default: () => [0, 0, 0] },
  },
  setup(props) {
    return () => <primitive object={existingGroup} position={props.position} onClick={() => console.log('hi')} />
  },
})

export default defineComponent({
  setup() {
    return () => (
      <Canvas>
        {{
          default: () => [
            <group>
              <Box position={[-0.5, 0, 0]} />
            </group>,
            <Box2 position={[0.5, 0, 0]} />,
          ],
        }}
      </Canvas>
    )
  },
})
