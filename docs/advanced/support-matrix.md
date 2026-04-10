---
title: Support Matrix
description: Supported versions, environments, and browser compatibility for vue-threejs packages.
---

# Support Matrix

## Core Dependencies

| Dependency | Supported Range | Notes                       |
| ---------- | --------------- | --------------------------- |
| Vue        | >= 3.3          | Uses `createRenderer` API   |
| Three.js   | >= 0.156        | Dynamic element mapping     |
| Node.js    | >= 18           | For build tooling and tests |

## Bundler Support

| Bundler | Status           | Notes                                                     |
| ------- | ---------------- | --------------------------------------------------------- |
| Vite    | Tested           | Primary development bundler                               |
| Nuxt    | Client-only      | Wrap Canvas in `<ClientOnly>`, add `three` to `transpile` |
| Webpack | Expected to work | Not actively tested in CI                                 |

## Browser Support

| Browser                  | Status                          |
| ------------------------ | ------------------------------- |
| Chrome / Edge (Chromium) | Supported                       |
| Firefox                  | Supported                       |
| Safari / WebKit          | Supported (WebGL2 required)     |
| Mobile browsers          | Supported (touch events mapped) |

## SSR

- Three.js requires browser APIs — Canvas must be wrapped in `<ClientOnly>` for SSR frameworks.
- Components importing Three.js at module scope need dynamic imports in SSR contexts.

## Package Status

| Package                                 | Status | Description                |
| --------------------------------------- | ------ | -------------------------- |
| `@xperimntl/vue-threejs`                | Stable | Core renderer              |
| `@xperimntl/vue-threejs-drei`           | Stable | Controls, loaders, helpers |
| `@xperimntl/vue-threejs-postprocessing` | Stable | GPU postprocessing effects |
| `@xperimntl/vue-threejs-rapier`         | Stable | Rigid-body physics         |
| `@xperimntl/vue-threejs-test-renderer`  | Stable | Node.js test renderer      |
| `@xperimntl/eslint-plugin-vue-threejs`  | Stable | ESLint rules               |
