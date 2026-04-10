import { Canvas, useThree, useRenderCommit } from '@xperimntl/vue-threejs'
import { defineComponent, ref } from 'vue'

const colors = ['orange', 'hotpink', 'cyan', 'lime', 'yellow', 'red', 'blue', 'purple', 'green', 'coral']

const Capture = defineComponent({
  setup() {
    const color = ref(colors[0])
    const gl = useThree((state) => state.gl)
    const { commit } = useRenderCommit()

    const handleClick = async () => {
      color.value = colors[Math.floor(Math.random() * colors.length)]
      // Wait for Vue to flush the color change and the scene to render
      await commit()
      // Now safe to capture — the new color is on screen
      const link = document.createElement('a')
      link.href = gl.value.domElement.toDataURL()
      link.download = 'screenshot.png'
      link.click()
    }

    return () => (
      <mesh onClick={handleClick}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color.value} />
      </mesh>
    )
  },
})

export default defineComponent({
  setup() {
    return () => (
      <Canvas>
        {{
          default: () => [
            <ambientLight intensity={Math.PI * 0.5} />,
            <spotLight decay={0} position={[10, 10, 10]} angle={0.15} penumbra={1} />,
            <Capture />,
          ],
        }}
      </Canvas>
    )
  },
})
