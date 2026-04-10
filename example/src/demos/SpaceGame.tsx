import { Canvas, useFrame, useLoader, useObjectRef, useThree } from '@xperimntl/vue-threejs'
import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  type InjectionKey,
  type Ref,
} from 'vue'
import * as THREE from 'three'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import {
  EffectComposer as ThreeEffectComposer,
  GLTFLoader,
  GrannyKnot,
  RenderPass,
  UnrealBloomPass,
} from 'three-stdlib'

type EntityData = {
  guid: number
  scale: number
  size: number
  offset: THREE.Vector3
  pos: THREE.Vector3
  speed: number
  radius: number
  t: number
  hit: THREE.Vector3
  distance: number
}

type ExplosionData = {
  guid: number
  offset: THREE.Vector3
  scale: number
  time: number
}

type RingData = {
  key: number
  position: [number, number, number]
  quaternion: THREE.Quaternion
  scale: number
}

type SpaceGameService = {
  points: Ref<number>
  health: Ref<number>
  sound: Ref<boolean>
  paused: Ref<boolean>
  pendingStep: Ref<number>
  elapsed: Ref<number>
  lasers: Ref<number[]>
  explosions: Ref<ExplosionData[]>
  rocks: Ref<EntityData[]>
  enemies: Ref<EntityData[]>
  mutation: {
    t: number
    position: THREE.Vector3
    track: THREE.TubeGeometry
    scale: number
    fov: number
    hits: number
    rings: RingData[]
    particles: EntityData[]
    looptime: number
    binormal: THREE.Vector3
    normal: THREE.Vector3
    clock: THREE.Clock
    mouse: THREE.Vector2
    dummy: THREE.Object3D
    ray: THREE.Ray
    box: THREE.Box3
    frameStepMs: number
    seekStepMs: number
  }
  actions: {
    shoot: () => void
    toggleSound: () => void
    togglePause: () => void
    restart: () => void
    jumpToLoopEnd: () => void
    seekBackward: () => void
    seekForward: () => void
    scrubTo: (seconds: number) => void
    stepBackward: () => void
    stepForward: () => void
    updateMouse: (event: PointerEvent, bounds?: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) => void
    test: (data: EntityData) => boolean
  }
}

type GraphGLTF = {
  nodes: Record<string, any>
  materials: Record<string, THREE.Material>
  scene: THREE.Group
}

const gameKey: InjectionKey<SpaceGameService> = Symbol('space-game')
const LASER_GEOMETRY = new THREE.BoxGeometry(1, 1, 40)
const LASER_MATERIAL = new THREE.MeshBasicMaterial({ color: new THREE.Color('lightgreen') })
const CROSS_MATERIAL = new THREE.MeshBasicMaterial({ color: new THREE.Color('hotpink'), fog: false })
const EXHAUST_MATERIAL = new THREE.MeshBasicMaterial({ color: new THREE.Color('lightblue') })
const TRACK_MATERIAL = new THREE.MeshBasicMaterial({ color: new THREE.Color('indianred') })
const RING_GEOMETRY = new THREE.RingGeometry(1, 1.01, 64)
const RING_MATERIAL = new THREE.MeshBasicMaterial({ color: new THREE.Color('lightgreen'), side: THREE.DoubleSide })
const DRONE_BEAM_MATERIAL = new THREE.MeshBasicMaterial({ color: new THREE.Color('lightblue') })
const STAR_POSITIONS = makeStarPositions(2000)
let guid = 1

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}space-game/${path.replace(/^\/+/, '')}`

function installUncharted2ToneMapping() {
  const flag = '__v3fUncharted2ToneMappingInstalled'
  if ((globalThis as Record<string, unknown>)[flag]) return

  const chunk = THREE.ShaderChunk.tonemapping_pars_fragment
  if (!chunk.includes('vec3 CustomToneMapping( vec3 color ) { return color; }')) {
    ;(globalThis as Record<string, unknown>)[flag] = true
    return
  }

  ;(THREE.ShaderChunk as Record<string, string>).tonemapping_pars_fragment = chunk.replace(
    'vec3 CustomToneMapping( vec3 color ) { return color; }',
    `
vec3 Uncharted2Helper( vec3 color ) {
  const float A = 0.15;
  const float B = 0.50;
  const float C = 0.10;
  const float D = 0.20;
  const float E = 0.02;
  const float F = 0.30;
  return ( ( color * ( A * color + C * B ) + D * E ) / ( color * ( A * color + B ) + D * F ) ) - E / F;
}

