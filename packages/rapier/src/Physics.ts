import {
  defineComponent,
  h,
  provide,
  shallowRef,
  watch,
  onBeforeUnmount,
  inject,
  type PropType,
  type ShallowRef,
} from 'vue'
import { useFrame } from '@xperimntl/vue-threejs'
import type RAPIER from '@dimforge/rapier3d-compat'
import {
  PHYSICS_CONTEXT,
  RAPIER_DEFAULTS,
  type PhysicsContext,
  type ColliderShape,
  type RapierPluginOptions,
} from './context'

export const Physics = defineComponent({
  name: 'Physics',
  props: {
    gravity: {
      type: Array as unknown as PropType<[number, number, number]>,
      default: undefined,
    },
    paused: {
      type: Boolean,
      default: false,
    },
    timeStep: {
      type: [Number, String] as PropType<number | 'vary'>,
      default: undefined,
    },
    interpolate: {
      type: Boolean,
      default: true,
    },
    colliders: {
      type: [String, Boolean] as PropType<ColliderShape | false>,
      default: false,
    },
    debug: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { slots }) {
    const ready = shallowRef(false)
    const paused = shallowRef(props.paused)
    const collidersRef: ShallowRef<ColliderShape | false> = shallowRef(props.colliders)

    // Inject plugin defaults (if provided via createRapierPlugin)
    const defaults = inject<RapierPluginOptions | undefined>(RAPIER_DEFAULTS, undefined)

    const resolvedGravity = (): [number, number, number] => props.gravity ?? defaults?.gravity ?? [0, -9.81, 0]
    const resolvedTimeStep = (): number | 'vary' => props.timeStep ?? defaults?.timeStep ?? 1 / 60

    let rapier: typeof RAPIER
    const worldRef: ShallowRef<RAPIER.World> = shallowRef(null!) as ShallowRef<RAPIER.World>

    // Step callbacks
    const beforeStepCallbacks = new Set<(world: RAPIER.World) => void>()
    const afterStepCallbacks = new Set<(world: RAPIER.World) => void>()

    // Accumulator for fixed timestep
    let accumulator = 0

    // Map of rigid body handles to their previous/current transforms for interpolation
    const bodyTransforms = new Map<
      number,
      {
        prevPosition: { x: number; y: number; z: number }
        prevRotation: { x: number; y: number; z: number; w: number }
        currPosition: { x: number; y: number; z: number }
        currRotation: { x: number; y: number; z: number; w: number }
      }
    >()

    function storeBodyTransforms(world: RAPIER.World) {
      world.forEachRigidBody((body) => {
        const handle = body.handle
        const pos = body.translation()
        const rot = body.rotation()
        let entry = bodyTransforms.get(handle)
        if (!entry) {
          entry = {
            prevPosition: { x: pos.x, y: pos.y, z: pos.z },
            prevRotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
            currPosition: { x: pos.x, y: pos.y, z: pos.z },
            currRotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
          }
          bodyTransforms.set(handle, entry)
        } else {
          entry.prevPosition.x = entry.currPosition.x
          entry.prevPosition.y = entry.currPosition.y
          entry.prevPosition.z = entry.currPosition.z
          entry.prevRotation.x = entry.currRotation.x
          entry.prevRotation.y = entry.currRotation.y
          entry.prevRotation.z = entry.currRotation.z
          entry.prevRotation.w = entry.currRotation.w
          entry.currPosition.x = pos.x
          entry.currPosition.y = pos.y
          entry.currPosition.z = pos.z
          entry.currRotation.x = rot.x
          entry.currRotation.y = rot.y
          entry.currRotation.z = rot.z
          entry.currRotation.w = rot.w
        }
      })
    }

    // Load Rapier asynchronously
    import('@dimforge/rapier3d-compat').then(async (mod) => {
      rapier = mod.default ?? mod
      await rapier.init()

      const g = resolvedGravity()
      const gravity = new rapier.Vector3(g[0], g[1], g[2])
      worldRef.value = new rapier.World(gravity)

      ready.value = true
    })

    // Watch gravity changes
    watch(
      () => props.gravity,
      (g) => {
        if (!worldRef.value) return
        const gravity = g ?? defaults?.gravity ?? [0, -9.81, 0]
        worldRef.value.gravity = { x: gravity[0], y: gravity[1], z: gravity[2] }
      },
    )

    // Sync paused and colliders props
    watch(
      () => props.paused,
      (v) => {
        paused.value = v
      },
    )

    watch(
      () => props.colliders,
      (v) => {
        collidersRef.value = v
      },
    )

    // Provide context
    const context: PhysicsContext = {
      world: worldRef,
      get rapier() {
        return rapier
      },
      paused,
      colliders: collidersRef,
      onBeforeStep(fn) {
        beforeStepCallbacks.add(fn)
        return () => {
          beforeStepCallbacks.delete(fn)
        }
      },
      onAfterStep(fn) {
        afterStepCallbacks.add(fn)
        return () => {
          afterStepCallbacks.delete(fn)
        }
      },
    }
    provide(PHYSICS_CONTEXT, context)

    // Step the physics world each frame
    useFrame((_state, delta) => {
      if (!worldRef.value || paused.value) return

      const world = worldRef.value
      const step = resolvedTimeStep()

      // Fire before-step callbacks
      for (const cb of beforeStepCallbacks) {
        cb(world)
      }

      if (step === 'vary') {
        // Variable timestep: step once with actual delta
        world.timestep = delta
        world.step()
        if (props.interpolate) {
          storeBodyTransforms(world)
        }
      } else {
        // Fixed timestep with accumulator
        accumulator += delta
        // Cap accumulator to prevent spiral of death
        if (accumulator > step * 4) {
          accumulator = step * 4
        }
        while (accumulator >= step) {
          world.timestep = step
          if (props.interpolate) {
            storeBodyTransforms(world)
          }
          world.step()
          if (props.interpolate) {
            storeBodyTransforms(world)
          }
          accumulator -= step
        }
      }

      // Fire after-step callbacks
      for (const cb of afterStepCallbacks) {
        cb(world)
      }
    })

    // Cleanup
    onBeforeUnmount(() => {
      if (worldRef.value) {
        worldRef.value.free()
        worldRef.value = null!
      }
      beforeStepCallbacks.clear()
      afterStepCallbacks.clear()
      bodyTransforms.clear()
      ready.value = false
    })

    // Expose interpolation data for RigidBody components
    const getInterpolationAlpha = (): number => {
      const step = resolvedTimeStep()
      if (step === 'vary' || !props.interpolate) return 1
      return accumulator / (step as number)
    }

    // Store on context for RigidBody to access
    ;(context as any)._getInterpolationAlpha = getInterpolationAlpha
    ;(context as any)._bodyTransforms = bodyTransforms

    return () => {
      if (!ready.value) return null
      return h('group', null, slots.default?.())
    }
  },
})
