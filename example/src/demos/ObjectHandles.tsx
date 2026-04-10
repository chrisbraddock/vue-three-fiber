import { Canvas, useFrame, useObjectRef } from '@xperimntl/vue-threejs'
import { defineComponent, h, ref, watch } from 'vue'
import type { Mesh } from 'three'
import { Vector3 } from 'three'

const InfoOverlay = defineComponent({
  props: {
    info: { type: Object, default: () => ({}) },
  },
  setup(props) {
    const row = (label: string, value: string, mono = false) => [
      h('span', { style: { opacity: 0.5 } }, label),
      h('span', { style: mono ? { fontFamily: 'monospace' } : {} }, value),
    ]

    return () =>
      h(
        'div',
        {
          style: {
            position: 'absolute',
            top: '16px',
            left: '16px',
            pointerEvents: 'none',
            background: 'rgba(10, 12, 18, 0.78)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '10px 14px',
            color: 'rgba(214, 228, 255, 0.85)',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '11px',
            lineHeight: '1.7',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '2px 10px',
          },
        },
        [
          h('span', { style: { opacity: 0.5 } }, 'useObjectRef'),
          h('span', { style: { fontWeight: 600 } }, 'Live THREE.Mesh data'),
          ...row('type', props.info.type ?? '\u2014'),
          ...row('uuid', props.info.uuid ?? '\u2014', true),
          ...row('world pos', props.info.position ?? '\u2014', true),
          ...row('rotation', props.info.rotation ?? '\u2014', true),
          ...row('mounted', String(props.info.mounted ?? false)),
        ],
      )
  },
})

const CubeWithInfo = defineComponent({
  props: {
    info: { type: Object, required: true },
  },
  setup(props) {
    const cube = useObjectRef<Mesh>()
    const tmpVec = new Vector3()

    useFrame((_, delta) => {
      const obj = cube.object.value
      if (!obj) return
      obj.rotation.x += delta
      obj.rotation.y += delta * 0.5

      const wp = obj.getWorldPosition(tmpVec)
      props.info.value = {
        type: obj.type,
        position: `${wp.x.toFixed(2)}, ${wp.y.toFixed(2)}, ${wp.z.toFixed(2)}`,
        rotation: `${obj.rotation.x.toFixed(2)}, ${obj.rotation.y.toFixed(2)}, ${obj.rotation.z.toFixed(2)}`,
        uuid: obj.uuid.slice(0, 8),
        mounted: cube.mounted.value,
      }
    })

    watch(cube.mounted, (mounted) => {
      if (props.info.value) {
        props.info.value = { ...props.info.value, mounted }
      }
    })

    return () => h('mesh', { ref: cube.ref }, [h('boxGeometry'), h('meshStandardMaterial', { color: 'orange' })])
  },
})

export default defineComponent({
  setup() {
    const cubeInfo = ref({
      type: '\u2014',
      position: '\u2014',
      rotation: '\u2014',
      uuid: '\u2014',
      mounted: false,
    })

    return () =>
      h(Canvas, null, {
        default: () => [
          h('ambientLight', { intensity: Math.PI / 2 }),
          h('spotLight', { position: [10, 10, 10], angle: 0.15, penumbra: 1, decay: 0, intensity: Math.PI }),
          h('pointLight', { position: [-10, -10, -10], decay: 0, intensity: Math.PI }),
          h(CubeWithInfo, { info: cubeInfo }),
        ],
        overlay: () => h(InfoOverlay, { info: cubeInfo.value }),
      })
  },
})
