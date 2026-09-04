import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppText, AppButton, VerificationCode } from '../UI';
import { verifyCode, loginUser } from '../../modules/store/actions/auth';
import { RootState } from '../../modules/store';
import { ELoginDataType } from '../../types/auth';
import { setAuth } from '../../modules/store/slices/auth';
import { jwtDecode } from 'jwt-decode';
import { useTheme } from '../../hooks/useTheme';
import { maybePromptAndroidVoipPowerSetup } from '../../modules/voip/AndroidPowerManager';
import { TabletCentered } from '../UI/tablet';

type VerificationRouteParams = {
  email: string;
  isSignup?: boolean;
  returnTo?: string; // Screen to navigate to after verification
  returnParams?: any; // Params for the return screen
};

type VerificationRoute = RouteProp<
  {
    verification: VerificationRouteParams;
  },
  'verification'
>;

export const Verification: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<VerificationRoute>();
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const { userId, loading } = useSelector((state: RootState) => state.auth);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [valid, setValid] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { email, isSignup = false, returnTo, returnParams } = route.params || {
    email: '',
    isSignup: false,
    returnTo: undefined,
    returnParams: undefined,
  };

  const handleComplete = useCallback(async (fullCode: string) => {
    if (!email) {
      setError('Ошибка: Email не найден');
      return;
    }

    try {
      setError(null);

      const result = await dispatch(
        verifyCode({
          email: email,
          code: fullCode,
        }) as any,
      );

      if (verifyCode.fulfilled.match(result)) {
        const data = result.payload;

        // Check if auth is true (like web code: if(data.auth))
        if (data?.auth && data?.authToken) {
          // Decode token and set auth (like web code)
          const user = jwtDecode(data.authToken);

          dispatch(setAuth({
            token: data.accessToken || data.authToken,
            refreshToken: data.refreshToken ?? null,
            user,
          }));
          void maybePromptAndroidVoipPowerSetup('first_login');

          // Navigate to return screen if specified, otherwise navigate to account
          if (returnTo) {
            // Handle nested navigation for account screen (inside Tab navigator)
            if (returnTo === 'account') {
              navigation.navigate('tab', {
                screen: 'AccountStackScreen',
                params: {
                  screen: 'account',
                  ...returnParams,
                },
              });
            } else {
              navigation.navigate(returnTo, returnParams || {});
            }
          } else {
            navigation.navigate('tab', {
              screen: 'AccountStackScreen',
              params: {
                screen: 'account',
              },
            });
          }
        } else {
          setValid(true);
        }
      } else {
        setValid(true);
        setError('Некорректный код. Попробуйте снова.');
      }
    } catch (err: any) {
      setValid(true);
      setError(err?.message || 'Произошла ошибка');
    }
  }, [email, returnTo, returnParams, dispatch, navigation]);

  useEffect(() => {
    if (secondsLeft === 0) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  const handleResendCode = async () => {
    if (!email) return;

    try {
      setError(null);
      setValid(false);

      let result;
      if (isSignup) {
        // For signup resend, we need to call signupUser again
        // But we don't have the signup data here, so we'll just show an error
        setError('Для повторной отправки кода вернитесь на экран регистрации');
        return;
      } else {
        result = await dispatch(
          loginUser({
            type: ELoginDataType.email,
            email: email,
          }) as any,
        );
      }

      if (loginUser.fulfilled.match(result)) {
        setSecondsLeft(60);
      } else {
        setError(result.payload?.message || 'Ошибка при повторной отправке кода');
      }
    } catch (err: any) {
      setError(err?.message || 'Произошла ошибка');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <TabletCentered>
        <View style={styles.header}>
          <AppText style={[styles.title, { color: theme.text }]}>Подтверждение</AppText>
          <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
            Введите код, направленный на {email}
          </AppText>
        </View>

        <View style={styles.form}>
          <VerificationCode
            setValid={setValid}
            valid={valid}
            screen={isSignup ? "SIGN_UP" : "SIGN_IN"}
            onComplete={handleComplete}
          />

          {error && (
            <View style={styles.errorContainer}>
              <AppText style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
            </View>
          )}

          <View style={styles.resendContainer}>
            {secondsLeft > 0 ? (
              <AppText style={[styles.resendText, { color: theme.textTertiary }]}>
                Выслать код повторно через {secondsLeft} сек.
              </AppText>
            ) : (
              <AppButton
                title="Отправить код повторно"
                onPress={handleResendCode}
                size="sm"
                type="transparent"
              />
            )}
          </View>
        </View>
        </TabletCentered>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  errorContainer: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  resendContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});

