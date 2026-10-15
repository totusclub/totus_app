import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppIcon, AppText } from '../UI';
import type { FlightCard, FlightSegment } from '../../types/tickets';
import { useTheme } from '../../hooks/useTheme';

type Props = {
  flight: FlightCard;
  priceLabel?: string;
  feesLabel?: string | null;
  onPress: () => void;
};

const directionLabel = (direction: FlightSegment['direction']) =>
  direction === 'back' ? 'Обратно' : 'Туда';

const FlightCardView: React.FC<Props> = ({ flight, priceLabel, feesLabel, onPress }) => {
  const { theme } = useTheme();
  const displayPrice = priceLabel || flight.price;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {flight.note ? (
        <AppText style={[styles.note, { color: theme.success }]}>{flight.note}</AppText>
      ) : null}

      {flight.segments.map((segment, index) => (
        <View
          key={segment.id}
          style={[
            styles.segmentBlock,
            { borderBottomColor: theme.borderLight },
            index === flight.segments.length - 1 && styles.segmentBlockLast,
          ]}
        >
          <AppText style={[styles.directionLabel, { color: theme.textTertiary }]}>
            {directionLabel(segment.direction)}
          </AppText>

          <View style={styles.segmentRow}>
            {segment.airlineLogo ? (
              <Image
                source={{ uri: segment.airlineLogo }}
                style={[styles.airlineLogo, { backgroundColor: theme.cardBackground }]}
              />
            ) : (
              <View
                style={[
                  styles.airlineLogoPlaceholder,
                  { backgroundColor: theme.backgroundTertiary },
                ]}
              >
                <AppText style={[styles.airlineLogoText, { color: theme.text }]}>
                  {segment.airlineName?.charAt(0) || 'A'}
                </AppText>
              </View>
            )}

            <View style={styles.segmentContent}>
              <View style={styles.topRow}>
                <View style={styles.timesBlock}>
                  <AppText style={[styles.timesText, { color: theme.text }]}>
                    {segment.departureTime} - {segment.arrivalTime}
                  </AppText>
                  <AppText style={[styles.metaText, { color: theme.textTertiary }]}>
                    {segment.dateLabel}
                  </AppText>
                </View>

                <View style={styles.durationBlock}>
                  <AppText style={[styles.durationText, { color: theme.text }]}>
                    {segment.duration}
                  </AppText>
                  <AppText style={[styles.metaText, { color: theme.textTertiary }]}>
                    {segment.isDirect ? 'Прямой' : 'С пересадкой'}
                  </AppText>
                </View>
              </View>

              <View style={styles.bottomRow}>
                <AppText
                  style={[styles.airlineName, { color: theme.textTertiary }]}
                  numberOfLines={1}
                >
                  {segment.airlineName}
                </AppText>

                <View style={styles.routeBlock}>
                  {segment.routeTitle ? (
                    <AppText
                      style={[styles.routeTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {segment.routeTitle}
                    </AppText>
                  ) : null}
                  {segment.airportTitle ? (
                    <AppText
                      style={[styles.airportTitle, { color: theme.textTertiary }]}
                      numberOfLines={1}
                    >
                      {segment.airportTitle}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </View>
      ))}

      {flight.baggage.length > 0 ? (
        <View style={styles.badgesRow}>
          {flight.baggage.map((item, index) => (
            <View
              key={`${flight.id}-${index}`}
              style={[styles.badge, { backgroundColor: theme.backgroundTertiary }]}
            >
              <AppText style={[styles.badgeText, { color: theme.text }]}>{item}</AppText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.priceBlock}>
          <AppText style={[styles.price, { color: theme.text }]}>{displayPrice}</AppText>
          {feesLabel ? (
            <AppText style={[styles.feesLabel, { color: theme.textTertiary }]}>
              {feesLabel}
            </AppText>
          ) : null}
          <AppText style={[styles.priceLabel, { color: theme.textTertiary }]}>
            За тур с перелётом
          </AppText>
        </View>
        <View style={[styles.arrowButton, { backgroundColor: theme.brand }]}>
          <View style={styles.arrowIcon}>
            <AppIcon name="simpleArrow" size={24} color="#FFFFFF" accent={false} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  note: {
    fontSize: 12,
    fontWeight: '400',
  },
  segmentBlock: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentBlockLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  directionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  airlineLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  airlineLogoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  airlineLogoText: {
    fontSize: 14,
    fontWeight: '600',
  },
  segmentContent: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  timesBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  timesText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  durationBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  airlineName: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 16,
  },
  routeBlock: {
    flexShrink: 1,
    maxWidth: '55%',
    alignItems: 'flex-end',
    gap: 2,
  },
  routeTitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 17,
    textAlign: 'right',
  },
  airportTitle: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  priceBlock: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  arrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  arrowIcon: {
    transform: [{ rotate: '180deg' }],
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
  },
  feesLabel: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  priceLabel: {
    fontSize: 13,
  },
});

export default React.memo(FlightCardView, (prevProps, nextProps) => {
  return (
    prevProps.flight.id === nextProps.flight.id &&
    prevProps.flight.priceValue === nextProps.flight.priceValue &&
    prevProps.flight.fuelCharge === nextProps.flight.fuelCharge &&
    prevProps.priceLabel === nextProps.priceLabel &&
    prevProps.feesLabel === nextProps.feesLabel &&
    prevProps.flight.segments === nextProps.flight.segments
  );
});
