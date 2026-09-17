import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  AppButton,
  AppInput,
  YandexSmartCaptcha,
  YANDEX_SMARTCAPTCHA_SITEKEY,
} from '../../component/UI';
import type { CaptchaStatus } from '../../component/UI/YandexSmartCaptcha';
import { useTheme } from '../../hooks/useTheme';
import { loginUser } from '../../modules/store/actions/auth';
import { ELoginDataType } from '../../types/auth';
import { AppDispatch } from '../../modules/store';
import { TabletCentered } from '../../component/UI/tablet';
import YandexIdButton from '../../component/auth/YandexIdButton';

const LoginScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [emailValid, setEmailValid] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaStatus, setCaptchaStatus] = useState<CaptchaStatus>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captchaRequired = Boolean(YANDEX_SMARTCAPTCHA_SITEKEY);
  /** Keep button tappable when email is valid so reviewers get feedback, not a dead gray control. */
  const buttonDisabled = useMemo(
    () => !emailValid || loading,
    [emailValid, loading],
  );

  const onEmailChange = (value: string) => {
    setEmail(value);
    setError(null);
    setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
  };

  const resetCaptcha = () => {
    setCaptchaToken('');
    setCaptchaResetKey(k => k + 1);
  };

  const onSubmit = async () => {
    if (!emailValid || loading) return;

    if (captchaRequired && !captchaToken) {
      setError(
        captchaStatus === 'error'
          ? 'Обновите капчу и попробуйте снова'
          : 'Пройдите проверку «Я не робот» ниже, затем нажмите «Войти»',
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await dispatch(
        loginUser({
          type: ELoginDataType.email,
          email: email.trim(),
          'smart-token': captchaToken,
          smartToken: captchaToken,
        }),
      );
      if (loginUser.fulfilled.match(result)) {
        const payload = result.payload as any;
        if (
          payload?.error ||
          payload?.message === 'Captcha validation failed'
        ) {
          setError(payload?.message || 'Ошибка капчи');
          resetCaptcha();
          return;
        }
        if (payload?.screen === 'SIGNUP') {
          navigation.navigate('signup', { email: email.trim() });
          return;
        }
        navigation.navigate('verification', {
          email: email.trim(),
          isSignup: false,
        });
      } else {
        setError((result.payload as any)?.message || 'Не удалось отправить код');
        resetCaptcha();
      }
    } catch (e: any) {
      setError(e?.message || 'Ошибка входа');
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 24,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <TabletCentered>
        <View style={styles.header}>
          <AppText style={[styles.title, { color: theme.text }]}>Вход</AppText>
          <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
            Введите ваш email для входа в аккаунт
          </AppText>
        </View>

        <View style={styles.form}>
          <AppInput
            value={email}
            onChange={onEmailChange}
            placeholder="Электронная почта"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            focusBorderColor={theme.brand}
          />

          <View style={styles.infoContainer}>
            <AppText style={[styles.infoText, { color: theme.textTertiary }]}>
              Мы отправим код подтверждения на вашу электронную почту
            </AppText>
          </View>

          <YandexSmartCaptcha
            resetKey={captchaResetKey}
            onTokenChange={token => {
              setCaptchaToken(token);
              if (token) setError(null);
            }}
            onStatusChange={setCaptchaStatus}
          />

          {error ? (
            <AppText style={[styles.errorText, { color: theme.error }]}>
              {error}
            </AppText>
          ) : null}

          <AppButton
            title="Войти"
            onPress={onSubmit}
            disabled={buttonDisabled}
            size="large"
            isProcessing={loading}
          />

          {/* Вход через Яндекс ID — появляется, только если раздел включён на сервере */}
          <YandexIdButton />
        </View>
        </TabletCentered>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
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
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoContainer: {
    marginTop: 0,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});

export default LoginScreen;
