import { defineComponent, h, type PropType } from 'vue'
import * as THREE from 'three'
import { extend } from '@xperimntl/vue-threejs'

const gridVertexShader = /* glsl */ `
  varying vec3 worldPosition;

  uniform float uFadeDistance;
  uniform bool uFollowCamera;
  uniform vec3 uCameraPosition;

  void main() {
    worldPosition = position.xzy;
    if (uFollowCamera) {
      worldPosition.xz += uCameraPosition.xz;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPosition, 1.0);
  }
`

const gridFragmentShader = /* glsl */ `
  varying vec3 worldPosition;

  uniform float uCellSize;
  uniform float uCellThickness;
  uniform vec3 uCellColor;
  uniform float uSectionSize;
  uniform float uSectionThickness;
  uniform vec3 uSectionColor;
  uniform float uFadeDistance;
  uniform float uFadeStrength;
  uniform bool uInfiniteGrid;

  float getGrid(float size, float thickness) {
    vec2 r = worldPosition.xz / size;
    vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
    float line = min(grid.x, grid.y) + 1.0 - thickness;
    return 1.0 - min(line, 1.0);
  }

  void main() {
    float g1 = getGrid(uCellSize, uCellThickness);
    float g2 = getGrid(uSectionSize, uSectionThickness);

    float dist = distance(worldPosition.xz, vec2(0.0));
    float d = 1.0 - min(dist / uFadeDistance, 1.0);
    float fade = pow(d, uFadeStrength);

    vec3 color = mix(uCellColor, uSectionColor, min(1.0, uSectionThickness * g2));

    float a = max(g1, g2) * fade;
    if (a <= 0.0) discard;

    gl_FragColor = vec4(color, a);
    gl_FragColor.rgb *= gl_FragColor.a;
  }
`

class GridMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: gridVertexShader,
      fragmentShader: gridFragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uCellSize: { value: 0.5 },
        uCellThickness: { value: 0.5 },
        uCellColor: { value: new THREE.Color('#6f6f6f') },
        uSectionSize: { value: 1 },
        uSectionThickness: { value: 1 },
        uSectionColor: { value: new THREE.Color('#9d4b4b') },
        uFadeDistance: { value: 25 },
        uFadeStrength: { value: 1 },
        uFollowCamera: { value: false },
        uInfiniteGrid: { value: false },
        uCameraPosition: { value: new THREE.Vector3() },
      },
    })
  }
}

const GridMaterialElement = extend(GridMaterial)

export const Grid = defineComponent({
  name: 'DreiGrid',
  props: {
    cellSize: { type: Number, default: 0.5 },
    cellThickness: { type: Number, default: 0.5 },
    cellColor: {
      type: [String, Number] as PropType<string | number>,
      default: '#6f6f6f',
    },
    sectionSize: { type: Number, default: 1 },
    sectionThickness: { type: Number, default: 1 },
    sectionColor: {
      type: [String, Number] as PropType<string | number>,
      default: '#9d4b4b',
    },
    fadeDistance: { type: Number, default: 25 },
    fadeStrength: { type: Number, default: 1 },
    followCamera: { type: Boolean, default: false },
    infiniteGrid: { type: Boolean, default: false },
    side: {
      type: Number as PropType<THREE.Side>,
      default: THREE.DoubleSide,
    },
    position: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
    rotation: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
  },
  setup(props) {
    return () => {
      const meshProps: Record<string, unknown> = {
        frustumCulled: false,
      }

      if (props.position) meshProps.position = props.position
      if (props.rotation) {
        meshProps.rotation = props.rotation
      } else {
        // Default rotation to lay flat on XZ plane
        meshProps.rotation = [-Math.PI / 2, 0, 0]
      }

      return h('mesh', meshProps, [
        h('planeGeometry', { args: [100, 100, 1, 1] }),
        h(GridMaterialElement, {
          attach: 'material',
          transparent: true,
          side: props.side,
          depthWrite: false,
          'uniforms-uCellSize-value': props.cellSize,
          'uniforms-uCellThickness-value': props.cellThickness,
          'uniforms-uCellColor-value': new THREE.Color(props.cellColor),
          'uniforms-uSectionSize-value': props.sectionSize,
          'uniforms-uSectionThickness-value': props.sectionThickness,
          'uniforms-uSectionColor-value': new THREE.Color(props.sectionColor),
          'uniforms-uFadeDistance-value': props.fadeDistance,
          'uniforms-uFadeStrength-value': props.fadeStrength,
          'uniforms-uFollowCamera-value': props.followCamera,
          'uniforms-uInfiniteGrid-value': props.infiniteGrid,
        }),
      ])
    }
  },
})
