import { isHTMLTag, isSVGTag } from '@vue/shared'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vitepress'

const base = process.env.VITEPRESS_BASE || '/'

export default defineConfig({
  base,
  title: 'vue-threejs',
  description: 'A Vue 3 renderer for Three.js',
  vite: {
    plugins: [
      vueJsx({
        isCustomElement: (tag) => !isHTMLTag(tag) && !isSVGTag(tag),
      }),
    ],
  },
  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/getting-started/introduction' },
      { text: 'API', link: '/API/canvas' },
      { text: 'Ecosystem', link: '/ecosystem/plugins' },
      { text: 'Tutorials', link: '/tutorials/basic-animations' },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/getting-started/introduction' },
          { text: 'Installation', link: '/getting-started/installation' },
          { text: 'Your First Scene', link: '/getting-started/your-first-scene' },
          { text: 'Examples', link: '/getting-started/examples' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'Canvas', link: '/API/canvas' },
          { text: 'Composables', link: '/API/hooks' },
          { text: 'Events', link: '/API/events' },
          { text: 'Objects', link: '/API/objects' },
          { text: 'Testing', link: '/API/testing' },
          { text: 'TypeScript', link: '/API/typescript' },
          { text: 'Additional Exports', link: '/API/additional-exports' },
        ],
      },
      {
        text: 'Tutorials',
        items: [
          { text: 'Basic Animations', link: '/tutorials/basic-animations' },
          { text: 'Events & Interaction', link: '/tutorials/events-and-interaction' },
          { text: 'How It Works', link: '/tutorials/how-it-works' },
          { text: 'Loading Models', link: '/tutorials/loading-models' },
          { text: 'Loading Textures', link: '/tutorials/loading-textures' },
          { text: 'Object Handles', link: '/tutorials/object-handles' },
          { text: 'Demand Rendering', link: '/tutorials/demand-rendering' },
          { text: 'DOM Overlays', link: '/tutorials/dom-overlays' },
          { text: 'Scene Transitions', link: '/tutorials/scene-transitions' },
          { text: 'Vue-Native Patterns', link: '/tutorials/vue-native-patterns' },
        ],
      },
      {
        text: 'Ecosystem',
        items: [
          { text: 'Plugin System', link: '/ecosystem/plugins' },
          { text: 'Drei', link: '/ecosystem/drei' },
          { text: 'Postprocessing', link: '/ecosystem/postprocessing' },
          { text: 'Rapier Physics', link: '/ecosystem/rapier' },
        ],
      },
      {
        text: 'Advanced',
        items: [
          { text: 'Compatibility Contract', link: '/advanced/compatibility-contract' },
          { text: 'Known Limitations', link: '/advanced/known-limitations' },
          { text: 'Pitfalls', link: '/advanced/pitfalls' },
          { text: 'Scaling Performance', link: '/advanced/scaling-performance' },
          { text: 'Vue Divergences', link: '/advanced/vue-divergences' },
          { text: 'Architecture', link: '/advanced/architecture' },
          { text: 'Support Matrix', link: '/advanced/support-matrix' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/chris-xperimntl/vue-threejs' }],
  },
})
