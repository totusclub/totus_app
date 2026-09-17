import React, {useEffect, useState} from 'react';
import {Linking, Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import {isYandexAuthEnabled, yandexStartUrl} from '../../modules/api/yandexAuth';

/**
 * «Войти с Яндекс ID» (макеты: claude/YANDEX_AUTH_DESIGN_RU.md).
 * Открывает системный браузер; возврат ловит YandexAuthBridge по deep link.
 * Пока раздел выключен на сервере (503) — кнопки нет.
 */
const YandexIdButton: React.FC<{label?: string; divider?: boolean}> = ({
  label = 'Войти с Яндекс ID',
  divider = true,
}) => {
  const {theme, isDark} = useTheme();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    isYandexAuthEnabled().then(value => {
      if (alive) setEnabled(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!enabled) return null;

  const onPress = () => {
    Linking.openURL(yandexStartUrl()).catch(() => undefined);
  };

  return (
    <View style={styles.wrap}>
      {divider ? (
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, {backgroundColor: theme.border}]} />
          <AppText style={[styles.dividerText, {color: theme.textTertiary}]}>или</AppText>
          <View style={[styles.dividerLine, {backgroundColor: theme.border}]} />
        </View>
      ) : null}
      <Pressable
        onPress={onPress}
        style={({pressed}) => [
          styles.button,
          {
            backgroundColor: isDark ? '#FFFFFF' : '#000000',
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <View style={styles.logo}>
          <AppText style={styles.logoText}>Я</AppText>
        </View>
        <AppText style={[styles.label, {color: isDark ? '#141414' : '#FFFFFF'}]}>{label}</AppText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FC3F1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default YandexIdButton;
