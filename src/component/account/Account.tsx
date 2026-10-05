import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  StatusBar,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { AppText, AppIcon } from '../../component/UI';
import { RootState } from '../../modules/store';
import { logoutReducer } from '../../modules/store/slices/auth';
import { jwtDecode } from 'jwt-decode';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoyaltyCardBackground from '../../component/UI/icons/loyaltyCardBackground';
import { useTheme } from '../../hooks/useTheme';
import {
  startOutgoingVoiceCallByLoyaltyId,
  getCurrentDeviceId,
  getCallState,
  cleanupVoipOnLogout,
} from '../../modules/voip/VoipService';
import { getUserById } from '../../modules/api/users';
import { useLayout } from '../../hooks/useLayout';
import { TabletColumns } from '../../component/UI/tablet';

// Support team loyalty ID / phone — shared with the support chat (src/modules/support/supportConstants.ts)
import {
  SUPPORT_LOYALTY_ID,
  SUPPORT_DISPLAY_NAME,
  SUPPORT_PHONE_NUMBER,
  SUPPORT_CHAT_ROUTE,
} from '../../modules/support/supportConstants';
import { disconnectSupportSocket } from '../../modules/support/supportSocket';
// Push-уведомления: строка «Уведомления» и снятие устройства при выходе (src/modules/push)
import { NOTIFICATIONS_ROUTE, PUSH_TEXTS } from '../../modules/push/pushConstants';
import { unregisterPushDevice } from '../../modules/push/pushService';
import { NotificationGlyph } from '../../component/notifications/CategoryIcon';
// «Документы» ООО «ТОТУСКЛАБ» (тексты из CMS): src/screens/legal
import { LEGAL_DOCUMENTS_ROUTE } from '../../screens/legal/legalRoutes';

