import React from 'react';
import {ActivityIndicator, Modal, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import {useLayout} from '../../hooks/useLayout';
import {PUSH_TEXTS} from '../../modules/push/pushConstants';
import CategoryIcon from './CategoryIcon';
import { FONT_HEADING } from '../../theme/fonts';

type Props = {
  visible: boolean;
  busy?: boolean;
  onEnable: () => void;
  onDismiss: () => void;
};

/**
 * Предзапрос разрешения на push (DESIGN.md): шторка снизу в стиле «Звонок в поддержку»
 * (Account.tsx) — колокольчик в круге brand 12 %, заголовок, текст, 4 строки с иконками,
 * кнопки «Включить» (brand) и «Не сейчас» (серая). Системный диалог показывается после «Включить».
 */
const PushPermissionSheet: React.FC<Props> = ({visible, busy, onEnable, onDismiss}) => {
  const {theme} = useTheme();
  const insets = useSafeAreaInsets();
  const {isTablet} = useLayout();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <TouchableOpacity
          style={[styles.overlay, {backgroundColor: theme.overlay}]}
          activeOpacity={1}
          onPress={busy ? undefined : onDismiss}
        />
        <View
          style={[
            styles.sheet,
            isTablet && styles.sheetTablet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}>
          <View style={[styles.handle, {backgroundColor: theme.border}]} />

          <View style={styles.hero}>
            <CategoryIcon kind="bell" color={theme.brand} size={72} iconSize={34} />
            <AppText style={[styles.title, {color: theme.text}]}>{PUSH_TEXTS.sheetTitle}</AppText>
            <AppText style={[styles.text, {color: theme.textTertiary}]}>{PUSH_TEXTS.sheetText}</AppText>
          </View>

          <View style={styles.list}>
            {PUSH_TEXTS.sheetItems.map(item => (
              <View key={item.text} style={styles.listRow}>
                <CategoryIcon kind={item.icon} color={item.color} size={34} iconSize={18} />
                <AppText style={[styles.listText, {color: theme.text}]}>{item.text}</AppText>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, {backgroundColor: theme.brand}]}
              onPress={onEnable}
              disabled={busy}
              activeOpacity={0.75}
              accessibilityRole="button">
              {busy ? (
                <ActivityIndicator color={theme.textInverse} />
              ) : (
                <AppText style={[styles.buttonText, {color: theme.textInverse}]}>{PUSH_TEXTS.enable}</AppText>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                {backgroundColor: theme.backgroundTertiary, borderColor: theme.border, borderWidth: 1},
              ]}
              onPress={onDismiss}
              disabled={busy}
              activeOpacity={0.75}
              accessibilityRole="button">
              <AppText style={[styles.buttonText, {color: theme.text}]}>{PUSH_TEXTS.notNow}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  sheetTablet: {
    width: 480,
    alignSelf: 'center',
    borderRadius: 32,
    marginBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 10,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  actions: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  button: {
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

export default PushPermissionSheet;
