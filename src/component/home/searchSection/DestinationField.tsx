import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppIcon, AppText } from '../../UI';
import type { DestinationResult } from '../../../types/destinations';
import DestinationSelectionModal from './modals/DestinationSelectionModal';
import { useTheme } from '../../../hooks/useTheme';

type DestinationFieldProps = {
  value: DestinationResult | null;
  onChange: (item: DestinationResult, type: string) => void;
  style?: any;
  fromCity?: string;
  searchType?: 'package' | 'hotel';
};

const DestinationField: React.FC<DestinationFieldProps> = ({
  value,
  onChange,
  style,
  fromCity = 'Moscow',
  searchType = 'package',
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (item: DestinationResult, type: string) => {
    onChange(item, type);
    setModalVisible(false);
  };
  return (
    <>
      <TouchableOpacity
        style={[styles.fieldButton, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={1}>
        <View style={styles.fieldContent}>
          <AppText style={[styles.label, { color: theme.textTertiary }]}>
            Страна, город, регион или отель
          </AppText>
          <View style={styles.valueContainer}>
            <View style={styles.valueWithIcon}>
              <AppText style={[styles.value, { color: theme.text }]}>
                {value?.name || 'Египет'}
              </AppText>
              <AppIcon name="arrowDown" size={24} color={theme.textTertiary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <DestinationSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelect}
        title="Страна, город, регион или отель"
        fromCity={fromCity}
        searchType={searchType}
      />
    </>
  );
};

export default DestinationField;

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
