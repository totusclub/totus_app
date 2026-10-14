import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, AppText } from '../../UI';
import FlightSegmentView from '../../tickets/ticket/FlightSegmentView';
import { transformFlightDetails } from '../../../utils/ticketsUtils/flightDetailsUtils';
import type { FlightDetails, FlightDetailSegment } from '../../../types/tickets/flightDetails';
import { useTheme } from '../../../hooks/useTheme';
import { FONT_HEADING } from '../../../theme/fonts';

type FlightDetailsModalProps = {
  visible: boolean;
  onClose: () => void;
  flightData?: any;
};

const sumSegmentDuration = (segment?: FlightDetailSegment): number => {
  if (!segment) {
    return 0;
  }

  const base = segment.durationSeconds || 0;
  const transitions = segment.transitions?.reduce((acc, item) => acc + (item.durationSeconds || 0), 0) || 0;
  return base + transitions;
};

const FlightDetailsModal: React.FC<FlightDetailsModalProps> = ({ visible, onClose, flightData }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const flightDetails = useMemo<FlightDetails | null>(() => {
    if (!flightData) return null;
    return transformFlightDetails(flightData);
  }, [flightData]);

  const totalDuration = useMemo(() => {
    if (!flightDetails) return '';
    const totalSeconds = sumSegmentDuration(flightDetails.to) + sumSegmentDuration(flightDetails.back);
    if (!totalSeconds) return '';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}ч ${minutes}м`;
  }, [flightDetails]);


  const paddingBottom = Math.max(insets.bottom, 16);

  return (
    <Modal
      isVisible={visible}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.35}>
      <View style={[styles.sheet, { paddingBottom: paddingBottom + 8, backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <AppText style={[styles.headerTitle, { color: theme.text }]}>Детали перелёта</AppText>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
              <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
            </TouchableOpacity>
            <View style={[styles.headerUnderline, { backgroundColor: theme.border }]} />
          </View>
          {!!totalDuration && (
            <AppText style={[styles.headerSubtitle, { color: theme.textTertiary }]}>В пути {totalDuration}</AppText>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {flightDetails?.to && (
            <FlightSegmentView segment={flightDetails.to} title="Перелёт туда" />
          )}


          {flightDetails?.back && (
            <FlightSegmentView segment={flightDetails.back} title="Перелёт обратно" />
          )}

          <View style={[styles.infoBanner, styles.infoBannerCompact, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderBottomColor: theme.brand, shadowColor: theme.shadow }]}>
            <AppIcon name="info" size={24} color={theme.brand} />
            <AppText style={[styles.infoBannerText, { color: theme.text }]}>
              Указано местное время, багаж на пассажира
            </AppText>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  infoBannerCompact: {
    marginTop: 16,
  },
  infoBannerText: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    flexDirection: 'column',
  },
  header: {
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    position: 'relative',
  },
  headerTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  layoverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginBottom: 16,
  },
  layoverDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1F1F1F',
  },
  layoverInfo: {
    flex: 1,
  },
  layoverTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F1F1F',
  },
  layoverSubtitle: {
    fontSize: 14,
    color: '#7A7A7A',
    marginTop: 2,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FDF5EE',
    borderBottomWidth: 1,
    borderBottomColor: '#FE732E',
    marginTop: 8,
  },
  infoAlertText: {
    flex: 1,
    fontSize: 14,
    color: '#7A7A7A',
  },
});

export default FlightDetailsModal;

