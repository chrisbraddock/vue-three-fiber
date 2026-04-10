import { Canvas, useFrame, useObjectRef } from '@xperimntl/vue-threejs'
import { defineComponent, ref, h, provide, inject, computed } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import type { Mesh } from 'three'

interface SceneService {
  selectedObject: Ref<string | null>
  highlightColor: Ref<string>
}

const sceneServiceKey: InjectionKey<SceneService> = Symbol('scene-service')

function isInputElement(target: unknown): target is HTMLInputElement {
  return target instanceof HTMLInputElement
}

const SelectableMesh = defineComponent({
  props: {
    name: { type: String, required: true },
    position: { type: Array, required: true },
    geometry: { type: String, default: 'box' },
  },
  setup(props) {
    const mesh = useObjectRef<Mesh>()
    const service = inject(sceneServiceKey)!
    const isSelected = computed(() => service.selectedObject.value === props.name)

    useFrame((_, delta) => {
      if (mesh.object.value) {
        mesh.object.value.rotation.y += delta * (isSelected.value ? 2 : 0.3)
      }
    })

    const handleClick = () => {
      service.selectedObject.value = service.selectedObject.value === props.name ? null : props.name
    }

    return () => {
      const color = isSelected.value ? service.highlightColor.value : '#4477aa'
      const geometryNode =
        props.geometry === 'sphere'
          ? h('sphereGeometry', { args: [0.6, 32, 32] })
          : props.geometry === 'torus'
            ? h('torusGeometry', { args: [0.5, 0.2, 16, 32] })
            : h('boxGeometry')

      return h(
        'mesh',
        {
          ref: mesh.ref,
          position: props.position,
          scale: isSelected.value ? 1.3 : 1,
          onClick: handleClick,
        },
        [geometryNode, h('meshBasicMaterial', { color, toneMapped: false })],
      )
    }
  },
})

const ServicePanel = defineComponent({
  setup() {
    const service = inject(sceneServiceKey)!

    return () =>
      h(
        'div',
        {
          style: {
            position: 'absolute',
            top: '20px',
            right: '20px',
            pointerEvents: 'auto',
            background: 'rgba(0,0,0,0.7)',
            padding: '16px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'sans-serif',
            fontSize: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '180px',
          },
        },
        [
          h('div', { style: { fontWeight: 'bold', marginBottom: '4px' } }, 'Scene Services'),
          h(
            'div',
            null,
            service.selectedObject.value ? `Selected: ${service.selectedObject.value}` : 'Click an object to select it',
          ),
          h('label', null, [
            'Highlight: ',
            h('input', {
              type: 'color',
              value: service.highlightColor.value,
              onInput: (e: Event) => {
                if (isInputElement(e.target)) service.highlightColor.value = e.target.value
              },
            }),
          ]),
          h(
            'div',
            { style: { fontSize: '12px', opacity: '0.6', marginTop: '4px' } },
            service.selectedObject.value
              ? `Rotation speed: 2x for ${service.selectedObject.value}`
              : 'Unselected objects rotate slowly',
          ),
        ],
      )
  },
})

export default defineComponent({
  setup() {
    const selectedObject = ref<string | null>(null)
    const highlightColor = ref('#ffaa00')

    provide(sceneServiceKey, { selectedObject, highlightColor })

    return () =>
      h(Canvas, null, {
        default: () => [
          h('ambientLight', { intensity: 0.8 }),
          h('directionalLight', { position: [5, 5, 5] }),
          h(SelectableMesh, { name: 'Cube', position: [-2, 0, 0], geometry: 'box' }),
          h(SelectableMesh, { name: 'Sphere', position: [0, 0, 0], geometry: 'sphere' }),
          h(SelectableMesh, { name: 'Torus', position: [2, 0, 0], geometry: 'torus' }),
        ],
        overlay: () => h(ServicePanel),
      })
  },
})
