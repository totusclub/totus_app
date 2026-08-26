const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;

const config = {
  resolver: {
    blockList: [/backend\/.*/],
    extraNodeModules: {
      react: path.resolve(projectRoot, 'node_modules/react'),
      'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
      '@react-native-async-storage/async-storage': path.resolve(
        projectRoot,
        'node_modules/@react-native-async-storage/async-storage',
      ),
      zustand: path.resolve(projectRoot, 'node_modules/zustand'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
