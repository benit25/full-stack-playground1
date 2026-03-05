const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix for Windows path issues with node:sea
config.transformer = {
  ...config.transformer,
  minifierPath: require.resolve('metro-minify-terser'),
};

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
};

module.exports = config;
