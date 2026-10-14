import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppButton } from '../../../UI';
import { useTheme } from '../../../../hooks/useTheme';
import { FONT_HEADING } from '../../../../theme/fonts';

type DateSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  title: string;
  initialDate?: Date;
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


const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
  title,
  initialDate,
}) => {
  const { theme } = useTheme();
  const today = new Date();
  // Reset time to start of day for accurate comparison
  today.setHours(0, 0, 0, 0);

  // Ensure initial date is not in the past
  const getValidInitialDate = () => {
    if (!initialDate) return today;
    const date = new Date(initialDate);
    date.setHours(0, 0, 0, 0);
    return date < today ? today : date;
  };

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    getValidInitialDate(),
  );
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top;
  const paddingBottom = insets.bottom;

  // Check if a date is in the past (comparing only date, not time)
  const isDateInPast = (day: number, month: Date): boolean => {
    const dateToCheck = new Date(month.getFullYear(), month.getMonth(), day);
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck < today;
  };

  // Get all months from current month (12 months forward for scrolling)
  const MONTHS_TO_SHOW = 13;
  const allMonths = useMemo(() => {
    const months: Date[] = [];
    for (let i = 0; i < MONTHS_TO_SHOW; i++) {
      months.push(new Date(today.getFullYear(), today.getMonth() + i, 1));
    }
    return months;
  }, []);

  // Generate calendar days for a month
  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Adjust to start from Monday (0 = Monday, 6 = Sunday)
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < adjustedStartingDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleDateSelect = (day: number, month: Date) => {
    const selected = new Date(
      month.getFullYear(),
      month.getMonth(),
      day,
    );
    selected.setHours(0, 0, 0, 0);

    // Prevent selecting past dates
    if (selected < today) {
      return;
    }

    setSelectedDate(selected);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onSelect(selectedDate);
    }
    onClose();
  };

  const isDateSelected = (day: number, month: Date) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month.getMonth() &&
      selectedDate.getFullYear() === month.getFullYear()
    );
  };

  const formatSelectedDate = () => {
    if (!selectedDate) return '';
    const day = selectedDate.getDate();
    const monthName = MONTH_NAMES[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    return `${day} ${monthName} ${year}`;
  };

  const renderCalendar = (month: Date, days: (number | null)[]) => {
    const monthName = MONTH_NAMES[month.getMonth()];
    const year = month.getFullYear();

    return (
      <View style={styles.calendarContainer}>
        <AppText style={[styles.monthTitle, { color: theme.text }]}>
          {monthName} {year}
        </AppText>
        <View style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (day === null) {
              return <View key={index} style={styles.calendarCell} />;
            }

            const isPast = isDateInPast(day, month);
            const isSelected = isDateSelected(day, month);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarCell,
                  isSelected && [styles.selectedCell, { backgroundColor: theme.brand }],
                  isPast && styles.disabledCell,
                ]}
                onPress={() => handleDateSelect(day, month)}
                disabled={isPast}
                activeOpacity={isPast ? 1 : 0.7}>
                <AppText
                  style={[
                    styles.dayText,
                    { color: theme.text },
                    ...(isSelected ? [styles.selectedDayText, { color: theme.textInverse }] : []),
                    ...(isPast ? [styles.disabledDayText, { color: theme.textDisabled }] : []),
                  ]}>
                  {day}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      style={styles.modal}
      isVisible={visible}
      animationIn="fadeIn"
      animationOut="fadeOut"
      // onBackdropPress={onClose}
      // onSwipeComplete={onClose}
      swipeDirection="left"
      backdropOpacity={0}
      hasBackdrop={false}>
      <View
        style={[
          styles.modalContent,
          {
            backgroundColor: theme.background,
            paddingTop: paddingTop + 20,
            paddingBottom: paddingBottom,
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <AppText style={[styles.headerTitle, { color: theme.text }]}>{title}</AppText>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
            </TouchableOpacity>
            <View style={[styles.headerUnderline, { backgroundColor: theme.border }]} />
          </View>
        </View>

        {/* Calendar Content - scrollable list of all months */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {allMonths.map((month, index) => (
            <React.Fragment key={`${month.getFullYear()}-${month.getMonth()}`}>
              {index > 0 && <View style={styles.monthSpacer} />}
              {renderCalendar(
                month,
                generateCalendarDays(month.getFullYear(), month.getMonth()),
              )}
            </React.Fragment>
          ))}
        </ScrollView>

        {/* Confirm Button */}
        <View style={styles.buttonContainer}>
          <AppButton
            title={formatSelectedDate() || 'Выбрать дату'}
            onPress={handleConfirm}
            disabled={!selectedDate}
            size="large"
          />
        </View>
      </View>
    </Modal>
  );
};

export default DateSelectionModal;

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    paddingHorizontal: 20,
    zIndex: 1,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
  },
  header: {
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    position: 'relative',
  },
  headerTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '700',
  },
  headerUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  calendarContainer: {
    marginBottom: 0,
    width: '100%',
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  selectedCell: {
    borderRadius: 9999,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  selectedDayText: {
  },
  disabledCell: {
    opacity: 0.3,
  },
  disabledDayText: {
  },
  monthSpacer: {
    height: 16,
  },
  buttonContainer: {
    marginTop: 20,
    paddingBottom: 0,

  },
});

