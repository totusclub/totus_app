import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText, AppInput, AppPhoneInput } from '../../UI';
import type { BookingValidationErrors } from '../../../types/booking';
import { useTheme } from '../../../hooks/useTheme';

interface ContactSectionProps {
  email: string;
  phone: string;
  errors: BookingValidationErrors;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  email,
  phone,
  errors,
  onEmailChange,
  onPhoneChange,
}) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.formCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.sectionHeader}>
        <AppText style={[styles.sectionTitle, { color: theme.text }]}>Контакты покупателя</AppText>
        <AppText style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>Для получения документов к туру</AppText>
      </View>

      <View style={styles.form}>
        <AppInput
          value={email}
          onChange={onEmailChange}
          placeholder="Электронная почта"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          focusBorderColor="#FE732E"
        />
        {errors.email && (
          <AppText style={[styles.fieldError, { color: theme.error }]}>{errors.email}</AppText>
        )}

        <AppPhoneInput
          number={phone}
          onChangeNumber={onPhoneChange}
          placeholder="Номер телефона"
          setValid={() => { }}
          focusBorderColor={theme.brand}
        />
        {errors.phone && (
          <AppText style={[styles.fieldError, { color: theme.error }]}>{errors.phone}</AppText>
        )}
      </View>
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  form: {
    gap: 16,
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -12,
    marginBottom: 4,
  },
});

