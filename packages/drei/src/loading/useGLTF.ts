import { inject, shallowRef, watch, onBeforeUnmount, isRef, type Ref, type ShallowRef } from 'vue'
import { buildGraph, type ObjectMap } from '@xperimntl/vue-threejs'
import { GLTFLoader, DRACOLoader, MeshoptDecoder, type GLTF } from 'three-stdlib'
import { DREI_DEFAULTS } from '../plugin'

export interface UseGLTFOptions {
  draco?: boolean | string
  useMeshopt?: boolean
}

type GLTFResult = GLTF & ObjectMap

// Module-level cache for loaded GLTFs
const gltfCache = new Map<string, GLTFResult>()

// Shared loader instances
let _gltfLoader: GLTFLoader | null = null
let _dracoLoader: DRACOLoader | null = null

function getGLTFLoader(): GLTFLoader {
  if (!_gltfLoader) {
    _gltfLoader = new GLTFLoader()
  }
  return _gltfLoader
}

function getDRACOLoader(path: string): DRACOLoader {
  if (!_dracoLoader) {
    _dracoLoader = new DRACOLoader()
  }
  _dracoLoader.setDecoderPath(path)
  return _dracoLoader
}

export function useGLTF(url: string | Ref<string>, options?: UseGLTFOptions): ShallowRef<GLTFResult | null> {
  const result = shallowRef<GLTFResult | null>(null)
  const defaults = inject(DREI_DEFAULTS, undefined)
  const loadedUrl = shallowRef<string | null>(null)

  function load(src: string) {
    // Check cache first
    const cached = gltfCache.get(src)
    if (cached) {
      result.value = cached
      loadedUrl.value = src
      return
    }

    const loader = getGLTFLoader()

    // Configure DRACO if requested
    if (options?.draco) {
      const dracoPath =
        typeof options.draco === 'string'
          ? options.draco
          : (defaults?.dracoPath ?? 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
      loader.setDRACOLoader(getDRACOLoader(dracoPath))
    }

    // Configure MeshOpt if requested
    if (options?.useMeshopt) {
      loader.setMeshoptDecoder(typeof MeshoptDecoder === 'function' ? MeshoptDecoder : (MeshoptDecoder as any))
    }

    loader.load(
      src,
      (gltf) => {
        const loaded = Object.assign(gltf, buildGraph(gltf.scene))
        gltfCache.set(src, loaded)
        result.value = loaded
        loadedUrl.value = src
      },
      undefined,
      (error) => {
        console.error(`[drei] Failed to load GLTF: ${src}`, error)
      },
    )
  }

  if (isRef(url)) {
    watch(
      url,
      (newUrl) => {
        if (newUrl) load(newUrl)
      },
      { immediate: true },
    )
  } else {
    load(url)
  }

  onBeforeUnmount(() => {
    // We don't dispose cached GLTFs — they persist for future use.
    // Only clear the ref so the component can be garbage collected.
    result.value = null
  })

  return result
}

/**
 * Preload a GLTF into cache. Call at module level for eager loading.
 */
useGLTF.preload = function (url: string, options?: UseGLTFOptions): void {
  if (gltfCache.has(url)) return

  const loader = getGLTFLoader()

  if (options?.draco) {
    const dracoPath =
      typeof options.draco === 'string' ? options.draco : 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
    loader.setDRACOLoader(getDRACOLoader(dracoPath))
  }

  if (options?.useMeshopt) {
    loader.setMeshoptDecoder(typeof MeshoptDecoder === 'function' ? MeshoptDecoder : (MeshoptDecoder as any))
  }

  loader.load(
    url,
    (gltf) => {
      gltfCache.set(url, Object.assign(gltf, buildGraph(gltf.scene)))
    },
    undefined,
    (error) => {
      console.error(`[drei] Failed to preload GLTF: ${url}`, error)
    },
  )
}

/**
 * Clear a GLTF from the cache.
 */
useGLTF.clear = function (url: string): void {
  gltfCache.delete(url)
}
