const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Tell Metro that .lottie files are safe to bundle as assets!
config.resolver.assetExts.push('lottie');

// Ignore CMake temporary directories to prevent ENOENT crashes on Windows
if (!Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList = config.resolver.blockList ? [config.resolver.blockList] : [];
}
config.resolver.blockList.push(
  /.*\.cxx.*/,
  /.*\.gradle.*/,
  /.*android[\\/]app[\\/]build.*/
);

module.exports = config;