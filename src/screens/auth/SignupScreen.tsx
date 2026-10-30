import React from 'react';
import { AuthScreen } from './LoginScreen';

/**
 * Маршрут signup (переходы с почтой в параметрах): тот же экран «Вход / Регистрация»
 * (LoginScreen.tsx), открытый на вкладке «Регистрация».
 */
const SignupScreen = () => <AuthScreen initialMode="signup" />;

export default SignupScreen;
