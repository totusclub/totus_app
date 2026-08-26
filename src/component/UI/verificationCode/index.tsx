import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { AppText } from '../index.ts';
import { useDispatch, useSelector } from 'react-redux';
import {
  verificationSignup,
  verifyCode,
} from '../../../modules/store/actions/auth.ts';
import { RootState } from '../../../modules/store';
import { useTheme } from '../../../hooks/useTheme';

type VerificationCodeProps = {
  setValid?: (value: boolean) => void;
  valid?: boolean;
  screen?: string;
  onComplete?: (code: string) => void;
};
const CELL_COUNT = 4;
const VerificationCode = ({ setValid, valid, screen, onComplete }: VerificationCodeProps) => {
  const { theme } = useTheme();
  const { userId } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  useEffect(() => {
    if (value.length === 4) {
      if (onComplete) {
        // If onComplete callback is provided, use it instead
        // Use setTimeout to avoid calling during render
        setTimeout(() => {
          onComplete(value);
        }, 0);
        return;
      }

      let params = {
        customerId: userId || '',
        token: value,
      };
      if (screen === 'SIGN_UP') {
        dispatch(verificationSignup(params) as any).then((e: any) => {
          if (e?.error) {
            setError(true);
            if (setValid) setValid(false);
          } else {
            setError(false);
            if (setValid) setValid(true);
          }
        });
      } else if (screen === 'SIGN_IN') {
        dispatch(verifyCode(params) as any).then((e: any) => {
          if (e?.error) {
            setError(true);
            if (setValid) setValid(false);
          } else {
            setError(false);
            if (setValid) setValid(true);
          }
        });
      }
    } else {
      if (setValid) {
        setValid(false);
      }
      setError(false);
    }
  }, [value, userId, screen, dispatch, setValid]);
  return (
    <View>
      <CodeField
        ref={ref}
        {...props}
        value={value}
        onChangeText={setValue}
        cellCount={CELL_COUNT}
        rootStyle={styles.codeFieldRoot}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        renderCell={({ index, symbol, isFocused }) => (
          <AppText
            key={index}
            style={[
              styles.cell,
              {
                borderColor: error ? theme.error : (index < value.length || isFocused) ? theme.brand : theme.border,
                color: theme.text,
              },
            ]}
            onLayout={getCellOnLayoutHandler(index)}>
            {symbol || (isFocused ? <Cursor /> : null)}
          </AppText>
        )}
      />
      {!error && !valid && (
        <View style={styles.infoBlock}>
          {/*<Image source={InfoIcon} />*/}
          <AppText style={[styles.infoBlockText, { color: theme.textTertiary }]}>
          Введите код, направленный на email.
          </AppText>
        </View>
      )}
      {error && (
        <View style={styles.infoBlock}>
          {/*<Image source={ErrorIcon} />*/}
          <AppText style={[styles.ErrorBlockText, { color: theme.error }]}>
            Некорректный код. Попробуйте снова.
          </AppText>
        </View>
      )}
    </View>
  );
};

export default VerificationCode;

const styles = StyleSheet.create({
  codeFieldRoot: { marginTop: 24 },
  cell: {
    width: 53,
    height: 52,
    lineHeight: 50,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    textAlign: 'center',
  },
  infoBlock: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 5,
    alignItems: 'center',
  },
  infoBlockText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ErrorBlockText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
