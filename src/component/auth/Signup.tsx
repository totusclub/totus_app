import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { AppText, AppButton, AppInput, AppPhoneInput } from '../UI';
import { signupUser } from '../../modules/store/actions/auth';
import { ELoginDataType } from '../../types/auth';
import { useTheme } from '../../hooks/useTheme';
import { TabletCentered } from '../UI/tablet';

type SignupRouteParams = {
  returnTo?: string;
  returnParams?: any;
  email?: string;
};

type SignupRoute = RouteProp<
  {
    signup: SignupRouteParams;
  },
  'signup'
>;

export const Signup: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<SignupRoute>();
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(route.params?.email || '');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return 'Введите имя';
        return null;
      case 'lastName':
        if (!value.trim()) return 'Введите фамилию';
        return null;
      case 'email':
        if (!value.trim()) return 'Введите email';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Некорректный email';
        return null;
      case 'phone':
        if (!value || value.length < 16) return 'Введите номер телефона';
        return null;
      default:
        return null;
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setError(null);
    const fieldError = validateField(field, value);
    setFieldErrors(prev => ({
      ...prev,
      [field]: fieldError || '',
    }));

    switch (field) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'phone':
        setPhone(value);
        break;
    }
  };

  const isFormValid = () => {
    return (
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      phone.length === 16 &&
      !Object.values(fieldErrors).some(err => err)
    );
  };

  const handleSignup = async () => {
    if (!isFormValid()) {
      // Validate all fields
      const errors: Record<string, string> = {};
      errors.firstName = validateField('firstName', firstName) || '';
      errors.lastName = validateField('lastName', lastName) || '';
      errors.email = validateField('email', email) || '';
      errors.phone = validateField('phone', phone) || '';
      setFieldErrors(errors);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Format phone number (remove formatting)
      const phoneRegex = phone.replace(/[^\d]/g, '');
      const formattedPhone = phoneRegex.startsWith('7') ? `+${phoneRegex}` : `+7${phoneRegex.slice(1)}`;

      const result = await dispatch(
        signupUser({
          type: ELoginDataType.email,
          email: email.trim(),
          phone: formattedPhone,
          name: firstName.trim(),
          l_name: lastName.trim(),
        }) as any,
      );

      if (signupUser.fulfilled.match(result)) {
        // Navigate to verification screen with email and return navigation
        const { returnTo, returnParams } = route.params || {};
        navigation.navigate('verification', {
          email,
          isSignup: true,
          returnTo,
          returnParams,
        });
      } else {
        const errorMessage = result.payload?.message || 'Ошибка при регистрации';
        setError(errorMessage);
      }
    } catch (err: any) {
      setError(err?.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <TabletCentered>
          <View style={styles.header}>
            <AppText style={[styles.title, { color: theme.text }]}>Регистрация</AppText>
            <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
              Заполните данные для создания аккаунта
            </AppText>
          </View>

          <View style={styles.form}>
            <AppInput
              value={firstName}
              onChange={(value) => handleFieldChange('firstName', value)}
              placeholder="Имя"
              autoCapitalize="words"
              focusBorderColor={theme.brand}
            />
            {fieldErrors.firstName && (
              <AppText style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.firstName}</AppText>
            )}

            <AppInput
              value={lastName}
              onChange={(value) => handleFieldChange('lastName', value)}
              placeholder="Фамилия"
              autoCapitalize="words"
              focusBorderColor={theme.brand}
            />
            {fieldErrors.lastName && (
              <AppText style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.lastName}</AppText>
            )}

            <AppInput
              value={email}
              onChange={(value) => handleFieldChange('email', value)}
              placeholder="Электронная почта"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              focusBorderColor={theme.brand}
            />
            {fieldErrors.email && (
              <AppText style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.email}</AppText>
            )}

            <AppPhoneInput
              number={phone}
              onChangeNumber={(value) => handleFieldChange('phone', value)}
              placeholder="Номер телефона"
              setValid={() => { }}
              focusBorderColor={theme.brand}
            />
            {fieldErrors.phone && (
              <AppText style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.phone}</AppText>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <AppText style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
              </View>
            )}

            <View style={styles.infoContainer}>
              <AppText style={[styles.infoText, { color: theme.textTertiary }]}>
                Мы позвоним или отправим сообщение, чтобы подтвердить ваш номер. Применяются стандартные тарифы на сообщения и данные.
              </AppText>
            </View>

            <AppButton
              title="Зарегистрироваться"
              onPress={handleSignup}
              disabled={!isFormValid() || loading}
              size="large"
            />

            <View style={styles.switchContainer}>
              <AppText style={[styles.switchText, { color: theme.textTertiary }]}>Уже есть аккаунт? </AppText>
              <TouchableOpacity onPress={() => navigation.navigate('login')}>
                <AppText style={[styles.switchLink, { color: theme.brand }]}>Войти</AppText>
              </TouchableOpacity>
            </View>
          </View>
          </TabletCentered>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
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
  errorContainer: {
    marginTop: -8,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '400',
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '500',
  },
});

