import { defineComponent, onBeforeUnmount, shallowRef, watch, type PropType } from 'vue'
import { useThree } from '@xperimntl/vue-threejs'
import { RGBELoader, EXRLoader } from 'three-stdlib'
import * as THREE from 'three'

function getLoaderForExtension(file: string) {
  const ext = file.split('.').pop()?.toLowerCase()
  if (ext === 'hdr') return RGBELoader
  if (ext === 'exr') return EXRLoader
  return RGBELoader // default to HDR
}

export const Environment = defineComponent({
  name: 'DreiEnvironment',
  props: {
    files: {
      type: [String, Array] as PropType<string | string[]>,
      required: true,
    },
    background: { type: Boolean, default: false },
    resolution: { type: Number, default: 256 },
    preset: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const scene = useThree((state) => state.scene)
    const gl = useThree((state) => state.gl)
    const envMap = shallowRef<THREE.Texture | null>(null)
    let previousEnvironment: THREE.Texture | null = null
    let previousBackground: THREE.Color | THREE.Texture | null = null

    function loadEnvironment(files: string | string[]) {
      const file = Array.isArray(files) ? files[0] : files
      if (!file) return

      const LoaderClass = getLoaderForExtension(file)
      const loader = new LoaderClass()

      // For cube maps (6 files), use CubeTextureLoader
      if (Array.isArray(files) && files.length === 6) {
        const cubeLoader = new THREE.CubeTextureLoader()
        cubeLoader.load(files, (cubeTexture) => {
          applyEnvironment(cubeTexture)
        })
        return
      }

      loader.load(file, (texture: THREE.Texture | THREE.DataTexture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping
        applyEnvironment(texture)
      })
    }

    function applyEnvironment(texture: THREE.Texture) {
      const scn = scene.value
      if (!scn) return

      envMap.value = texture
      previousEnvironment = scn.environment
      scn.environment = texture

      if (props.background) {
        previousBackground = scn.background
        scn.background = texture
      }
    }

    function clearEnvironment() {
      const scn = scene.value
      if (!scn) return

      if (envMap.value) {
        if (scn.environment === envMap.value) {
          scn.environment = previousEnvironment
        }
        if (props.background && scn.background === envMap.value) {
          scn.background = previousBackground
        }
        envMap.value.dispose()
        envMap.value = null
      }
    }

    watch(
      () => props.files,
      (files) => {
        clearEnvironment()
        if (files) loadEnvironment(files)
      },
      { immediate: true },
    )

    watch(
      () => props.background,
      (bg) => {
        const scn = scene.value
        if (!scn || !envMap.value) return

        if (bg) {
          previousBackground = scn.background
          scn.background = envMap.value
        } else {
          if (scn.background === envMap.value) {
            scn.background = previousBackground
          }
        }
      },
    )

    onBeforeUnmount(() => {
      clearEnvironment()
    })

    return () => slots.default?.() ?? null
  },
})
