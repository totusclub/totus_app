import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText, AppButton } from '../../UI';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { TabletCentered } from '../../UI/tablet';
import {
  formatMoneyRub,
  getBookingPriceBreakdown,
} from '../../../utils/packagePrice';

interface BookingFooterProps {
  onSubmit: () => void;
  disabled: boolean;
  loading: boolean;
}

export const BookingOrderSummary: React.FC<{
  packageData?: any;
  selectedFlight?: any;
}> = ({ packageData, selectedFlight }) => {
  const { theme } = useTheme();

  const { basePrice, fees, totalPrice } = useMemo(
    () => getBookingPriceBreakdown(packageData, selectedFlight),
    [packageData, selectedFlight],
  );

  const destination = useMemo(() => {
    const city = packageData?.hotel?.city;
    const country = packageData?.hotel?.country;
    if (city && country) return `Тур в ${city}, ${country}`;
    if (city) return `Тур в ${city}`;
    return 'Тур';
  }, [packageData]);

  const dateLabel = useMemo(() => {
    const start = packageData?.dates_info?.start_date;
    const end = packageData?.dates_info?.end_date;
    const nights = packageData?.nights_count;
    if (!start || !end) return null;

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return null;
    }

    const formatter = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
    const range = `${formatter.format(startDate)} – ${formatter.format(endDate)}`;
    return nights ? `${range}, на ${nights} ночей` : range;
  }, [packageData]);

  if (!packageData || totalPrice <= 0) return null;

  return (
    <View style={styles.orderCard}>
      <AppText style={[styles.orderTitle, { color: theme.text }]}>Ваш заказ</AppText>

      <View style={styles.row}>
        <AppText style={[styles.rowLabel, { color: theme.text }]} numberOfLines={2}>
          {destination}
        </AppText>
        <AppText style={[styles.rowValue, { color: theme.text }]}>
          {formatMoneyRub(basePrice)}
        </AppText>
      </View>

      {dateLabel ? (
        <AppText style={[styles.dateText, { color: theme.textTertiary }]}>
          {dateLabel}
        </AppText>
      ) : null}

      {fees > 0 ? (
        <View style={styles.row}>
          <AppText style={[styles.rowLabel, { color: theme.text }]}>
            Доплаты и сборы
          </AppText>
          <AppText style={[styles.rowValue, { color: theme.text }]}>
            +{formatMoneyRub(fees)}
          </AppText>
        </View>
      ) : null}

      <View style={[styles.divider, { backgroundColor: theme.borderLight }]} />

      <View style={styles.row}>
        <AppText style={[styles.totalLabel, { color: theme.text }]}>Итого</AppText>
        <AppText style={[styles.totalValue, { color: theme.text }]}>
          {formatMoneyRub(totalPrice)}
        </AppText>
      </View>
    </View>
  );
};

export const BookingLegalInfo: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={styles.legalWrap}>
      <AppText style={[styles.legalText, { color: theme.textTertiary }]}>
        Нажимая на кнопку, вы ознакомлены и соглашаетесь с{' '}
        <AppText style={[styles.legalLink, { color: theme.brand }]}>
          Политикой по перс. данным
        </AppText>{' '}
        и{' '}
        <AppText style={[styles.legalLink, { color: theme.brand }]}>
          Условиями продажи
        </AppText>
        , в т.ч. с потреб. свойствами Тура, указанными в Заказе
      </AppText>
    </View>
  );
};

export const BookingFooter: React.FC<BookingFooterProps> = ({
  onSubmit,
  disabled,
  loading,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: theme.cardBackground,
          borderTopColor: theme.borderLight,
        },
      ]}
    >
      <TabletCentered>
      <AppButton
        title="Отправить запрос"
        onPress={onSubmit}
        disabled={disabled || loading}
        isProcessing={loading}
        size="large"
      />
      </TabletCentered>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  orderCard: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 20,
    gap: 6,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  dateText: {
    fontSize: 13,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  legalWrap: {
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  legalText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    textAlign: 'center',
  },
  legalLink: {
    textDecorationLine: 'underline',
  },
});
