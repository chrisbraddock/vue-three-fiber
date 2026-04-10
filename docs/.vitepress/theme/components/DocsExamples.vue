<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { codeToHtml } from 'shiki'
import GlassFlowerDemo from './GlassFlowerDemo'
// @ts-expect-error raw import resolved by Vite
import glassFlowerSource from './GlassFlowerDemo.tsx?raw'

// ---------------------------------------------------------------------------
// Raw source imports via import.meta.glob (Vite resolves these at build time)
// ---------------------------------------------------------------------------
const rawModules = import.meta.glob('../../../../example/src/demos/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Extract demo name from glob path */
function sourceFor(name: string): string {
  for (const [path, content] of Object.entries(rawModules)) {
    if (path.endsWith(`/${name}.tsx`)) return content
  }
  return `// Source not found for ${name}`
}

// ---------------------------------------------------------------------------
// Demo registry
// ---------------------------------------------------------------------------

interface DemoEntry {
  title: string
  height: number
  description: string
  component: ReturnType<typeof defineAsyncComponent> | ReturnType<(typeof import('vue'))['defineComponent']>
  source: string
  originalDemo?: {
    label: string
    url: string
  }
}

const demos: Record<string, DemoEntry> = {
  Compose: {
    title: 'DOM + 3D Composer',
    height: 640,
    description:
      'Vue-native DOM/3D composition: provide/inject bridges a sidebar and overlay controls into the scene, watchInvalidate drives demand rendering, and postprocessing effects toggle reactively. One Vue app, two render targets, zero iframes.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/Compose')),
    source: sourceFor('Compose'),
  },
  GlassFlower: {
    title: 'GlassFlower',
    height: 640,
    description: 'GLTF model with HDRI lighting, physically-based glass material, postprocessing, and orbit controls.',
    component: GlassFlowerDemo,
    source: glassFlowerSource,
  },
  SpaceGame: {
    title: 'Space Game',
    height: 620,
    description:
      'Procedural starfield, spline track, ship steering, enemy drones, rocks, score HUD, and click-to-fire gameplay.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/SpaceGame')),
    source: sourceFor('SpaceGame'),
    originalDemo: {
      label: 'Original React version',
      url: 'https://codesandbox.io/s/i2160',
    },
  },
  Test: {
    title: 'Test',
    height: 420,
    description:
      'Foundational conditional rendering, ref lifecycle, and interaction behavior. This is the minimal sanity-check scene for the renderer itself.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/Test')),
    source: sourceFor('Test'),
  },
  ClickAndHover: {
    title: 'Click & Hover',
    height: 420,
    description:
      'Pointer events, click handling, and mixing declarative nodes with primitive Three objects in one scene.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/ClickAndHover')),
    source: sourceFor('ClickAndHover'),
  },
  ContextMenuOverride: {
    title: 'Context Menu Override',
    height: 380,
    description:
      'Custom right-click interactions in 3D space, including suppressing the browser context menu and mapping it to scene behavior.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/ContextMenuOverride')),
    source: sourceFor('ContextMenuOverride'),
  },
  SceneServices: {
    title: 'Scene Services',
    height: 520,
    description:
      'Shared state across the scene and the DOM overlay using provide/inject. Click a shape to select it, then drive the selection state from the overlay controls.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/SceneServices')),
    source: sourceFor('SceneServices'),
  },
  DomOverlay: {
    title: 'DOM Overlay',
    height: 460,
    description:
      'Canvas overlay slots keep the 3D scene and the interface in one Vue app. Adjust the color and speed in the overlaid controls and the scene updates immediately.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/DomOverlay')),
    source: sourceFor('DomOverlay'),
  },
  ObjectHandles: {
    title: 'Object Handles',
    height: 420,
    description:
      'useObjectRef gives you explicit access to the raw THREE object while keeping the authoring model declarative. This is the preferred imperative pattern for new code.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/ObjectHandles')),
    source: sourceFor('ObjectHandles'),
  },
  DemandRendering: {
    title: 'Demand Rendering',
    height: 420,
    description:
      'watchInvalidate pairs Vue reactivity with frameloop="demand" so the scene only redraws when state actually changes. Use the overlay button or click the torus knot to cycle colors.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/DemandRendering')),
    source: sourceFor('DemandRendering'),
  },
  AutoDispose: {
    title: 'Auto Dispose',
    height: 420,
    description:
      'Automatic disposal of Three objects when conditional scene branches unmount, with interaction-driven state changes to prove cleanup stays correct.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/AutoDispose')),
    source: sourceFor('AutoDispose'),
  },
  Layers: {
    title: 'Layers',
    height: 420,
    description:
      'Selective visibility with Three.js layers and camera filtering, demonstrated as timed visibility swaps.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/Layers')),
    source: sourceFor('Layers'),
  },
  MultiMaterial: {
    title: 'Multi Material',
    height: 520,
    description:
      'Multiple material slots on one geometry, shared material reuse, and dynamic geometry/material replacement.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/MultiMaterial')),
    source: sourceFor('MultiMaterial'),
  },
  MultiRender: {
    title: 'Multi Render',
    height: 560,
    description:
      'Two independent Canvas instances on one page, showing separate stores, renderers, and lifecycle timing in the same Vue view.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/MultiRender')),
    source: sourceFor('MultiRender'),
  },
  Pointcloud: {
    title: 'Pointcloud',
    height: 460,
    description:
      'A custom shader-driven interactive point cloud with per-point hover feedback using buffer geometry and raycaster indices.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/Pointcloud')),
    source: sourceFor('Pointcloud'),
  },
  Reparenting: {
    title: 'Reparenting',
    height: 460,
    description:
      'Dynamic createPortal reparenting without destroying objects, useful for scene graph orchestration and view transitions.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/Reparenting')),
    source: sourceFor('Reparenting'),
  },
  ResetProps: {
    title: 'Reset Props',
    height: 480,
    description:
      'Adaptive DPR, dynamic geometry replacement, and prop-reset behavior under ongoing animation and interaction.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/ResetProps')),
    source: sourceFor('ResetProps'),
  },
  SceneSwap: {
    title: 'Scene Swap',
    height: 460,
    description:
      'Swap entire scene branches without remounting the Canvas. This is a lightweight example of scene-level transitions and view switching.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/SceneSwap')),
    source: sourceFor('SceneSwap'),
  },
  LoaderTransition: {
    title: 'Loader Transition',
    height: 460,
    description:
      'A Vue-first loading flow with a visible placeholder and an explicit transition into the loaded content, without leaning on Suspense semantics.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/LoaderTransition')),
    source: sourceFor('LoaderTransition'),
  },
  ScreenCapture: {
    title: 'Screen Capture',
    height: 420,
    description:
      'Frame-synchronized screenshot capture using render lifecycle composables, proving scene updates are committed before pixels are read.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/ScreenCapture')),
    source: sourceFor('ScreenCapture'),
  },
  StopPropagation: {
    title: 'Stop Propagation',
    height: 460,
    description:
      'Nested pointer interactions with stopPropagation, demonstrating event routing and hover behavior across scene hierarchies.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/StopPropagation')),
    source: sourceFor('StopPropagation'),
  },
  SVGRenderer: {
    title: 'SVG Renderer',
    height: 460,
    description:
      'Alternative renderer support with Three.js SVGRenderer instead of WebGL, showing the renderer abstraction is not WebGL-only.',
    component: defineAsyncComponent(() => import('../../../../example/src/demos/SVGRenderer')),
    source: sourceFor('SVGRenderer'),
  },
}

