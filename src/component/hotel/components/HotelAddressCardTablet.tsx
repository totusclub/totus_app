import React, { useCallback, useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { AppButton, AppText } from '../../UI';
import type { HotelInfo } from '../../UI';
import type { ApiHotelData } from '../../../types/hotel';
import { useTheme } from '../../../hooks/useTheme';
import TotusIconByKey from '../../UI/icons/totus/TotusIconByKey';

/**
 * iPad only: address block that sits under the price/search column on the
 * hotel page (Figma «iPad / Hotel page»). Opens the hotel in Apple Maps —
 * the app has no map SDK, so this is a deep link, not an embedded map.
 * Never rendered on iPhone.
 */
type Props = {
  hotel: HotelInfo;
  apiHotelData?: ApiHotelData;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const HotelAddressCardTablet: React.FC<Props> = ({ hotel, apiHotelData }) => {
  const { theme } = useTheme();

  const address = hotel.address || 'Адрес не указан';

  const mapsUrl = useMemo(() => {
    const lat = toNumber(apiHotelData?.lat ?? apiHotelData?.latitude);
    const lng = toNumber(apiHotelData?.long ?? apiHotelData?.lng ?? apiHotelData?.longitude);
    const query = encodeURIComponent([hotel.name, hotel.address].filter(Boolean).join(', '));
    if (lat !== null && lng !== null) {
      return `https://maps.apple.com/?ll=${lat},${lng}&q=${query}`;
    }
    return hotel.address ? `https://maps.apple.com/?q=${query}` : null;
  }, [apiHotelData?.lat, apiHotelData?.latitude, apiHotelData?.long, apiHotelData?.lng, apiHotelData?.longitude, hotel.name, hotel.address]);

  const openMap = useCallback(() => {
    if (!mapsUrl) return;
    Linking.openURL(mapsUrl).catch(() => undefined);
  }, [mapsUrl]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}>
      <AppText style={[styles.title, { color: theme.text }]}>Расположение</AppText>
      <View style={styles.addressRow}>
        <TotusIconByKey name="pin" size={16} color={theme.textSecondary} />
        <AppText style={[styles.address, styles.addressText, { color: theme.textSecondary }]}>{address}</AppText>
      </View>
      {mapsUrl ? (
        <AppButton title="Показать на карте" type="outline" size="sm" onPress={openMap} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    flexShrink: 1,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  address: {
    fontSize: 14,
    lineHeight: 18,
  },
});

export default HotelAddressCardTablet;
