import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
import { signupUser } from '../../modules/store/actions/auth';
import { AppDispatch } from '../../modules/store';

type SignupRoute = RouteProp<{ signup: { email?: string } }, 'signup'>;

const SignupScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<SignupRoute>();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(route.params?.email || '');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaStatus, setCaptchaStatus] = useState<CaptchaStatus>('loading');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captchaRequired = Boolean(YANDEX_SMARTCAPTCHA_SITEKEY);
  const formReady = Boolean(name.trim()) && Boolean(email.trim());
  const buttonDisabled = useMemo(
    () => !formReady || loading,
    [formReady, loading],
  );

  const resetCaptcha = () => {
    setCaptchaToken('');
    setCaptchaResetKey(k => k + 1);
  };

  const onSubmit = async () => {
    if (!formReady || loading) return;

    if (captchaRequired && !captchaToken) {
      setError(
        captchaStatus === 'error'
          ? 'Обновите капчу и попробуйте снова'
          : 'Пройдите проверку «Я не робот» ниже, затем нажмите «Продолжить»',
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await dispatch(
        signupUser({
          name: name.trim(),
          email: email.trim(),
          'smart-token': captchaToken,
          smartToken: captchaToken,
        }),
      );
      if (signupUser.fulfilled.match(result)) {
        const payload = result.payload as any;
        if (!payload?.screen) {
          setError(payload?.message || 'Ошибка регистрации');
          resetCaptcha();
          return;
        }
        navigation.navigate('verification', {
          email: email.trim(),
          isSignup: true,
        });
      } else {
        setError(
          (result.payload as any)?.message || 'Не удалось зарегистрироваться',
        );
        resetCaptcha();
      }
    } catch (e: any) {
      setError(e?.message || 'Ошибка регистрации');
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
        <AppText style={[styles.title, { color: theme.text }]}>
          Регистрация
        </AppText>
        <View style={styles.form}>
          <AppInput
            value={name}
            onChange={setName}
            placeholder="Имя"
            focusBorderColor={theme.brand}
          />
          <AppInput
            value={email}
            onChange={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Электронная почта"
            autoComplete="email"
            focusBorderColor={theme.brand}
          />

          <YandexSmartCaptcha
            resetKey={captchaResetKey}
            onTokenChange={token => {
              setCaptchaToken(token);
              if (token) setError(null);
            }}
            onStatusChange={setCaptchaStatus}
          />

          {error ? (
            <AppText style={{ color: theme.error }}>{error}</AppText>
          ) : null}

          <AppButton
            title="Продолжить"
            onPress={onSubmit}
            disabled={buttonDisabled}
            size="large"
            isProcessing={loading}
          />
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('login')}
          style={styles.link}>
          <AppText style={{ color: theme.brand }}>Уже есть аккаунт</AppText>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  form: { gap: 16 },
  link: { marginTop: 20, alignItems: 'center' },
});

export default SignupScreen;
