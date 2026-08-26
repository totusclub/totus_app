import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../text';
import AppButton from '../button';
import { useTheme } from '../../../hooks/useTheme';

type DatePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  title: string;
  initialDate?: Date;
  allowPastDates?: boolean;
  allowFutureDates?: boolean;
};

const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const MONTH_NAMES_SHORT = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
];

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  title,
  initialDate,
  allowPastDates = false,
  allowFutureDates = true,
}) => {
  const { theme } = useTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getValidInitialDate = () => {
    if (!initialDate) return today;
    const date = new Date(initialDate);
    date.setHours(0, 0, 0, 0);
    if (!allowPastDates && date < today) {
      return today;
    }
    if (!allowFutureDates && date > today) {
      return today;
    }
    return date;
  };

  const initialDateValue = getValidInitialDate();
  const [selectedDate, setSelectedDate] = useState<Date>(initialDateValue);
  const [selectedMonth, setSelectedMonth] = useState(initialDateValue.getMonth());
  const [selectedYear, setSelectedYear] = useState(initialDateValue.getFullYear());
  const [selectedDay, setSelectedDay] = useState(initialDateValue.getDate());

  const dayScrollRef = React.useRef<ScrollView>(null);
  const monthScrollRef = React.useRef<ScrollView>(null);
  const yearScrollRef = React.useRef<ScrollView>(null);

  const insets = useSafeAreaInsets();

  // Generate years (current year ± 100 years)
  const years = useMemo(() => {
    const currentYear = today.getFullYear();
    const yearsList: number[] = [];
    const startYear = allowPastDates ? currentYear - 100 : currentYear;
    const endYear = allowFutureDates ? currentYear + 50 : currentYear;
    for (let year = startYear; year <= endYear; year++) {
      yearsList.push(year);
    }
    return yearsList;
  }, [allowPastDates, allowFutureDates]);

  // Scroll to selected values when modal opens
  React.useEffect(() => {
    if (visible) {
      // Reset to initial date when modal opens
      const date = getValidInitialDate();
      setSelectedDate(date);
      setSelectedMonth(date.getMonth());
      setSelectedYear(date.getFullYear());
      setSelectedDay(date.getDate());

      // Scroll to selected values after a short delay
      setTimeout(() => {
        const dayIndex = date.getDate() - 1;
        const monthIndex = date.getMonth();
        const yearIndex = years.findIndex(y => y === date.getFullYear());

        if (dayScrollRef.current && dayIndex >= 0) {
          dayScrollRef.current.scrollTo({
            y: dayIndex * 48 - 100, // 48 is item height, 100 is padding
            animated: true,
          });
        }
        if (monthScrollRef.current && monthIndex >= 0) {
          monthScrollRef.current.scrollTo({
            y: monthIndex * 48 - 100,
            animated: true,
          });
        }
        if (yearScrollRef.current && yearIndex >= 0) {
          yearScrollRef.current.scrollTo({
            y: yearIndex * 48 - 100,
            animated: true,
          });
        }
      }, 100);
    }
  }, [visible, years]);

  // Update selected date when month/year/day changes
  React.useEffect(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const day = Math.min(selectedDay, daysInMonth);
    const newDate = new Date(selectedYear, selectedMonth, day);
    newDate.setHours(0, 0, 0, 0);
    setSelectedDate(newDate);
  }, [selectedMonth, selectedYear, selectedDay]);

  // Generate days for selected month/year
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  const days = useMemo(() => {
    const daysList: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      daysList.push(day);
    }
    return daysList;
  }, [daysInMonth]);

  const isDateValid = (day: number, month: number, year: number): boolean => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    if (!allowPastDates && date < today) {
      return false;
    }
    if (!allowFutureDates && date > today) {
      return false;
    }
    return true;
  };

  const handleConfirm = () => {
    if (isDateValid(selectedDay, selectedMonth, selectedYear)) {
      const date = new Date(selectedYear, selectedMonth, selectedDay);
      date.setHours(0, 0, 0, 0);
      onSelect(date);
    }
    onClose();
  };

  const formatSelectedDate = () => {
    const month = (selectedMonth + 1).toString().padStart(2, '0');
    const day = selectedDay.toString().padStart(2, '0');
    const year = selectedYear.toString();
    return `${day} ${MONTH_NAMES[selectedMonth]} ${year}`;
  };

  const getPickerItemStyles = (
    isSelected: boolean,
    isValid: boolean
  ): ViewStyle[] => {
    const styleArray: ViewStyle[] = [styles.pickerItem];
    if (isSelected) {
      styleArray.push({ backgroundColor: theme.brand });
    }
    if (!isValid) {
      styleArray.push(styles.pickerItemDisabled);
    }
    return styleArray;
  };

  const getPickerTextStyles = (
    isSelected: boolean,
    isValid: boolean
  ): TextStyle[] => {
    const styleArray: TextStyle[] = [styles.pickerItemText, { color: theme.text }];
    if (isSelected) {
      styleArray.push({ color: theme.textInverse, fontWeight: '600' });
    }
    if (!isValid) {
      styleArray.push({ color: theme.textTertiary });
    }
    return styleArray;
  };

  return (
    <Modal
      style={styles.modal}
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      backdropOpacity={0.5}
      hasBackdrop={true}>
      <View
        style={[
          styles.modalContent,
          {
            paddingBottom: insets.bottom + 20,
            backgroundColor: theme.background,
          },
        ]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
          <AppText style={[styles.headerTitle, { color: theme.text }]}>{title}</AppText>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>

          </TouchableOpacity>
        </View>

        {/* Picker Content */}
        <View style={styles.pickerContainer}>
          {/* Day Picker */}
          <View style={styles.pickerColumn}>
            <AppText style={[styles.pickerLabel, { color: theme.textTertiary }]}>День</AppText>
            <ScrollView
              ref={dayScrollRef}
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerContent}
              showsVerticalScrollIndicator={false}
              bounces={false}>
              {days.map((day) => {
                const isValid = isDateValid(day, selectedMonth, selectedYear);
                const isSelected = day === selectedDay;
                return (
                  <TouchableOpacity
                    key={day}
                    style={getPickerItemStyles(isSelected, isValid)}
                    onPress={() => isValid && setSelectedDay(day)}
                    disabled={!isValid}
                    activeOpacity={0.7}>
                    <AppText style={getPickerTextStyles(isSelected, isValid)}>
                      {day}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Month Picker */}
          <View style={styles.pickerColumn}>
            <AppText style={[styles.pickerLabel, { color: theme.textTertiary }]}>Месяц</AppText>
            <ScrollView
              ref={monthScrollRef}
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerContent}
              showsVerticalScrollIndicator={false}
              bounces={false}>
              {MONTH_NAMES_SHORT.map((month, index) => {
                const isValid = isDateValid(selectedDay, index, selectedYear);
                const isSelected = index === selectedMonth;
                return (
                  <TouchableOpacity
                    key={index}
                    style={getPickerItemStyles(isSelected, isValid)}
                    onPress={() => {
                      if (isValid) {
                        setSelectedMonth(index);
                        // Adjust day if it exceeds days in new month
                        const daysInNewMonth = new Date(selectedYear, index + 1, 0).getDate();
                        if (selectedDay > daysInNewMonth) {
                          setSelectedDay(daysInNewMonth);
                        }
                      }
                    }}
                    disabled={!isValid}
                    activeOpacity={0.7}>
                    <AppText style={getPickerTextStyles(isSelected, isValid)}>
                      {month}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Year Picker */}
          <View style={styles.pickerColumn}>
            <AppText style={[styles.pickerLabel, { color: theme.textTertiary }]}>Год</AppText>
            <ScrollView
              ref={yearScrollRef}
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerContent}
              showsVerticalScrollIndicator={false}
              bounces={false}>
              {years.map((year) => {
                const isValid = isDateValid(selectedDay, selectedMonth, year);
                const isSelected = year === selectedYear;
                return (
                  <TouchableOpacity
                    key={year}
                    style={getPickerItemStyles(isSelected, isValid)}
                    onPress={() => {
                      if (isValid) {
                        setSelectedYear(year);
                        // Adjust day if it exceeds days in new year's month
                        const daysInNewMonth = new Date(year, selectedMonth + 1, 0).getDate();
                        if (selectedDay > daysInNewMonth) {
                          setSelectedDay(daysInNewMonth);
                        }
                      }
                    }}
                    disabled={!isValid}
                    activeOpacity={0.7}>
                    <AppText style={getPickerTextStyles(isSelected, isValid)}>
                      {year}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Confirm Button */}
        <View style={styles.buttonContainer}>
          <AppButton
            title={formatSelectedDate() || 'Выбрать дату'}
            onPress={handleConfirm}
            size="large"
          />
        </View>
      </View>
    </Modal >
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 300,
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  pickerScroll: {
    flex: 1,
    width: '100%',
  },
  pickerContent: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
  },
  pickerItem: {
    width: 60,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  pickerItemSelected: {
  },
  pickerItemDisabled: {
    opacity: 0.3,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '400',
  },
  pickerItemTextSelected: {
  },
  pickerItemTextDisabled: {
  },
  buttonContainer: {
    marginTop: 8,
  },
});

export default DatePickerModal;

