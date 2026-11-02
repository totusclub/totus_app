/**
 * react-native для пакета Маши (@tosmedia/ai-assistant-native): всё как есть, но Text и TextInput —
 * со шрифтами приложения (Museo / «Totus Symbols»), как у Маши на сайте («Golos Text» там = Museo).
 * Подставляется только для файлов пакета — metro.config.js → resolveRequest. Сам пакет не меняется.
 */
export * from 'react-native';
export { FontText as Text, FontTextInput as TextInput } from '../component/UI/text/FontText';
