/**
 * Возврат из браузера после входа через Яндекс ID.
 *
 * Слушает deep link totus://auth/yandex?ticket=… (и ?error=…), меняет одноразовый
 * ticket на наши токены и кладёт их в redux тем же setAuth, что и код из письма.
 * У нового пользователя показывает неблокирующий шаг «Почти готово» (телефон).
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
import {
  parseYandexDeepLink,
  updateProfilePhone,
  yandexExchange,
} from '../api/yandexAuth';

type Stage = 'idle' | 'loading' | 'phone' | 'error';

const ERROR_TEXT: Record<string, string> = {
  yandex_email_required:
    'Яндекс не передал адрес почты. Она нужна, чтобы связать вход с вашим аккаунтом Totus Club. Разрешите доступ к почте на странице Яндекса или войдите по email.',
  yandex_access_denied: 'Вы не разрешили доступ на странице Яндекса. Можно попробовать снова или войти по email.',
  user_blocked: 'Доступ к этому аккаунту ограничен. Напишите в поддержку — мы разберёмся.',
  ticket_invalid: 'Ссылка устарела: на подтверждение даётся две минуты. Начните вход заново.',
};

const DEFAULT_ERROR = 'Не получилось войти через Яндекс. Попробуйте ещё раз или войдите по email.';

const YandexAuthBridge: React.FC = () => {
  const {theme} = useTheme();
  const dispatch = useDispatch();
  const handled = useRef<Set<string>>(new Set());

  const [stage, setStage] = useState<Stage>('idle');
  const [errorText, setErrorText] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleUrl = useCallback(
    async (url?: string | null) => {
      if (!url) return;
      const parsed = parseYandexDeepLink(url);
      if (!parsed) return;

      if (parsed.error) {
        setErrorText(ERROR_TEXT[parsed.error] || DEFAULT_ERROR);
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
          setErrorText(ERROR_TEXT.ticket_invalid);
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
        const code = error?.response?.data?.error;
        setErrorText(ERROR_TEXT[code] || DEFAULT_ERROR);
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

  const onSavePhone = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneError('Введите номер целиком');
      return;
    }
    setPhoneError('');
    setSaving(true);
    try {
      const data = await updateProfilePhone(phone);
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
          ? 'Проверьте номер'
          : 'Не удалось сохранить номер',
      );
    } finally {
      setSaving(false);
    }
  };

  if (stage === 'idle') return null;

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
                onChange={setPhone}
                placeholder="+7 999 123-45-67"
                keyboardType="phone-pad"
                focusBorderColor={theme.brand}
              />
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
              <AppText style={[styles.title, {color: theme.text}]}>Не получилось войти</AppText>
              <AppText style={[styles.text, {color: theme.textTertiary}]}>{errorText}</AppText>
              <AppButton title="Понятно" onPress={() => setStage('idle')} size="large" />
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
    fontSize: 22,
    fontWeight: '700',
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: 6,
  },
});

export default YandexAuthBridge;
