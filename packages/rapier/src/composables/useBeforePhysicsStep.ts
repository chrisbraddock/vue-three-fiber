import { inject, onBeforeUnmount } from 'vue'
import type RAPIER from '@dimforge/rapier3d-compat'
import { PHYSICS_CONTEXT } from '../context'

/**
 * Register a callback that runs before each physics step.
 * Automatically cleaned up on component unmount.
 * Must be called inside a `<Physics>` component.
 */
export function useBeforePhysicsStep(callback: (world: RAPIER.World) => void): void {
  const physics = inject(PHYSICS_CONTEXT)
  if (!physics) {
    throw new Error('@xperimntl/vue-threejs-rapier: useBeforePhysicsStep() must be called inside a <Physics> component')
  }

  const unsub = physics.onBeforeStep(callback)

  onBeforeUnmount(() => {
    unsub()
  })
}
