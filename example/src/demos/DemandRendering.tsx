import { Canvas, watchInvalidate, type RootState } from '@xperimntl/vue-threejs'
import { defineComponent, h, ref } from 'vue'

const Product = defineComponent({
  props: {
    color: { type: String, default: 'orange' },
    onCycle: { type: Function, default: undefined },
  },
  setup(props) {
    // Re-render whenever color changes — no wasted frames between changes
    watchInvalidate(() => props.color)

    return () => (
      <mesh onClick={props.onCycle as (() => void) | undefined}>
        <torusKnotGeometry args={[1, 0.3, 128, 32]} />
        <meshStandardMaterial color={props.color} />
      </mesh>
    )
  },
})

const colors = ['#4488ff', '#ff4444', '#44ff44', '#ff8800', '#8844ff', '#ff44aa']

export default defineComponent({
  setup() {
    const color = ref(colors[0])
    const invalidateFrame = ref<((frames?: number) => void) | null>(null)
    let colorIndex = 0

    const cycleColor = () => {
      colorIndex = (colorIndex + 1) % colors.length
      color.value = colors[colorIndex]
      invalidateFrame.value?.(1)
    }

    return () =>
      h(
        Canvas,
        {
          frameloop: 'demand',
          onCreated: (state: RootState) => {
            invalidateFrame.value = state.invalidate
          },
        },
        {
          default: () => [
            h('ambientLight', { intensity: 0.5 }),
            h('directionalLight', { position: [5, 5, 5] }),
            h(Product, { color: color.value, onCycle: cycleColor }),
          ],
          overlay: () =>
            h(
              'div',
              {
                style: {
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  pointerEvents: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'flex-start',
                },
              },
              [
                h(
                  'button',
                  {
                    onClick: cycleColor,
                    style: {
                      padding: '8px 14px',
                      borderRadius: '999px',
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(10, 12, 18, 0.76)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                    },
                  },
                  'Cycle color',
                ),
                h(
                  'div',
                  {
                    style: {
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '12px',
                      fontFamily: 'sans-serif',
                    },
                  },
                  'Click the button or the torus knot.',
                ),
              ],
            ),
        },
      )
  },
})
