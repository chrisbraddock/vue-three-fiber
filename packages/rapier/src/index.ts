// Plugin
export { rapierFiberPlugin, createRapierPlugin } from './plugin'

// Context types and injection keys
export {
  PHYSICS_CONTEXT,
  RIGID_BODY_CONTEXT,
  RAPIER_DEFAULTS,
  type PhysicsContext,
  type RigidBodyContext,
  type RapierPluginOptions,
  type ColliderShape,
} from './context'

// Components
export { Physics } from './Physics'
export { RigidBody } from './RigidBody'
export { Debug } from './Debug'

// Colliders
export {
  BallCollider,
  CuboidCollider,
  CapsuleCollider,
  CylinderCollider,
  ConeCollider,
  TrimeshCollider,
  HeightfieldCollider,
} from './colliders'

// Joints
export { FixedJoint, SphericalJoint, RevoluteJoint, PrismaticJoint, RopeJoint, SpringJoint } from './joints'

// Composables
export {
  useRapier,
  useRigidBody,
  useCollider,
  useBeforePhysicsStep,
  useAfterPhysicsStep,
  type UseColliderReturn,
} from './composables'
