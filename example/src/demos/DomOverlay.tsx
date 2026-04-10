import { Canvas, useFrame, useObjectRef } from '@xperimntl/vue-threejs'
import { defineComponent, ref, h } from 'vue'
import type { Mesh } from 'three'

function isInputElement(target: unknown): target is HTMLInputElement {
  return target instanceof HTMLInputElement
}

const RotatingBox = defineComponent({
  props: {
    color: { type: String, default: 'orange' },
    speed: { type: Number, default: 1 },
  },
  setup(props) {
    const mesh = useObjectRef<Mesh>()

    useFrame((_, delta) => {
      if (mesh.object.value) {
        mesh.object.value.rotation.x += delta * props.speed
        mesh.object.value.rotation.y += delta * props.speed * 0.7
      }
    })

    return () => (
      <mesh ref={mesh.ref}>
        <boxGeometry />
        <meshStandardMaterial color={props.color} />
      </mesh>
    )
  },
})

export default defineComponent({
  setup() {
    const color = ref('#ff8800')
    const speed = ref(1)

    return () =>
      h(Canvas, null, {
        default: () => [
          h('ambientLight', { intensity: 0.5 }),
          h('directionalLight', { position: [5, 5, 5] }),
          h(RotatingBox, { color: color.value, speed: speed.value }),
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
                background: 'rgba(0,0,0,0.7)',
                padding: '16px',
                borderRadius: '8px',
                color: 'white',
                fontFamily: 'sans-serif',
                fontSize: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              },
            },
            [
              h('label', null, [
                'Color: ',
                h('input', {
                  type: 'color',
                  value: color.value,
                  onInput: (e: Event) => {
                    if (isInputElement(e.target)) color.value = e.target.value
                  },
                }),
              ]),
              h('label', null, [
                'Speed: ',
                h('input', {
                  type: 'range',
                  min: '0',
                  max: '5',
                  step: '0.1',
                  value: String(speed.value),
                  onInput: (e: Event) => {
                    if (isInputElement(e.target)) speed.value = parseFloat(e.target.value)
                  },
                }),
              ]),
            ],
          ),
      })
  },
})
