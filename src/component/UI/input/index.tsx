import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Image } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
// import SearchIcon from './../../../assets/icons/Search.png';

type AppInputProps = {
  placeholder?: string;
  value?: string;
  onChange?: (text: string) => void;
  icon?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  autoComplete?: 'email' | 'tel' | 'off';
  focusBorderColor?: string;
  disabled?: boolean;
};

const AppInput = ({
  placeholder,
  value,
  onChange,
  icon,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  autoComplete,
  focusBorderColor,
  disabled = false,
}: AppInputProps) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = focused ? (focusBorderColor || theme.brand) : theme.inputBorder;
  const inputBgColor = theme.inputBackground;

  return (
    <View
      style={{
        ...styles.inputWrap,
        backgroundColor: inputBgColor,
        borderColor: borderColor,
        opacity: disabled ? 0.5 : 1,
      }}>
      {/*{icon && icon === 'search' && <Image source={SearchIcon} />}*/}

      <TextInput
          allowFontScaling={false}
        autoCorrect={false}
        spellCheck={false}
        style={[styles.input, { color: theme.inputText }]}
        value={value || ''}
        placeholderTextColor={theme.inputPlaceholder}
        placeholder={placeholder || ''}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        editable={!disabled}
      />
    </View>
  );
};

export default AppInput;

const styles = StyleSheet.create({
  inputWrap: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    position: 'relative',
    flexDirection: 'row',
  },
  input: {
    width: '100%',
    height: 52,
    fontSize: 16,
    fontStyle: 'normal',
    letterSpacing: -0.2,
    fontWeight: '400',
    // lineHeight: 23,
  },
});
