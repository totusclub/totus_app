import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../modules/store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppIcon, HotelCard } from '../../component/UI';
import { useTheme } from '../../hooks/useTheme';
import { useLayout } from '../../hooks/useLayout';
import { getUserFavorites, removeFavorite, type Favorite } from '../../modules/api/favorites';
import { HotelInfo } from '../../types/hotel/hotelCard';
import { buildRecommendedHotelRouteParams } from '../../utils/hotelUtils/recommendedHotelNavigation';
import { favoriteImageSources } from '../../utils/favoriteHotel';
import { FONT_HEADING } from '../../theme/fonts';

const FavoritesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  // iPad only: hotel cards in a 2/3-column wrap grid; on phone `false` in style arrays is a no-op.
  const { isTablet, columns } = useLayout();
  const tabletCellStyle = isTablet && [styles.favoriteItemTablet, { width: `${100 / columns}%` as `${number}%` }];
  const { user: loggedInUser } = useSelector((state: RootState) => state.auth);
  
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const userId = loggedInUser ? (loggedInUser as any).id : null;

  const loadFavorites = useCallback(async () => {
    if (!userId) {
      return;
    }
    try {
      setLoading(true);
      const favs = await getUserFavorites(userId);
      setFavorites(favs);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить избранное');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Load on mount and every time Favorites tab/screen is focused.
  useFocusEffect(
    useCallback(() => {
      void loadFavorites();
    }, [loadFavorites]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleHotelPress = (hotel: HotelInfo) => {
    const hotelId = typeof hotel.id === 'string' ? parseInt(hotel.id, 10) : hotel.id;
    // Same handoff as home recommendations — hotel page needs searchParams to startSearch/rooms.
    const routeParams = buildRecommendedHotelRouteParams(hotelId);
    navigation.navigate('hotel', {
      ...routeParams,
      hotel,
    });
  };

  const handleRemoveFavorite = async (hotelId: number) => {
    if (!userId) return;

    Alert.alert(
      'Удалить из избранного',
      'Вы уверены, что хотите удалить этот отель из избранного?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFavorite(userId, hotelId);
              await loadFavorites();
            } catch (error: any) {
              Alert.alert('Ошибка', error.message || 'Не удалось удалить из избранного');
            }
          },
        },
      ]
    );
  };

  if (!userId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundSecondary, paddingTop: insets.top }]}>
        <View style={styles.emptyContainer}>
          <AppText style={[styles.emptyText, { color: theme.textTertiary }]}>
            Пожалуйста, войдите в систему для просмотра избранного
          </AppText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary, paddingTop: insets.top }]}>
      <AppText allowFontScaling={false} style={[styles.title, isTablet && styles.titleTablet, { color: theme.text }]}>
        Избранное
      </AppText>

      {/* Content */}
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.backgroundSecondary }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.brand}
            colors={[theme.brand]}
          />
        }>
        {loading && favorites.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.brand} />
            <AppText allowFontScaling={false} style={[styles.loadingText, { color: theme.textTertiary }]}>
              Загрузка избранного...
            </AppText>
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AppIcon name="heart" size={64} color={theme.textTertiary} />
            <AppText allowFontScaling={false} style={[styles.emptyText, { color: theme.textTertiary }]}>
              У вас пока нет избранных отелей
            </AppText>
            <AppText allowFontScaling={false} style={[styles.emptySubtext, { color: theme.textTertiary }]}>
              Добавьте отели в избранное, нажав на иконку сердца на странице отеля
            </AppText>
          </View>
        ) : (
          <View style={[styles.favoritesList, isTablet && styles.favoritesListTablet]}>
            {favorites.map((favorite) => {
              const hotelData = favorite.hotelData || ({} as any);
              // Ensure hotel has required HotelInfo structure
              const hotel: HotelInfo = {
                id: String(hotelData.id || favorite.hotelId),
                name: hotelData.name || 'Отель',
                reviews: hotelData.reviews || 0,
                rating: hotelData.rating || 0,
                stars: hotelData.stars || 0,
                // Записи с сайта хранят {webp_x620, x500,…}, из приложения — {uri}: приводим к {uri}.
                images: favoriteImageSources(hotelData),
                tags: hotelData.tags || [],
                price: hotelData.price || '',
                dateRange: hotelData.dateRange || '',
                address:
                  hotelData.address ||
                  [hotelData.city_name, hotelData.country_name].filter(Boolean).join(', ') ||
                  '',
              };
              return (
                <View key={favorite.id} style={[styles.favoriteItem, tabletCellStyle]}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleHotelPress(hotel)}
                    style={styles.hotelCardWrapper}>
                    <HotelCard
                      hotel={hotel}
                      imageHeight={200}
                      showAddress
                      showTags={false}
                      onPress={() => handleHotelPress(hotel)}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.removeButton,
                      isTablet && styles.removeButtonTablet,
                      { backgroundColor: theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)' },
                    ]}
                    onPress={() => handleRemoveFavorite(favorite.hotelId)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <AppIcon name="heart" size={24} color={theme.error || '#FF3B30'} filled={true} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 12,
    paddingTop: 16,
    textAlign: 'left',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  favoritesList: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16,
  },
  favoriteItem: {
    position: 'relative',
  },
  hotelCardWrapper: {
    marginBottom: 8,
    width: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // iPad grid: 24 screen padding = 16 (list) + 8 (cell); 16 gap between columns = 8 + 8, rows keep gap 16.
  titleTablet: {
    paddingHorizontal: 24,
  },
  favoritesListTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    columnGap: 0,
    paddingHorizontal: 16,
  },
  favoriteItemTablet: {
    paddingHorizontal: 8,
  },
  removeButtonTablet: {
    right: 28,
  },
});

export default FavoritesScreen;
