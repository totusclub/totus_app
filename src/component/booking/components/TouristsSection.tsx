import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../../UI';
import type { Tourist, BookingValidationErrors } from '../../../types/booking';
import { TouristForm } from './TouristForm';
import { useTheme } from '../../../hooks/useTheme';
import { FONT_HEADING } from '../../../theme/fonts';

interface TouristsSectionProps {
  tourists: Tourist[];
  errors: BookingValidationErrors;
  onUpdateTourist: (index: number, key: keyof Tourist, value: string | boolean | number, additionalUpdates?: Partial<Tourist>) => void;
  onClearPatronymicError: (index: number) => void;
  onNoPatronymicToggle: (index: number, newValue: boolean) => void;
}

export const TouristsSection: React.FC<TouristsSectionProps> = ({
  tourists,
  errors,
  onUpdateTourist,
  onClearPatronymicError,
  onNoPatronymicToggle,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.formCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.sectionHeader}>
        <AppText style={[styles.sectionTitle, { color: theme.text }]}>Туристы</AppText>
        <AppText style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>
          Заполните данные в точности так, как в документе, по которому полетите
        </AppText>
      </View>

      {tourists.map((tourist, index) => {
        const touristErrors = errors.tourists?.[index] || {};

        return (
          <TouristForm
            key={index}
            tourist={tourist}
            index={index}
            errors={touristErrors}
            onUpdate={(key, value, additionalUpdates) => onUpdateTourist(index, key, value, additionalUpdates)}
            onClearPatronymicError={() => onClearPatronymicError(index)}
            onNoPatronymicToggle={(newValue) => onNoPatronymicToggle(index, newValue)}
            showDivider={index > 0}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  formCard: {
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
});

