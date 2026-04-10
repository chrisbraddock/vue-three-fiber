import { inject } from 'vue'
import { RIGID_BODY_CONTEXT, type RigidBodyContext } from '../context'

/**
 * Access the parent rigid body context. Must be called inside a `<RigidBody>` component.
 * Returns the rigid body ref and collider management functions.
 */
export function useRigidBody(): RigidBodyContext {
  const context = inject(RIGID_BODY_CONTEXT)
  if (!context) {
    throw new Error('@xperimntl/vue-threejs-rapier: useRigidBody() must be called inside a <RigidBody> component')
  }
  return context
}
