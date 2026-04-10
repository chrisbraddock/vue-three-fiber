import { inject } from 'vue'
import { PHYSICS_CONTEXT, type PhysicsContext } from '../context'

/**
 * Access the Rapier physics context. Must be called inside a `<Physics>` component.
 * Returns the physics world, the Rapier module, pause state, and step callback registrars.
 */
export function useRapier(): PhysicsContext {
  const context = inject(PHYSICS_CONTEXT)
  if (!context) {
    throw new Error('@xperimntl/vue-threejs-rapier: useRapier() must be called inside a <Physics> component')
  }
  return context
}
