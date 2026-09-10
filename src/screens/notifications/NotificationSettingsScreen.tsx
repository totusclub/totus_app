import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {jwtDecode} from 'jwt-decode';
import {AppIcon, AppText} from '../../component/UI';
import {TabletCentered} from '../../component/UI/tablet';
import {useTheme} from '../../hooks/useTheme';
import type {AppDispatch, RootState} from '../../modules/store';
import {fetchSettings, setSettingsLocal, updateSettings} from '../../modules/store/slices/notifications';
import type {NotificationCategory} from '../../modules/api/notifications';
import {CATEGORY_SETTINGS, DEFAULT_PREFS, PUSH_TEXTS} from '../../modules/push/pushConstants';
import {
  getDeviceName,
  getPushStatus,
  openSystemNotificationSettings,
  registerPushDevice,
  requestPushPermission,
  unregisterPushDevice,
} from '../../modules/push/pushService';
import CategoryIcon from '../../component/notifications/CategoryIcon';

type SwitchRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
};

const SwitchRow: React.FC<SwitchRowProps> = ({title, subtitle, value, disabled, onChange, last}) => {
  const {theme, isDark} = useTheme();
  return (
    <>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <AppText style={[styles.rowTitle, {color: disabled ? theme.textTertiary : theme.text}]}>{title}</AppText>
          {subtitle ? (
            <AppText style={[styles.rowSubtitle, {color: theme.textTertiary}]}>{subtitle}</AppText>
          ) : null}
        </View>
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={onChange}
          trackColor={{
            false: isDark ? '#3A3A3C' : '#E5E5EA',
            true: disabled ? (isDark ? '#5A5A5A' : '#B8B8B8') : theme.brand,
          }}
          thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isDark ? '#F2F2F7' : '#FFFFFF'}
          style={styles.switch}
        />
      </View>
      {!last ? <View style={[styles.hairline, {backgroundColor: theme.border}]} /> : null}
    </>
  );
};

/**
 * Экран «Настройки уведомлений» (AccountStackScreen → notificationSettings), DESIGN.md:
 * карточка статуса разрешения, «ЧТО ПРИСЫЛАТЬ» (категории; обязательные — недоступны),
 * пояснение, «КАНАЛЫ» (push на этом устройстве, электронная почта).
 */
