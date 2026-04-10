import { Canvas } from '@xperimntl/vue-threejs'
import { defineComponent, ref } from 'vue'

const SphereComponent = defineComponent({
  setup() {
    const hovered = ref(false)
    return () => (
      <mesh
        onPointerOver={(e: { stopPropagation: () => void }) => (e.stopPropagation(), (hovered.value = true))}
        onPointerOut={() => (hovered.value = false)}>
        <sphereGeometry args={[0.5, 64, 64]} />
        <meshBasicMaterial color={hovered.value ? 'hotpink' : 'indianred'} />
      </mesh>
    )
  },
})

const Circle = defineComponent({
  setup() {
    const hovered = ref(false)
    return () => (
      <mesh
        onPointerOver={(e: { stopPropagation: () => void }) => (e.stopPropagation(), (hovered.value = true))}
        onPointerOut={() => (hovered.value = false)}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color={hovered.value ? 'lightgreen' : 'grey'} />
      </mesh>
    )
  },
})

export default defineComponent({
  setup() {
    return () => (
      <Canvas orthographic camera={{ position: [0, 0, 20], zoom: 150 }} style={{ background: '#272730' }}>
        {{
          default: () => [
            <group
              position={[-1.25, 0, 0]}
              onPointerOver={() => console.log('group1 over')}
              onPointerOut={() => console.log('group1 out')}>
              <group
                onPointerOver={() => console.log('      group2 over')}
                onPointerOut={() => console.log('      group2 out')}>
                <mesh
                  renderOrder={8}
                  onPointerOver={() => console.log('      white mesh over')}
                  onPointerOut={() => console.log('      white mesh out')}>
                  <sphereGeometry args={[1, 32, 32]} />
                  <meshBasicMaterial color="white" transparent opacity={0.2} />
                </mesh>
                <mesh
                  renderOrder={7}
                  onPointerOver={() => console.log('        black mesh over')}
                  onPointerOut={() => console.log('        black mesh out')}>
                  <sphereGeometry args={[0.7, 32, 32]} />
                  <meshBasicMaterial color="black" transparent opacity={0.2} />
                </mesh>
              </group>
            </group>,
            <group position={[1.25, 0, 0]}>
              <Circle />
              <SphereComponent />
            </group>,
          ],
        }}
      </Canvas>
    )
  },
})
