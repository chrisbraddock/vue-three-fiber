import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './theme.css'
import Codesandbox from './components/Codesandbox.vue'
import DocsExamples from './components/DocsExamples.vue'
import Grid from './components/Grid.vue'
import Intro from './components/Intro.vue'
import Img from './components/Img.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Codesandbox', Codesandbox)
    app.component('DocsExamples', DocsExamples)
    app.component('Grid', Grid)
    app.component('Intro', Intro)
    app.component('Img', Img)
  },
} satisfies Theme
