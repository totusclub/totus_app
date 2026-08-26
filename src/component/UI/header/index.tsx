import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import AppText from '../text';
import SearchResultHeader from './SearchResultHeader';
import HotelHeader from './HotelHeader';
import TicketsHeader from '../../tickets/TicketsHeader';
import TicketDetailsHeader from '../../tickets/ticket/TicketDetailsHeader';
import BookingHeader from './BookingHeader';
import CheckoutHeader from './CheckoutHeader';
import OrdersHeader from './OrdersHeader';
import OrderDetailsHeader from './OrderDetailsHeader';
import { useTheme } from '../../../hooks/useTheme';

type AppButtonProps = {
  title?: string;
  goBack?: () => void;
  onBack?: () => void;
};

const AppHeader = ({ title, goBack, onBack }: AppButtonProps) => {
  const { theme } = useTheme();
  const route = useRoute();
  const handleBack = goBack || onBack;

  const headerComponent = useMemo(() => {
    switch (route.name) {
      case 'searchResult':
        return <SearchResultHeader />;
      case 'hotel':
      case 'hotelFromAi':
        return <HotelHeader />;
      case 'tickets':
        return <TicketsHeader />;
      case 'ticketDetails':
        return <TicketDetailsHeader />;
      case 'booking':
        return <BookingHeader />;
      case 'checkout':
        return <CheckoutHeader />;
      case 'orders':
        return <OrdersHeader />;
      case 'orderDetails':
        return <OrderDetailsHeader />;
      default:
        return (
          <View style={styles.header}>
            {handleBack && (
              <TouchableOpacity
                activeOpacity={1}
                style={styles.backButton}
                onPress={() => handleBack()}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <AppText style={[styles.backButtonText, { color: theme.text }]}>Назад</AppText>
              </TouchableOpacity>
            )}

            {title && <AppText style={[styles.title, { color: theme.text }]}>{title}</AppText>}
          </View>
        );
    }
  }, [route.name, title, handleBack, theme]);

  return headerComponent;
};

export default AppHeader;
export { SearchResultHeader };

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  backButton: {
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 19,
  },
  title: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    zIndex: -1,
    fontSize: 16,
    fontWeight: '600',
  },
});
