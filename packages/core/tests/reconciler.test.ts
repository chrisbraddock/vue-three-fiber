import * as THREE from 'three'
import { createCanvas } from '@xperimntl/vue-threejs-test-renderer/src/createTestCanvas'

async function act<T>(fn: () => Promise<T>) {
  // Silence act warning since we have a custom act implementation
  const error = console.error
  console.error = function (message) {
    if (/was not wrapped in act/.test(message)) return
    return error.call(this, arguments)
  }

  const value = fn()

  return new Promise<T>((res) => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => res(value))))
  }).finally(() => {
    console.error = error
  })
}

describe('reconciler', () => {
  const NODE_ENV = process.env.NODE_ENV

  for (const env of ['development', 'production']) {
    it(`should work with ${env} builds of Vue`, async () => {
      vi.resetModules()

      // @ts-ignore
      if (typeof window !== 'undefined') delete window.__THREE__
      process.env.NODE_ENV = env

      const Vue = await import('vue')
      const V3F = await import('../src/index')

      // @ts-expect-error - THREE namespace is compatible with Catalogue at runtime
      V3F.extend(THREE)
      const canvas = createCanvas()
      const root = V3F.createRoot(canvas)

      const lifecycle: string[] = []

      const object = {}
      const objRef = Vue.ref<Record<string, unknown> | null>(null)

      const Test = Vue.defineComponent({
        setup() {
          lifecycle.push('render')
          Vue.onMounted(() => void lifecycle.push('onMounted'))
          return () => Vue.h('primitive', { ref: objRef, object })
        },
      })
      await act(async () => root.render(Vue.h(Test)))

      expect(lifecycle).toStrictEqual(['render', 'onMounted'])
      // Verify ref was set (Vue custom renderer sets el to the Instance node)
      expect(objRef.value).not.toBeNull()

      await act(async () => root.unmount())
    })
  }

  // @ts-ignore
  if (typeof window !== 'undefined') delete window.__THREE__
  process.env.NODE_ENV = NODE_ENV
  vi.resetModules()
})
