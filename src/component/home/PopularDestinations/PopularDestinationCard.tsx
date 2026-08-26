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

interface PopularDestinationCardProps {
  style?: StyleProp<ViewStyle>;
  destination: any;
  handlePressHotel: any
}

export default function PopularDestinationCard({ destination, style, handlePressHotel }: PopularDestinationCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.touchable, style]}
      onPress={() => handlePressHotel(destination)}
    >
      <View style={styles.container}>
        <ImageBackground
          source={{ uri: destination.image }}
          style={styles.image}
          imageStyle={styles.imageBorderRadius}
        >

          <LinearGradient
            colors={['rgba(254, 115, 46, 0)', 'rgba(254, 115, 46, 0.9)']}
            style={styles.gradientBadge}>
            <View style={styles.badgeContainer}>
              <AppText style={styles.badgeText}>{destination.name}</AppText>
              <AppIcon name="arrowRight" size={18} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    width: 286,
  },
  badgeContainer: {
    position: 'absolute',
    top: '40%',
    left: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    overflow: 'hidden',
    opacity: 1,
  },
  image: {
    height: 180,
    width: '100%',
    justifyContent: 'flex-end',
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
    height: '40%', width: '100%',
    borderRadius: 16,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 32,
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
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
  subtitle: {
    color: '#7A7A7A',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',

  },
  ratingStar: {
    color: '#FE732E',
    fontSize: 16,
    marginRight: 6,
  },
  ratingValue: {
    color: '#FE732E',
    fontSize: 16,
    fontWeight: '500',
  },
});