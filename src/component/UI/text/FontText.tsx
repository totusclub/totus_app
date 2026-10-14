import React, { createContext, forwardRef, useContext } from 'react';
import { Text, TextInput, TextInputProps, TextProps } from 'react-native';
import { InheritedFont, resolveAppFont, withAppFont } from '../../../theme/fonts';

/** Шрифт родительского текста (начертание, заголовок) — для вложенных текстов. */
export const InheritedFontContext = createContext<InheritedFont | undefined>(undefined);

/**
 * Text из react-native со шрифтом приложения (theme/fonts.ts). Остальные свойства
 * (allowFontScaling, numberOfLines и т.д.) не меняются — замена 1:1 для `import { Text }`.
 */
export const FontText = forwardRef<React.ElementRef<typeof Text>, TextProps>(({ style, ...props }, ref) => {
  const inherited = useContext(InheritedFontContext);
  const resolved = resolveAppFont(style, inherited);
  return (
    <InheritedFontContext.Provider value={resolved.inherited}>
      <Text ref={ref} style={resolved.style} {...props} />
    </InheritedFontContext.Provider>
  );
});
FontText.displayName = 'FontText';

/** TextInput из react-native со шрифтом приложения (текст и placeholder). */
export const FontTextInput = forwardRef<TextInput, TextInputProps>(({ style, ...props }, ref) => (
  <TextInput ref={ref} style={withAppFont(style)} {...props} />
));
FontTextInput.displayName = 'FontTextInput';
