import { defineComponent, h, shallowRef, inject, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { useFrame } from '@xperimntl/vue-threejs'
import { PHYSICS_CONTEXT } from './context'

export const Debug = defineComponent({
  name: 'PhysicsDebug',
  setup() {
    const physics = inject(PHYSICS_CONTEXT)
    if (!physics) {
      throw new Error('@xperimntl/vue-threejs-rapier: <Debug> must be placed inside a <Physics> component')
    }

    const { world } = physics

    const geometry = new THREE.BufferGeometry()
    const material = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      vertexColors: true,
    })

    const meshRef = shallowRef<THREE.LineSegments | null>(null)

    useFrame(() => {
      if (!world.value || !meshRef.value) return

      const debugBuffers = world.value.debugRender()

      // debugBuffers.vertices is a Float32Array of xyz positions
      // debugBuffers.colors is a Float32Array of rgba colors
      const vertices = debugBuffers.vertices
      const colors = debugBuffers.colors

      if (vertices.length === 0) {
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 4))
        return
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4))
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.color.needsUpdate = true
      geometry.computeBoundingSphere()
    })

    onBeforeUnmount(() => {
      geometry.dispose()
      material.dispose()
    })

    return () => {
      return h('primitive', {
        object: new THREE.LineSegments(geometry, material),
        ref: (el: any) => {
          if (el && el.object) {
            meshRef.value = el.object as THREE.LineSegments
          } else if (el instanceof THREE.LineSegments) {
            meshRef.value = el
          } else {
            meshRef.value = null
          }
        },
        raycast: () => null, // disable raycasting on debug mesh
      })
    }
  },
})
