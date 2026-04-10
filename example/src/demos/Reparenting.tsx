import { Canvas, createPortal } from '@xperimntl/vue-threejs'
import { defineComponent, onMounted, onUnmounted, ref } from 'vue'
import { Group, Object3D } from 'three'

const Icosahedron = defineComponent({
  setup() {
    const active = ref(false)

    return () => (
      <mesh scale={active.value ? [2, 2, 2] : [1, 1, 1]} onClick={() => (active.value = !active.value)}>
        <icosahedronGeometry args={[1, 0]} />
        <meshNormalMaterial />
      </mesh>
    )
  },
})

const RenderToPortal = defineComponent({
  props: {
    targets: { type: Array, required: true },
  },
  setup(props) {
    const targetIndex = ref(0)
    let interval: ReturnType<typeof setInterval>

    onMounted(() => {
      interval = setInterval(() => {
        targetIndex.value = (targetIndex.value + 1) % props.targets.length
      }, 1000)
    })
    onUnmounted(() => clearInterval(interval))

    return () => {
      const current = props.targets[targetIndex.value]
      if (!(current instanceof Object3D)) return null
      return <>{createPortal(<Icosahedron />, current)}</>
    }
  },
})

export default defineComponent({
  setup() {
    const ref1 = ref<Group | null>(null)
    const ref2 = ref<Group | null>(null)

    return () => (
      <Canvas onCreated={() => console.log('onCreated')}>
        {{
          default: () => (
            <group>
              <group ref={ref1} position={[-2, 0, 0]} />
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshNormalMaterial />
              </mesh>
              <group ref={ref2} position={[2, 0, 0]} />
              {ref1.value && ref2.value && <RenderToPortal targets={[ref1.value, ref2.value]} />}
            </group>
          ),
        }}
      </Canvas>
    )
  },
})
