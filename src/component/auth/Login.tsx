import React, { useState, useEffect } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { AppText, AppButton, AppInput } from '../UI';
import { loginUser } from '../../modules/store/actions/auth';
import { ELoginDataType } from '../../types/auth';
import { handleEmail } from '../../utils/login';
import { useTheme } from '../../hooks/useTheme';

type LoginRouteParams = {
  returnTo?: string;
  returnParams?: any;
  email?: string;
};

type LoginRoute = RouteProp<
  {
    login: LoginRouteParams;
  },
  'login'
>;

export const Login: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<LoginRoute>();
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const [email, setEmail] = useState(route.params?.email || '');
  const [disabled, setDisabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update disabled state when email from route params is set
  useEffect(() => {
    if (route.params?.email) {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(route.params.email);
      if (isEmail) {
        setDisabled(false);
      }
    }
  }, [route.params?.email]);

  const onEmailChange = (value: string) => {
    handleEmail(value, setEmail, setError, setDisabled);
  };

  const handleLogin = async () => {
    if (!email || disabled) return;

    try {
      setLoading(true);
      setError(null);
      const result = await dispatch(
        loginUser({
          type: ELoginDataType.email,
          email: email,
        }) as any,
      );

      if (loginUser.fulfilled.match(result)) {
        // Check if response contains "User not found" error - navigate to signup
        if (result.payload.screen === 'SIGNUP') {

          const { returnTo, returnParams } = route.params || {};
          navigation.navigate('signup', {
            email,
            returnTo,
            returnParams,
          });
          return;
        }
        // Navigate to verification screen with email and return navigation
        const { returnTo, returnParams } = route.params || {};
        navigation.navigate('verification', {
          email,
          returnTo,
          returnParams,
        });
      } else {
        setError(result.payload?.message || 'Произошла ошибка');
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
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText style={[styles.title, { color: theme.text }]}>Вход</AppText>
          <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
            Введите ваш email для входа в аккаунт
          </AppText>
        </View>

        <View style={styles.form}>
          <AppInput
            value={email}
            onChange={onEmailChange}
            placeholder="Электронная почта"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            focusBorderColor={theme.brand}
          />

          {error && (
            <View style={styles.errorContainer}>
              <AppText style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
            </View>
          )}

          <View style={styles.infoContainer}>
            <AppText style={[styles.infoText, { color: theme.textTertiary }]}>
              Мы отправим код подтверждения на вашу электронную почту
            </AppText>
          </View>

          <AppButton
            title="Войти"
            onPress={handleLogin}
            disabled={disabled || loading}
            size="large"
          />

          {/*<View style={styles.switchContainer}>*/}
          {/*  <AppText style={[styles.switchText, { color: theme.textTertiary }]}>Нет аккаунта? </AppText>*/}
          {/*  <TouchableOpacity onPress={() => navigation.navigate('signup')}>*/}
          {/*    <AppText style={[styles.switchLink, { color: theme.brand }]}>Зарегистрироваться</AppText>*/}
          {/*  </TouchableOpacity>*/}
          {/*</View>*/}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
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