type DecodedToken = {
  id?: string;
  name?: string;
  l_name?: string;
  loyalty_id?: string;
  email?: string;
  [key: string]: any;
};

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  subtext?: string;
  cancelLabel?: string;
  confirmLabel: string;
  confirmColor: string;
  onClose: () => void;
  onConfirm: () => void;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  subtext,
  cancelLabel = 'Отмена',
  confirmLabel,
  confirmColor,
  onClose,
  onConfirm,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={confirmStyles.root}>
        <TouchableOpacity
          style={[confirmStyles.overlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            confirmStyles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <View style={[confirmStyles.handle, { backgroundColor: theme.border }]} />

          <View style={[confirmStyles.header, { borderBottomColor: theme.borderLight }]}>
            <AppText style={[confirmStyles.title, { color: theme.text }]}>{title}</AppText>
          </View>

          <View style={confirmStyles.body}>
            <AppText style={[confirmStyles.message, { color: theme.text }]}>{message}</AppText>
            {subtext ? (
              <AppText style={[confirmStyles.subtext, { color: theme.textTertiary }]}>
                {subtext}
              </AppText>
            ) : null}
          </View>

          <View style={confirmStyles.footer}>
            <TouchableOpacity
              style={[
                confirmStyles.button,
                {
                  backgroundColor: theme.backgroundTertiary,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.75}>
              <AppText style={[confirmStyles.buttonText, { color: theme.text }]}>
                {cancelLabel}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[confirmStyles.button, { backgroundColor: confirmColor }]}
              onPress={onConfirm}
              activeOpacity={0.75}>
              <AppText style={[confirmStyles.buttonText, { color: theme.textInverse }]}>
                {confirmLabel}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const confirmStyles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 10,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  subtext: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

type CallSupportModalProps = {
  visible: boolean;
  onClose: () => void;
  onCallPhone: () => void;
  onCallApp: () => void;
  /** iOS: the sheet has finished closing (Modal onDismiss). */
  onDismissed?: () => void;
};

const CallSupportModal: React.FC<CallSupportModalProps> = ({
  visible,
  onClose,
  onCallPhone,
  onCallApp,
  onDismissed,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onDismissed}>
      <View style={confirmStyles.root}>
        <TouchableOpacity
          style={[confirmStyles.overlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            confirmStyles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <View style={[confirmStyles.handle, { backgroundColor: theme.border }]} />

          <View style={[confirmStyles.header, { borderBottomColor: theme.borderLight }]}>
            <AppText style={[confirmStyles.title, { color: theme.text }]}>
              Звонок в поддержку
            </AppText>
          </View>

          <View style={confirmStyles.body}>
            <AppText style={[confirmStyles.message, { color: theme.text }]}>
              Выберите способ связи с поддержкой
            </AppText>
          </View>

          <View style={callSupportStyles.actions}>
            <TouchableOpacity
              style={[callSupportStyles.actionButton, { backgroundColor: theme.brand }]}
              onPress={onCallApp}
              activeOpacity={0.75}>
              <AppIcon name="phone" size={20} color={theme.textInverse} />
              <AppText style={[confirmStyles.buttonText, { color: theme.textInverse }]}>
                Звонок через приложение
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                callSupportStyles.actionButton,
                {
                  backgroundColor: theme.backgroundTertiary,
                  borderColor: theme.border,
                  borderWidth: 1,
                },
              ]}
              onPress={onCallPhone}
              activeOpacity={0.75}>
              <AppIcon name="phone" size={20} color={theme.text} />
              <AppText style={[confirmStyles.buttonText, { color: theme.text }]}>
                Позвонить по телефону
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={callSupportStyles.cancelButton}
              onPress={onClose}
              activeOpacity={0.75}>
              <AppText style={[callSupportStyles.cancelText, { color: theme.textTertiary }]}>
                Отмена
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const callSupportStyles = StyleSheet.create({
  actions: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  actionButton: {
    height: 50,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  cancelButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

const AccountScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { accessToken, user: userFromState, fullAuth, userId } = useSelector((state: RootState) => state.auth);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  // iOS: resolves when the support sheet has finished closing (see closeSupportSheet).
  const supportSheetClosedRef = React.useRef<(() => void) | null>(null);
  const [showCallingSupport, setShowCallingSupport] = React.useState(true);
  const { theme, isDark, toggleTheme } = useTheme();
  const { isTablet } = useLayout();
  const supportUnread = useSelector((state: RootState) => state.supportChat?.unreadCount ?? 0);
  const notificationsUnread = useSelector((state: RootState) => state.notifications?.unread ?? 0);

  // access 0 = show calling support, access 1 = hide
  useEffect(() => {
    if (!userId) {
      setShowCallingSupport(true);
      return;
    }
    getUserById(userId)
      .then((u) => {
        const a = u?.access;
        setShowCallingSupport(a === 0 || a === false);
      })
      .catch(() => setShowCallingSupport(true));
  }, [userId]);

  // Check authentication and redirect to login if not authenticated
  useEffect(() => {
    if (!fullAuth || !accessToken) {
      navigation.navigate('login', {
        returnTo: 'account',
        returnParams: route.params || {},
      });
    }
  }, [fullAuth, accessToken, navigation, route.params]);

  // Use user from state, or decode from token if not available
  const user: DecodedToken | null = React.useMemo(() => {
    if (userFromState) {
      return userFromState as DecodedToken;
    }
    if (!accessToken) return null;
    try {
      return jwtDecode<DecodedToken>(accessToken);
    } catch (error) {
      console.error('[AccountScreen] Error decoding token:', error);
      return null;
    }
  }, [accessToken, userFromState]);

  const formatLoyaltyCard = (loyaltyId: string | undefined): string => {
    if (!loyaltyId) return '0000 0000 0000 0000';
    // Format as XXXX XXXX XXXX XXXX
    const cleaned = loyaltyId.replace(/\s/g, '');
    return cleaned.match(/.{1,4}/g)?.join(' ') || loyaltyId;
  };

  const handleCopyLoyaltyId = async () => {
    const loyaltyIdToCopy = loyaltyId.replace(/\s/g, ''); // Remove spaces for copy
    try {
      Clipboard.setString(loyaltyIdToCopy);
      Alert.alert('Скопировано', 'Loyalty ID скопирован в буфер обмена');
    } catch (error) {
      console.error('Error copying loyalty ID:', error);
      Alert.alert('Ошибка', 'Не удалось скопировать Loyalty ID');
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    // CRITICAL: Clean up call-related state before logout so old account
    // no longer receives VoIP pushes, socket events, or CallKeep UI
    await cleanupVoipOnLogout();
    await unregisterPushDevice();
    disconnectSupportSocket();
    dispatch(logoutReducer());
    navigation.reset({
      index: 0,
      routes: [{ name: 'tab' }],
    });
  };

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const confirmDeleteAccount = async () => {
    // TODO: Implement account deletion API call
    setDeleteModalVisible(false);
    // Clean up call state before logout (same as handleLogout)
    await cleanupVoipOnLogout();
    await unregisterPushDevice();
    disconnectSupportSocket();
    dispatch(logoutReducer());
    navigation.reset({
      index: 0,
      routes: [{ name: 'tab' }],
    });
  };

  const handleCallSupport = () => {
    setSupportModalVisible(true);
  };

  const handleSupportChat = () => {
    navigation.navigate(SUPPORT_CHAT_ROUTE);
  };

  const handleNotifications = () => {
    navigation.navigate(NOTIFICATIONS_ROUTE);
  };

  const handleCallSupportPhone = () => {
    setSupportModalVisible(false);
    Linking.openURL(`tel:${SUPPORT_PHONE_NUMBER}`).catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть телефон');
    });
  };

  // The call window must not open while this sheet is still closing: on iOS a modal presented
  // during another modal's dismissal is not shown. Android closes the sheet at once.
  const closeSupportSheet = () =>
    new Promise<void>((resolve) => {
      if (Platform.OS !== 'ios' || !supportModalVisible) {
        setSupportModalVisible(false);
        resolve();
        return;
      }
      const done = () => {
        clearTimeout(timer);
        supportSheetClosedRef.current = null;
        resolve();
      };
      const timer = setTimeout(done, 700);
      supportSheetClosedRef.current = done;
      setSupportModalVisible(false);
    });

  const handleCallSupportApp = async () => {
    await closeSupportSheet();

    const deviceId = getCurrentDeviceId();
    if (!deviceId) {
      Alert.alert(
        'Ошибка',
        'Устройство не зарегистрировано для звонков. Пожалуйста, подождите несколько секунд и попробуйте снова.',
      );
      return;
    }

    const callState = getCallState();
    if (callState.state !== 'idle' && callState.state !== 'ended') {
      Alert.alert('Внимание', 'У вас уже есть активный звонок');
      return;
    }

    try {
      // The call window is the global one in App.tsx (same as the support chat). This screen used
      // to open its own second CallModal after the answer, on top of the global one: the visible
      // window did not react to any tap (end call, mute, speaker, minimize).
      await startOutgoingVoiceCallByLoyaltyId(SUPPORT_LOYALTY_ID, SUPPORT_DISPLAY_NAME);
    } catch (e: any) {
      console.error('❌ Failed to call support:', e);
      const errorMessage = e?.message || 'Неизвестная ошибка';
      Alert.alert('Ошибка', `Не удалось позвонить в поддержку: ${errorMessage}`);
    }
  };

  const handleDocuments = () => {
    navigation.navigate(LEGAL_DOCUMENTS_ROUTE);
  };

  const userName = user ? `${user.name || ''} ${user.l_name || ''}`.trim() : 'Пользователь';
  const loyaltyId = user?.loyalty_id || user?.id || '0000 0000 0000 0000';
  const [cardHeight, setCardHeight] = React.useState(240);

  // Don't render if not authenticated (will redirect to login)
  if (!fullAuth || !accessToken) {
    return null;
  }

  // Settings groups: right column on iPad (TabletColumns `side`), stacked under the card on phone.
  const settingsBlocks = (
        /* Settings — compact grouped cards */
        <View style={styles.settingsBlocks}>
          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.borderLight,
              },
            ]}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={handleNotifications}
              activeOpacity={0.65}>
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: isDark ? 'rgba(254,115,46,0.2)' : 'rgba(254,115,46,0.12)' },
                ]}>
                <NotificationGlyph kind="bell" size={17} color={theme.brand} />
              </View>
              <View style={styles.settingsTextCol}>
                <AppText style={[styles.settingsTitle, { color: theme.text }]}>
                  {PUSH_TEXTS.accountRowTitle}
                </AppText>
                <AppText style={[styles.settingsSubtitle, { color: theme.textTertiary }]}>
                  {PUSH_TEXTS.accountRowSubtitle}
                </AppText>
              </View>
              {notificationsUnread > 0 ? (
                <View style={[styles.settingsCountBadge, { backgroundColor: theme.brand }]}>
                  <AppText style={styles.settingsCountBadgeText}>
                    {notificationsUnread > 99 ? '99+' : notificationsUnread}
                  </AppText>
                </View>
              ) : null}
              <AppIcon name="arrowRight" size={14} color={theme.textTertiary} />
            </TouchableOpacity>
            <View style={[styles.settingsHairline, { backgroundColor: theme.border }]} />

            {showCallingSupport ? (
              <>
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={handleSupportChat}
                  activeOpacity={0.65}>
                  <View
                    style={[
                      styles.settingsIcon,
                      { backgroundColor: isDark ? 'rgba(43,169,226,0.2)' : 'rgba(43,169,226,0.12)' },
                    ]}>
                    <AppIcon name="support" size={16} color="#2BA9E2" />
                    {supportUnread > 0 ? (
                      <View style={[styles.settingsBadge, { backgroundColor: theme.brand, borderColor: theme.cardBackground }]} />
                    ) : null}
                  </View>
                  <View style={styles.settingsTextCol}>
                    <AppText style={[styles.settingsTitle, { color: theme.text }]}>
                      Чат с поддержкой
                    </AppText>
                    <AppText style={[styles.settingsSubtitle, { color: theme.textTertiary }]}>
                      Напишите нам — ответим в чате
                    </AppText>
                  </View>
                  <AppIcon name="arrowRight" size={14} color={theme.textTertiary} />
                </TouchableOpacity>
                <View style={[styles.settingsHairline, { backgroundColor: theme.border }]} />
                <TouchableOpacity
                  style={styles.settingsRow}
                  onPress={handleCallSupport}
                  activeOpacity={0.65}>
                  <View
                    style={[
                      styles.settingsIcon,
                      { backgroundColor: isDark ? 'rgba(52,199,89,0.18)' : 'rgba(52,199,89,0.12)' },
                    ]}>
                    <AppIcon name="HelpCenterIcon" size={16} color="#34C759" />
                  </View>
                  <View style={styles.settingsTextCol}>
                    <AppText style={[styles.settingsTitle, { color: theme.text }]}>
                      Звонок в поддержку
                    </AppText>
                    <AppText style={[styles.settingsSubtitle, { color: theme.textTertiary }]}>
                      Связаться с командой Totus
                    </AppText>
                  </View>
                  <AppIcon name="arrowRight" size={14} color={theme.textTertiary} />
                </TouchableOpacity>
                <View style={[styles.settingsHairline, { backgroundColor: theme.border }]} />
              </>
            ) : null}

            <View style={styles.settingsRow}>
              <View
                style={[
                  styles.settingsIcon,
                  {
                    backgroundColor: isDark
                      ? 'rgba(88,86,214,0.18)'
                      : 'rgba(255,149,0,0.12)',
                  },
                ]}>
                {isDark ? (
                  <AppIcon name="moon" size={16} color="#5856D6" />
                ) : (
                  <AppIcon name="sun" size={16} color="#FF9500" />
                )}
              </View>
              <View style={styles.settingsTextCol}>
                <AppText style={[styles.settingsTitle, { color: theme.text }]}>
                  {isDark ? 'Тёмная тема' : 'Светлая тема'}
                </AppText>
                <AppText style={[styles.settingsSubtitle, { color: theme.textTertiary }]}>
                  Внешний вид приложения
                </AppText>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{
                  false: isDark ? '#3A3A3C' : '#E5E5EA',
                  true: isDark ? '#5856D6' : '#34C759',
                }}
                thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isDark ? '#F2F2F7' : '#FFFFFF'}
                style={styles.switch}
              />
            </View>
          </View>

          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.borderLight,
              },
            ]}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={handleDocuments}
              activeOpacity={0.65}>
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: isDark ? 'rgba(88,86,214,0.18)' : 'rgba(88,86,214,0.1)' },
                ]}>
                <AppIcon name="document" size={16} color="#5856D6" />
              </View>
              <View style={styles.settingsTextCol}>
                <AppText style={[styles.settingsTitle, { color: theme.text }]}>
                  Документы
                </AppText>
                <AppText style={[styles.settingsSubtitle, { color: theme.textTertiary }]}>
                  Соглашение, политика данных, реквизиты
                </AppText>
              </View>
              <AppIcon name="arrowRight" size={14} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.borderLight,
              },
            ]}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={handleLogout}
              activeOpacity={0.65}>
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: isDark ? 'rgba(255,149,0,0.18)' : 'rgba(255,149,0,0.12)' },
                ]}>
                <AppIcon name="logout" size={16} color="#FF9500" />
              </View>
              <AppText style={[styles.settingsTitle, styles.settingsTitleSolo, { color: theme.text }]}>
                Выйти
              </AppText>
              <AppIcon name="arrowRight" size={14} color={theme.textTertiary} />
            </TouchableOpacity>

            <View style={[styles.settingsHairline, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.settingsRow}
              onPress={handleDeleteAccount}
              activeOpacity={0.65}>
              <View
                style={[
                  styles.settingsIcon,
                  { backgroundColor: isDark ? 'rgba(254,115,46,0.2)' : 'rgba(254,115,46,0.12)' },
                ]}>
                <AppIcon name="warning" size={16} color="#FE732E" />
              </View>
              <AppText
                style={[styles.settingsTitle, styles.settingsTitleSolo, { color: '#FE732E' }]}>
                Удалить аккаунт
              </AppText>
              <AppIcon name="arrowRight" size={14} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {/* <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBarBackground} /> */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}>
        <TabletColumns sideWidth={380} side={settingsBlocks}>
        {/* Loyalty Card */}
        <View
          style={[styles.loyaltyCardContainer, isTablet && styles.loyaltyCardContainerTablet]}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            if (height > 0) {
              setCardHeight(height);
            }
          }}>
          <View style={styles.loyaltyCardBackground}>
            <LoyaltyCardBackground width="100%" height="100%" containerHeight={cardHeight} />
          </View>
          <View style={[styles.loyaltyCard, isTablet && styles.loyaltyCardTablet]}>
            <View style={styles.loyaltyCardHeader}>
              <AppText style={styles.loyaltyCardTitle}>Карта лояльности</AppText>
              <AppIcon name="bird" size={64} color="#FFFFFF" />
            </View>

            <View style={styles.loyaltyCardInfo}>
              <TouchableOpacity
                style={styles.loyaltyCardNumberContainer}
                onPress={handleCopyLoyaltyId}
                activeOpacity={0.7}>
                <AppText style={styles.loyaltyCardNumber}  numberOfLines={1}>
                  {formatLoyaltyCard(loyaltyId)}
                </AppText>
                <View style={styles.copyIconContainer}>
                  <AppIcon name="copy" size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <View style={styles.loyaltyCardInfoRow}>
                <AppIcon name="info" size={18} color="#FFFFFF" />
                <AppText style={styles.loyaltyCardInfoText}>
                  Ваш персональный номер
                </AppText>
              </View>
            </View>

            <View style={styles.loyaltyCardFooter}>
              <AppText style={styles.loyaltyCardName}>{userName}</AppText>
              <View style={styles.userCardIcon}>
                <AppIcon name="user" size={16} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>
        </TabletColumns>
      </ScrollView>

      <ConfirmModal
        visible={deleteModalVisible}
        title="Удаление аккаунта"
        message="Вы действительно хотите удалить аккаунт?"
        subtext="Если вы не войдёте в систему в течение 30 дней, аккаунт будет автоматически удалён."
        confirmLabel="Удалить"
        confirmColor={theme.error}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={confirmDeleteAccount}
      />

      <ConfirmModal
        visible={logoutModalVisible}
        title="Выход"
        message="Вы действительно хотите выйти?"
        confirmLabel="Выйти"
        confirmColor={theme.brand}
        onClose={() => setLogoutModalVisible(false)}
        onConfirm={confirmLogout}
      />

      <CallSupportModal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        onCallPhone={handleCallSupportPhone}
        onCallApp={handleCallSupportApp}
        onDismissed={() => supportSheetClosedRef.current?.()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  loyaltyCardContainer: {
    width: '100%',
    minHeight: 240,
    borderRadius: 20,
    overflow: 'hidden',
  },
  loyaltyCardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  loyaltyCard: {
    width: '100%',
    padding: 24,
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
    minHeight: 240,
  },
  loyaltyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loyaltyCardTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loyaltyCardInfo: {
    gap: 8,
  },
  loyaltyCardNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 8,
    // paddingHorizontal: 8,
    paddingVertical: 4,
  },
  loyaltyCardNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginRight: 8,
  },
  copyIconContainer: {
    opacity: 1,
    marginLeft: 8,
  },
  loyaltyCardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loyaltyCardInfoText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  loyaltyCardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(249, 249, 249, 0.22)',
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  loyaltyCardName: {
    fontSize: 22,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  userCardIcon: {
    width: 39,
    height: 39,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Compact settings cards
  settingsBlocks: {
    gap: 10,
  },
  settingsCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 10,
  },
  settingsIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsTextCol: {
    flex: 1,
    gap: 1,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  settingsTitleSolo: {
    flex: 1,
  },
  settingsSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  settingsBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  settingsCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsHairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  switch: {
    transform: Platform.OS === 'ios'
      ? [{ scaleX: 0.82 }, { scaleY: 0.78 }]
      : [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  // iPad only
  scrollContentTablet: {
    padding: 24,
  },
  loyaltyCardContainerTablet: {
    minHeight: 280,
  },
  loyaltyCardTablet: {
    minHeight: 280,
  },
});

export default AccountScreen;