vec3 CustomToneMapping( vec3 color ) {
  const float W = 11.2;
  color *= toneMappingExposure;
  color = Uncharted2Helper( color );
  vec3 whiteScale = vec3( 1.0 ) / Uncharted2Helper( vec3( W ) );
  return saturate( color * whiteScale );
}`,
  )
  ;(globalThis as Record<string, unknown>)[flag] = true
}

installUncharted2ToneMapping()

function useGame(): SpaceGameService {
  const game = inject(gameKey)
  if (!game) throw new Error('SpaceGame components must be used within the SpaceGame provider')
  return game
}

function makeStarPositions(count: number): Float32Array {
  const positions: number[] = []
  for (let i = 0; i < count; i++) {
    const radius = 4000
    const theta = 2 * Math.PI * Math.random()
    const phi = Math.acos(2 * Math.random() - 1)
    const x = radius * Math.cos(theta) * Math.sin(phi) + (-2000 + Math.random() * 4000)
    const y = radius * Math.sin(theta) * Math.sin(phi) + (-2000 + Math.random() * 4000)
    const z = radius * Math.cos(phi) + (-1000 + Math.random() * 2000)
    positions.push(x, y, z)
  }
  return new Float32Array(positions)
}

function createRandomData(
  count: number,
  track: THREE.TubeGeometry,
  radius: number,
  size: number,
  scale: number | (() => number),
): EntityData[] {
  return new Array(count).fill(null).map(() => {
    const t = Math.random()
    const pos = track.parameters.path.getPointAt(t).multiplyScalar(15)
    const offset = pos
      .clone()
      .add(
        new THREE.Vector3(
          -radius + Math.random() * radius * 2,
          -radius + Math.random() * radius * 2,
          -radius + Math.random() * radius * 2,
        ),
      )
    const speed = 0.1 + Math.random()
    return {
      guid: guid++,
      scale: typeof scale === 'function' ? scale() : scale,
      size,
      offset,
      pos,
      speed,
      radius,
      t,
      hit: new THREE.Vector3(),
      distance: 1000,
    }
  })
}

function createRings(track: THREE.TubeGeometry): RingData[] {
  const rings: RingData[] = []
  let t = 0.4

  for (let i = 0; i < 30; i++) {
    t += 0.003
    const pos = track.parameters.path.getPointAt(t).multiplyScalar(15)
    const segments = track.tangents.length
    const pickt = t * segments
    const pick = Math.floor(pickt)
    const lookAt = track.parameters.path.getPointAt((t + 1 / track.parameters.path.getLength()) % 1).multiplyScalar(15)
    const matrix = new THREE.Matrix4().lookAt(pos, lookAt, track.binormals[pick])
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix)
    const factor = (Math.sin(i / 10) * Math.PI) / 2
    rings.push({
      key: i,
      position: pos.toArray() as [number, number, number],
      quaternion,
      scale: 30 + i * 5 * factor,
    })
  }

  return rings
}

function getTimelineSeconds(game: SpaceGameService) {
  return game.mutation.clock.getElapsedTime()
}

function getTimelineMs(game: SpaceGameService) {
  return getTimelineSeconds(game) * 1000
}

function getLoopDurationSeconds(game: SpaceGameService) {
  return game.mutation.looptime / 1000
}

function getFrameStepSeconds(game: SpaceGameService) {
  return game.mutation.frameStepMs / 1000
}

function queuePausedRender(game: SpaceGameService, direction: number) {
  if (!game.paused.value) return
  game.pendingStep.value = direction === 0 ? 1 : direction > 0 ? 1 : -1
}

function setAbsoluteTimelineSeconds(game: SpaceGameService, seconds: number, direction = 1) {
  game.mutation.clock.elapsedTime = Math.max(0, seconds)
  game.elapsed.value = game.mutation.clock.getElapsedTime()
  queuePausedRender(game, direction)
}

function setLoopTimelineSeconds(game: SpaceGameService, seconds: number) {
  const loopDuration = getLoopDurationSeconds(game)
  const frameStep = getFrameStepSeconds(game)
  const clamped = Math.min(Math.max(0, seconds), Math.max(0, loopDuration - frameStep))
  const currentAbsolute = getTimelineSeconds(game)
  const currentLoopIndex = Math.floor(currentAbsolute / loopDuration)
  setAbsoluteTimelineSeconds(
    game,
    currentLoopIndex * loopDuration + clamped,
    clamped >= currentAbsolute % loopDuration ? 1 : -1,
  )
}

function createSpaceGame(): SpaceGameService {
  const spline = new GrannyKnot()
  const track = new THREE.TubeGeometry(spline, 250, 0.2, 10, true)
  const points = ref(0)
  const health = ref(100)
  const sound = ref(false)
  const paused = ref(false)
  const pendingStep = ref(0)
  const elapsed = ref(0)
  const lasers = ref<number[]>([])
  const explosions = ref<ExplosionData[]>([])
  const rocks = ref<EntityData[]>(createRandomData(100, track, 150, 8, () => 1 + Math.random() * 2.5))
  const enemies = ref<EntityData[]>(createRandomData(10, track, 20, 15, 1))
  const mutation = {
    t: 0,
    position: new THREE.Vector3(),
    track,
    scale: 15,
    fov: 70,
    hits: 0,
    rings: createRings(track),
    particles: createRandomData(1500, track, 100, 1, () => 0.5 + Math.random() * 0.8),
    looptime: 40 * 1000,
    binormal: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    clock: new THREE.Clock(false),
    mouse: new THREE.Vector2(-250, 50),
    dummy: new THREE.Object3D(),
    ray: new THREE.Ray(),
    box: new THREE.Box3(),
    frameStepMs: 1000 / 60,
    seekStepMs: 1000,
  }

  const game: SpaceGameService = {
    points,
    health,
    sound,
    paused,
    pendingStep,
    elapsed,
    lasers,
    explosions,
    rocks,
    enemies,
    mutation,
    actions: {
      shoot() {
        if (paused.value) return
        lasers.value = [...lasers.value, getTimelineMs(game)]
      },
      toggleSound() {
        sound.value = !sound.value
      },
      togglePause() {
        if (!paused.value) {
          paused.value = true
          mutation.clock.stop()
          return
        }

        const pausedElapsed = mutation.clock.elapsedTime
        mutation.clock.start()
        mutation.clock.elapsedTime = pausedElapsed
        paused.value = false
      },
      restart() {
        setAbsoluteTimelineSeconds(game, 0, -1)
      },
      jumpToLoopEnd() {
        const loopDuration = getLoopDurationSeconds(game)
        const frameStep = getFrameStepSeconds(game)
        setLoopTimelineSeconds(game, loopDuration - frameStep)
      },
      seekBackward() {
        setAbsoluteTimelineSeconds(game, getTimelineSeconds(game) - mutation.seekStepMs / 1000, -1)
      },
      seekForward() {
        setAbsoluteTimelineSeconds(game, getTimelineSeconds(game) + mutation.seekStepMs / 1000, 1)
      },
      scrubTo(seconds: number) {
        setLoopTimelineSeconds(game, seconds)
      },
      stepBackward() {
        setAbsoluteTimelineSeconds(game, getTimelineSeconds(game) - mutation.frameStepMs / 1000, -1)
      },
      stepForward() {
        setAbsoluteTimelineSeconds(game, getTimelineSeconds(game) + mutation.frameStepMs / 1000, 1)
      },
      updateMouse(event: PointerEvent, bounds?: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) {
        if (bounds) {
          mutation.mouse.set(
            event.clientX - bounds.left - bounds.width / 2,
            event.clientY - bounds.top - bounds.height / 2,
          )
          return
        }

        mutation.mouse.set(event.clientX - window.innerWidth / 2, event.clientY - window.innerHeight / 2)
      },
      test(data: EntityData) {
        mutation.box.min.copy(data.offset)
        mutation.box.max.copy(data.offset)
        mutation.box.expandByScalar(data.size * data.scale)
        data.hit.set(10000, 10000, 10000)
        const result = mutation.ray.intersectBox(mutation.box, data.hit)
        data.distance = mutation.ray.origin.distanceTo(data.hit)
        return !!result
      },
    },
  }

  return game
}

const Stars = defineComponent({
  name: 'SpaceGameStars',
  setup() {
    return () => (
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[STAR_POSITIONS, 3]} />
        </bufferGeometry>
        <pointsMaterial size={15} sizeAttenuation color="white" fog={false} />
      </points>
    )
  },
})

const Track = defineComponent({
  name: 'SpaceGameTrack',
  setup() {
    const game = useGame()
    return () => (
      <mesh scale={[game.mutation.scale, game.mutation.scale, game.mutation.scale]} geometry={game.mutation.track}>
        <primitive object={TRACK_MATERIAL} attach="material" />
      </mesh>
    )
  },
})

const Particles = defineComponent({
  name: 'SpaceGameParticles',
  setup() {
    const game = useGame()
    const particles = useObjectRef<THREE.InstancedMesh>()

    useFrame(() => {
      if (game.paused.value && game.pendingStep.value === 0) return
      const mesh = particles.object.value
      if (!mesh || mesh.userData.__initialized) return

      game.mutation.particles.forEach((particle, index) => {
        const { offset, scale } = particle
        game.mutation.dummy.position.copy(offset)
        game.mutation.dummy.scale.set(scale, scale, scale)
        game.mutation.dummy.rotation.set(
          Math.sin(Math.random()) * Math.PI,
          Math.sin(Math.random()) * Math.PI,
          Math.cos(Math.random()) * Math.PI,
        )
        game.mutation.dummy.updateMatrix()
        mesh.setMatrixAt(index, game.mutation.dummy.matrix)
      })

      mesh.instanceMatrix.needsUpdate = true
      mesh.userData.__initialized = true
    }, -2)

    return () => (
      <instancedMesh ref={particles.ref} args={[null, null, game.mutation.particles.length]} frustumCulled={false}>
        <coneGeometry args={[2, 2, 3]} />
        <meshStandardMaterial color="#606060" />
      </instancedMesh>
    )
  },
})

const Rings = defineComponent({
  name: 'SpaceGameRings',
  setup() {
    const game = useGame()

    return () =>
      game.mutation.rings.map((ring) => (
        <mesh
          key={ring.key}
          position={ring.position}
          quaternion={ring.quaternion}
          scale={[ring.scale, ring.scale, ring.scale]}
          geometry={RING_GEOMETRY}
          material={RING_MATERIAL}
        />
      ))
  },
})

const Planets = defineComponent({
  name: 'SpaceGamePlanets',
  setup() {
    const textures = useLoader(THREE.TextureLoader, [assetUrl('earth.jpg'), assetUrl('moon.png')])

    return () => {
      const loaded = textures.value as THREE.Texture[] | null
      if (!loaded) return null

      const [earth, moon] = loaded

      return (
        <group scale={[100, 100, 100]} position={[-500, -500, 1000]}>
          <mesh>
            <sphereGeometry args={[5, 32, 32]} />
            <meshStandardMaterial
              map={earth}
              emissiveMap={earth}
              emissive="#8fb6ff"
              emissiveIntensity={0.24}
              roughness={1}
              fog={false}
            />
          </mesh>
          <mesh position={[5, -5, -5]}>
            <sphereGeometry args={[0.75, 32, 32]} />
            <meshStandardMaterial map={moon} roughness={1} fog={false} />
          </mesh>
          <pointLight position={[-5, -5, -5]} distance={1000} decay={0} intensity={6} />
          <mesh position={[-30, -10, -60]}>
            <sphereGeometry args={[4, 32, 32]} />
            <meshBasicMaterial color="#ffff99" fog={false} />
            <pointLight distance={6100} decay={0} intensity={50} color="white" />
          </mesh>
        </group>
      )
    }
  },
})

const Rocks = defineComponent({
  name: 'SpaceGameRocks',
  setup() {
    const game = useGame()
    const gltf = useLoader(GLTFLoader, assetUrl('rock.gltf'))

    return () => {
      const asset = gltf.value as GraphGLTF | null
      if (!asset) return null

      return game.rocks.value.map((data) => <Rock key={data.guid} data={data} asset={asset} />)
    }
  },
})

const Rock = defineComponent({
  name: 'SpaceGameRock',
  props: {
    data: { type: Object as () => EntityData, required: true },
    asset: { type: Object as () => GraphGLTF, required: true },
  },
  setup(props) {
    const game = useGame()
    const rock = useObjectRef<THREE.Group>()

    useFrame(() => {
      if (game.paused.value && game.pendingStep.value === 0) return
      if (!rock.object.value) return
      const rotation = Math.cos((game.mutation.clock.getElapsedTime() / 2) * props.data.speed) * Math.PI
      rock.object.value.rotation.set(rotation, rotation, rotation)
    })

    return () => (
      <group ref={rock.ref} position={props.data.offset} scale={[props.data.scale, props.data.scale, props.data.scale]}>
        <group
          position={[-0.016298329457640648, -0.012838120572268963, 0.24073271453380585]}
          rotation={[3.0093872578726644, 0.27444228385461117, -0.22745113653772078]}
          scale={[20, 20, 20]}>
          <mesh
            geometry={props.asset.nodes.node_id4_Material_52_0.geometry}
            material={props.asset.materials.Material_52 as any}
            material-roughness={1}
            material-metalness={1}
          />
        </group>
      </group>
    )
  },
})

const Enemies = defineComponent({
  name: 'SpaceGameEnemies',
  setup() {
    const game = useGame()
    const gltf = useLoader(GLTFLoader, assetUrl('spacedrone.gltf'))

    return () => {
      const asset = gltf.value as GraphGLTF | null
      if (!asset) return null

      return game.enemies.value.map((data) => <Drone key={data.guid} data={data} asset={asset} />)
    }
  },
})

const Drone = defineComponent({
  name: 'SpaceGameDrone',
  props: {
    data: { type: Object as () => EntityData, required: true },
    asset: { type: Object as () => GraphGLTF, required: true },
  },
  setup(props) {
    const game = useGame()
    const drone = useObjectRef<THREE.Group>()

    useFrame(() => {
      if (game.paused.value && game.pendingStep.value === 0) return
      if (!drone.object.value) return
      const rotation = Math.cos((game.mutation.clock.getElapsedTime() / 2) * props.data.speed) * Math.PI
      drone.object.value.position.copy(props.data.offset)
      drone.object.value.rotation.set(rotation, rotation, rotation)
    })

    return () => (
      <group ref={drone.ref} scale={[5, 5, 5]}>
        <mesh position={[0, 0, 50]} rotation={[Math.PI / 2, 0, 0]} material={DRONE_BEAM_MATERIAL}>
          <cylinderGeometry args={[0.25, 0.25, 100, 4]} />
        </mesh>
        <mesh geometry={props.asset.nodes.Sphere_DroneGlowmat_0.geometry}>
          <primitive object={props.asset.materials.DroneGlowmat} attach="material" />
        </mesh>
        <mesh geometry={props.asset.nodes.Sphere_DroneGlowmat_0.geometry} scale={[1.02, 1.02, 1.02]}>
          <meshBasicMaterial
            color="#7fd8ff"
            transparent
            opacity={0.55}
            fog={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh geometry={props.asset.nodes.Sphere_Body_0.geometry}>
          <meshPhongMaterial color="black" />
        </mesh>
      </group>
    )
  },
})

const Explosions = defineComponent({
  name: 'SpaceGameExplosions',
  setup() {
    const game = useGame()
    return () =>
      game.explosions.value.map((explosion) => (
        <Explosion key={explosion.guid} position={explosion.offset} scale={explosion.scale * 0.75} />
      ))
  },
})

const Explosion = defineComponent({
  name: 'SpaceGameExplosion',
  props: {
    position: { type: Object as () => THREE.Vector3, required: true },
    scale: { type: Number, required: true },
  },
  setup(props) {
    const game = useGame()
    const white = useObjectRef<THREE.InstancedMesh>()
    const orange = useObjectRef<THREE.InstancedMesh>()
    const whiteParticles = createExplosionParticles(0.8)
    const orangeParticles = createExplosionParticles(0.6)

    useFrame(() => {
      if (game.paused.value && game.pendingStep.value === 0) return
      updateExplosionMesh(white.object.value, whiteParticles, game.mutation.dummy, 0.04)
      updateExplosionMesh(orange.object.value, orangeParticles, game.mutation.dummy, 0.022)
    })

    return () => (
      <group position={props.position} scale={[props.scale, props.scale, props.scale]}>
        <instancedMesh ref={white.ref} args={[null, null, whiteParticles.length]} frustumCulled={false}>
          <dodecahedronGeometry args={[12, 0]} />
          <meshBasicMaterial
            color="white"
            transparent
            opacity={1}
            fog={false}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
          />
        </instancedMesh>
        <instancedMesh ref={orange.ref} args={[null, null, orangeParticles.length]} frustumCulled={false}>
          <dodecahedronGeometry args={[10, 0]} />
          <meshBasicMaterial color="orange" transparent opacity={0.65} fog={false} />
        </instancedMesh>
      </group>
    )
  },
})

function createExplosionParticles(speed: number) {
  return new Array(20).fill(null).map(() => ({
    position: new THREE.Vector3(),
    normal: new THREE.Vector3(-1 + Math.random() * 2, -1 + Math.random() * 2, -1 + Math.random() * 2)
      .normalize()
      .multiplyScalar(speed * 0.75),
  }))
}

function updateExplosionMesh(
  mesh: THREE.InstancedMesh | null,
  particles: Array<{ position: THREE.Vector3; normal: THREE.Vector3 }>,
  dummy: THREE.Object3D,
  fade = 0.025,
) {
  if (!mesh) return
  particles.forEach((particle, index) => {
    particle.position.add(particle.normal)
    dummy.position.copy(particle.position)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  })
  const material = mesh.material as THREE.Material & { opacity?: number }
  if (typeof material.opacity === 'number') material.opacity = Math.max(0, material.opacity - fade)
  mesh.instanceMatrix.needsUpdate = true
}

const Ship = defineComponent({
  name: 'SpaceGameShip',
  setup() {
    const game = useGame()
    const gltf = useLoader(GLTFLoader, assetUrl('ship.gltf'))
    const main = useObjectRef<THREE.Group>()
    const laserGroup = useObjectRef<THREE.Group>()
    const laserLight = useObjectRef<THREE.PointLight>()
    const exhaust = useObjectRef<THREE.Mesh>()
    const cross = useObjectRef<THREE.Group>()
    const target = useObjectRef<THREE.Group>()
    const position = new THREE.Vector3()
    const direction = new THREE.Vector3()

    useFrame(() => {
      if (game.paused.value && game.pendingStep.value === 0) return
      const root = main.object.value
      if (!root) return

      const elapsed = game.mutation.clock.getElapsedTime()
      root.position.z = Math.sin(elapsed * 40) * Math.PI * 0.2
      root.rotation.z += (game.mutation.mouse.x / 500 - root.rotation.z) * 0.2
      root.rotation.x += (-game.mutation.mouse.y / 1200 - root.rotation.x) * 0.2
      root.rotation.y += (-game.mutation.mouse.x / 1200 - root.rotation.y) * 0.2
      root.position.x += (game.mutation.mouse.x / 10 - root.position.x) * 0.2
      root.position.y += (25 + -game.mutation.mouse.y / 10 - root.position.y) * 0.2

      if (exhaust.object.value) {
        const pulse = 1 + Math.sin(elapsed * 200)
        exhaust.object.value.scale.x = pulse
        exhaust.object.value.scale.y = pulse
      }

      if (laserGroup.object.value) {
        for (const child of laserGroup.object.value.children) {
          child.position.z -= 20
        }
      }

      if (laserLight.object.value) {
        const recentShot =
          game.lasers.value.length > 0 && getTimelineMs(game) - game.lasers.value[game.lasers.value.length - 1] < 100
        laserLight.object.value.intensity += ((recentShot ? 20 : 0) - laserLight.object.value.intensity) * 0.3
      }

      root.getWorldPosition(position)
      root.getWorldDirection(direction)
      game.mutation.ray.origin.copy(position)
      game.mutation.ray.direction.copy(direction.negate())

      CROSS_MATERIAL.color.set(game.mutation.hits ? 'lightgreen' : 'hotpink')
      if (cross.object.value) cross.object.value.visible = !game.mutation.hits
      if (target.object.value) target.object.value.visible = !!game.mutation.hits
    })

    return () => {
      const asset = gltf.value as GraphGLTF | null
      if (!asset) return null
      const nodes = asset.nodes

      return (
        <group ref={main.ref}>
          <group scale={[3.5, 3.5, 3.5]}>
            <group ref={cross.ref} position={[0, 0, -300]} name="cross">
              <mesh renderOrder={1000} material={CROSS_MATERIAL}>
                <boxGeometry args={[20, 2, 2]} />
              </mesh>
              <mesh renderOrder={1000} material={CROSS_MATERIAL}>
                <boxGeometry args={[2, 20, 2]} />
              </mesh>
            </group>

            <group ref={target.ref} position={[0, 0, -300]} name="target">
              <mesh position={[0, 20, 0]} renderOrder={1000} material={CROSS_MATERIAL}>
                <boxGeometry args={[40, 2, 2]} />
              </mesh>
              <mesh position={[0, -20, 0]} renderOrder={1000} material={CROSS_MATERIAL}>
                <boxGeometry args={[40, 2, 2]} />
              </mesh>
              <mesh position={[20, 0, 0]} renderOrder={1000} material={CROSS_MATERIAL}>
                <boxGeometry args={[2, 40, 2]} />
              </mesh>
              <mesh position={[-20, 0, 0]} renderOrder={1000} material={CROSS_MATERIAL}>
                <boxGeometry args={[2, 40, 2]} />
              </mesh>
            </group>

            <pointLight ref={laserLight.ref} position={[0, 0, -20]} distance={100} intensity={0} color="lightgreen" />

            <group ref={laserGroup.ref}>
              {game.lasers.value.map((shot, index) => (
                <group key={`${shot}-${index}`}>
                  <mesh position={[-2.8, 0, -0.8]} geometry={LASER_GEOMETRY} material={LASER_MATERIAL} />
                  <mesh position={[2.8, 0, -0.8]} geometry={LASER_GEOMETRY} material={LASER_MATERIAL} />
                </group>
              ))}
            </group>

            <group rotation={[Math.PI / 2, Math.PI, 0]}>
              <mesh geometry={nodes['Renault_(S,_T1)_0'].geometry}>
                <meshStandardMaterial color="#070707" />
              </mesh>
              <mesh geometry={nodes['Renault_(S,_T1)_1'].geometry}>
                <meshStandardMaterial color="black" />
              </mesh>
              <mesh geometry={nodes['Renault_(S,_T1)_2'].geometry}>
                <meshStandardMaterial color="#070707" />
              </mesh>
              <mesh geometry={nodes['Renault_(S,_T1)_3'].geometry}>
                <meshBasicMaterial color="lightblue" fog={false} />
              </mesh>
              <mesh geometry={nodes['Renault_(S,_T1)_4'].geometry}>
                <meshBasicMaterial color="white" fog={false} />
              </mesh>
              <mesh geometry={nodes['Renault_(S,_T1)_5'].geometry}>
                <meshBasicMaterial color="teal" fog={false} />
              </mesh>
            </group>
          </group>

          <mesh ref={exhaust.ref} scale={[1, 1, 30]} position={[0, 1, 30]}>
            <dodecahedronGeometry args={[1.5, 0]} />
            <primitive object={EXHAUST_MATERIAL} attach="material" />
          </mesh>
        </group>
      )
    }
  },
})

const ProgressLoop = defineComponent({
  name: 'SpaceGameProgressLoop',
  setup() {
    const game = useGame()

    useFrame(() => {
      if (game.paused.value && game.pendingStep.value === 0) return
      const time = getTimelineMs(game)
      game.elapsed.value = getTimelineSeconds(game)
      game.mutation.t = (time % game.mutation.looptime) / game.mutation.looptime
      game.mutation.position
        .copy(game.mutation.track.parameters.path.getPointAt(game.mutation.t))
        .multiplyScalar(game.mutation.scale)

      game.lasers.value = game.lasers.value.filter((timestamp) => time - timestamp <= 1000)
      game.explosions.value = game.explosions.value.filter((explosion) => time - explosion.time <= 1000)
    }, -2)

    return () => null
  },
})

const CombatLoop = defineComponent({
  name: 'SpaceGameCombatLoop',
  setup() {
    const game = useGame()

    useFrame(() => {
      if (game.paused.value && game.pendingStep.value === 0) return
      const hitRocks = game.rocks.value.filter(game.actions.test)
      const hitEnemies = game.enemies.value.filter(game.actions.test)
      const hits = hitRocks.length + hitEnemies.length
      game.mutation.hits = hits

      const recentShot =
        game.lasers.value.length > 0 && getTimelineMs(game) - game.lasers.value[game.lasers.value.length - 1] < 100

      if (!hits || !recentShot) return

      const updates = [...hitRocks, ...hitEnemies].map((data) => ({
        guid: data.guid,
        time: getTimelineMs(game),
        offset: data.offset.clone(),
        scale: data.scale,
      }))

      game.explosions.value = [...game.explosions.value, ...updates]
      game.points.value += hitRocks.length * 100 + hitEnemies.length * 200
      game.rocks.value = game.rocks.value.filter((rock) => !hitRocks.some((hit) => hit.guid === rock.guid))
      game.enemies.value = game.enemies.value.filter((enemy) => !hitEnemies.some((hit) => hit.guid === enemy.guid))
      game.mutation.hits = 0
    })

    return () => null
  },
})

const Rig = defineComponent({
  name: 'SpaceGameRig',
  setup(_, { slots }) {
    const game = useGame()
    const camera = useThree((state) => state.camera)
    const rig = useObjectRef<THREE.Group>()
    let offset = 0

    useFrame(() => {
      if (game.paused.value && game.pendingStep.value === 0) return
      const cam = camera.value as THREE.PerspectiveCamera
      const lightRig = rig.object.value
      if (!cam || !lightRig) return

      const t = game.mutation.t
      const pos = game.mutation.position.clone()
      const segments = game.mutation.track.tangents.length
      const pickt = t * segments
      const pick = Math.floor(pickt)
      const pickNext = (pick + 1) % segments

      game.mutation.binormal
        .subVectors(game.mutation.track.binormals[pickNext], game.mutation.track.binormals[pick])
        .multiplyScalar(pickt - pick)
        .add(game.mutation.track.binormals[pick])

      const dir = game.mutation.track.parameters.path.getTangentAt(t)
      offset += (Math.max(15, 15 + -game.mutation.mouse.y / 20) - offset) * 0.05
      game.mutation.normal.copy(game.mutation.binormal).cross(dir)
      pos.add(game.mutation.normal.clone().multiplyScalar(offset))

      cam.position.copy(pos)
      const lookAt = game.mutation.track.parameters.path
        .getPointAt((t + 30 / game.mutation.track.parameters.path.getLength()) % 1)
        .multiplyScalar(game.mutation.scale)
      cam.matrix.lookAt(cam.position, lookAt, game.mutation.normal)
      cam.quaternion.setFromRotationMatrix(cam.matrix)
      cam.fov += ((t > 0.4 && t < 0.45 ? 120 : game.mutation.fov) - cam.fov) * 0.05
      cam.updateProjectionMatrix()

      const lightPos = game.mutation.track.parameters.path
        .getPointAt((t + 1 / game.mutation.track.parameters.path.getLength()) % 1)
        .multiplyScalar(game.mutation.scale)
      lightRig.position.copy(lightPos)
      lightRig.quaternion.setFromRotationMatrix(cam.matrix)
    }, -1)

    return () => (
      <group ref={rig.ref}>
        <pointLight distance={400} decay={0} position={[0, 100, -420]} intensity={5} color="indianred" />
        <group position={[0, 0, -50]}>{slots.default?.()}</group>
      </group>
    )
  },
})

const Effects = defineComponent({
  name: 'SpaceGameEffects',
  setup() {
    const state = useThree()
    const composer = shallowRef<ThreeEffectComposer | null>(null)
    let originalAutoClear: boolean | null = null

    function disposeComposer() {
      composer.value?.dispose()
      composer.value = null
    }

    function createComposer() {
      const { gl, scene, camera, size } = state.value
      if (!gl || !scene || !camera) return

      disposeComposer()

      const next = new ThreeEffectComposer(gl)
      next.addPass(new RenderPass(scene, camera))
      next.addPass(new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 2.3, 1, 0))
      next.addPass(new OutputPass())
      next.setSize(size.width, size.height)
      composer.value = next

      if (originalAutoClear === null) originalAutoClear = gl.autoClear
      gl.autoClear = false
    }

    watch(
      () => [state.value.gl, state.value.scene, state.value.camera] as const,
      ([gl, scene, camera]) => {
        if (!gl || !scene || !camera) {
          disposeComposer()
          return
        }

        createComposer()
      },
      { immediate: true },
    )

    watch(
      () => state.value.size,
      (size) => {
        composer.value?.setSize(size.width, size.height)
      },
      { deep: true },
    )

    useFrame(() => {
      composer.value?.render()
    }, 2)

    onBeforeUnmount(() => {
      if (originalAutoClear !== null) {
        state.value.gl.autoClear = originalAutoClear
      }
      disposeComposer()
    })

    return () => null
  },
})

const StepFinalize = defineComponent({
  name: 'SpaceGameStepFinalize',
  setup() {
    const game = useGame()

    useFrame(() => {
      if (!game.paused.value || game.pendingStep.value === 0) return
      game.pendingStep.value = 0
    }, 100)

    return () => null
  },
})

const Hud = defineComponent({
  name: 'SpaceGameHud',
  setup() {
    const game = useGame()
    const score = computed(() =>
      game.points.value >= 1000 ? `${(game.points.value / 1000).toFixed(1)}K` : `${game.points.value}`,
    )
    const loopDurationSeconds = getLoopDurationSeconds(game)
    const frameStepLabel = `${(getFrameStepSeconds(game) * 1000).toFixed(0)}ms`
    const loopPosition = computed(() => game.elapsed.value % loopDurationSeconds)

    const stopClick = (event: MouseEvent) => {
      event.stopPropagation()
      game.actions.toggleSound()
    }

    const stopPauseClick = (event: MouseEvent) => {
      event.stopPropagation()
      game.actions.togglePause()
    }

    const stopRestartClick = (event: MouseEvent) => {
      event.stopPropagation()
      game.actions.restart()
    }

    const stopSeekBackward = (event: MouseEvent) => {
      event.stopPropagation()
      game.actions.seekBackward()
    }

    const stopSeekForward = (event: MouseEvent) => {
      event.stopPropagation()
      game.actions.seekForward()
    }

    const stopJumpToEnd = (event: MouseEvent) => {
      event.stopPropagation()
      game.actions.jumpToLoopEnd()
    }

    const stopStepBackward = (event: MouseEvent) => {
      event.stopPropagation()
      game.actions.stepBackward()
    }

    const stopStepForward = (event: MouseEvent) => {
      event.stopPropagation()
      game.actions.stepForward()
    }

    const stopScrub = (event: Event) => {
      event.stopPropagation()
      const target = event.target as HTMLInputElement
      game.actions.scrubTo(Number(target.value))
    }

    return () => (
      <>
        <button
          onClick={stopClick}
          style={{
            position: 'absolute',
            top: '40px',
            left: '50px',
            fontFamily: "'Teko', sans-serif",
            textTransform: 'uppercase',
            fontWeight: 900,
            fontVariantNumeric: 'slashed-zero tabular-nums',
            fontSize: '32px',
            lineHeight: 1,
            color: 'indianred',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            pointerEvents: 'auto',
            transform: 'skew(5deg, 5deg)',
          }}>
          sound
          <br />
          {game.sound.value ? 'off' : 'on'}
        </button>

        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '50px',
            textAlign: 'right',
            fontFamily: "'Teko', sans-serif",
            textTransform: 'uppercase',
            fontWeight: 900,
            fontVariantNumeric: 'slashed-zero tabular-nums',
            fontSize: '32px',
            lineHeight: 1,
            color: 'indianred',
            transform: 'skew(-5deg, -5deg)',
            pointerEvents: 'auto',
          }}>
          Source
          <br />
          Docs
          <br />
          GitHub
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50px',
            bottom: '5px',
            width: '200px',
            fontFamily: "'Teko', sans-serif",
            textTransform: 'uppercase',
            fontWeight: 900,
            color: 'indianred',
            lineHeight: '1em',
            fontVariantNumeric: 'slashed-zero tabular-nums',
            transform: 'skew(-5deg, -5deg)',
          }}>
          <div style={{ margin: 0, fontSize: '4em', lineHeight: '1em' }}>{game.elapsed.value.toFixed(1)}</div>
          <div style={{ margin: 0, fontSize: '10em', lineHeight: '1em' }}>{score.value}</div>
        </div>

        <div
          style={{
            position: 'absolute',
            right: '50px',
            bottom: '70px',
            width: '150px',
            height: '40px',
            background: 'black',
            transform: 'skew(5deg, 5deg)',
          }}>
          <div
            style={{
              width: `${game.health.value}%`,
              height: '100%',
              background: 'indianred',
            }}
          />
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '10px',
            transform: 'translateX(-50%)',
            display: 'grid',
            gap: '3px',
            minWidth: '180px',
            padding: '3px 5px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.55)',
            color: 'rgba(214, 228, 255, 0.82)',
            fontFamily: "'Teko', sans-serif",
            fontSize: '11px',
            lineHeight: 1,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            pointerEvents: 'auto',
          }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}>
            <button onClick={stopRestartClick} style={transportButtonStyle}>
              |&lt;
            </button>
            <button onClick={stopSeekBackward} style={transportButtonStyle}>
              rw
            </button>
            <button onClick={stopPauseClick} style={transportButtonStyle}>
              {game.paused.value ? 'play' : 'pause'}
            </button>
            <button onClick={stopSeekForward} style={transportButtonStyle}>
              ff
            </button>
            <button onClick={stopJumpToEnd} style={transportButtonStyle}>
              &gt;|
            </button>
            <span style={{ opacity: 0.6 }}>|</span>
            <button
              onClick={stopStepBackward}
              disabled={!game.paused.value}
              style={frameButtonStyle(game.paused.value)}>
              -1f
            </button>
            <button onClick={stopStepForward} disabled={!game.paused.value} style={frameButtonStyle(game.paused.value)}>
              +1f
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: '5px',
            }}>
            <input
              type="range"
              min={0}
              max={Math.max(0, loopDurationSeconds - getFrameStepSeconds(game))}
              step={getFrameStepSeconds(game)}
              value={loopPosition.value}
              onInput={stopScrub}
              style={{
                width: '100%',
                accentColor: 'indianred',
                cursor: 'pointer',
              }}
            />
            <span>
              {loopPosition.value.toFixed(1)}s / {loopDurationSeconds.toFixed(1)}s
            </span>
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: '8px',
              opacity: 0.7,
            }}>
            looping timeline | seek = 1.0s | frame step = {frameStepLabel}
          </div>
        </div>
      </>
    )
  },
})

const transportButtonStyle: Record<string, string | number> = {
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  letterSpacing: 'inherit',
  textTransform: 'inherit',
  cursor: 'pointer',
  padding: 0,
  pointerEvents: 'auto',
}

function frameButtonStyle(enabled: boolean): Record<string, string | number> {
  return {
    ...transportButtonStyle,
    color: enabled ? 'inherit' : 'rgba(214, 228, 255, 0.35)',
    cursor: enabled ? 'pointer' : 'default',
  }
}

export default defineComponent({
  name: 'SpaceGame',
  setup() {
    const game = createSpaceGame()
    provide(gameKey, game)
    const stageRef = ref<HTMLDivElement>()

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = stageRef.value?.getBoundingClientRect()
      game.actions.updateMouse(event, bounds ?? undefined)
    }

    const handleClick = () => {
      game.actions.shoot()
    }

    onMounted(() => {
      const stage = stageRef.value
      if (!stage) return

      stage.addEventListener('pointermove', handlePointerMove)
      stage.addEventListener('click', handleClick)
    })

    onBeforeUnmount(() => {
      const stage = stageRef.value
      if (!stage) return

      stage.removeEventListener('pointermove', handlePointerMove)
      stage.removeEventListener('click', handleClick)
    })

    return () => (
      <div ref={stageRef} style={{ width: '100%', height: '100%' }}>
        <Canvas
          linear
          legacy
          dpr={[1, 1.5]}
          gl={{ antialias: false }}
          camera={{ position: [0, 0, 2000], near: 0.01, far: 10000, fov: game.mutation.fov }}
          onCreated={({ gl }) => {
            game.mutation.clock.start()
            gl.toneMapping = THREE.CustomToneMapping
            gl.toneMappingExposure = 1.05
            gl.setClearColor(new THREE.Color('#020209'))
          }}>
          {{
            default: () => [
              <fog attach="fog" args={['#070710', 100, 700]} />,
              <ambientLight intensity={0.32} />,
              <Stars />,
              <Explosions />,
              <Track />,
              <Particles />,
              <Rings />,
              <Rocks />,
              <Planets />,
              <Enemies />,
              h(Rig, null, {
                default: () => [h(Ship)],
              }),
              <Effects />,
              <ProgressLoop />,
              <CombatLoop />,
              <StepFinalize />,
            ],
            overlay: () => <Hud />,
          }}
        </Canvas>
      </div>
    )
  },
})
