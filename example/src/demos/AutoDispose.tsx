import { Canvas, useFrame } from '@xperimntl/vue-threejs'
import { defineComponent, ref } from 'vue'
import { Mesh } from 'three'

const Box1 = defineComponent({
  props: {
    active: { type: Boolean, required: true },
    setActive: { type: Function, required: true },
    position: { type: Array, default: () => [0, 0, 0] },
  },
  setup(props) {
    const mesh = ref<Mesh | null>(null)
    const hovered = ref(false)

    useFrame((state) => {
      if (mesh.value) mesh.value.position.y = Math.sin(state.clock.elapsedTime)
    })

    return () => (
      <mesh
        ref={mesh}
        position={props.position}
        onClick={() => props.setActive(!props.active)}
        onPointerOver={() => (hovered.value = true)}
        onPointerOut={() => (hovered.value = false)}>
        <boxGeometry />
        <meshStandardMaterial color={hovered.value ? 'hotpink' : 'orange'} />
      </mesh>
    )
  },
})

const Box2 = defineComponent({
  props: {
    active: { type: Boolean, required: true },
    setActive: { type: Function, required: true },
    position: { type: Array, default: () => [0, 0, 0] },
  },
  setup(props) {
    const mesh = ref<Mesh | null>(null)
    const hovered = ref(false)

    useFrame((state) => {
      if (mesh.value) mesh.value.position.y = Math.sin(state.clock.elapsedTime)
    })

    return () => (
      <group position={props.position}>
        <mesh
          ref={mesh}
          onClick={() => props.setActive(!props.active)}
          onPointerOver={() => (hovered.value = true)}
          onPointerOut={() => (hovered.value = false)}>
          <boxGeometry />
          <meshStandardMaterial color={hovered.value ? 'green' : 'blue'} />
        </mesh>
      </group>
    )
  },
})

const Switcher = defineComponent({
  setup() {
    const active = ref(false)

    return () => (
      <>
        {active.value && (
          <Box1 active={active.value} setActive={(v: boolean) => (active.value = v)} position={[-0.5, 0, 0]} />
        )}
        {!active.value && (
          <Box2 active={active.value} setActive={(v: boolean) => (active.value = v)} position={[0.25, 0, 0]} />
        )}
      </>
    )
  },
})

export default defineComponent({
  setup() {
    return () => (
      <Canvas orthographic camera={{ zoom: 100 }}>
        {{
          default: () => [<ambientLight intensity={Math.PI} />, <Switcher />],
        }}
      </Canvas>
    )
  },
})
