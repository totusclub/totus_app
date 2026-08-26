import React, { useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText, AppIcon } from '../../UI';
import { formatPeriod } from '../../../utils/ordersUtils';
import {
  collectOrderDocuments,
  formatDocumentsDescription,
  type OrderDocumentApiItem,
} from '../../../utils/ordersUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InfoRow from './InfoRow';
import DocumentsModal from './DocumentsModal';
import FlightDetailsModal from '../../checkout/components/FlightDetailsModal';
import type { Order } from '../../../types';
import { useTheme } from '../../../hooks/useTheme';

type OrderDetailsSectionsProps = {
  pkg: any;
  hotelName: string;
  destination: string;
  order: Order | null;
  apiDocuments?: OrderDocumentApiItem[];
};

const OrderDetailsSections: React.FC<OrderDetailsSectionsProps> = ({
  pkg,
  hotelName,
  destination,
  order,
  apiDocuments = [],
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [flightModalVisible, setFlightModalVisible] = useState(false);

  const documents = useMemo(
    () => collectOrderDocuments(order, apiDocuments),
    [order, apiDocuments],
  );

  const documentsDescription = useMemo(
    () => formatDocumentsDescription(documents.length),
    [documents.length],
  );

  return (
    <>
      <View style={[styles.card, { marginBottom: insets.bottom + 36, backgroundColor: theme.cardBackground, shadowColor: theme.shadow, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.documentsPanel, { backgroundColor: theme.backgroundSecondary }]}
          onPress={() => setDocumentsModalVisible(true)}
          activeOpacity={0.7}>
          <View style={styles.documentsContent}>
            <View style={styles.documentsTitleContainer}>
              <View style={styles.documentsTitleIcon}>
                <AppIcon name="document" size={24} color={theme.text} />
                <AppText style={[styles.documentsTitle, { color: theme.text }]}>Документы</AppText>
              </View>
              <View style={styles.arrowContainer}>
                <AppIcon name="simpleArrow" size={20} color={theme.text} />
              </View>
            </View>
            <AppText style={[styles.documentsDescription, { color: theme.textTertiary }]}>
              {documentsDescription}
            </AppText>
          </View>
        </TouchableOpacity>

        <View style={styles.sectionWrapper}>
          <AppText style={[styles.sectionHeader, { color: theme.text }]}>Самое важное</AppText>
          <View style={[styles.infoPanel, { backgroundColor: theme.backgroundSecondary }]}>
            <InfoRow
              label="Отель"
              value={formatPeriod(pkg) || '—'}
              showArrow
              onPress={() => setFlightModalVisible(true)}
            />
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <InfoRow
              label="Курорт"
              value={destination || '—'}
              rightValue={pkg?.hotel?.country ? 'Виза не нужна' : undefined}
            />
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <InfoRow
              label="Туроператор"
              value="Level.Travel"
            />
          </View>
        </View>

        <View style={styles.sectionWrapper}>
          <AppText style={[styles.sectionHeader, { color: theme.text }]}>Отель и номер</AppText>
          <View style={[styles.infoPanel, { backgroundColor: theme.backgroundSecondary }]}>
            <InfoRow
              label="Отель"
              value={hotelName || '—'}
              showArrow
            />
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <InfoRow
              label="Номер"
              value={pkg?.room_type || '—'}
              showArrow
            />
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <InfoRow
              label="Питание"
              value={pkg.pansion_description}
            />
          </View>
        </View>
      </View>

      <DocumentsModal
        visible={documentsModalVisible}
        onClose={() => setDocumentsModalVisible(false)}
        documents={documents}
      />

      <FlightDetailsModal
        visible={flightModalVisible}
        onClose={() => setFlightModalVisible(false)}
        flightData={order?.package?.flights?.[0] || pkg?.flights?.[0]}
      />
    </>
  );
};

export default OrderDetailsSections;

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 16,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    borderWidth: 1,
    marginTop: 16,
  },
  documentsPanel: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  sectionWrapper: {
    marginTop: 16,
  },
  documentsContent: {
    flex: 1,
  },
  documentsTitleIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  documentsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentsDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: 8,
  },
  infoPanel: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
  },
  arrowContainer: {
    transform: [{ rotate: '-180deg' }],
  },
});
