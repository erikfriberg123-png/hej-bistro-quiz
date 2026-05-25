const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const MONOREPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.resolve(MONOREPO_ROOT, 'packages');

const config = getDefaultConfig(__dirname);

// Allow Metro to watch and resolve files from the shared packages directory
config.watchFolders = [PACKAGES_DIR];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(MONOREPO_ROOT, 'node_modules'),
];
config.resolver.extraNodeModules = {
  '@quizine/config': path.resolve(PACKAGES_DIR, 'config/src'),
};

// Forces Metro to use CommonJS builds of packages, fixing the
// "Cannot use import.meta outside a module" error from @supabase/supabase-js on web
config.resolver.unstable_enablePackageExports = false;

// Stub native-only packages that have no web implementation
const webStubs = {
  'expo-apple-authentication': path.resolve(__dirname, 'src/lib/appleAuth.stub.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webStubs[moduleName]) {
    return { filePath: webStubs[moduleName], type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
