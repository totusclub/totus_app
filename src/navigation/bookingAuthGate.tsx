import * as React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../modules/store';

/**
 * Бронирование только для вошедших (06.11.2026): экраны booking и checkout во всех стеках обёрнуты
 * этим guard'ом. Гость сразу переводится на вход/регистрацию (AccountStackScreen → login) с
 * returnTo = имя экрана и returnParams = его параметры (выбранный тур): после подтверждения кода
 * Verification через returnAfterLogin возвращает на этот же экран, и оформление продолжается.
 * До этого вход проверялся только кнопкой «Перейти к бронированию» на ticketDetails; другие пути
 * к booking/checkout (отель без перелёта, чат Totus AI, deep link) гостя не останавливали.
 */
export function withBookingAuth<P extends object>(Screen: React.ComponentType<P>): React.FC<P> {
  const BookingAuthGate: React.FC<P> = (props) => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { accessToken, fullAuth } = useSelector((state: RootState) => state.auth);
    const authorized = Boolean(accessToken && fullAuth);

    React.useEffect(() => {
      if (authorized) return;
      navigation.navigate('tab', {
        screen: 'AccountStackScreen',
        params: {
          screen: 'login',
          params: {
            returnTo: route.name,
            returnParams: route.params,
          },
        },
      });
    }, [authorized, navigation, route.name, route.params]);

    if (!authorized) return null;
    return <Screen {...props} />;
  };
  BookingAuthGate.displayName = `withBookingAuth(${Screen.displayName || Screen.name || 'Screen'})`;
  return BookingAuthGate;
}
