import React from 'react';
import {
  ImageBackground,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { AppIcon, AppText } from '../../UI';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../../hooks/useTheme';

interface RecommendTripCardProps {
  style?: StyleProp<ViewStyle>;
  hotel: any;
  onPress?: () => void;
}

export default function RecommendTripCard({ hotel, style, onPress }: RecommendTripCardProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={[styles.touchable, style]}
    >
      <View style={styles.container}>
        <ImageBackground
          source={{ uri: hotel.image }}
          style={styles.image}
          imageStyle={styles.imageBorderRadius}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <LinearGradient colors={['#FE732E', 'rgba(254, 115, 46, 0.6)', 'rgba(254, 115, 46, 0.8)']}
                start={{ x: 0, y: 0.5 }}
                style={styles.gradientBadge}
                locations={[0, 0.651, 1]}
              >
                <View style={styles.badge}>
                  <AppText style={styles.badgeText}>Самый популярный</AppText>
                </View>
              </LinearGradient>
              {/*<LinearGradient*/}
              {/*  colors={['#FFFFFF', 'rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.8)']}*/}
              {/*  start={{ x: 0, y: 0.5 }}*/}
              {/*  end={{ x: 1, y: 0.5 }}*/}
              {/*  locations={[0, 0.651, 1]}*/}
              {/*  style={styles.gradientFavoriteButton}*/}
              {/*>*/}
              {/*  <View style={styles.favoriteButton}>*/}
              {/*    <AppIcon name='heart' size={20} color='#1F1F1F' />*/}
              {/*  </View>*/}
              {/*</LinearGradient>*/}
            </View>
          </View>
        </ImageBackground>
        <View style={styles.footer}>
          <View style={styles.footerTopRow}>
            <AppText numberOfLines={1} style={[styles.title, { color: theme.text }]}>
              {hotel.name}
            </AppText>
            <View style={styles.rating}>
              <AppText style={[styles.ratingStar, { color: theme.brand }]}>★</AppText>
              <AppText style={[styles.ratingValue, { color: theme.brand }]}>{hotel.rate}</AppText>
            </View>
          </View>
          <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>{hotel.city}</AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    width: 286,
  },
  container: {
    overflow: 'hidden',
    opacity: 1,
  },
  image: {
    height: 180,
    width: '100%',
  },
  imageBorderRadius: {
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(254, 115, 46, 1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gradientBadge: {
    borderRadius: 32,

  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  gradientFavoriteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  favoriteButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 20,
    color: '#F26662',
  },
  footer: {
    marginTop: 8,
    gap: 2,
  },
  footerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',

  },
  ratingStar: {
    fontSize: 16,
    marginRight: 6,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '500',
  },
});