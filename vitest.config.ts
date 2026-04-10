import path from 'node:path'
import { defineConfig } from 'vitest/config'
import vueJsx from '@vitejs/plugin-vue-jsx'

// Narrowly-scoped allowlist of Three.js element tags used in tests.
// These are rendered via Vue's custom renderer, not the DOM, so Vue
// must be told they are custom elements to avoid resolveComponent warnings.
const FIBER_INTRINSICS = new Set([
  'group',
  'mesh',
  'mock',
  'primitive',
  'boxGeometry',
  'meshStandardMaterial',
  'meshBasicMaterial',
  'object3D',
  'color',
  'bufferGeometry',
  'bufferAttribute',
  'line',
  'threeLine',
  'threeRandom',
])

export default defineConfig({
  plugins: [
    vueJsx({
      isCustomElement: (tag) => FIBER_INTRINSICS.has(tag),
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    testPathIgnorePatterns: ['/node_modules/', '/\\.claude/', '/dist/', '/e2e/'],
    exclude: ['node_modules', '.claude', 'dist', 'e2e'],
    setupFiles: ['./packages/shared/setupTests.ts'],
    coverage: {
      exclude: ['node_modules/', 'packages/core/dist', 'packages/core/src/index', 'packages/test-renderer/dist'],
      provider: 'v8',
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: [
      { find: 'three', replacement: 'three' },
      { find: /^@xperimntl\/vue-threejs$/, replacement: path.resolve(__dirname, 'packages/core/src/index.ts') },
      { find: /^@xperimntl\/vue-threejs\/(.*)$/, replacement: path.resolve(__dirname, 'packages/core/src/$1') },
      {
        find: /^@xperimntl\/vue-threejs-test-renderer$/,
        replacement: path.resolve(__dirname, 'packages/test-renderer/src/index.tsx'),
      },
      {
        find: /^@xperimntl\/vue-threejs-test-renderer\/(.*)$/,
        replacement: path.resolve(__dirname, 'packages/test-renderer/$1'),
      },
    ],
  },
})
