import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {AppIcon, AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import SupportAvatar from './SupportAvatar';
import {SUPPORT_DISPLAY_NAME, SUPPORT_STATUS_TEXT} from '../../modules/support/supportConstants';

type Props = {
  onBack: () => void;
  onCall: () => void;
  /** Статус вместо «Онлайн · …» (например, при ошибке сети). */
  statusText?: string;
  statusOnline?: boolean;
};

/** Шапка чата: назад · аватар · «Поддержка Totus» + статус · кнопка «Позвонить». */
const SupportHeader: React.FC<Props> = ({
  onBack,
  onCall,
  statusText = SUPPORT_STATUS_TEXT,
  statusOnline = true,
}) => {
  const {theme} = useTheme();
  const statusColor = statusOnline ? theme.success : theme.textTertiary;

  return (
    <View
      style={[
        styles.header,
        {backgroundColor: theme.background, borderBottomColor: theme.border},
      ]}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        accessibilityRole="button"
        accessibilityLabel="Назад">
        <AppIcon name="simpleArrow" size={24} color={theme.text} />
      </TouchableOpacity>

      <SupportAvatar size={40} online={statusOnline} />

      <View style={styles.titleCol}>
        <AppText style={[styles.title, {color: theme.text}]} numberOfLines={1}>
          {SUPPORT_DISPLAY_NAME}
        </AppText>
        <AppText style={[styles.status, {color: statusColor}]} numberOfLines={1}>
          {statusText}
        </AppText>
      </View>

      <TouchableOpacity
        onPress={onCall}
        style={[styles.callButton, {backgroundColor: theme.backgroundSecondary}]}
        activeOpacity={0.7}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        accessibilityRole="button"
        accessibilityLabel="Позвонить в поддержку">
        <AppIcon name="phone" size={20} color={theme.brand} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
  titleCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  status: {
    fontSize: 12,
    fontWeight: '400',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SupportHeader;
