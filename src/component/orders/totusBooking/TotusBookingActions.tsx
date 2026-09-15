import React, { useCallback } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { AppButton } from '../../UI';
import { navigateRoot } from '../../../navigation/navigationRef';
import { SUPPORT_CHAT_ROUTE } from '../../../modules/support/supportConstants';
import { buildRecommendedHotelRouteParams } from '../../../utils/hotelUtils/recommendedHotelNavigation';
import type { TotusBooking } from '../../../utils/totusBooking';

/** Существующий чат поддержки (AccountStackScreen → supportChat), как deep-link `support_chat` из пушей. */
export function openTotusSupportChat(): void {
  navigateRoot('tab', {
    screen: 'AccountStackScreen',
    params: { screen: SUPPORT_CHAT_ROUTE, initial: false },
  });
}

/** Страница отеля по `hotel.id` (наш hotel_id = id отеля в каталоге) или главная/поиск. */
export function openTotusPickAnotherRoom(booking: TotusBooking | null | undefined): void {
  const hotelId = booking?.hotel?.id;
  if (hotelId && hotelId > 0) {
    navigateRoot('tab', {
      screen: 'HomeStackScreen',
      params: {
        screen: 'hotel',
        params: buildRecommendedHotelRouteParams(hotelId),
        initial: false,
      },
    });
    return;
  }
  navigateRoot('tab', { screen: 'HomeStackScreen', params: { screen: 'home' } });
}

type Props = {
  booking: TotusBooking;
  style?: StyleProp<ViewStyle>;
};

/**
 * Кнопки внутреннего бронирования: «Написать в поддержку» (существующий чат поддержки)
 * и при отклонении/отмене — «Подобрать другой номер».
 */
const TotusBookingActions: React.FC<Props> = ({ booking, style }) => {
  const rejected = booking.status === 'rejected' || booking.status === 'cancelled';

  const handleSupport = useCallback(() => {
    openTotusSupportChat();
  }, []);

  const handlePickAnother = useCallback(() => {
    openTotusPickAnotherRoom(booking);
  }, [booking]);

  return (
    <View style={[styles.actions, style]}>
      {rejected && (
        <AppButton title="Подобрать другой номер" size="large" onPress={handlePickAnother} />
      )}
      <AppButton
        title="Написать в поддержку"
        size="large"
        type="outline"
        onPress={handleSupport}
      />
    </View>
  );
};

export default TotusBookingActions;

const styles = StyleSheet.create({
  actions: {
    width: '100%',
    gap: 12,
  },
});
