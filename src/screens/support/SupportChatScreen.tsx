import React, {useEffect} from 'react';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {RootState} from '../../modules/store';
import SupportChat from '../../component/support/SupportChat';

/**
 * Экран «Чат с поддержкой» (AccountStackScreen → supportChat).
 * Полноэкранный, без таб-бара (SCREENS_WITHOUT_TAB_BAR / ROOT_SCREENS_WITHOUT_TAB_BAR).
 * Требует авторизации — иначе уводит на login, как «Аккаунт».
 */
const SupportChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const {accessToken, fullAuth} = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!fullAuth || !accessToken) {
      navigation.navigate('login', {
        returnTo: 'supportChat',
        returnParams: route.params || {},
      });
    }
  }, [accessToken, fullAuth, navigation, route.params]);

  if (!fullAuth || !accessToken) {
    return null;
  }

  return <SupportChat />;
};

export default SupportChatScreen;
