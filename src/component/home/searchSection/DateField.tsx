import React, { useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText } from '../../UI';
import CalendarIcon from '../../UI/icons/calendar';
import DateSelectionModal from './modals/DateSelectionModal';
import { useTheme } from '../../../hooks/useTheme';

type DateFieldProps = {
  value: string; // Format: "DD.MM.YY"
  onChange: (date: string) => void;
  style?: any;
  label?: string;
};

const DateField: React.FC<DateFieldProps> = ({ value, onChange, style, label = 'Дата вылета' }) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse date from string format "DD.MM.YY" to Date object
  const initialDate = useMemo(() => {
    const parts = value.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = 2000 + parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  }, [value]);

  const handleSelect = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    onChange(`${day}.${month}.${year}`);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fieldButton, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={1}>
        <View style={styles.fieldContent}>
          <AppText style={[styles.label, { color: theme.textTertiary }]}>{label}</AppText>
          <View style={styles.valueContainer}>
            <View style={styles.valueWithIcon}>
              <AppText style={[styles.value, { color: theme.text }]}>{value}</AppText>
              <CalendarIcon size={24} color={theme.textTertiary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <DateSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelect}
        title="Выберите дату"
        initialDate={initialDate}
      />
    </>
  );
};

export default DateField;

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

