const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;

// Мила (@tosmedia/ai-assistant-native) берёт Text / TextInput из react-native без fontFamily.
// Для файлов пакета react-native подменяется обёрткой со шрифтами приложения — как у Милы на сайте.
const MILA_PACKAGE = `${path.sep}@tosmedia${path.sep}ai-assistant-native${path.sep}`;
const RN_WITH_APP_FONTS = path.resolve(projectRoot, 'src/theme/reactNativeWithAppFonts.ts');

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
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native' && context.originModulePath.includes(MILA_PACKAGE)) {
        return {type: 'sourceFile', filePath: RN_WITH_APP_FONTS};
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