const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const {theme} = useTheme();
  const {accessToken, fullAuth, user} = useSelector((state: RootState) => state.auth);
  const {settings, settingsLoading, settingsError, permission, registered} = useSelector(
    (state: RootState) => state.notifications,
  );
  const [pushBusy, setPushBusy] = useState(false);
  /** Local switch value while register/unregister is in flight (avoids snap-back). */
  const [optimisticPush, setOptimisticPush] = useState<boolean | null>(null);
  const pendingEnableRef = useRef(false);

  const isLoggedIn = Boolean(fullAuth && accessToken);
  const pushEnabled = permission === 'granted' && registered;
  const displayPush = optimisticPush ?? pushEnabled;

  useEffect(() => {
    if (!isLoggedIn) {
      navigation.navigate('login', {
        returnTo: 'notificationSettings',
        returnParams: route.params || {},
      });
    }
  }, [isLoggedIn, navigation, route.params]);

  useEffect(() => {
    if (!isLoggedIn) return;
    dispatch(fetchSettings());
    getPushStatus().catch(() => undefined);
  }, [dispatch, isLoggedIn]);

  // Clear optimistic flag once Redux matches what the user wanted.
  useEffect(() => {
    if (optimisticPush === null) return;
    if (optimisticPush === pushEnabled) setOptimisticPush(null);
  }, [optimisticPush, pushEnabled]);

  // After OS settings: if user was enabling push and now granted — register device.
  useEffect(() => {
    if (!isLoggedIn) return;

    const onAppState = (next: AppStateStatus) => {
      if (next !== 'active') return;
      void (async () => {
        const status = await getPushStatus().catch(() => null);
        if (!status) return;
        if (pendingEnableRef.current && status.permission === 'granted') {
          pendingEnableRef.current = false;
          setPushBusy(true);
          setOptimisticPush(true);
          try {
            const ok = await registerPushDevice();
            await getPushStatus();
            if (!ok) {
              setOptimisticPush(false);
              Alert.alert(
                'Не удалось включить Push',
                'Разрешение есть, но устройство не зарегистрировалось. Проверьте интернет и попробуйте снова.',
              );
            }
          } finally {
            setPushBusy(false);
          }
        }
      })();
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [isLoggedIn]);

  const email: string = React.useMemo(() => {
    const fromState = (user as {email?: string} | null)?.email;
    if (fromState) return fromState;
    if (!accessToken) return '';
    try {
      return jwtDecode<{email?: string}>(accessToken)?.email || '';
    } catch {
      return '';
    }
  }, [accessToken, user]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('account');
  }, [navigation]);

  const handleCategory = useCallback(
    (key: NotificationCategory, value: boolean) => {
      dispatch(setSettingsLocal({prefs: {[key]: value}}));
      dispatch(updateSettings({prefs: {[key]: value}}));
    },
    [dispatch],
  );

  const handleEmail = useCallback(
    (value: boolean) => {
      dispatch(setSettingsLocal({email: value}));
      dispatch(updateSettings({email: value}));
    },
    [dispatch],
  );

  const enablePush = useCallback(async () => {
    setPushBusy(true);
    setOptimisticPush(true);
    try {
      // Always re-read OS permission (stale Redux value broke re-enable after OFF).
      const status = await getPushStatus();

      if (status.permission === 'denied') {
        pendingEnableRef.current = true;
        setOptimisticPush(null);
        Alert.alert(
          'Разрешите уведомления',
          'В системных настройках включите уведомления для Totus, затем вернитесь в приложение — Push включится автоматически.',
          [
            {text: 'Отмена', style: 'cancel', onPress: () => { pendingEnableRef.current = false; }},
            {text: 'Открыть настройки', onPress: () => { void openSystemNotificationSettings(); }},
          ],
        );
        return;
      }

      if (status.permission !== 'granted') {
        const next = await requestPushPermission();
        await getPushStatus();
        if (next !== 'granted') {
          setOptimisticPush(false);
          pendingEnableRef.current = true;
          Alert.alert(
            'Push не включён',
            'Нужно разрешение на уведомления. Можно включить в системных настройках.',
            [
              {text: 'Отмена', style: 'cancel', onPress: () => { pendingEnableRef.current = false; }},
              {text: 'Настройки', onPress: () => { void openSystemNotificationSettings(); }},
            ],
          );
        }
        return;
      }

      const ok = await registerPushDevice();
      await getPushStatus();
      if (!ok) {
        setOptimisticPush(false);
        Alert.alert(
          'Не удалось включить Push',
          'Проверьте интернет и попробуйте снова.',
        );
      }
    } finally {
      setPushBusy(false);
    }
  }, []);

  const handleDevicePush = useCallback(
    async (value: boolean) => {
      if (value) {
        await enablePush();
        return;
      }
      pendingEnableRef.current = false;
      setPushBusy(true);
      setOptimisticPush(false);
      try {
        await unregisterPushDevice();
        await getPushStatus();
      } finally {
        setPushBusy(false);
      }
    },
    [enablePush],
  );

  if (!isLoggedIn) {
    return null;
  }

  const prefs = {...DEFAULT_PREFS, ...(settings?.prefs || {})};
  const deviceName = getDeviceName();

  return (
    <View style={[styles.container, {backgroundColor: theme.backgroundSecondary, paddingTop: insets.top}]}>
      <View style={[styles.header, {backgroundColor: theme.background, borderBottomColor: theme.border}]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          accessibilityRole="button"
          accessibilityLabel="Назад">
          <AppIcon name="simpleArrow" size={24} color={theme.text} />
        </TouchableOpacity>
        <AppText style={[styles.title, {color: theme.text}]} numberOfLines={1}>
          {PUSH_TEXTS.settingsTitle}
        </AppText>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + 24}]}
        showsVerticalScrollIndicator={false}>
        <TabletCentered>
          {/* Статус разрешения */}
          <TouchableOpacity
            style={[styles.card, styles.statusCard, {backgroundColor: theme.cardBackground, borderColor: theme.borderLight}]}
            onPress={displayPush ? openSystemNotificationSettings : enablePush}
            disabled={pushBusy}
            activeOpacity={0.7}
            accessibilityRole="button">
            <CategoryIcon
              kind={displayPush ? 'check' : 'bellOff'}
              color={displayPush ? theme.success : theme.warning}
              size={44}
            />
            <View style={styles.rowText}>
              <AppText style={[styles.rowTitle, {color: theme.text}]}>
                {displayPush ? PUSH_TEXTS.pushOnTitle : PUSH_TEXTS.pushOffTitle}
              </AppText>
              <AppText style={[styles.rowSubtitle, {color: theme.textTertiary}]}>
                {displayPush
                  ? `${deviceName} · ${PUSH_TEXTS.pushOnSubtitle}`
                  : permission === 'denied'
                    ? 'Разрешите уведомления в системных настройках'
                    : 'Сообщим об оплате, документах и вылете'}
              </AppText>
            </View>
            {displayPush ? (
              <AppIcon name="arrowRight" size={14} color={theme.textTertiary} />
            ) : (
              <View style={[styles.enableButton, {backgroundColor: theme.brand}]}>
                {pushBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <AppText style={styles.enableText}>{PUSH_TEXTS.enable}</AppText>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Что присылать */}
          <AppText style={[styles.sectionTitle, {color: theme.textTertiary}]}>{PUSH_TEXTS.sectionWhat}</AppText>
          <View style={[styles.card, {backgroundColor: theme.cardBackground, borderColor: theme.borderLight}]}>
            {settingsLoading && !settings ? (
              <View style={styles.loader}>
                <ActivityIndicator color={theme.textTertiary} />
              </View>
            ) : (
              CATEGORY_SETTINGS.map((item, index) => (
                <SwitchRow
                  key={item.key}
                  title={item.title}
                  subtitle={item.subtitle}
                  value={item.mandatory ? true : Boolean(prefs[item.key])}
                  disabled={item.mandatory || !settings}
                  onChange={value => handleCategory(item.key, value)}
                  last={index === CATEGORY_SETTINGS.length - 1}
                />
              ))
            )}
          </View>
          <AppText style={[styles.hint, {color: theme.textTertiary}]}>{PUSH_TEXTS.settingsHint}</AppText>
          {settingsError ? (
            <AppText style={[styles.hint, {color: theme.error}]}>{settingsError}</AppText>
          ) : null}

          {/* Каналы */}
          <AppText style={[styles.sectionTitle, {color: theme.textTertiary}]}>{PUSH_TEXTS.sectionChannels}</AppText>
          <View style={[styles.card, {backgroundColor: theme.cardBackground, borderColor: theme.borderLight}]}>
            <SwitchRow
              title={PUSH_TEXTS.channelPushTitle}
              subtitle={deviceName}
              value={displayPush}
              disabled={pushBusy}
              onChange={value => void handleDevicePush(value)}
            />
            <SwitchRow
              title={PUSH_TEXTS.channelEmailTitle}
              subtitle={email ? `${email} · ${PUSH_TEXTS.channelEmailSubtitle}` : PUSH_TEXTS.channelEmailSubtitle}
              value={Boolean(settings?.email)}
              disabled={!settings}
              onChange={handleEmail}
              last
            />
          </View>
        </TabletCentered>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginTop: 8,
    marginLeft: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 52,
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 12,
  },
  switch: {
    transform: Platform.OS === 'ios' ? [{scaleX: 0.82}, {scaleY: 0.78}] : [{scaleX: 0.85}, {scaleY: 0.85}],
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 12,
    marginTop: 4,
  },
  loader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  enableButton: {
    height: 36,
    minWidth: 96,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationSettingsScreen;
