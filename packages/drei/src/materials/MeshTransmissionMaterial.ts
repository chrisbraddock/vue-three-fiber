import { defineComponent, onBeforeUnmount, shallowRef, watch, h, type PropType } from 'vue'
import { useThree, useFrame } from '@xperimntl/vue-threejs'
import * as THREE from 'three'

export const MeshTransmissionMaterial = defineComponent({
  name: 'DreiMeshTransmissionMaterial',
  props: {
    samples: { type: Number, default: 6 },
    resolution: { type: Number, default: 512 },
    transmission: { type: Number, default: 1 },
    thickness: { type: Number, default: 0 },
    roughness: { type: Number, default: 0 },
    chromaticAberration: { type: Number, default: 0.05 },
    anisotropy: { type: Number, default: 0.1 },
    distortion: { type: Number, default: 0 },
    distortionScale: { type: Number, default: 0.5 },
    temporalDistortion: { type: Number, default: 0 },
    clearcoat: { type: Number, default: 0 },
    clearcoatRoughness: { type: Number, default: 0 },
    ior: { type: Number, default: 1.5 },
    color: {
      type: [String, Number] as PropType<string | number>,
      default: 'white',
    },
    background: {
      type: Object as PropType<THREE.Texture | null>,
      default: null,
    },
    backside: { type: Boolean, default: false },
    backsideThickness: { type: Number, default: 0 },
    attach: { type: String, default: 'material' },
  },
  setup(props) {
    const state = useThree()
    const fboRef = shallowRef<THREE.WebGLRenderTarget | null>(null)
    const parentMesh = shallowRef<THREE.Mesh | null>(null)
    const materialInstance = shallowRef<any>(null)

    // Create the FBO for refraction buffer
    function createFBO(resolution: number): THREE.WebGLRenderTarget {
      return new THREE.WebGLRenderTarget(resolution, resolution, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        type: THREE.HalfFloatType,
        samples: 4,
      })
    }

    watch(
      () => props.resolution,
      (res) => {
        if (fboRef.value) {
          fboRef.value.dispose()
        }
        fboRef.value = createFBO(res)
      },
      { immediate: true },
    )

    // Render the scene behind the transmissive object into the FBO
    useFrame(() => {
      if (!fboRef.value || props.samples <= 0) return

      const { gl, scene, camera } = state.value
      if (!gl || !scene || !camera) return

      // Discover parent mesh from the material's Instance if not yet found
      if (!parentMesh.value && materialInstance.value) {
        const inst = materialInstance.value
        // The Instance proxy has a .parent property pointing to the parent Instance
        // whose .object is the mesh this material is attached to
        const parentInst = inst.parent
        if (parentInst && parentInst.object instanceof THREE.Mesh) {
          parentMesh.value = parentInst.object
        }
      }

      const parent = parentMesh.value
      if (parent) {
        const wasVisible = parent.visible
        parent.visible = false

        // Render scene to FBO
        gl.setRenderTarget(fboRef.value)
        gl.render(scene, camera)
        gl.setRenderTarget(null)

        parent.visible = wasVisible
      }
    })

    onBeforeUnmount(() => {
      if (fboRef.value) {
        fboRef.value.dispose()
        fboRef.value = null
      }
    })

    return () => {
      const materialProps: Record<string, unknown> = {
        attach: props.attach,
        color: props.color,
        transmission: props.transmission,
        thickness: props.thickness,
        roughness: props.roughness,
        clearcoat: props.clearcoat,
        clearcoatRoughness: props.clearcoatRoughness,
        ior: props.ior,
        side: props.backside ? THREE.BackSide : THREE.FrontSide,
        ref: (instance: any) => {
          // Capture the Instance proxy so we can walk up to the parent mesh
          materialInstance.value = instance
        },
      }

      if (fboRef.value && props.samples > 0) {
        materialProps.transmissionMap = fboRef.value.texture
      }

      return h('meshPhysicalMaterial', materialProps)
    }
  },
})
