import { Canvas, useFrame, useLoader, useObjectRef } from '@xperimntl/vue-threejs'
import { Environment, OrbitControls } from '@xperimntl/vue-threejs-drei'
import { defineComponent, h } from 'vue'
import * as THREE from 'three'
import type { Mesh, Object3D } from 'three'
import { DRACOLoader, GLTFLoader } from 'three-stdlib'

type FlowerGLTF = {
  nodes: Record<string, Object3D>
  scene: THREE.Group
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

const Model = defineComponent({
  name: 'GlassFlowerModel',
  setup() {
    const gltf = useLoader(GLTFLoader, assetUrl('flower-transformed.glb'), (loader) => {
      const draco = new DRACOLoader()
      draco.setDecoderPath(assetUrl('draco-gltf/'))
      draco.setDecoderConfig({ type: 'js' })
      loader.setDRACOLoader(draco)
    })
    const root = useObjectRef<THREE.Group>()

    useFrame((_, delta) => {
      if (root.object.value) root.object.value.rotation.y += delta * 0.15
    })

    return () => {
      const asset = gltf.value as (FlowerGLTF & { scene: THREE.Group }) | null
      if (!asset) {
        return (
          <group ref={root.ref} position={[0, 0.25, 0]}>
            <mesh rotation={[0.4, 0.6, 0]}>
              <icosahedronGeometry args={[0.85, 2]} />
              <meshStandardMaterial
                color="#9fb8ff"
                emissive="#4055ff"
                emissiveIntensity={0.45}
                roughness={0.18}
                metalness={0.1}
              />
            </mesh>
          </group>
        )
      }

      const petals = asset?.nodes?.petals as Mesh | undefined
      const innerSphere = asset?.nodes?.Sphere as Mesh | undefined
      const glow = asset?.nodes?.Sphere001 as Mesh | undefined

      if (!petals || !innerSphere || !glow) {
        return (
          <group ref={root.ref} position={[0, -0.25, 0]} dispose={null}>
            <primitive object={asset.scene} />
          </group>
        )
      }

      return (
        <group ref={root.ref} position={[0, -0.25, 0]} dispose={null}>
          <mesh geometry={petals.geometry}>
            <meshPhysicalMaterial
              color="#f7ecff"
              side={THREE.DoubleSide}
              transmission={1}
              thickness={0.22}
              ior={1.05}
              roughness={0.02}
              iridescence={1}
              iridescenceIOR={1}
              iridescenceThicknessRange={[0, 1400]}
              clearcoat={1}
              clearcoatRoughness={0.04}
              envMapIntensity={1.25}
              attenuationDistance={0.25}
              attenuationColor="#ffffff"
            />
            <mesh geometry={innerSphere.geometry}>
              <meshPhysicalMaterial
                color="#d6d7ff"
                transmission={1}
                thickness={0.9}
                roughness={0}
                clearcoat={1}
                ior={1.18}
                envMapIntensity={1.5}
              />
            </mesh>
          </mesh>
        </group>
      )
    }
  },
})

export default defineComponent({
  name: 'GlassFlowerDemo',
  setup() {
    return () =>
      h(
        Canvas,
        {
          gl: { antialias: false },
          camera: { position: [0, 2.5, 5], fov: 35 },
          onCreated: (state: { gl: THREE.WebGLRenderer }) => {
            state.gl.toneMapping = THREE.ACESFilmicToneMapping
            state.gl.toneMappingExposure = 1
          },
        },
        {
          default: () => [
            h('color', { attach: 'background', args: ['#151520'] }),
            h('ambientLight', { intensity: 0.5 }),
            h('spotLight', { position: [10, 10, 10], angle: 0.15, penumbra: 1, intensity: 1.5 }),
            h('pointLight', { position: [-10, -10, -10], intensity: 1.2 }),
            h('pointLight', { position: [0, 3.5, -4], intensity: 8, color: '#dfe7ff', decay: 2 }),
            h('pointLight', { position: [4, 1.5, 2], intensity: 4, color: '#ffb8de', decay: 2 }),
            h('pointLight', { position: [-4, 1, 2], intensity: 3, color: '#89bbff', decay: 2 }),
            h(Environment, { files: assetUrl('blue_photo_studio_1k.hdr'), resolution: 512 }),
            h(Model),
            h(OrbitControls, {
              enableDamping: true,
              dampingFactor: 0.08,
              enablePan: false,
              minDistance: 3,
              maxDistance: 8,
              target: [0, 0.35, 0],
            }),
          ],
          overlay: () =>
            h(
              'div',
              {
                style: {
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  maxWidth: '320px',
                  padding: '12px 14px',
                  background: 'rgba(14, 14, 19, 0.72)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#e8e8ef',
                  fontFamily: 'Inter var, sans-serif',
                  fontSize: '12px',
                  lineHeight: 1.45,
                  pointerEvents: 'auto',
                },
              },
              [
                h('div', { style: { fontWeight: 600, marginBottom: '6px' } }, 'GlassFlower'),
                h('div', null, 'GLTF model with HDRI lighting, physically-based glass material, and orbit controls.'),
              ],
            ),
        },
      )
  },
})
