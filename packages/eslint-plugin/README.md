# @xperimntl/eslint-plugin-vue-threejs

[![Version](https://img.shields.io/npm/v/@xperimntl/eslint-plugin-vue-threejs?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@xperimntl/eslint-plugin-vue-threejs)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/ZZjjNvJ)
[![Open Collective](https://img.shields.io/opencollective/all/vue-three-fiber?style=flat&colorA=000000&colorB=000000)](https://opencollective.com/vue-three-fiber)
[![ETH](https://img.shields.io/badge/ETH-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/eth/address/0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682)
[![BTC](https://img.shields.io/badge/BTC-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/btc/address/36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH)

An ESLint plugin which provides lint rules for [@xperimntl/vue-threejs](https://github.com/chris-xperimntl/vue-threejs).

## Installation

```bash
npm install @xperimntl/eslint-plugin-vue-threejs --save-dev
```

## Configuration

Use the recommended [config](#recommended) to get reasonable defaults:

```json
"extends": [
  "plugin:@xperimntl/vue-threejs/recommended"
]
```

If you do not use a config you will need to specify individual rules and add extra configuration.

Add "@xperimntl/vue-three" to the plugins section.

```json
"plugins": [
  "@xperimntl/vue-three"
]
```

Enable the rules that you would like to use.

```json
"rules": {
  "@xperimntl/vue-threejs/no-clone-in-frame-loop": "error"
}
```

## Rules

✅ Enabled in the `recommended` [configuration](#recommended).<br>
🔧 Automatically fixable by the `--fix` [CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).<br>
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/developer-guide/working-with-rules#providing-suggestions).

<!-- START_RULE_CODEGEN -->
<!-- @command yarn codegen:eslint -->

| Rule                                                            | Description                                                                                | ✅  | 🔧  | 💡  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --- | --- | --- |
| <a href="./docs/rules/no-clone-in-loop.md">no-clone-in-loop</a> | Disallow cloning vectors in the frame loop which can cause performance problems.           | ✅  |     |     |
| <a href="./docs/rules/no-new-in-loop.md">no-new-in-loop</a>     | Disallow instantiating new objects in the frame loop which can cause performance problems. | ✅  |     |     |

<!-- END_CODEGEN -->

## Shareable configs

### Recommended

This plugin exports a `recommended` configuration that enforces rules appropriate for everyone using Vue Three Fiber.

```json
"extends": [
  "plugin:@xperimntl/vue-threejs/recommended"
]
```

### All

This plugin also exports an `all` configuration that includes every available rule.

```json
"extends": [
  "plugin:@xperimntl/vue-threejs/all"
]
```
