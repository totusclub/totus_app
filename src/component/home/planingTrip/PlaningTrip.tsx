import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppText } from '../../UI';
import RecommendTripCard from './RecommendTripCard';
import { useTheme } from '../../../hooks/useTheme';
import { buildRecommendedHotelRouteParams } from '../../../utils/hotelUtils/recommendedHotelNavigation';
import { useLayout } from '../../../hooks/useLayout';
import { TabletGrid } from '../../UI/tablet';

type PlaningTripProps = {
  recommendHotels?: any[] | null;
};

export const PlaningTrip: React.FC<PlaningTripProps> = ({ recommendHotels }) => {
  const { theme } = useTheme();
  const { isTablet, layoutClass } = useLayout();
  const navigation = useNavigation<any>();

  const handlePressHotel = useCallback(
    (hotelId: string | number) => {
      if (hotelId == null || hotelId === '') {
        return;
      }
      // Same as kedam_WEB HotDealsSlide → buildHotelDetailsDeepLinkQuery
      const routeParams = buildRecommendedHotelRouteParams(hotelId);
      navigation.navigate('hotel', routeParams);
    },
    [navigation],
  );

  // iPad only: grid (3 columns portrait / 4 landscape) instead of the horizontal strip.
  const tabletColumns = layoutClass === 'expanded' ? 4 : 3;

  return (
    <View style={styles.wrapper}>
      <AppText style={[styles.title, isTablet && styles.titleTablet, { color: theme.text }]}>
        Начните планирование путешествия здесь
      </AppText>
      {isTablet ? (
        <View style={styles.gridTablet}>
          <TabletGrid
            items={recommendHotels ?? []}
            columns={tabletColumns}
            gap={16}
            rowStyle={styles.gridRowTablet}
            keyExtractor={(hotel: any, index: number) => String(hotel.id ?? index)}
            renderItem={(hotel: any) => (
              <RecommendTripCard
                hotel={hotel}
                onPress={() => handlePressHotel(hotel.id)}
                style={styles.cardTablet}
              />
            )}
          />
        </View>
      ) : (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.container}>
          {recommendHotels?.map((hotel, index) => (
            <RecommendTripCard
              key={hotel.id ?? index}
              hotel={hotel}
              onPress={() => handlePressHotel(hotel.id)}
              style={[
                styles.card,
                index === recommendHotels.length - 1 && styles.lastCard,
              ]}
            />
          ))}
        </View>
      </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
      marginLeft:16,
      marginRight:16
  },
  wrapper: {
   marginHorizontal: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 24,
    marginBottom: 16,
    marginTop: 16,
      marginLeft:16
  },
  card: {
    marginRight: 16,
  },
  lastCard: {
    marginRight: 0,
  },
  // --- iPad only (never applied on phone) ---
  titleTablet: {
    marginLeft: 24,
  },
  gridTablet: {
    paddingHorizontal: 24,
  },
  gridRowTablet: {
    marginBottom: 16,
  },
  cardTablet: {
    width: '100%',
  },
});