type DemoKey = keyof typeof demos

// ---------------------------------------------------------------------------
// Hash ↔ demo key helpers
// ---------------------------------------------------------------------------

/** Convert PascalCase key to kebab-case slug for the URL hash */
function toSlug(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** Reverse lookup: slug → demo key */
const slugToKey: Record<string, DemoKey> = {}
for (const key of Object.keys(demos)) {
  slugToKey[toSlug(key)] = key as DemoKey
}

function keyFromHash(): DemoKey | null {
  const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
  return slugToKey[hash] ?? null
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const selected = ref<DemoKey>('Compose')
const selectedDemo = computed(() => demos[selected.value])

/** Key being hovered in the inline picker (for preview description) */
const hoveredKey = ref<DemoKey | null>(null)
const previewDemo = computed(() => demos[hoveredKey.value ?? selected.value])

/** Whether the modal is open */
const modalOpen = ref(false)

function openModal(key: DemoKey) {
  selected.value = key
  viewTab.value = 'demo'
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && modalOpen.value) closeModal()
}

/** Which inner tab is active: 'demo' or 'source' */
const viewTab = ref<'demo' | 'source'>('demo')

/** Cached highlighted HTML per demo key */
const highlightCache = new Map<string, string>()

/** Current highlighted HTML to render */
const highlightedHtml = shallowRef('')

/** Whether we're currently highlighting */
const highlighting = ref(false)

// Sync selected → hash (skip during programmatic back/forward updates)
let suppressHashSync = false
watch(selected, (key) => {
  viewTab.value = 'demo'
  if (!suppressHashSync && typeof window !== 'undefined') {
    history.replaceState(null, '', `#${toSlug(key)}`)
  }
})

// Sync hash → selected on back/forward navigation
function onHashChange() {
  const key = keyFromHash()
  if (key && key !== selected.value) {
    suppressHashSync = true
    selected.value = key
    suppressHashSync = false
  }
}

onMounted(() => {
  window.addEventListener('hashchange', onHashChange)
  window.addEventListener('keydown', onEscape)
  // Read hash on mount (handles SSR hydration and SPA navigation)
  const fromHash = keyFromHash()
  if (fromHash) {
    suppressHashSync = true
    selected.value = fromHash
    modalOpen.value = true
    suppressHashSync = false
  } else {
    history.replaceState(null, '', `#${toSlug(selected.value)}`)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', onHashChange)
  window.removeEventListener('keydown', onEscape)
})

// Highlight source on demand
watch(
  [selected, viewTab],
  async ([key, tab]) => {
    if (tab !== 'source') return

    // Use cache if available
    if (highlightCache.has(key)) {
      highlightedHtml.value = highlightCache.get(key)!
      return
    }

    highlighting.value = true
    try {
      const source = demos[key as DemoKey].source
      const html = await codeToHtml(source, {
        lang: 'tsx',
        themes: {
          light: 'github-light',
          dark: 'github-dark-dimmed',
        },
      })
      highlightCache.set(key, html)
      highlightedHtml.value = html
    } finally {
      highlighting.value = false
    }
  },
  { immediate: true },
)

// Line count for display
const lineCount = computed(() => {
  const source = demos[selected.value as DemoKey]?.source
  return source ? source.split('\n').length : 0
})

// ---------------------------------------------------------------------------
// stats.js — mrdoob's standard FPS/MS/MB panel
// Lazy-imported to avoid SSR failures (stats.js touches DOM at import time).
// ---------------------------------------------------------------------------
import { addEffect, addAfterEffect } from '@xperimntl/vue-threejs'

const stageEl = ref<HTMLElement | null>(null)
let stats: any = null
let unsubBefore: (() => void) | null = null
let unsubAfter: (() => void) | null = null

function initStats(container: HTMLElement) {
  import('stats.js').then((mod) => {
    const Stats = mod.default
    stats = new Stats()
    stats.showPanel(0)
    stats.dom.style.position = 'absolute'
    stats.dom.style.top = '0'
    stats.dom.style.right = '0'
    stats.dom.style.left = 'auto'
    stats.dom.style.pointerEvents = 'none'
    stats.dom.style.zIndex = '10'
    container.appendChild(stats.dom)

    unsubBefore = addEffect(() => {
      stats?.begin()
    })
    unsubAfter = addAfterEffect(() => {
      stats?.end()
    })
  })
}

function teardownStats() {
  unsubBefore?.()
  unsubAfter?.()
  stats?.dom?.remove()
  stats = null
  unsubBefore = null
  unsubAfter = null
}

// Watch the template ref — it only resolves after ClientOnly renders
watch(stageEl, (el) => {
  if (el && !stats) initStats(el)
})

onBeforeUnmount(teardownStats)
</script>

<template>
  <div class="docs-examples">
    <!-- Inline preview (small) — visible when modal is closed -->
    <div v-if="!modalOpen" class="docs-examples__preview" @click="openModal(selected)">
      <div ref="stageEl" class="docs-examples__preview-stage">
        <ClientOnly>
          <component :is="selectedDemo.component" />
        </ClientOnly>

        <!-- Dots nav -->
        <div class="docs-examples__dots docs-examples__dots--preview" @mouseleave="hoveredKey = null">
          <button
            v-for="(demo, key) in demos"
            :key="key"
            type="button"
            class="docs-examples__dot"
            :class="{ 'docs-examples__dot--active': selected === key }"
            :title="demo.title"
            @mouseenter="hoveredKey = key as DemoKey"
            @click.stop="selected = key as DemoKey" />
        </div>

        <span class="docs-examples__name">{{ previewDemo.title }}</span>
      </div>

      <div class="docs-examples__preview-meta">
        <strong>{{ previewDemo.title }}</strong> &mdash;
        <span>{{ previewDemo.description }}</span>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="modalOpen" class="docs-examples__backdrop" @click.self="closeModal">
        <div class="docs-examples__modal">
          <!-- Header: tabs + close -->
          <div class="docs-examples__modal-header">
            <div class="docs-examples__view-tabs">
              <button
                type="button"
                class="docs-examples__view-tab"
                :class="{ 'docs-examples__view-tab--active': viewTab === 'demo' }"
                @click="viewTab = 'demo'">
                Demo
              </button>
              <button
                type="button"
                class="docs-examples__view-tab"
                :class="{ 'docs-examples__view-tab--active': viewTab === 'source' }"
                @click="viewTab = 'source'">
                Source
                <span class="docs-examples__view-tab-badge">TSX</span>
              </button>
            </div>
            <button type="button" class="docs-examples__close" @click="closeModal">&times;</button>
          </div>

          <!-- Demo stage -->
          <div v-show="viewTab === 'demo'" class="docs-examples__stage">
            <ClientOnly>
              <component :is="selectedDemo.component" />
            </ClientOnly>

            <div class="docs-examples__dots" @mouseleave="hoveredKey = null">
              <button
                v-for="(demo, key) in demos"
                :key="key"
                type="button"
                class="docs-examples__dot"
                :class="{ 'docs-examples__dot--active': selected === key }"
                :title="demo.title"
                @mouseenter="hoveredKey = key as DemoKey"
                @click="selected = key as DemoKey" />
            </div>

            <span class="docs-examples__name">{{ previewDemo.title }}</span>
          </div>

          <!-- Source view -->
          <div v-show="viewTab === 'source'" class="docs-examples__code-wrap">
            <div class="docs-examples__code-header">
              <span class="docs-examples__code-filename">{{ selected }}.tsx</span>
              <span class="docs-examples__code-lines">{{ lineCount }} lines</span>
            </div>
            <div v-if="highlighting" class="docs-examples__code-loading">Loading syntax highlighting...</div>
            <div v-else class="docs-examples__code-container" v-html="highlightedHtml" />
          </div>

          <!-- Description -->
          <div class="docs-examples__meta">
            <h3>{{ previewDemo.title }}</h3>
            <p>{{ previewDemo.description }}</p>
            <p v-if="previewDemo.originalDemo" class="docs-examples__credit">
              {{ previewDemo.originalDemo.label }}:
              <a :href="selectedDemo.originalDemo.url" target="_blank" rel="noreferrer noopener">
                {{ selectedDemo.originalDemo.url }}
              </a>
            </p>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.docs-examples {
  display: grid;
  gap: 0.75rem;
}

/* --- Inline preview --- */

.docs-examples__preview {
  cursor: pointer;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.docs-examples__preview:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.docs-examples__preview-stage {
  position: relative;
  width: 100%;
  height: 320px;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 45%),
    linear-gradient(180deg, #12131b 0%, #191b24 100%);
}

.docs-examples__preview-meta {
  padding: 10px 14px;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-divider);
}

.docs-examples__preview-meta strong {
  color: var(--vp-c-text-1);
}

.docs-examples__preview-meta span {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Smaller dots in preview */
.docs-examples__dots--preview .docs-examples__dot {
  width: 12px;
  height: 12px;
  margin: 3px;
  background: rgba(255, 255, 255, 0.7);
}

.docs-examples__dots--preview .docs-examples__dot:hover {
  background: #fff;
}

.docs-examples__dots--preview .docs-examples__dot--active {
  background: #e8755a;
}

.docs-examples__dots--preview .docs-examples__dot--active:hover {
  background: #ff8866;
}

/* --- Shared dot styles --- */

.docs-examples__dot {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin: 6px;
  border: none;
  background: var(--vp-c-divider);
  cursor: pointer;
  padding: 0;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.docs-examples__dot:hover {
  transform: scale(1.25);
  background: var(--vp-c-text-3);
}

.docs-examples__dot--active {
  background: #e8755a;
}

.docs-examples__dot--active:hover {
  background: #ff8866;
}

/* --- Modal backdrop --- */

.docs-examples__backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

/* --- Modal --- */

.docs-examples__modal {
  width: 90vw;
  height: 90vh;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
  border-radius: 16px;
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

/* --- Modal header --- */

.docs-examples__modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem 0 0;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}

.docs-examples__view-tabs {
  display: flex;
  gap: 0;
}

.docs-examples__view-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.2rem;
  border: none;
  background: none;
  color: var(--vp-c-text-2);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition:
    color 0.18s ease,
    border-color 0.18s ease;
}

.docs-examples__view-tab:hover {
  color: var(--vp-c-text-1);
}

.docs-examples__view-tab--active {
  color: var(--vp-c-brand-1);
  border-bottom-color: var(--vp-c-brand-1);
}

.docs-examples__view-tab-badge {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.4;
}

.docs-examples__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: var(--vp-c-text-2);
  font-size: 1.4rem;
  cursor: pointer;
  border-radius: 6px;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.docs-examples__close:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

/* --- Demo stage (inside modal) --- */

.docs-examples__stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 45%),
    linear-gradient(180deg, #12131b 0%, #191b24 100%);
}

/* --- Dots nav (bottom-left inside stage) --- */

.docs-examples__dots {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 20;
  max-width: 210px;
  display: flex;
  flex-wrap: wrap;
  gap: 0px;
}

/* Use smaller dots inside the stage */
.docs-examples__stage .docs-examples__dot {
  width: 14px;
  height: 14px;
  margin: 4px;
  background: rgba(255, 255, 255, 0.85);
}

.docs-examples__stage .docs-examples__dot:hover {
  background: #fff;
}

/* --- Demo name (bottom-right inside stage) --- */

.docs-examples__name {
  position: absolute;
  bottom: 16px;
  right: 20px;
  z-index: 20;
  color: rgba(255, 255, 255, 0.6);
  font-family: system-ui, sans-serif;
  font-size: 13px;
  pointer-events: none;
}

/* --- Meta below stage in modal --- */

.docs-examples__meta {
  padding: 12px 20px 16px;
  flex-shrink: 0;
  border-top: 1px solid var(--vp-c-divider);
  max-height: 120px;
  overflow-y: auto;
}

.docs-examples__meta h3 {
  margin: 0 0 0.2rem;
  font-size: 1rem;
}

.docs-examples__meta p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  line-height: 1.5;
}

/* --- Credit --- */

.docs-examples__credit {
  margin-top: 0.35rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
}

.docs-examples__credit a {
  color: var(--vp-c-brand-1);
}

/* --- Code view --- */

.docs-examples__code-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.docs-examples__credit a {
  color: var(--vp-c-brand-1);
  word-break: break-all;
}

/* --- Code view --- */

.docs-examples__code-wrap {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.docs-examples__code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}

.docs-examples__code-filename {
  font-family: var(--vp-font-family-mono);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.docs-examples__code-lines {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.docs-examples__code-loading {
  padding: 2rem;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 0.85rem;
}

.docs-examples__code-container {
  max-height: 600px;
  overflow: auto;
}

/* Style the shiki output to match VitePress code blocks */
.docs-examples__code-container :deep(pre) {
  margin: 0;
  padding: 1rem;
  background: transparent !important;
  overflow-x: auto;
}

.docs-examples__code-container :deep(code) {
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  line-height: 1.65;
}

/* Shiki dual-theme: light mode uses --shiki-light, dark mode uses --shiki-dark */
.docs-examples__code-container :deep(.shiki) {
  background-color: transparent !important;
}

.docs-examples__code-container :deep(.shiki span) {
  color: var(--shiki-light) !important;
  background-color: var(--shiki-light-bg) !important;
}

:root.dark .docs-examples__code-container :deep(.shiki span),
.dark .docs-examples__code-container :deep(.shiki span) {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}
</style>
