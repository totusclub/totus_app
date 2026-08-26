import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { AppText } from '../index.ts';

import { TextInputMask } from 'react-native-masked-text';
// import IconArrow from './../../../assets/icons/Arrow-right.png';
// import IconError from './../../../assets/icons/Error.png';
import { useDispatch } from 'react-redux';
// import {updateCustomerPhone} from '../../../modules/store/actions/customer.ts';
import { loginUser } from '../../../modules/store/actions/auth.ts';
import { useTheme } from '../../../hooks/useTheme';

type AppPhoneInputProps = {
  placeholder?: string;
  number?: string;
  onPress?: () => void;
  onChangeNumber?: (value: string) => void;
  screen?: string;
  setValid: (value: boolean) => void;
  errorText?: string;
  setErrorText?: any;
  focusBorderColor?: string;
};

const AppPhoneInput = ({
  placeholder,
  number,
  onChangeNumber,
  onPress,
  screen,
  setValid,
  errorText,
  setErrorText,
  focusBorderColor,
}: AppPhoneInputProps) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [localValidate, setLocalValidate] = useState(false);
  const [error, setError] = useState<boolean | string>(false);
  const dispatch = useDispatch();
  const phoneRegex =
    /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;

  useEffect(() => {
    if (errorText) {
      setError(errorText)
    }

  }, [errorText]);

  useEffect(() => {
    let checkPhone = phoneRegex?.test(number || '');
    if (screen === 'SIGN_IN') {
      if (checkPhone) {
        let phoneRegex = number?.replace(/[^\d]/g, '');
        let params = { phone: `+${phoneRegex}`, type: 'PHONE' };
        dispatch(loginUser(params)).then(response => {
          if (response?.error) {
            setValid && setValid(false);
            setLocalValidate(false);
            setError('Мы не нашли пользователя с таким номером');
          } else {
            setValid && setValid(true);
            setLocalValidate(true);
          }
        });
      }
    } else if (screen === 'CHANGE') {
      if (checkPhone) {
        let phoneRegex = number?.replace(/[^\d]/g, '');
        let params = { phone: `+${phoneRegex}`, type: 'PHONE' };
        // dispatch(updateCustomerPhone(params)).then(response => {
        //   if (response?.error) {
        //     setValid && setValid(false);
        //     setLocalValidate(false);
        //     setError('Номер телефона уже используется.');
        //   } else {
        //     setValid && setValid(true);
        //     setLocalValidate(true);
        //   }
        // });
      }
    } else {
      setValid && setValid(checkPhone);
      setLocalValidate(checkPhone);
    }
  }, [number, phoneRegex]);

  const backgroundColor = useMemo(() => {
    let color: string = 'transparent';
    if (screen === 'SIGN_IN' || screen === 'CHANGE') {
      if (localValidate && number?.length === 16) {
        color = theme.brand;
      } else if (number?.length === 16 && !localValidate) {
        color = theme.error;
      }
    }
    setError('');
    setErrorText && setErrorText('');
    return color;
  }, [number, localValidate, theme]);

  const borderColor = useMemo(() => {
    let color: string = theme.inputBorder;

    if (focused && number?.length === 16 && !localValidate) {
      color = theme.error;
    } else if (focused && number?.length <= 16) {
      color = focusBorderColor || theme.brand;
    }

    return color;
  }, [focused, number, localValidate, focusBorderColor, theme]);

  return (
    <>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: backgroundColor === 'transparent' ? theme.inputBackground : backgroundColor,
            borderColor: borderColor,
          },
        ]}>
        <TextInputMask
            allowFontScaling={false}
          placeholderTextColor={theme.inputPlaceholder}
          type={'custom'}
          options={{
            mask: '+7 999 999-99-99',
          }}
          value={number}
          onChangeText={text => {
            if (onChangeNumber) {
              onChangeNumber(text);
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...styles.input,
            color:
              (screen === 'SIGN_IN' && number?.length === 16) ||
                (screen === 'CHANGE' && number?.length === 16)
                ? theme.textInverse
                : theme.inputText,
          }}
          keyboardType="phone-pad"
          placeholder={placeholder}
        />
        {screen === 'SIGN_IN' && number?.length === 16 && localValidate && (
          <TouchableOpacity onPress={onPress} style={styles.button}>
            {/*<Image style={styles.buttonIcon} source={IconArrow} />*/}
          </TouchableOpacity>
        )}
        {screen === 'CHANGE' && number?.length === 16 && localValidate && (
          <TouchableOpacity onPress={onPress} style={styles.button}>
            {/*<Image style={styles.buttonIcon} source={IconArrow} />*/}
          </TouchableOpacity>
        )}
      </View>
      {/*{!error && number?.length === 16 && !localValidate && (*/}
      {/*  <>*/}
      {/*    <View style={styles.error}>*/}
      {/*      <Image source={IconError} />*/}
      {/*      <AppText style={styles.errorText}>*/}
      {/*        Мы не нашли пользователя с таким номером*/}
      {/*      </AppText>*/}
      {/*    </View>*/}
      {/*  </>*/}
      {/*)}*/}

      {error && (
        <View style={styles.error}>
          {/*<Image source={IconError} />*/}
          <AppText style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
        </View>
      )}
      {/*{errorText && (*/}
      {/*  <View style={styles.error}>*/}
      {/*    <Image source={IconError} />*/}
      {/*    <AppText style={styles.errorText}>{errorText}</AppText>*/}
      {/*  </View>*/}
      {/*)}*/}
    </>
  );
};

export default AppPhoneInput;

const styles = StyleSheet.create({
  inputWrap: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 14,
    position: 'relative',
  },
  input: {
    width: '100%',
    height: '100%',
  },
  button: {
    position: 'absolute',
    width: 36,
    height: 36,
    backgroundColor: '#8EB2FB',
    borderRadius: 8,
    right: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {},
  errorText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
});
