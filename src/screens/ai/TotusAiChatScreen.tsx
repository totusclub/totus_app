import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatScreen, useAssistantStore } from '@tosmedia/ai-assistant-native';
import { setAiHotelNavigator } from '../../utils/aiAssistantOpenHotel';
import { getAiReturnTab } from '../../utils/aiTabReturn';

/**
 * AI tab screen — Totus Мила chat; back returns to the tab the user came from.
 * On focus: reload MySQL history. On blur: flush active chat to MySQL.
 */
export default function TotusAiChatScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  useEffect(() => {
    setAiHotelNavigator((params) => {
      navigation.navigate('hotelFromAi', params);
    });
    return () => setAiHotelNavigator(null);
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      void useAssistantStore.getState().refreshHistory();
      return () => {
        void useAssistantStore.getState().flushPersist();
      };
    }, []),
  );

  const handleBack = useCallback(() => {
    // Do NOT use parent.goBack() — tab backBehavior sends to Home (first route).
    void useAssistantStore.getState().flushPersist();
    const returnTab = getAiReturnTab();
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate(returnTab);
      return;
    }
    navigation.navigate(returnTab);
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ChatScreen
        topInset={insets.top}
        bottomInset={Math.max(insets.bottom, 8)}
        showBackButton
        onBack={handleBack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
