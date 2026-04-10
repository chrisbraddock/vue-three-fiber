import { defineComponent, inject, watchEffect } from 'vue'
import { useFrame, useObjectRef, watchInvalidate } from '@xperimntl/vue-threejs'
import { composerKey, type ComposerService } from './ComposerService'
import type { Mesh, MeshStandardMaterial } from 'three'

function isComposerService(v: unknown): v is ComposerService {
  return v != null && typeof v === 'object' && 'selectedIndex' in v
}

function isStandardMaterial(m: unknown): m is MeshStandardMaterial {
  return m != null && typeof m === 'object' && 'emissive' in m
}

const ComposerMesh = defineComponent({
  props: {
    index: { type: Number, required: true },
    position: { type: Array, required: true },
    geometry: { type: String, required: true },
  },
  setup(props) {
    const injected = inject(composerKey)
    if (!isComposerService(injected)) throw new Error('ComposerService not provided')
    const service = injected
    const mesh = useObjectRef<Mesh>()

    // Demand rendering: invalidate when selection or material props change
    watchInvalidate(() => [
      service.selectedIndex.value,
      service.objects[props.index].color,
      service.objects[props.index].roughness,
      service.objects[props.index].metalness,
    ])

    // Drive emissive highlight reactively
    watchEffect(() => {
      const obj = mesh.object.value
      if (!obj) return
      const mat = obj.material
      if (!isStandardMaterial(mat)) return
      const isSelected = service.selectedIndex.value === props.index
      mat.emissive.set(isSelected ? '#334466' : '#000000')
      mat.emissiveIntensity = isSelected ? 1.5 : 0
    })

    useFrame((_, delta) => {
      const obj = mesh.object.value
      if (!obj) return
      const isSelected = service.selectedIndex.value === props.index
      obj.rotation.y += delta * (isSelected ? 1.2 : 0.2)
    })

    const handleClick = () => {
      service.selectedIndex.value = props.index
    }

    return () => {
      const def = service.objects[props.index]
      const geo =
        props.geometry === 'torus' ? (
          <torusGeometry args={[0.55, 0.22, 32, 64]} />
        ) : props.geometry === 'sphere' ? (
          <sphereGeometry args={[0.6, 32, 32]} />
        ) : (
          <boxGeometry args={[0.9, 0.9, 0.9]} />
        )

      return (
        <mesh
          ref={mesh.ref}
          position={props.position as [number, number, number]}
          onClick={handleClick}
          scale={service.selectedIndex.value === props.index ? 1.15 : 1}>
          {geo}
          <meshStandardMaterial
            color={def.color}
            roughness={def.roughness}
            metalness={def.metalness}
            envMapIntensity={1.2}
          />
        </mesh>
      )
    }
  },
})

export const SceneContent = defineComponent({
  setup() {
    return () => (
      <group>
        <ComposerMesh index={0} position={[-2, 0, 0]} geometry="torus" />
        <ComposerMesh index={1} position={[0, 0, 0]} geometry="sphere" />
        <ComposerMesh index={2} position={[2, 0, 0]} geometry="box" />
      </group>
    )
  },
})
