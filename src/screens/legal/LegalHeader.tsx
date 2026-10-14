import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { FontText as Text } from '../../component/UI/text/FontText';
import { AppIcon } from '../../component/UI';
import { useTheme } from '../../hooks/useTheme';

/**
 * Шапка экранов «Документы» — та же, что была у PrivacyPolicyScreen:
 * кнопка назад simpleArrow, заголовок по центру, hairline-граница снизу.
 */
const LegalHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Назад"
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
        <AppIcon name="simpleArrow" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text
        allowFontScaling={false}
        numberOfLines={2}
        style={[styles.headerTitle, { color: theme.text }]}>
        {title}
      </Text>
      <View style={styles.placeholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
});

export default LegalHeader;
