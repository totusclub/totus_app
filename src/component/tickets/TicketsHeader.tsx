import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppIcon, AppText } from '../UI';
import { getHeaderDestination, getHeaderSubtitle } from '../../utils/ticketsUtils/headerUtils';
import { useTicketsFilters } from './TicketsFiltersContext';
import { useTheme } from '../../hooks/useTheme';

const TicketsHeader: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { setFiltersModalVisible, packageInfo } = useTicketsFilters();

  const routeParams = (route.params as any) || {};
  const hotelMeta = routeParams?.hotelMeta;
  const searchContext = routeParams?.searchContext;

  const destination = getHeaderDestination(hotelMeta, packageInfo);
  const subtitle = getHeaderSubtitle(searchContext, packageInfo, []);

  return (
    <View style={[styles.container, { borderBottomColor: theme.borderLight }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
        <AppIcon name="simpleArrow" size={24} color={theme.text} />
      </TouchableOpacity>
      <View style={styles.textContainer}>
        <AppText
          style={[styles.destinationText, { color: theme.text }]}
          numberOfLines={1}>
          {destination || 'Выберите направление'}
        </AppText>
        {subtitle ? (
          <AppText
            style={[styles.dateText, { color: theme.textTertiary }]}
            numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={() => setFiltersModalVisible(true)}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        style={styles.filterButton}>
        <AppIcon name="filters" size={24} color={theme.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    padding: 8,
    borderBottomWidth: 2,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 0,
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    textAlign: 'center',
  },
  filterButton: {
    padding: 4,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TicketsHeader;
