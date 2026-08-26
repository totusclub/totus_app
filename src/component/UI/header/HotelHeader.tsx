import React, { useCallback, useState, useEffect } from 'react';
import { Share, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AppIcon from '../icons';
import AppText from '../text';
import { useTheme } from '../../../hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '../../../modules/store';
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite } from '../../../modules/api/favorites';
import { useHotelDetails } from '../../../modules/hooks/useHotelDetails';

const HotelHeader: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user: loggedInUser } = useSelector((state: RootState) => state.auth);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get hotel ID from route params
  const routeParams = route.params as any;
  const hotelId = routeParams?.hotelId || routeParams?.hotel?.id || null;
  const passedHotel = routeParams?.hotel || null;
  const userId = loggedInUser ? (loggedInUser as any).id : null;

  // Fetch hotel data if not passed in params
  const { hotel: fetchedHotel } = useHotelDetails(hotelId ? String(hotelId) : null);
  const hotel = passedHotel || fetchedHotel;

  // Check if hotel is favorited on mount and when hotel/user change
  useEffect(() => {
    if (userId && hotelId) {
      checkFavoriteStatus();
    }
  }, [userId, hotelId]);

  const checkFavoriteStatus = async () => {
    if (!userId || !hotelId) return;
    try {
      const favorited = await checkIsFavorite(userId, parseInt(String(hotelId), 10));
      setIsFavorite(favorited);
    } catch {
      // isFavorite already falls back to false
    }
  };

  const handleShare = useCallback(() => {
    if (!hotel) {
      Share.share({
        message: 'Посмотрите этот отель в нашем клубе путешествий!',
      }).catch(error => console.log('Share error', error));
      return;
    }

    // Build share message with hotel details (text only, no image)
    const hotelName = hotel.name || 'Отель';
    const stars = hotel.stars ? '⭐'.repeat(hotel.stars) + ' ' : '';
    const rating = hotel.rating ? `\nРейтинг: ${hotel.rating.toFixed(1)}` : '';
    const reviews = hotel.reviews ? ` (${hotel.reviews} отзывов)` : '';
    const city = hotel.city_name ? `\n📍 ${hotel.city_name}` : '';
    const address = hotel.address ? `\n${hotel.address}` : '';

    const shareMessage = `🏨 ${stars}${hotelName}${rating}${reviews}${city}${address}\n\nПосмотрите этот отель в нашем клубе путешествий Totus!`;

    Share.share({
      message: shareMessage,
      title: hotelName,
    }).catch(error => console.log('Share error', error));
  }, [hotel]);

  const handleFavoriteToggle = async () => {
    if (!userId || !hotelId) {
      Alert.alert('Ошибка', 'Пожалуйста, войдите в систему для добавления в избранное');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      const hotelIdNum = parseInt(String(hotelId), 10);
      
      if (isFavorite) {
        // Remove from favorites
        await removeFavorite(userId, hotelIdNum);
        setIsFavorite(false);
        Alert.alert('Удалено', 'Отель удален из избранного');
      } else {
        // Add to favorites - save complete hotel data
        const hotelDataToSave = hotel ? {
          id: hotel.id,
          name: hotel.name,
          name_en: hotel.name_en,
          city_name: hotel.city_name,
          stars: hotel.stars,
          rating: hotel.rating,
          reviews: hotel.reviews,
          images: hotel.images || [],
          tags: hotel.tags || [],
          address: hotel.address,
          ...hotel, // Include all other hotel properties
        } : {
          id: hotelIdNum,
          name: routeParams?.hotel?.name || 'Отель',
        };
        await addFavorite(userId, hotelIdNum, hotelDataToSave);
        setIsFavorite(true);
        Alert.alert('Добавлено', 'Отель добавлен в избранное');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось изменить статус избранного');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.borderLight }]}>
        <View style={styles.sideContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <AppIcon name="simpleArrow" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <AppText style={[styles.headerTitle, { color: theme.text }]}>Отель</AppText>

        <View style={[styles.sideContainer, styles.rightButtons]}>
          {userId && hotelId && (
            <TouchableOpacity
              activeOpacity={1}
              style={styles.headerButton}
              onPress={handleFavoriteToggle}
              disabled={isLoading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <AppIcon
                name="heart"
                size={24}
                color={isFavorite ? (theme.error || '#FF3B30') : theme.text}
                filled={isFavorite}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            activeOpacity={1}
            style={styles.headerButton}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AppIcon name="share" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default HotelHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    padding: 8,
    borderBottomWidth: 2,
  },
  sideContainer: {
    width: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});

