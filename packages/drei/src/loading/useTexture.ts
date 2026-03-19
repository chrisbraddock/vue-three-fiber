import { shallowRef, watch, onBeforeUnmount, isRef, type Ref, type ShallowRef } from 'vue'
import * as THREE from 'three'

const textureLoader = new THREE.TextureLoader()

export function useTexture(url: string | Ref<string>): ShallowRef<THREE.Texture | null> {
  const result = shallowRef<THREE.Texture | null>(null)
  let currentTexture: THREE.Texture | null = null

  function load(src: string) {
    textureLoader.load(
      src,
      (texture) => {
        currentTexture = texture
        result.value = texture
      },
      undefined,
      (error) => {
        console.error(`[drei] Failed to load texture: ${src}`, error)
      },
    )
  }

  if (isRef(url)) {
    watch(
      url,
      (newUrl, oldUrl) => {
        if (newUrl === oldUrl) return
        // Dispose previous texture
        if (currentTexture) {
          currentTexture.dispose()
          currentTexture = null
        }
        if (newUrl) load(newUrl)
      },
      { immediate: true },
    )
  } else {
    load(url)
  }

  onBeforeUnmount(() => {
    if (currentTexture) {
      currentTexture.dispose()
      currentTexture = null
    }
    result.value = null
  })

  return result
}
