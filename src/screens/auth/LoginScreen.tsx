import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
import { loginUser, signupUser } from '../../modules/store/actions/auth';
import { ELoginDataType } from '../../types/auth';
import { AppDispatch } from '../../modules/store';
import { TabletCentered } from '../../component/UI/tablet';
import { FONT_HEADING } from '../../theme/fonts';

export type AuthMode = 'login' | 'signup';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUBTITLE: Record<AuthMode, string> = {
  login: 'Войдите в аккаунт: пришлём код на почту',
  signup: 'Создайте аккаунт за минуту: имя и почта, без пароля',
};

/**
 * Вход и регистрация на одном экране (вариант A, макет утверждён 30.10.2026):
 * переключатель «Вход / Регистрация», почта общая для обеих вкладок.
 * Капча появляется ПОСЛЕ нажатия кнопки и, как только пройдена, сама отправляет запрос —
 * дальше экран подтверждения кода. Почта не найдена при входе → вкладка «Регистрация»
 * с подсказкой; почта уже есть при регистрации → вкладка «Вход» с подсказкой.
 */
export const AuthScreen = ({ initialMode = 'login' }: { initialMode?: AuthMode }) => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState<string>(route.params?.email || '');
  const [notice, setNotice] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [captchaStatus, setCaptchaStatus] = useState<CaptchaStatus>('loading');
  // Капча прокручивает форму к заданию Яндекса (картинка, поле, «Отправить» — над клавиатурой).
  const scrollRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';
  const captchaRequired = Boolean(YANDEX_SMARTCAPTCHA_SITEKEY);
  const emailValid = EMAIL_RE.test(email.trim());
  const formReady = emailValid && (!isSignup || Boolean(name.trim()));
  const buttonDisabled = useMemo(() => !formReady || loading, [formReady, loading]);

  const resetCaptcha = () => {
    setCaptchaToken('');
    setCaptchaResetKey(k => k + 1);
  };

  const switchMode = (next: AuthMode, message: string | null = null) => {
    setMode(next);
    setNotice(message);
    setError(null);
    setCaptchaVisible(false);
    resetCaptcha();
  };

  const onEmailChange = (value: string) => {
    setEmail(value);
    setError(null);
    setNotice(null);
  };

  const onNameChange = (value: string) => {
    setName(value);
    setError(null);
  };

  const submitLogin = async (token: string) => {
    const cleanEmail = email.trim();
    const result = await dispatch(
      loginUser({
        type: ELoginDataType.email,
        email: cleanEmail,
        'smart-token': token,
        smartToken: token,
      }),
    );
    if (loginUser.fulfilled.match(result)) {
      const payload = result.payload as any;
      if (payload?.error || payload?.message === 'Captcha validation failed') {
        setError(payload?.message || 'Ошибка капчи');
        resetCaptcha();
        return;
      }
      if (payload?.screen === 'SIGNUP') {
        // Почты нет — та же форма на вкладке «Регистрация», почта уже заполнена.
        switchMode(
          'signup',
          `Аккаунта с почтой ${cleanEmail} пока нет. Укажите имя, и мы его создадим.`,
        );
        return;
      }
      navigation.navigate('verification', { email: cleanEmail, isSignup: false });
    } else {
      setError((result.payload as any)?.message || 'Не удалось отправить код');
      resetCaptcha();
    }
  };

  const submitSignup = async (token: string) => {
    const cleanEmail = email.trim();
    const result = await dispatch(
      signupUser({
        name: name.trim(),
        email: cleanEmail,
        'smart-token': token,
        smartToken: token,
      }),
    );
    if (signupUser.fulfilled.match(result)) {
      const payload = result.payload as any;
      if (!payload?.screen) {
        setError(payload?.message || 'Ошибка регистрации');
        resetCaptcha();
        return;
      }
      navigation.navigate('verification', { email: cleanEmail, isSignup: true });
    } else {
      const message = (result.payload as any)?.message;
      if (message === 'Email already exists') {
        // Почта уже зарегистрирована — та же форма на вкладке «Вход».
        switchMode('login', `Аккаунт с почтой ${cleanEmail} уже есть. Войдите: пришлём код на почту.`);
        return;
      }
      setError(message || 'Не удалось зарегистрироваться');
      resetCaptcha();
    }
  };

  const submit = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      if (isSignup) {
        await submitSignup(token);
      } else {
        await submitLogin(token);
      }
    } catch (e: any) {
      setError(e?.message || (isSignup ? 'Ошибка регистрации' : 'Ошибка входа'));
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!formReady || loading) return;

    // Капча нужна — показываем её; запрос уйдёт сам после прохождения.
    if (captchaRequired && !captchaToken) {
      setCaptchaVisible(true);
      setError(
        captchaStatus === 'error' && captchaVisible
          ? 'Обновите капчу и попробуйте снова'
          : null,
      );
      return;
    }

    await submit(captchaToken);
  };

  // Капча пройдена после нажатия кнопки — отправляем без второго нажатия.
  useEffect(() => {
    if (!captchaVisible || !captchaToken || loading || !formReady) return;
    void submit(captchaToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captchaToken, captchaVisible]);

  const segmentBackground = theme.backgroundSecondary;
  const segmentActive = isDark ? theme.border : theme.surface;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
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
          <AppText style={[styles.logo, { color: theme.brand }]}>TOTUS CLUB</AppText>
          <AppText style={[styles.title, { color: theme.text }]}>Добро пожаловать</AppText>
        </View>

        <View
          style={[styles.segment, { backgroundColor: segmentBackground }]}
          accessibilityRole="tablist">
          {(['login', 'signup'] as AuthMode[]).map(item => {
            const active = mode === item;
            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  if (!active) switchMode(item);
                }}
                style={[
                  styles.segmentItem,
                  active && [styles.segmentItemActive, { backgroundColor: segmentActive }],
                ]}>
                <AppText
                  style={[
                    styles.segmentText,
                    { color: active ? theme.text : theme.textTertiary },
                  ]}>
                  {item === 'login' ? 'Вход' : 'Регистрация'}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.form}>
          {notice ? (
            <View style={[styles.notice, { backgroundColor: 'rgba(254, 115, 46, 0.12)' }]}>
              <AppText style={[styles.noticeText, { color: theme.text }]}>{notice}</AppText>
            </View>
          ) : (
            <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
              {SUBTITLE[mode]}
            </AppText>
          )}

          {isSignup ? (
            <AppInput
              value={name}
              onChange={onNameChange}
              placeholder="Имя"
              focusBorderColor={theme.brand}
            />
          ) : null}

          <AppInput
            value={email}
            onChange={onEmailChange}
            placeholder="Электронная почта"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            focusBorderColor={theme.brand}
          />

          {captchaVisible ? (
            <>
              <AppText style={[styles.infoText, { color: theme.textTertiary }]}>
                Подтвердите, что вы не робот — и мы отправим код на почту
              </AppText>
              <YandexSmartCaptcha
                resetKey={captchaResetKey}
                scrollRef={scrollRef}
                onTokenChange={token => {
                  setCaptchaToken(token);
                  if (token) setError(null);
                }}
                onStatusChange={setCaptchaStatus}
              />
            </>
          ) : null}

          {error ? (
            <AppText style={[styles.errorText, { color: theme.error }]}>
              {error}
            </AppText>
          ) : null}

          <AppButton
            title={isSignup ? 'Создать аккаунт' : 'Войти'}
            onPress={onSubmit}
            disabled={buttonDisabled}
            size="large"
            isProcessing={loading}
          />
        </View>

        <TouchableOpacity
          onPress={() => switchMode(isSignup ? 'login' : 'signup')}
          style={styles.link}
          accessibilityRole="button">
          <AppText style={[styles.linkText, { color: theme.textTertiary }]}>
            {isSignup ? (notice ? 'Ошиблись почтой? ' : 'Уже есть аккаунт? ') : 'Нет аккаунта? '}
            <AppText style={[styles.linkText, styles.linkAccent, { color: theme.brand }]}>
              {isSignup ? (notice ? 'Войти с другой' : 'Войти') : 'Зарегистрироваться'}
            </AppText>
          </AppText>
        </TouchableOpacity>
        </TabletCentered>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const LoginScreen = () => <AuthScreen initialMode="login" />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
    gap: 8,
  },
  logo: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    letterSpacing: 2.8,
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 28,
    fontWeight: '700',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentItemActive: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  notice: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  link: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  linkAccent: {
    fontWeight: '700',
  },
});

export default LoginScreen;
