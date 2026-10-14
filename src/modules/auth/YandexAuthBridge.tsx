/**
 * Возврат из браузера после входа через Яндекс ID.
 *
 * Слушает deep link totus://auth/yandex?ticket=… (и ?error=…), меняет одноразовый
 * ticket на наши токены и кладёт их в redux тем же setAuth, что и код из письма.
 * У нового пользователя показывает неблокирующий шаг «Почти готово» (телефон, только РФ).
 *
 * Если Яндекс не отдал почту — это не тупик: предлагаем повторить вход с экраном
 * прав (force_confirm) либо сразу войти по email.
 * Макеты: claude/YANDEX_AUTH_DESIGN_RU.md.
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {useDispatch} from 'react-redux';
import {jwtDecode} from 'jwt-decode';
import {AppText, AppButton, AppInput} from '../../component/UI';
import {useTheme} from '../../hooks/useTheme';
import {setAuth} from '../store/slices/auth';
import {navigateRoot} from '../../navigation/navigationRef';
import {formatRuPhoneInput, normalizeRuPhone, RU_PHONE_HINT} from '../../utils/phone';
import {
  parseYandexDeepLink,
  updateProfilePhone,
  yandexExchange,
  yandexStartUrl,
} from '../api/yandexAuth';
import { FONT_HEADING } from '../../theme/fonts';

type Stage = 'idle' | 'loading' | 'phone' | 'error';

const ERROR_TEXT: Record<string, string> = {
  yandex_email_required:
    'Яндекс не передал адрес почты. Она нужна, чтобы связать вход с вашим аккаунтом Totus Club. Можно вернуться на страницу Яндекса и разрешить доступ — или войти по email.',
  yandex_access_denied: 'Вы не разрешили доступ на странице Яндекса. Можно попробовать снова или войти по email.',
  ticket_invalid: 'Ссылка устарела: на подтверждение даётся две минуты. Начните вход заново.',
};

const DEFAULT_ERROR = 'Не получилось войти через Яндекс. Попробуйте ещё раз или войдите по email.';

const YandexAuthBridge: React.FC = () => {
  const {theme} = useTheme();
  const dispatch = useDispatch();
  const handled = useRef<Set<string>>(new Set());

  const [stage, setStage] = useState<Stage>('idle');
  const [errorCode, setErrorCode] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUrl = useCallback(
    async (url?: string | null) => {
      if (!url) return;
      const parsed = parseYandexDeepLink(url);
      if (!parsed) return;

      if (parsed.error) {
        setErrorCode(parsed.error);
        setStage('error');
        return;
      }
      const ticket = parsed.ticket;
      if (!ticket || handled.current.has(ticket)) return;
      handled.current.add(ticket);

      setStage('loading');
      try {
        const data = await yandexExchange(ticket);
        const token = data.accessToken || data.authToken;
        if (!data?.auth || !token) {
          setErrorCode('ticket_invalid');
          setStage('error');
          return;
        }
        const user = jwtDecode(token);
        dispatch(
          setAuth({
            token,
            refreshToken: data.refreshToken ?? null,
            user,
          }),
        );

        if (data.needsPhone) {
          setStage('phone');
          return;
        }
        setStage('idle');
        navigateRoot('tab', {
          screen: 'AccountStackScreen',
          params: {screen: 'account'},
        });
      } catch (error: any) {
        setErrorCode(error?.response?.data?.error || 'yandex_failed');
        setStage('error');
      }
    },
    [dispatch],
  );

  useEffect(() => {
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({url}) => handleUrl(url));
    return () => subscription.remove();
  }, [handleUrl]);

  const goAccount = () => {
    setStage('idle');
    navigateRoot('tab', {
      screen: 'AccountStackScreen',
      params: {screen: 'account'},
    });
  };

  /** Повтор входа: с force Яндекс снова покажет экран прав, где можно выдать почту. */
  const retryYandex = (force: boolean) => {
    setStage('idle');
    Linking.openURL(yandexStartUrl({force})).catch(() => undefined);
  };

  const goEmailLogin = () => {
    setStage('idle');
    navigateRoot('tab', {
      screen: 'AccountStackScreen',
      params: {screen: 'login'},
    });
  };

  const onPhoneChange = (value: string) => {
    setPhone(formatRuPhoneInput(value));
    if (phoneError) setPhoneError('');
  };

  const onSavePhone = async () => {
    const normalized = normalizeRuPhone(phone);
    if (!normalized) {
      setPhoneError(RU_PHONE_HINT);
      return;
    }
    setPhoneError('');
    setSaving(true);
    try {
      const data = await updateProfilePhone(normalized);
      const token = data?.accessToken || data?.authToken;
      if (token) {
        dispatch(
          setAuth({
            token,
            refreshToken: data?.refreshToken ?? null,
            user: jwtDecode(token),
          }),
        );
      }
      goAccount();
    } catch (error: any) {
      setPhoneError(
        error?.response?.data?.error === 'phone_invalid'
          ? error?.response?.data?.message || RU_PHONE_HINT
          : 'Не удалось сохранить номер',
      );
    } finally {
      setSaving(false);
    }
  };

  if (stage === 'idle') return null;

  const needsEmailPermission = errorCode === 'yandex_email_required';
  const errorText = ERROR_TEXT[errorCode] || DEFAULT_ERROR;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setStage('idle')}>
      <View style={styles.overlay}>
        <View style={[styles.card, {backgroundColor: theme.surface}]}>
          {stage === 'loading' ? (
            <>
              <ActivityIndicator color={theme.brand} />
              <AppText style={[styles.title, {color: theme.text}]}>Завершаем вход…</AppText>
              <AppText style={[styles.text, {color: theme.textTertiary}]}>
                Проверяем ответ Яндекс ID. Это занимает пару секунд.
              </AppText>
            </>
          ) : null}

          {stage === 'phone' ? (
            <>
              <AppText style={[styles.title, {color: theme.text}]}>Почти готово</AppText>
              <AppText style={[styles.text, {color: theme.textTertiary}]}>
                Добавьте телефон — он нужен для оформления заказа и связи по бронированию.
              </AppText>
              <AppInput
                value={phone}
                onChange={onPhoneChange}
                placeholder="+7 999 123-45-67"
                keyboardType="phone-pad"
                maxLength={18}
                focusBorderColor={theme.brand}
              />
              <AppText style={[styles.hint, {color: theme.textTertiary}]}>
                Только российские номера: +7 или 8
              </AppText>
              {phoneError ? (
                <AppText style={[styles.text, {color: theme.error}]}>{phoneError}</AppText>
              ) : null}
              <AppButton
                title="Сохранить"
                onPress={onSavePhone}
                size="large"
                isProcessing={saving}
              />
              <Pressable onPress={goAccount} style={styles.skip}>
                <AppText style={[styles.text, {color: theme.textTertiary}]}>Пропустить</AppText>
              </Pressable>
            </>
          ) : null}

          {stage === 'error' ? (
            <>
              <AppText style={[styles.title, {color: theme.text}]}>
                {needsEmailPermission ? 'Нужен доступ к почте' : 'Не получилось войти'}
              </AppText>
              <AppText style={[styles.text, {color: theme.textTertiary}]}>{errorText}</AppText>
              <AppButton
                title={needsEmailPermission ? 'Разрешить доступ к почте' : 'Попробовать снова'}
                onPress={() => retryYandex(needsEmailPermission)}
                size="large"
              />
              {needsEmailPermission ? (
                <AppText style={[styles.hint, {color: theme.textTertiary}]}>
                  На странице Яндекса отметьте «Адрес электронной почты» и нажмите «Разрешить».
                </AppText>
              ) : null}
              <AppButton title="Войти по email" onPress={goEmailLogin} size="large" type="transparent" />
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(20,20,20,0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    gap: 14,
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 22,
    fontWeight: '700',
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -8,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: 6,
  },
});

export default YandexAuthBridge;
