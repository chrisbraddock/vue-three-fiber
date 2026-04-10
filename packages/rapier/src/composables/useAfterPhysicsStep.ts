import { inject, onBeforeUnmount } from 'vue'
import type RAPIER from '@dimforge/rapier3d-compat'
import { PHYSICS_CONTEXT } from '../context'

/**
 * Register a callback that runs after each physics step.
 * Automatically cleaned up on component unmount.
 * Must be called inside a `<Physics>` component.
 */
export function useAfterPhysicsStep(callback: (world: RAPIER.World) => void): void {
  const physics = inject(PHYSICS_CONTEXT)
  if (!physics) {
    throw new Error('@xperimntl/vue-threejs-rapier: useAfterPhysicsStep() must be called inside a <Physics> component')
  }

  const unsub = physics.onAfterStep(callback)

  onBeforeUnmount(() => {
    unsub()
  })
}
