import { defineComponent, provide, h } from 'vue'
import { Canvas } from '@xperimntl/vue-threejs'
import { EffectComposer, Bloom, Vignette } from '@xperimntl/vue-threejs-postprocessing'
import { OrbitControls } from '@xperimntl/vue-threejs-drei'
import { createComposerService, composerKey } from './compose/ComposerService'
import { SceneContent } from './compose/SceneObjects'
import { Sidebar } from './compose/Sidebar'
import { OverlayControls } from './compose/OverlayControls'

export default defineComponent({
  setup() {
    const service = createComposerService()
    provide(composerKey, service)

    return () =>
      h(
        'div',
        {
          style: {
            display: 'flex',
            width: '100%',
            height: '100%',
            minHeight: '500px',
            background: '#0c0e14',
            borderRadius: '12px',
            overflow: 'hidden',
          },
        },
        [
          // DOM sidebar — outside Canvas, reads same service via provide/inject
          h(Sidebar),

          // Canvas — 3D viewport with overlay slot
          h('div', { style: { flex: 1, position: 'relative' } }, [
            h(
              Canvas,
              {
                frameloop: service.frameloop.value,
                camera: { position: [0, 1.5, 5], fov: 50 },
                dpr: [1, 2],
                gl: { antialias: true },
                style: { width: '100%', height: '100%' },
              },
              {
                default: () => [
                  h('ambientLight', { intensity: 0.4 }),
                  h('directionalLight', { position: [5, 5, 5], intensity: 1.2 }),
                  h('pointLight', { position: [-3, 2, -2], intensity: 0.6, color: '#aaccff' }),
                  h('color', { attach: 'background', args: ['#0c0e14'] }),
                  h(SceneContent),
                  h(OrbitControls, { enableDamping: true, dampingFactor: 0.05, enablePan: false }),
                  h(EffectComposer, null, {
                    default: () => [
                      service.bloom.value
                        ? h(Bloom, {
                            intensity: service.bloomIntensity.value,
                            luminanceThreshold: 0.3,
                            luminanceSmoothing: 0.9,
                            mipmapBlur: true,
                          })
                        : null,
                      service.vignette.value ? h(Vignette, { darkness: 0.5, offset: 0.5 }) : null,
                    ],
                  }),
                ],
                overlay: () => h(OverlayControls),
              },
            ),
          ]),
        ],
      )
  },
})
