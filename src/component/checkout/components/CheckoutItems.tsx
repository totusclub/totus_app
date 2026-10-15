import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AppText, AppIcon } from '../../UI';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Order } from '../../../types/orders';
import FlightDetailsModal from './FlightDetailsModal';
import { getPackageData, formatPeriod } from '../../../utils/ordersUtils';
import { useTheme } from '../../../hooks/useTheme';
import { TabletCentered } from '../../UI/tablet';

interface CheckoutItemsProps {
  order: Order | null;
}

export const CheckoutItems: React.FC<CheckoutItemsProps> = ({ order }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [flightModalVisible, setFlightModalVisible] = useState(false);

  const pkg = useMemo(() => getPackageData(order || undefined), [order]);

  const formatDate = useMemo(() => {
    return formatPeriod(pkg);
  }, [pkg]);


  if (!order) {
    return null;
  }
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Info Banner */}


      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}>
        <TabletCentered>

        {/* <View style={[styles.topInfoBanner, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderBottomColor: theme.brand, shadowColor: theme.shadow }]}>
          <AppIcon name="warning" size={24} color={theme.brand} />
          <AppText style={[styles.infoBannerText, { color: theme.text }]}>Оплатите заказ в течение II часов</AppText>
        </View> */}

        {/* Самое важное */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <AppText style={[styles.sectionHeaderText, { color: theme.text }]}>
              Отдыхаем {pkg?.nights_count || 0} ночей
            </AppText>
          </View>

          <View style={styles.sectionTitle}>
            <AppText style={[styles.infoItemValue, { color: theme.text }]}>Самое важное</AppText>
          </View>

          <View style={[styles.infoItemsLayout, { backgroundColor: theme.backgroundSecondary }]}>
            <TouchableOpacity
              style={[styles.infoItem, { borderBottomColor: theme.divider }]}
              onPress={() => setFlightModalVisible(true)}
              activeOpacity={0.7}>
              <View style={styles.infoItemContent}>
                <AppText style={[styles.infoItemLabel, { color: theme.text }]}>Даты перелёта</AppText>
                <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>{formatDate}</AppText>
              </View>
              {/* <View style={styles.arrowIconContainer}>
                <AppIcon name="simpleArrow" size={24} color={theme.text} />
              </View> */}
            </TouchableOpacity>

            <View style={[styles.infoItem, { borderBottomColor: theme.divider }]}>
              <View style={styles.infoItemContent}>
                <AppText style={[styles.infoItemLabel, { color: theme.text }]}>Курорт</AppText>
                <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>
                  {pkg?.hotel?.city || ''}, {pkg?.hotel?.country || ''}
                </AppText>
              </View>
              {pkg?.hotel?.visa?.needed && (
                <AppText style={[styles.visaRequired, { color: theme.brand }]}>Требуется виза</AppText>
              )}
            </View>

            <View style={[styles.infoItem, { borderBottomColor: theme.divider }]}>
              <View style={styles.infoItemContent}>
                <AppText style={[styles.infoItemLabel, { color: theme.text }]}>Скорость бронирования</AppText>
                <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>Быстрое подтверждение</AppText>
              </View>
              {/* <View style={styles.arrowIconContainer}>
                <AppIcon name="simpleArrow" size={24} color={theme.text} />
              </View> */}
            </View>

            <View style={[styles.infoItem, styles.infoItemLast]}>
              <View style={styles.infoItemContent}>
                <AppText style={[styles.infoItemLabel, { color: theme.text }]}>Туроператор</AppText>
                <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>{pkg?.operator?.name || ''}</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Кто летит */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.sectionTitle}>
            <AppText style={[styles.sectionTitleText, { color: theme.text }]}>Кто летит</AppText>
          </View>

          <View style={[styles.infoItemsLayout, { backgroundColor: theme.backgroundSecondary }]}>
            {order.package.tourists?.map((tourist: any, index: number, array: any[]) => (
              <View
                key={tourist.id || index}
                style={[
                  styles.infoItem,
                  { borderBottomColor: theme.divider },
                  index === array.length - 1 && styles.infoItemLast,
                ]}>
                <View style={styles.infoItemContent}>
                  <AppText style={[styles.infoItemLabel, { color: theme.text }]}>
                    {tourist.name} {tourist.surname}
                  </AppText>
                  <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>
                    {tourist.birthday}, загран. паспорт {tourist.passport || ''}
                  </AppText>
                </View>
                {/* <View style={styles.arrowIconContainer}>
                  <AppIcon name="simpleArrow" size={24} color={theme.text} />
                </View> */}
              </View>
            ))}
          </View>
        </View>

        {/* Где живем */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.sectionTitle}>
            <AppText style={[styles.sectionTitleText, { color: theme.text }]}>Где живем</AppText>
          </View>

          <View style={[styles.infoItemsLayout, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.infoItem, { borderBottomColor: theme.divider }]}>
              <View style={styles.infoItemContent}>
                <AppText style={[styles.infoItemLabel, { color: theme.text }]}>Отель</AppText>
                <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>{pkg?.hotel?.name || ''}</AppText>
              </View>
              {/* <View style={styles.arrowIconContainer}>
                <AppIcon name="simpleArrow" size={24} color={theme.text} />
              </View> */}
            </View>

            <View style={[styles.infoItem, { borderBottomColor: theme.divider }]}>
              <View style={styles.infoItemContent}>
                <AppText style={[styles.infoItemLabel, { color: theme.text }]}>Номер</AppText>
                <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>{pkg?.room_info?.name_ru || ''}</AppText>
              </View>
              <View style={styles.arrowIconContainer}>
                <AppIcon name="simpleArrow" size={24} color={theme.text} />
              </View>
            </View>

            <View style={[styles.infoItem, styles.infoItemLast]}>
              <View style={styles.infoItemContent}>
                <AppText style={[styles.infoItemLabel, { color: theme.text }]}>Питание</AppText>
                <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>{pkg?.pansion_description || ''}</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* А что еще */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.sectionTitle}>
            <AppText style={[styles.sectionTitleText, { color: theme.text }]}>А что еще</AppText>
          </View>

          <View style={[styles.infoItemsLayout, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.infoItem, { borderBottomColor: theme.divider }]}>
              <View style={styles.infoItemContent}>
                <AppText style={[styles.infoItemLabel, { color: theme.text }]}>Страховка</AppText>
                <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>Включена в стоимость</AppText>
              </View>
              {/* <View style={styles.arrowIconContainer}>
                <AppIcon name="simpleArrow" size={24} color={theme.text} />
              </View> */}
            </View>

            <View style={[styles.infoItem, styles.infoItemLast]}>
              <View style={styles.infoItemContent}>
                <AppText style={[styles.infoItemLabel, { color: theme.text }]}>Трансфер</AppText>
                <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>Не включен в стоимость</AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Контакты покупателя */}
        <View style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.sectionTitle}>
            <AppText style={[styles.sectionTitleText, { color: theme.text }]}>Контакты покупателя</AppText>
          </View>

          <View style={[styles.infoItemsLayout, { backgroundColor: theme.backgroundSecondary }]}>
            {order.package.client?.phone && (
              <View style={[styles.infoItem, { borderBottomColor: theme.divider }]}>
                <View style={styles.infoItemContent}>
                  <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>{order.package.client.phone}</AppText>
                </View>
              </View>
            )}

            {order.package.client?.email && (
              <View style={[styles.infoItem, styles.infoItemLast]}>
                <View style={styles.infoItemContent}>
                  <AppText style={[styles.infoItemValue, { color: theme.textTertiary }]}>{order.package.client.email}</AppText>
                </View>
              </View>
            )}
          </View>

          {order.package.client?.email && (
            <View style={[styles.infoBanner, styles.infoBannerCompact, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderBottomColor: theme.brand, shadowColor: theme.shadow }]}>
              <AppIcon name="info" size={24} color={theme.brand} />
              <AppText style={[styles.infoBannerText, { color: theme.text }]}>
                Отправим документы на <AppText style={[styles.emailHighlight, { color: theme.brand }]}>{order.package.client.email}</AppText>
              </AppText>
            </View>
          )}
        </View>
        </TabletCentered>
      </ScrollView>

      <FlightDetailsModal
        visible={flightModalVisible}
        onClose={() => setFlightModalVisible(false)}
        flightData={order.package.flights?.[0]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginTop: 24,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderBottomWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  topInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    marginBottom: 17,
    marginTop: 17,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderBottomWidth: 1,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoBannerCompact: {
    marginTop: 16,
  },
  infoBannerText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  emailHighlight: {
    fontSize: 14,
    fontWeight: '500',
    paddingTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  sectionHeader: {
    paddingVertical: 12,
  },
  sectionHeaderText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sectionCard: {
    marginHorizontal: 8,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  infoItemsLayout: {
    borderRadius: 16,
    width: '100%',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  infoItemLast: {
    borderBottomWidth: 0,
  },
  infoItemContent: {
    flex: 1,
    gap: 4,
  },
  infoItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  infoItemValue: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  visaRequired: {
    fontSize: 14,
    fontWeight: '400',
  },
  arrowIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scaleX: -1 }],
  },
});

