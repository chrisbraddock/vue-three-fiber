## Contributing

This project uses [semantic commits](https://conventionalcommits.org) and [semver](https://semver.org).

### Setup

Make sure you have [Node 18+](https://nodejs.org) and [Yarn 1](https://classic.yarnpkg.com) installed.

```bash
yarn install
yarn build
```

### Development

```bash
yarn examples      # docs site with interactive demos
yarn docs:dev      # docs dev server
yarn test          # test suite
yarn test:watch    # tests in watch mode
yarn typecheck     # TypeScript checks
yarn eslint        # lint
yarn format        # prettier check
```

### Workflow

1. Create a branch from `master`
2. Make your changes
3. Open a PR — CI runs build, typecheck, lint, tests, and formatting
4. PR must pass all checks before merge

### Releasing

We use [changesets](https://github.com/changesets/changesets) for versioning and publishing.

**To prepare a release:**

```bash
yarn changeset:add    # describe your changes (patch/minor/major)
git add .changeset/
git commit -m "chore: add changeset"
git push
```

**What happens next (automated):**

1. CI creates a "Version Packages" PR that bumps versions and updates CHANGELOG
2. Merge that PR when ready
3. CI publishes to npm and creates a GitHub Release automatically

Only `@xperimntl/vue-threejs` is published to npm. All other packages (drei, postprocessing, rapier, etc.) are internal.
