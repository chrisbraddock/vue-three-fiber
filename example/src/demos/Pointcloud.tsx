import { Canvas, type ThreeEvent, extend } from '@xperimntl/vue-threejs'
import { computed, defineComponent, ref } from 'vue'
import { Color, Points, ShaderLib, ShaderMaterial } from 'three'

class DotMaterialImpl extends ShaderMaterial {
  constructor() {
    super({
      transparent: true,
      uniforms: { size: { value: 15 }, scale: { value: 1 } },
      vertexShader: ShaderLib.points.vertexShader,
      fragmentShader: `
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, step(length(gl_PointCoord.xy - vec2(0.5)), 0.5));
      }`,
    })
  }
}

const DotMaterial = extend(DotMaterialImpl)

const white = new Color('white')
const hotpink = new Color('hotpink')

const Particles = defineComponent({
  props: {
    pointCount: { type: Number, required: true },
  },
  setup(props) {
    const positions = computed(() => {
      return new Float32Array([...new Array(props.pointCount * 3)].map(() => 5 - Math.random() * 10))
    })
    const colors = computed(() => {
      return new Float32Array([...new Array(props.pointCount)].flatMap(() => hotpink.toArray()))
    })

    const pointsRef = ref<Points | null>(null)

    const hover = (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (pointsRef.value && e.index != null) {
        white.toArray(pointsRef.value.geometry.attributes.color.array, e.index * 3)
        pointsRef.value.geometry.attributes.color.needsUpdate = true
      }
    }

    const unhover = (e: ThreeEvent<PointerEvent>) => {
      if (pointsRef.value && e.index != null) {
        hotpink.toArray(pointsRef.value.geometry.attributes.color.array, e.index * 3)
        pointsRef.value.geometry.attributes.color.needsUpdate = true
      }
    }

    return () => (
      <points ref={pointsRef} onPointerOver={hover} onPointerOut={unhover}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions.value, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors.value, 3]} />
        </bufferGeometry>
        <DotMaterial vertexColors depthWrite={false} />
      </points>
    )
  },
})

export default defineComponent({
  setup() {
    return () => (
      <Canvas
        orthographic
        camera={{ zoom: 40, position: [0, 0, 100] }}
        raycaster={{ params: { Points: { threshold: 0.2 } } }}>
        {{ default: () => <Particles pointCount={1000} /> }}
      </Canvas>
    )
  },
})
