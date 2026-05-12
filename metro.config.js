const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

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
