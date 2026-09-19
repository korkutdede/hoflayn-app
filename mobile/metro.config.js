/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Next.js at repo root uses react@19.2.3; Expo SDK 54 needs react@19.1.0.
// Without pinning, Metro bundles both → "Cannot read property 'useMemo' of null".
const reactRoot = path.resolve(projectRoot, 'node_modules/react');
const reactDomRoot = path.resolve(projectRoot, 'node_modules/react-dom');
const reactNativeRoot = path.resolve(monorepoRoot, 'node_modules/react-native');

const singletonExact = {
  react: path.join(reactRoot, 'index.js'),
  'react-dom': path.join(reactDomRoot, 'index.js'),
  'react-native': path.join(reactNativeRoot, 'index.js'),
  'react/jsx-runtime': path.join(reactRoot, 'jsx-runtime.js'),
  'react/jsx-dev-runtime': path.join(reactRoot, 'jsx-dev-runtime.js'),
  'react/compiler-runtime': path.join(reactRoot, 'compiler-runtime.js'),
};

const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const forced = singletonExact[moduleName];
  if (forced) {
    return { type: 'sourceFile', filePath: forced };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
