import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {useIsFocused, useNavigation, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {AppIcon, AppText} from '../../component/UI';
import {useTheme} from '../../hooks/useTheme';
import {useLayout} from '../../hooks/useLayout';
import type {AppDispatch, RootState} from '../../modules/store';
import {
  fetchNotifications,
  markRead,
  removeNotification,
  setCategoryFilter,
} from '../../modules/store/slices/notifications';
import {deleteNotification, type NotificationCategory, type NotificationItem as NotificationModel} from '../../modules/api/notifications';
import {
  NOTIFICATION_SETTINGS_ROUTE,
  PUSH_TEXTS,
  formatUnreadSubtitle,
} from '../../modules/push/pushConstants';
import {getPushStatus, handleNotificationPress, requestPushPermission} from '../../modules/push/pushService';
import NotificationItem from '../../component/notifications/NotificationItem';
import NotificationFilters from '../../component/notifications/NotificationFilters';
import NotificationsEmpty from '../../component/notifications/NotificationsEmpty';
import {NotificationGlyph} from '../../component/notifications/CategoryIcon';
import {groupNotifications, type NotificationSection} from '../../component/notifications/notificationDates';

/** Ширина колонки на iPad (как чат с поддержкой). */
const TABLET_MAX_WIDTH = 720;

/**
 * Экран «Уведомления» (AccountStackScreen → notifications), DESIGN.md.
 * Полноэкранный, без таб-бара; требует авторизации — иначе уводит на login, как SupportChatScreen.
 */
const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const {theme} = useTheme();
  const {isTablet} = useLayout();
  const {accessToken, fullAuth} = useSelector((state: RootState) => state.auth);
  const {items, hasMore, unread, loading, loadingMore, error, category, permission, registered} = useSelector(
    (state: RootState) => state.notifications,
  );
  const [enabling, setEnabling] = useState(false);

  const isLoggedIn = Boolean(fullAuth && accessToken);

  useEffect(() => {
    if (!isLoggedIn) {
      navigation.navigate('login', {
        returnTo: 'notifications',
        returnParams: route.params || {},
      });
    }
  }, [isLoggedIn, navigation, route.params]);

  // Первая загрузка + при каждом фокусе (после тапа по пушу список мог измениться).
  useEffect(() => {
    if (!isLoggedIn || !isFocused) return;
    dispatch(fetchNotifications({category}));
    getPushStatus().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isLoggedIn, isFocused]);

  const sections = useMemo<NotificationSection[]>(() => groupNotifications(items), [items]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('account');
  }, [navigation]);

  const handleSettings = useCallback(() => {
    navigation.navigate(NOTIFICATION_SETTINGS_ROUTE);
  }, [navigation]);

  const handleFilter = useCallback(
    (next: NotificationCategory | null) => {
      dispatch(setCategoryFilter(next));
      dispatch(fetchNotifications({category: next}));
    },
    [dispatch],
  );

  const handleRefresh = useCallback(() => {
    dispatch(fetchNotifications({category}));
  }, [category, dispatch]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore || items.length === 0) return;
    const last = items[items.length - 1];
    dispatch(fetchNotifications({category, before: last.id}));
  }, [category, dispatch, hasMore, items, loading, loadingMore]);

  const handleReadAll = useCallback(() => {
    dispatch(markRead('all'));
  }, [dispatch]);

  const handlePress = useCallback((item: NotificationModel) => {
    handleNotificationPress({
      ...(item.data || {}),
      type: item.type,
      title: item.title,
      body: item.body,
      notificationId: item.id,
    });
  }, []);

  const handleLongPress = useCallback(
    (item: NotificationModel) => {
      Alert.alert(item.title, undefined, [
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            dispatch(removeNotification(item.id));
            deleteNotification(item.id).catch(() => undefined);
          },
        },
        {text: 'Отмена', style: 'cancel'},
      ]);
    },
    [dispatch],
  );

  const handleEnablePush = useCallback(async () => {
    setEnabling(true);
    try {
      await requestPushPermission();
      await getPushStatus();
    } finally {
      setEnabling(false);
    }
  }, []);

  if (!isLoggedIn) {
    return null;
  }

  const showEnablePush = permission !== 'granted' || !registered;
  const isEmpty = !loading && !error && items.length === 0;
  const subtitle = formatUnreadSubtitle(unread);

  const header = (
    <View style={[styles.header, {borderBottomColor: theme.border}]}>
      <TouchableOpacity
        onPress={handleBack}
        style={styles.headerButton}
        hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
        accessibilityRole="button"
        accessibilityLabel="Назад">
        <AppIcon name="simpleArrow" size={24} color={theme.text} />
      </TouchableOpacity>
      <View style={styles.titleCol}>
        <AppText style={[styles.title, {color: theme.text}]} numberOfLines={1}>
          {PUSH_TEXTS.screenTitle}
        </AppText>
        {subtitle ? (
          <AppText style={[styles.subtitle, {color: theme.textTertiary}]} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={handleSettings}
        style={[styles.headerButton, styles.settingsButton, {backgroundColor: theme.backgroundSecondary}]}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        accessibilityRole="button"
        accessibilityLabel={PUSH_TEXTS.settingsTitle}>
        <NotificationGlyph kind="gear" size={20} color={theme.text} />
      </TouchableOpacity>
    </View>
  );

  let body: React.ReactNode;
  if (loading && items.length === 0) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.textTertiary} />
      </View>
    );
  } else if (error && items.length === 0) {
    body = (
      <View style={styles.center}>
        <AppText style={[styles.errorTitle, {color: theme.text}]}>{error}</AppText>
        <TouchableOpacity
          onPress={handleRefresh}
          activeOpacity={0.7}
          style={[styles.retryButton, {backgroundColor: theme.brand}]}>
          <AppText style={styles.retryText}>{PUSH_TEXTS.retry}</AppText>
        </TouchableOpacity>
      </View>
    );
  } else if (isEmpty) {
    body = (
      <NotificationsEmpty showEnablePush={showEnablePush} enabling={enabling} onEnablePush={handleEnablePush} />
    );
  } else {
    body = (
      <SectionList
        sections={sections}
        keyExtractor={item => String(item.id)}
        renderItem={({item}) => <NotificationItem item={item} onPress={handlePress} onLongPress={handleLongPress} />}
        renderSectionHeader={({section}) => (
          <View style={[styles.sectionHeader, {backgroundColor: theme.background}]}>
            <AppText style={[styles.sectionTitle, {color: theme.textTertiary}]}>{section.title}</AppText>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={[styles.separator, {backgroundColor: theme.borderLight}]} />}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={loading && items.length > 0} onRefresh={handleRefresh} tintColor={theme.textTertiary} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={theme.textTertiary} />
            </View>
          ) : null
        }
        contentContainerStyle={{paddingBottom: insets.bottom + 24}}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  const content = (
    <View style={styles.column}>
      {header}
      <View style={styles.filters}>
        <NotificationFilters value={category} onChange={handleFilter} canReadAll={unread > 0} onReadAll={handleReadAll} />
      </View>
      <View style={styles.body}>{body}</View>
    </View>
  );

  return (
    <View style={[styles.container, {backgroundColor: theme.background, paddingTop: insets.top}]}>
      {isTablet ? (
        <View style={styles.tabletRow}>
          <View style={[styles.tabletColumn, {maxWidth: TABLET_MAX_WIDTH}]}>{content}</View>
        </View>
      ) : (
        content
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 32,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  filters: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  body: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
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

export default NotificationsScreen;
