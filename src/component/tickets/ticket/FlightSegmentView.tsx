import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppIcon, AppText } from '../../UI';
import type { FlightDetailSegment } from '../../../types/tickets';
import { useTheme } from '../../../hooks/useTheme';

type FlightSegmentViewProps = {
  segment: FlightDetailSegment;
  title: string;
};

const FlightSegmentView: React.FC<FlightSegmentViewProps> = ({ segment, title }) => {
  const { theme } = useTheme();
  // console.log('segment', segment.departureAirport)
  return (
    <View style={styles.section}>
      {/* Section Title */}
      <AppText style={[styles.sectionTitle, { color: theme.text }]}>{title}</AppText>

      {/* Airline Logo and Name */}
      <View style={styles.airlineRow}>
        <View style={styles.airlineInfo}>
          {segment.airlineLogo ? (
            <Image source={{ uri: segment.airlineLogo }} style={styles.airlineLogo} />
          ) : (
            <View style={[styles.airlineLogoPlaceholder, { backgroundColor: theme.backgroundTertiary }]}>
              <AppText style={[styles.airlineLogoText, { color: theme.text }]}>
                {segment.airlineName.charAt(0)}
              </AppText>
            </View>
          )}
          {segment.flightNo && (
            <View style={[styles.flightNoChip, { borderColor: theme.textTertiary }]}>
              <AppText style={[styles.flightNoText, { color: theme.textTertiary }]}>{` ${segment.airlineName} ${segment.flightNo}`}</AppText>
            </View>
          )}
        </View>
        {segment.aircraft && (
          <View style={[styles.aircraftChip, { backgroundColor: theme.backgroundTertiary }]}>
            <AppText style={[styles.aircraftText, { color: theme.textTertiary }]}>{segment.aircraft}</AppText>
          </View>
        )}
      </View>

      {/* Baggage badges */}
      <View style={styles.badgesRow}>
        {segment.baggage.isBlock && (
          <View style={[styles.badge, { backgroundColor: theme.backgroundTertiary }]}>
            <AppText style={[styles.badgeText, { color: theme.text }]}>Блочный</AppText>
          </View>
        )}
        {segment.baggage.class && (
          <View style={[styles.badge, { backgroundColor: theme.backgroundTertiary }]}>
            <AppText style={[styles.badgeText, { color: theme.text }]}>{segment.baggage.class}</AppText>
          </View>
        )}
        {segment.baggage.handLuggage.map((item, idx) => (
          <View key={`hand-${idx}`} style={[styles.badge, { backgroundColor: theme.backgroundTertiary }]}>
            <AppText style={[styles.badgeText, { color: theme.text }]}>
              Ручная кладь {item.weight ? `${item.weight} кг` : `${item.count} шт.`}{' '}
              {item.direction}
            </AppText>
          </View>
        ))}
        {segment.baggage.holdLuggage.map((item, idx) => (
          <View key={`hold-${idx}`} style={[styles.badge, { backgroundColor: theme.backgroundTertiary }]}>
            <AppText style={[styles.badgeText, { color: theme.text }]}>
              Багаж {item.weight ? `${item.weight} кг` : `${item.count} шт.`}{' '}
              {item.direction}
            </AppText>
          </View>
        ))}
      </View>

      {/* Flight timeline */}
      <View style={styles.timeline}>
        <View style={styles.timelineStep}>
          {/* Left side: dots, lines, plane icon */}
          <View style={styles.timelineStepLeft}>
            <View style={[styles.timelineDotOutlined, { borderColor: theme.border }]} />
            <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
            <AppIcon name="plane" size={20} color={theme.textTertiary} />
            <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
            <View style={[styles.timelineDotOutlined, { borderColor: theme.border }]} />
          </View>

          {/* Right side: departure and arrival info */}
          <View style={styles.timelineStepRight}>
            {/* Departure */}
            <View style={styles.timelineInfoLine}>
              <View style={styles.timelineInfoRow}>
                <AppText style={[styles.timelineTime, { color: theme.text }]}>{segment.departureTime}</AppText>
                <AppText style={[styles.timelineCity, { color: theme.text }]}>{segment.departureAirport.city}</AppText>
              </View>
              <View style={styles.timelineInfoRow}>
                <AppText style={[styles.timelineDate, { color: theme.textTertiary }]}>{segment.departureDate}</AppText>
                <AppText style={[styles.timelineAirport, { color: theme.textTertiary }]}>
                  {segment.departureAirport.airport || segment.departureAirport.code}
                </AppText>
              </View>
            </View>

            {/* Duration */}
            <View style={styles.timelineDuration}>
              <AppText style={[styles.timelineDurationText, { color: theme.textTertiary }]}>
                {segment.duration} в пути{segment.flightType === 'block' ? ', блочный' : ', регулярный'}
              </AppText>
            </View>

            {/* Arrival */}
            <View style={styles.timelineInfoLine}>
              <View style={styles.timelineInfoRow}>
                <AppText style={[styles.timelineTime, { color: theme.text }]}>{segment.arrivalTime}</AppText>
                <AppText style={[styles.timelineCity, { color: theme.text }]}>{segment.arrivalAirport.city}</AppText>
              </View>
              <View style={styles.timelineInfoRow}>
                <AppText style={[styles.timelineDate, { color: theme.textTertiary }]}>{segment.arrivalDate}</AppText>
                <AppText style={[styles.timelineAirport, { color: theme.textTertiary }]}>
                  {segment.arrivalAirport.airport || segment.arrivalAirport.code}
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Transitions */}
      {segment.transitions?.map((transition, index) => (
        <View key={`${segment.id}-transition-${index}`} style={[styles.transitionCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <View style={styles.transitionHeaderRow}>
            <View style={styles.transitionHeaderText}>
              <AppText style={[styles.transitionTitle, { color: theme.text }]}>
                Пересадка в {transition.city || transition.airport || transition.code}
              </AppText>
              {(transition.airport) && (
                <AppText style={[styles.transitionSubtitle, { color: theme.textTertiary }]}>
                  {transition.airport}
                </AppText>
              )}
            </View>
            {transition.duration && (
              <View style={[styles.transitionBadge, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <AppText style={[styles.transitionBadgeText, { color: theme.text }]}>{transition.duration}</AppText>
              </View>
            )}
          </View>

          <View style={styles.transitionTimesRow}>
            <View style={styles.transitionTimeBlock}>
              <AppText style={[styles.transitionLabel, { color: theme.textTertiary }]}>Прилёт</AppText>
              <AppText style={[styles.transitionTime, { color: theme.text }]}>{transition.arrivalTime || '--:--'}</AppText>
              {transition.arrivalDate && (
                <AppText style={[styles.transitionDate, { color: theme.textTertiary }]}>{transition.arrivalDate}</AppText>
              )}
            </View>
            <View style={styles.transitionTimeBlock}>
              <AppText style={[styles.transitionLabel, { color: theme.textTertiary }]}>Вылет</AppText>
              <AppText style={[styles.transitionTime, { color: theme.text }]}>{transition.departureTime || '--:--'}</AppText>
              {transition.departureDate && (
                <AppText style={[styles.transitionDate, { color: theme.textTertiary }]}>{transition.departureDate}</AppText>
              )}
            </View>
          </View>

          {(transition.airlineName || transition.flightNo) && (
            <View style={styles.transitionFlightRow}>
              {transition.airlineLogo && (
                <Image source={{ uri: transition.airlineLogo }} style={[styles.transitionAirlineLogo, { backgroundColor: theme.cardBackground }]} />
              )}
              <View style={styles.transitionFlightInfo}>
                {transition.airlineName && (
                  <AppText style={[styles.transitionFlightText, { color: theme.text }]}>{transition.airlineName}</AppText>
                )}
                {transition.flightNo && (
                  <AppText style={[styles.transitionFlightSubtext, { color: theme.textTertiary }]}>Рейс {transition.flightNo}</AppText>
                )}
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  airlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  airlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  airlineLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'contain',
  },
  airlineLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  airlineLogoText: {
    fontSize: 16,
    fontWeight: '600',
  },
  airlineName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F1F1F',
  },
  flightNoChip: {
    height: 24,
    paddingHorizontal: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  flightNoText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  aircraftChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aircraftText: {
    fontSize: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
  },
  timeline: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  timelineStepLeft: {
    paddingVertical: 8,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: -2,
  },
  timelineDotOutlined: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  timelineLine: {
    width: 2,
    height: 38.5,
  },
  timelineStepRight: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 24,
  },
  timelineInfoLine: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    alignSelf: 'stretch',
  },
  timelineInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    alignSelf: 'stretch',
  },
  timelineTime: {
    width: 80,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  timelineCity: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  timelineDate: {
    width: 80,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  timelineAirport: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  timelineDuration: {
    alignSelf: 'stretch',
  },
  timelineDurationText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  transitionCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  transitionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  transitionHeaderText: {
    flex: 1,
    gap: 4,
  },
  transitionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  transitionSubtitle: {
    fontSize: 14,
  },
  transitionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  transitionBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  transitionTimesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  transitionTimeBlock: {
    flex: 1,
    gap: 4,
  },
  transitionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  transitionTime: {
    fontSize: 18,
    fontWeight: '600',
  },
  transitionDate: {
    fontSize: 14,
  },
  transitionFlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transitionAirlineLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    resizeMode: 'contain',
  },
  transitionFlightInfo: {
    flex: 1,
  },
  transitionFlightText: {
    fontSize: 14,
    fontWeight: '500',
  },
  transitionFlightSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
});

export default FlightSegmentView;

