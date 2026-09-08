import React, {memo} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import type {NotificationItem as NotificationItemModel} from '../../modules/api/notifications';
import {visualForNotification} from '../../modules/push/pushConstants';
import CategoryIcon, {withAlpha} from './CategoryIcon';
import {formatNotificationTime} from './notificationDates';

type Props = {
  item: NotificationItemModel;
  onPress: (item: NotificationItemModel) => void;
  onLongPress?: (item: NotificationItemModel) => void;
};

/** Подложка непрочитанного (DESIGN.md): Light #FFF1EA, Dark — brand 14–16 %. */
const UNREAD_BACKGROUND_LIGHT = '#FFF1EA';

/**
 * Элемент списка: иконка-круг слева, заголовок 15 semibold, текст до 2 строк,
 * время справа сверху; непрочитанный — подложка и точка brand 8 px справа от заголовка.
 */
const NotificationItem: React.FC<Props> = ({item, onPress, onLongPress}) => {
  const {theme, isDark} = useTheme();
  const visual = visualForNotification(item.type, item.category);
  const unread = !item.readAt;
  const background = unread
    ? isDark
      ? withAlpha(theme.brand, 0.15)
      : UNREAD_BACKGROUND_LIGHT
    : 'transparent';

  return (
    <TouchableOpacity
      style={[styles.row, {backgroundColor: background}]}
      onPress={() => onPress(item)}
      onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}`}>
      <CategoryIcon kind={visual.icon} color={visual.color} size={42} />
      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <View style={styles.titleWrap}>
            <AppText style={[styles.title, {color: theme.text}]} numberOfLines={1}>
              {item.title}
            </AppText>
            {unread ? <View style={[styles.dot, {backgroundColor: theme.brand}]} /> : null}
          </View>
          <AppText style={[styles.time, {color: theme.textTertiary}]} numberOfLines={1}>
            {formatNotificationTime(item.createdAt)}
          </AppText>
        </View>
        {item.body ? (
          <AppText style={[styles.body, {color: theme.textTertiary}]} numberOfLines={2}>
            {item.body}
          </AppText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  textCol: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  time: {
    fontSize: 12,
    fontWeight: '400',
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default memo(NotificationItem);
