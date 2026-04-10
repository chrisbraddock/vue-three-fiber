import { inject, onBeforeUnmount, shallowRef, type ShallowRef } from 'vue'
import type RAPIER from '@dimforge/rapier3d-compat'
import { PHYSICS_CONTEXT, RIGID_BODY_CONTEXT } from '../context'

export interface UseColliderReturn {
  /** Create a collider on the parent rigid body from a descriptor */
  createCollider(desc: RAPIER.ColliderDesc): RAPIER.Collider
  /** Remove a collider */
  removeCollider(collider: RAPIER.Collider): void
  /** The Rapier module for building ColliderDesc instances */
  rapier: typeof RAPIER
  /** All colliders created through this composable */
  colliders: ShallowRef<RAPIER.Collider[]>
}

/**
 * Provides helpers for working with colliders. Must be called inside both
 * `<Physics>` and `<RigidBody>` components.
 *
 * All colliders created through this composable are automatically cleaned up on unmount.
 */
export function useCollider(): UseColliderReturn {
  const physics = inject(PHYSICS_CONTEXT)
  if (!physics) {
    throw new Error('@xperimntl/vue-threejs-rapier: useCollider() must be called inside a <Physics> component')
  }

  const rigidBody = inject(RIGID_BODY_CONTEXT)
  if (!rigidBody) {
    throw new Error('@xperimntl/vue-threejs-rapier: useCollider() must be called inside a <RigidBody> component')
  }

  const colliders: ShallowRef<RAPIER.Collider[]> = shallowRef([])

  function createCollider(desc: RAPIER.ColliderDesc): RAPIER.Collider {
    const collider = rigidBody.addCollider(desc)
    colliders.value = [...colliders.value, collider]
    return collider
  }

  function removeCollider(collider: RAPIER.Collider): void {
    rigidBody.removeCollider(collider)
    colliders.value = colliders.value.filter((c) => c !== collider)
  }

  // Clean up all colliders on unmount
  onBeforeUnmount(() => {
    for (const collider of colliders.value) {
      rigidBody.removeCollider(collider)
    }
    colliders.value = []
  })

  return {
    createCollider,
    removeCollider,
    rapier: physics.rapier,
    colliders,
  }
}
