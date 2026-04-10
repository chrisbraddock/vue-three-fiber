import { Canvas, type ThreeEvent } from '@xperimntl/vue-threejs'
import { defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const state = ref(false)

    return () => (
      <Canvas
        orthographic
        camera={{ zoom: 150, fov: 75, position: [0, 0, 25] }}
        onPointerMissed={() => console.log('canvas.missed')}>
        {{
          default: () => [
            <ambientLight intensity={Math.PI} />,
            <pointLight decay={0} position={[10, 10, 10]} />,
            <mesh
              scale={[2, 2, 2]}
              position={[1, 0, 0]}
              onContextMenu={(ev: ThreeEvent<PointerEvent>) => {
                ev.nativeEvent.preventDefault()
                state.value = !state.value
              }}
              onPointerMissed={() => console.log('mesh.missed')}>
              <boxGeometry args={[1, 1, 1]} />
              <meshPhysicalMaterial color={state.value ? 'hotpink' : 'blue'} />
            </mesh>,
          ],
        }}
      </Canvas>
    )
  },
})
