import React, { useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { TextInputMask } from 'react-native-masked-text';
import AppText from '../text';
import AppIcon from '../icons';
import DatePickerModal from './DatePickerModal';
import { useTheme } from '../../../hooks/useTheme';

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  allowPastDates?: boolean; // true for birthday, false for passport expiry
  allowFutureDates?: boolean; // false for birthday
  focusBorderColor?: string;
  disabled?: boolean;
};

const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder = 'DD.MM.YYYY',
  label,
  error,
  allowPastDates = false,
  allowFutureDates = true,
  focusBorderColor,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Parse date from string format "DD.MM.YYYY" to Date object
  const parseDate = (dateString: string): Date | null => {
    if (!dateString || dateString.length !== 10) return null;
    const parts = dateString.split('.');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
    if (month < 0 || month > 11) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1900 || year > 2100) return null;
    return new Date(year, month, day);
  };

  const initialDate = useMemo(() => {
    const parsed = parseDate(value);
    return parsed || new Date();
  }, [value]);

  const handlePickerSelect = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    onChange(`${day}.${month}.${year}`);
    setModalVisible(false);
  };

  const handleTextChange = (text: string) => {
    // Only update if format is correct (DD.MM.YYYY)
    if (text.length <= 10) {
      onChange(text);
    }
  };

  return (
    <>
      <View style={styles.container}>
        {label && (
          <AppText style={[styles.label, { color: theme.textTertiary }]}>{label}</AppText>
        )}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
            focused && { borderColor: focusBorderColor || theme.brand },
            error && { borderColor: theme.error },
            disabled && styles.inputDisabled,
          ]}>
          <TextInputMask
            allowFontScaling={false}
            type="custom"
            options={{
              mask: '99.99.9999',
            }}
            value={value}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor={theme.inputPlaceholder}
            style={[styles.input, { color: theme.inputText }]}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            editable={!disabled}
            keyboardType="numeric"
          />
          <TouchableOpacity
            onPress={() => !disabled && setModalVisible(true)}
            disabled={disabled}
            activeOpacity={0.7}
            style={styles.calendarButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="calendar" size={20} color={disabled ? theme.textDisabled : theme.brand} />
          </TouchableOpacity>
        </View>
        {error && (
          <AppText style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
        )}
      </View>

      <DatePickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handlePickerSelect}
        title={label || 'Выберите дату'}
        initialDate={initialDate}
        allowPastDates={allowPastDates}
        allowFutureDates={allowFutureDates}
      />
    </>
  );
};

export default DateInput;

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    padding: 0,
    letterSpacing: -0.2,
  },
  calendarButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});

