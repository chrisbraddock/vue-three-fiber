import type { InjectionKey, ShallowRef } from 'vue'
import type RAPIER from '@dimforge/rapier3d-compat'

export interface PhysicsContext {
  world: ShallowRef<RAPIER.World>
  rapier: typeof RAPIER
  paused: ShallowRef<boolean>
  /** The auto-collider default from the Physics component */
  colliders: ShallowRef<ColliderShape | false>
  /** Register a before-step callback; returns an unregister function */
  onBeforeStep(fn: (world: RAPIER.World) => void): () => void
  /** Register an after-step callback; returns an unregister function */
  onAfterStep(fn: (world: RAPIER.World) => void): () => void
}

export interface RigidBodyContext {
  body: ShallowRef<RAPIER.RigidBody>
  /** Add a collider descriptor to this body */
  addCollider(desc: RAPIER.ColliderDesc): RAPIER.Collider
  /** Remove a collider from this body */
  removeCollider(collider: RAPIER.Collider): void
}

export type ColliderShape = 'ball' | 'cuboid' | 'trimesh'

export const PHYSICS_CONTEXT: InjectionKey<PhysicsContext> = Symbol('v3f-physics')
export const RIGID_BODY_CONTEXT: InjectionKey<RigidBodyContext> = Symbol('v3f-rigid-body')
export const RAPIER_DEFAULTS: InjectionKey<RapierPluginOptions> = Symbol('v3f-rapier-defaults')

export interface RapierPluginOptions {
  gravity?: [number, number, number]
  timeStep?: number | 'vary'
  debug?: boolean
}
