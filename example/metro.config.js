const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const workspaceRoot = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Monorepo setup: watch the workspace root (so changes to packages/react-native
 * are picked up) and let Metro fall back to the root node_modules for hoisted
 * workspace packages.
 *
 * `extraNodeModules` pins `react`/`react-native` to this app's own copy no
 * matter which symlinked package does the `require` — without it, code
 * inside `packages/react-native` (a separate workspace, with `react`/
 * `react-native` as its own devDependencies) resolved a *different* React
 * copy than the app's, which broke every hook with "Invalid hook call...
 * you might have more than one copy of React" at runtime. `nodeModulesPaths`
 * alone (adding extra search roots) does not prevent this — Metro still
 * finds a same-named package earlier via its normal per-file directory walk
 * unless a specific module name is pinned like this.
 *
 * `blockList` excludes the workspace root's own `node_modules` from Metro's haste
 * crawl entirely. Without it, Metro indexed *two* copies of react-native's
 * internal (Haste-named) files — this app's own (`example/node_modules`) and
 * the root-hoisted one (pulled in by `packages/react-native`'s devDependencies,
 * reachable once `watchFolders` includes the workspace root) — which is a
 * second, independent way (beyond plain npm resolution) this monorepo layout
 * caused two React/react-native instances to end up in one bundle. Blocking
 * the root `node_modules` is safe: `extraNodeModules` above already redirects
 * any `require('react')`/`require('react-native')` from anywhere (including
 * packages/react-native) to this app's own copies regardless.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-native': path.resolve(__dirname, 'node_modules/react-native'),
    },
    blockList: [new RegExp(`^${path.resolve(workspaceRoot, 'node_modules').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*$`)],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
