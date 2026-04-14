const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Tell Metro that .lottie files are safe to bundle as assets!
config.resolver.assetExts.push('lottie');

module.exports = config;