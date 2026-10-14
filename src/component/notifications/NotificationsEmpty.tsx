import React from 'react';
import {ActivityIndicator, StyleSheet, TouchableOpacity, View} from 'react-native';
import {AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import {PUSH_TEXTS} from '../../modules/push/pushConstants';
import CategoryIcon from './CategoryIcon';
import { FONT_HEADING } from '../../theme/fonts';

type Props = {
  /** Показать карточку «Push-уведомления выключены» + «Включить». */
  showEnablePush: boolean;
  enabling?: boolean;
  onEnablePush: () => void;
};

/**
 * Пустое состояние: колокольчик в круге, «Уведомлений пока нет», пояснение;
 * ниже карточка «Push-уведомления выключены» + «Включить» (если разрешения нет
 * или устройство не зарегистрировано).
 */
const NotificationsEmpty: React.FC<Props> = ({showEnablePush, enabling, onEnablePush}) => {
  const {theme} = useTheme();
  return (
    <View style={styles.container}>
      <CategoryIcon kind="bell" color={theme.brand} size={72} iconSize={34} />
      <AppText style={[styles.title, {color: theme.text}]}>{PUSH_TEXTS.emptyTitle}</AppText>
      <AppText style={[styles.text, {color: theme.textTertiary}]}>{PUSH_TEXTS.emptyText}</AppText>

      {showEnablePush ? (
        <View
          style={[
            styles.card,
            {backgroundColor: theme.cardBackground, borderColor: theme.borderLight},
          ]}>
          <CategoryIcon kind="bellOff" color={theme.warning} size={40} />
          <View style={styles.cardText}>
            <AppText style={[styles.cardTitle, {color: theme.text}]}>{PUSH_TEXTS.pushOffTitle}</AppText>
          </View>
          <TouchableOpacity
            onPress={onEnablePush}
            disabled={enabling}
            activeOpacity={0.75}
            style={[styles.enableButton, {backgroundColor: theme.brand}]}
            accessibilityRole="button">
            {enabling ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText style={styles.enableText}>{PUSH_TEXTS.enable}</AppText>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 340,
  },
  card: {
    marginTop: 16,
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
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

export default NotificationsEmpty;
