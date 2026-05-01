const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Forces Metro to use CommonJS builds of packages, fixing the
// "Cannot use import.meta outside a module" error from @supabase/supabase-js on web
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
