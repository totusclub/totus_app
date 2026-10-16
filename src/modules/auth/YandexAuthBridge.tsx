/**
 * Возврат из браузера после входа через Яндекс ID.
 *
 * Слушает deep link totus://auth/yandex?ticket=… (и ?error=…), меняет одноразовый
 * ticket на наши токены и кладёт их в redux тем же setAuth, что и код из письма.
 * У нового пользователя показывает неблокирующий шаг «Почти готово» (телефон, только РФ).
 *
 * Если Яндекс не отдал почту — это не тупик: предлагаем повторить вход с экраном
 * прав (force_confirm) либо сразу войти по email.
 *
 * Ошибку («Не получилось войти») показываем, только если человек так и не вошёл:
 * за одну попытку может прийти и ticket, и запоздалая ссылка с ошибкой (yandexReturn.ts).
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
import {useDispatch, useStore} from 'react-redux';
import {jwtDecode} from 'jwt-decode';
import {AppText, AppButton, AppInput} from '../../component/UI';
import {useTheme} from '../../hooks/useTheme';
import {setAuth} from '../store/slices/auth';
import type {RootState} from '../store';
import {log as crashLog} from '../crashReporting';
import {navigateRoot} from '../../navigation/navigationRef';
import {formatRuPhoneInput, normalizeRuPhone, RU_PHONE_HINT} from '../../utils/phone';
import {
  parseYandexDeepLink,
  updateProfilePhone,
  yandexExchange,
  yandexStartUrl,
} from '../api/yandexAuth';
import {decideYandexLink, shouldShowExchangeError} from './yandexReturn';
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
  const store = useStore<RootState>();
  const handled = useRef<Set<string>>(new Set());
  const exchangesInFlight = useRef(0);

  const [stage, setStage] = useState<Stage>('idle');
  const [errorCode, setErrorCode] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  const isAuthorized = useCallback(() => Boolean(store.getState().auth?.accessToken), [store]);

  const handleUrl = useCallback(
    async (url?: string | null) => {
      if (!url) return;
      const decision = decideYandexLink(parseYandexDeepLink(url), {
        isAuthorized: isAuthorized(),
        exchangeInFlight: exchangesInFlight.current > 0,
        handledTickets: handled.current,
      });

      if (decision.action === 'skip') return;
      if (decision.action === 'ignoreError') {
        crashLog(`Yandex ID: error link ignored (${decision.reason}): ${decision.code}`);
        return;
      }
      if (decision.action === 'showError') {
        crashLog(`Yandex ID: error link: ${decision.code}`);
        setErrorCode(decision.code);
        setStage('error');
        return;
      }

      const ticket = decision.ticket;
      handled.current.add(ticket);
      exchangesInFlight.current += 1;
      setStage('loading');

      let data: Awaited<ReturnType<typeof yandexExchange>>;
      let token: string | undefined;
      let user: ReturnType<typeof jwtDecode>;
      try {
        data = await yandexExchange(ticket);
        token = data?.accessToken || data?.authToken;
        if (!data?.auth || !token) {
          throw Object.assign(new Error('ticket_invalid'), {yandexCode: 'ticket_invalid'});
        }
        user = jwtDecode(token);
      } catch (error: any) {
        exchangesInFlight.current -= 1;
        const code = error?.yandexCode || error?.response?.data?.error || 'yandex_failed';
        if (!shouldShowExchangeError(isAuthorized())) {
          // Вход уже удался другим ticket этой попытки — окно ошибки не показываем.
          crashLog(`Yandex ID: exchange error ignored (authorized): ${code}`);
          setStage(current => (current === 'loading' ? 'idle' : current));
          return;
        }
        crashLog(`Yandex ID: exchange failed: ${code}`);
        setErrorCode(code);
        setStage('error');
        return;
      }
      exchangesInFlight.current -= 1;

      try {
        dispatch(
          setAuth({
            token,
            refreshToken: data.refreshToken ?? null,
            user,
          }),
        );
      } catch (error: any) {
        // Подписчик store упал уже после записи токенов — вход при этом состоялся.
        crashLog(`Yandex ID: setAuth listener failed: ${error?.message || error}`);
        if (!isAuthorized()) {
          setErrorCode('yandex_failed');
          setStage('error');
          return;
        }
      }

      if (data.needsPhone) {
        setStage('phone');
        return;
      }
      setStage('idle');
      // Вход уже состоялся: сбой перехода на «Аккаунт» — не ошибка входа.
      try {
        navigateRoot('tab', {
          screen: 'AccountStackScreen',
          params: {screen: 'account'},
        });
      } catch (error: any) {
        crashLog(`Yandex ID: navigation after sign-in failed: ${error?.message || error}`);
      }
    },
    [dispatch, isAuthorized],
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
