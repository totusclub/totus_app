import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppIcon, AppText } from '../UI';
import { useTheme } from '../../hooks/useTheme';
import {
  formatMoneyRub,
  getMinFlightOfferTotal,
  getPackageBasePrice,
  toMoney,
} from '../../utils/packagePrice';
import { FONT_HEADING } from '../../theme/fonts';

type SelectedTourCardProps = {
  packageInfo: any;
  flights?: any[] | null;
};

const formatTourPrice = (amount: number) =>
  formatMoneyRub(amount).replace(' ₽', ' ₽');

const SelectedTourCard: React.FC<SelectedTourCardProps> = ({
  packageInfo,
  flights,
}) => {
  const { theme } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);

  const { totalPrice, fees, hasFlights } = useMemo(() => {
    const basePrice = getPackageBasePrice(packageInfo);
    const fromFlights =
      Array.isArray(flights) && flights.length > 0
        ? getMinFlightOfferTotal(basePrice, flights)
        : basePrice + toMoney(packageInfo?.predicted_surcharge);
    return {
      totalPrice: fromFlights,
      fees: Math.max(0, fromFlights - basePrice),
      hasFlights: Array.isArray(flights) && flights.length > 0,
    };
  }, [packageInfo, flights]);

  if (!packageInfo) return null;

  const hotel = packageInfo.hotel ?? {};
  const stars = Number(hotel.stars) || 0;
  const roomName =
    packageInfo.room_info?.name_ru || packageInfo.room?.name_ru || '';
  const meal = packageInfo.pansion_description || packageInfo.meal_type || '';
  const location = [hotel.city, hotel.country].filter(Boolean).join(', ');
  const imageUri =
    packageInfo.room_info?.images?.[0]?.['x260x150'] ||
    packageInfo.room_info?.images?.[0]?.x500 ||
    hotel.images?.[0]?.webp_x620 ||
    hotel.images?.[0]?.x500;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}>
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.badge,
            { backgroundColor: `${theme.brand}14` },
          ]}>
          <AppIcon name="checkmark" size={14} color={theme.brand} />
          <AppText style={[styles.badgeText, { color: theme.brand }]}>
            Выбранный тур
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        {imageUri && !imageFailed ? (
          <Image
            source={{ uri: String(imageUri) }}
            style={styles.image}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.imagePlaceholder,
              { backgroundColor: theme.backgroundTertiary },
            ]}>
            <AppIcon name="radiologo" size={44} color={theme.text} />
          </View>
        )}

        <View style={styles.info}>
          {stars > 0 ? (
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(star => (
                <AppIcon
                  key={star}
                  name="starFilled"
                  size={12}
                  color={stars >= star ? theme.brand : theme.border}
                />
              ))}
            </View>
          ) : null}

          <AppText
            style={[styles.hotelName, { color: theme.text }]}
            numberOfLines={2}>
            {hotel.name || 'Отель'}
          </AppText>

          {location ? (
            <AppText
              style={[styles.meta, { color: theme.textTertiary }]}
              numberOfLines={1}>
              {location}
            </AppText>
          ) : null}

          {(roomName || meal) ? (
            <AppText
              style={[styles.meta, { color: theme.textSecondary }]}
              numberOfLines={2}>
              {[roomName, meal ? `«${meal}»` : ''].filter(Boolean).join(' · ')}
            </AppText>
          ) : null}

          {packageInfo.operator?.name ? (
            <AppText
              style={[styles.operator, { color: theme.textTertiary }]}
              numberOfLines={1}>
              {packageInfo.operator.name}
            </AppText>
          ) : null}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

      <View style={styles.priceRow}>
        <AppText style={[styles.priceLabel, { color: theme.textTertiary }]}>
          {hasFlights ? 'Тур с перелётом от' : 'Стоимость тура'}
        </AppText>
        <View style={styles.priceValues}>
          <AppText style={[styles.total, { color: theme.text }]}>
            {formatTourPrice(totalPrice)}
          </AppText>
          {fees > 0 ? (
            <AppText style={[styles.fees, { color: theme.textTertiary }]}>
              Доплаты +{formatTourPrice(fees)}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  body: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  image: {
    width: 92,
    height: 92,
    borderRadius: 18,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingTop: 2,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 2,
  },
  hotelName: {
    fontFamily: FONT_HEADING,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  meta: {
    fontSize: 13,
    lineHeight: 17,
  },
  operator: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  priceLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
  },
  priceValues: {
    alignItems: 'flex-end',
    gap: 2,
  },
  total: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  fees: {
    fontSize: 11,
    lineHeight: 14,
  },
});

export default React.memo(SelectedTourCard);
