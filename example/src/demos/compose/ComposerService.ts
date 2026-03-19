import { ref, computed, type InjectionKey, type Ref, type ComputedRef } from 'vue'

export interface ObjectDef {
  name: string
  color: string
  roughness: number
  metalness: number
}

export interface ComposerService {
  objects: ObjectDef[]
  selectedIndex: Ref<number>
  selected: ComputedRef<ObjectDef>
  bloom: Ref<boolean>
  bloomIntensity: Ref<number>
  vignette: Ref<boolean>
  frameloop: Ref<'always' | 'demand'>
}

export const composerKey: InjectionKey<ComposerService> = Symbol('composer-service')

export function createComposerService(): ComposerService {
  const objects: ObjectDef[] = [
    { name: 'Torus', color: '#6688cc', roughness: 0.2, metalness: 0.8 },
    { name: 'Sphere', color: '#cc6644', roughness: 0.5, metalness: 0.3 },
    { name: 'Box', color: '#44aa66', roughness: 0.7, metalness: 0.1 },
  ]

  const selectedIndex = ref(0)
  const selected = computed(() => objects[selectedIndex.value])

  const bloom = ref(true)
  const bloomIntensity = ref(0.6)
  const vignette = ref(true)
  const frameloop = ref<'always' | 'demand'>('always')

  return { objects, selectedIndex, selected, bloom, bloomIntensity, vignette, frameloop }
}
