import React, {useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {openOrderDetails} from '../../navigation/historyNavigation';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import {useLayout} from '../../hooks/useLayout';
import {useSupportChat} from '../../modules/hooks/useSupportChat';
import {useAndroidKeyboardInset} from '../../hooks/useAndroidKeyboardInset';
import {
  SUPPORT_DISPLAY_NAME,
  SUPPORT_LOYALTY_ID,
  SUPPORT_PHONE_NUMBER,
  type SupportQuickTopic,
} from '../../modules/support/supportConstants';
import {
  getCallState,
  getCurrentDeviceId,
  startOutgoingVoiceCallByLoyaltyId,
} from '../../modules/voip/VoipService';
import SupportHeader from './SupportHeader';
import SupportMessageList from './SupportMessageList';
import SupportComposer from './SupportComposer';
import SupportQuickTopics from './SupportQuickTopics';
import SupportEmptyState from './SupportEmptyState';

/** Ширина колонки чата на iPad (макет: 786 портрет / 800 ландшафт). */
const TABLET_CHAT_MAX_WIDTH = 720;
/** Пузырь на iPhone ≤ 290 (макет), на iPad ≤ 70 % колонки. */
const PHONE_BUBBLE_MAX_WIDTH = 290;

/**
 * Полноэкранный чат с поддержкой: шапка, список сообщений (или пустое состояние),
 * композер с чипами быстрых тем. Логика — useSupportChat.
 */
const SupportChat: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const {theme} = useTheme();
  const {isTablet} = useLayout();
  const {width} = useWindowDimensions();
  // Android: поднять поле ввода над клавиатурой (на iOS — 0, работает KeyboardAvoidingView)
  const {containerRef, inset: androidKeyboardInset} = useAndroidKeyboardInset();
  const {
    messages,
    hours,
    hasMore,
    loading,
    loadingMore,
    error,
    sendError,
    staffTyping,
    reload,
    loadMore,
    send,
    retry,
    removeFailed,
    notifyTyping,
    clearSendError,
  } = useSupportChat();

  const bubbleMaxWidth = useMemo(() => {
    if (isTablet) {
      return Math.round(Math.min(width, TABLET_CHAT_MAX_WIDTH) * 0.7);
    }
    return Math.min(PHONE_BUBBLE_MAX_WIDTH, Math.round(width * 0.78));
  }, [isTablet, width]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('account');
    }
  }, [navigation]);

  // Звонок: тот же поток, что в «Аккаунте» (VoIP через приложение или tel:).
  const callByPhone = useCallback(() => {
    Linking.openURL(`tel:${SUPPORT_PHONE_NUMBER}`).catch(() => {
      Alert.alert('Ошибка', 'Не удалось открыть телефон');
    });
  }, []);

  const callViaApp = useCallback(async () => {
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
      await startOutgoingVoiceCallByLoyaltyId(SUPPORT_LOYALTY_ID, SUPPORT_DISPLAY_NAME);
      // Окно звонка показывает App.tsx по состоянию VoipService.
    } catch (e: any) {
      const errorMessage = e?.message || 'Неизвестная ошибка';
      Alert.alert('Ошибка', `Не удалось позвонить в поддержку: ${errorMessage}`);
    }
  }, []);

  const handleCall = useCallback(() => {
    Alert.alert('Звонок в поддержку', 'Выберите способ связи с поддержкой', [
      {text: 'Звонок через приложение', onPress: () => void callViaApp()},
      {text: 'Позвонить по телефону', onPress: callByPhone},
      {text: 'Отмена', style: 'cancel'},
    ]);
  }, [callByPhone, callViaApp]);

  const handleTopic = useCallback(
    (topic: SupportQuickTopic) => {
      send(topic.label, {topic: topic.key});
    },
    [send],
  );

  const handleSend = useCallback(
    (text: string) => {
      send(text);
    },
    [send],
  );

  // Карточка заказа → детали заказа поверх чата: «Назад» возвращает в чат.
  const handleOpenOrder = useCallback(
    (orderId: number | string) => {
      openOrderDetails(navigation, orderId);
    },
    [navigation],
  );

  const isEmpty = !loading && !error && messages.length === 0;
  const composerDisabled = loading || Boolean(error);

  let body: React.ReactNode;
  if (loading && messages.length === 0) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.textTertiary} />
      </View>
    );
  } else if (error && messages.length === 0) {
    body = (
      <View style={styles.center}>
        <AppText style={[styles.errorTitle, {color: theme.text}]}>{error}</AppText>
        <TouchableOpacity
          onPress={reload}
          activeOpacity={0.7}
          style={[styles.retryButton, {backgroundColor: theme.brand}]}>
          <AppText style={styles.retryText}>Повторить</AppText>
        </TouchableOpacity>
      </View>
    );
  } else if (isEmpty) {
    body = <SupportEmptyState hours={hours} onSelectTopic={handleTopic} disabled={composerDisabled} />;
  } else {
    body = (
      <SupportMessageList
        messages={messages}
        hasMore={hasMore}
        loadingMore={loadingMore}
        staffTyping={staffTyping}
        bubbleMaxWidth={bubbleMaxWidth}
        onLoadMore={loadMore}
        onRetry={retry}
        onRemoveFailed={removeFailed}
        onOpenOrder={handleOpenOrder}
      />
    );
  }

  const content = (
    <View style={styles.column}>
      <SupportHeader
        onBack={handleBack}
        onCall={handleCall}
        statusOnline={!error}
        statusText={error ? 'Чат временно недоступен' : undefined}
      />
      <View style={styles.body}>{body}</View>
      <SupportComposer
        onSend={handleSend}
        onTyping={notifyTyping}
        disabled={composerDisabled}
        errorText={sendError}
        onDismissError={clearSendError}
        bottomInset={androidKeyboardInset > 0 ? 0 : insets.bottom}
        above={
          !isEmpty && !loading && !error ? (
            <SupportQuickTopics onSelect={handleTopic} disabled={composerDisabled} />
          ) : null
        }
      />
    </View>
  );

  const screen = (
    <KeyboardAvoidingView
      style={[
        styles.container,
        {backgroundColor: theme.background, paddingTop: insets.top},
        androidKeyboardInset > 0 ? {paddingBottom: androidKeyboardInset} : null,
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {isTablet ? (
        // Как TabletCentered, но на всю высоту экрана (колонка чата по центру).
        <View style={styles.tabletRow}>
          <View style={[styles.tabletColumn, {maxWidth: TABLET_CHAT_MAX_WIDTH}]}>{content}</View>
        </View>
      ) : (
        content
      )}
    </KeyboardAvoidingView>
  );

  if (Platform.OS !== 'android') {
    return screen;
  }
  // Android: внешний контейнер не меняет размер от отступа — по нему меряется перекрытие клавиатурой.
  return (
    <View ref={containerRef} style={styles.container} collapsable={false}>
      {screen}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  column: {
    flex: 1,
  },
  tabletRow: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  tabletColumn: {
    flex: 1,
    width: '100%',
  },
  body: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SupportChat;
