import React, { useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppIcon, AppText } from '../../UI';
import NightsSelectionModal from './modals/NightsSelectionModal';
import { useTheme } from '../../../hooks/useTheme';

type NightsFieldProps = {
  value: string; // Format: "7 ночей"
  onChange: (nights: string) => void;
  style?: any;
};

const NightsField: React.FC<NightsFieldProps> = ({ value, onChange, style }) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse initial nights from string format "7 ночей" to number
  const initialNights = useMemo(() => {
    const match = value.match(/\d+/);
    return match ? parseInt(match[0], 10) : 7;
  }, [value]);

  const handleSelect = (nights: number) => {
    onChange(`${nights} ночей`);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fieldButton, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={1}>
        <View style={styles.fieldContent}>
          <AppText style={[styles.label, { color: theme.textTertiary }]}>Количество ночей</AppText>
          <View style={styles.valueContainer}>
            <View style={styles.valueWithIcon}>
              <AppText style={[styles.value, { color: theme.text }]}>{value}</AppText>
              <AppIcon name="nights" size={24} color={theme.textTertiary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <NightsSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelect}
        initialNights={initialNights}
      />
    </>
  );
};

export default NightsField;

const styles = StyleSheet.create({
  fieldButton: {
    marginBottom: 16,
  },
  fieldContent: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 3,
    marginTop: 8,
  },
  valueContainer: {
    paddingBottom: 8,
    position: 'relative',
  },
  valueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
});

