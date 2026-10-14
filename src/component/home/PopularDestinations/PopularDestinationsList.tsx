import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../UI';
import PopularDestinationCard from './PopularDestinationCard';
import { getCurrentDateHotel, getDefaultStartDate } from "../searchSection/utils/searchHelpers.ts";
import { useNavigation } from "@react-navigation/native";
import { runFullSearchFlow, setHeaderName, setSearchParams } from "../../../modules/store/slices/search.ts";
import { useDispatch } from "react-redux";
import { useTheme } from '../../../hooks/useTheme';
import { useLayout } from '../../../hooks/useLayout';
import { TabletGrid } from '../../UI/tablet';
import { FONT_HEADING } from '../../../theme/fonts';

type PopularDestinationsListProps = {
  popularDestinations?: any[] | null;
};

export const PopularDestinationsList: React.FC<PopularDestinationsListProps> = ({ popularDestinations }) => {
  const { theme } = useTheme();
  const { isTablet, layoutClass } = useLayout();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const date = useMemo(() => {
    return getDefaultStartDate()
  }, [])


  const handlePressHotel = (item: string) => {

    const searchParams = {
      "from_city": "Moscow",
      "from_country": "RU",
      "to_country": item?.to_country,
      "to_city": undefined,
      "adults": "2",
      "start_date": date,
      "nights": "7",
      "search_type": "package",
      "flex_dates": 0,
      "page_number": 1,
      "page_limit": 20,
      "sort_by": "relevance"
    };
    // Match kedam-WEB popular destinations: stars only — do not default meal filter to AI.
    const filterParams = {
      "filter_instant_confirm": false,
      "page_number": 1,
      "page_limit": 20,
      "sort_by": "relevance",
      "filter_stars": "3,4,5",
    };

    // dispatch(setSearchParams(searchParams))
    dispatch(setHeaderName(item?.name))

    dispatch(
      runFullSearchFlow({
        searchParams,
        filterParams,
      }),
    );

    setTimeout(() => {
      navigation.navigate('searchResult');
    }, 500);
  }


  // iPad only: grid (3 columns portrait / 4 landscape) instead of the horizontal strip.
  const tabletColumns = layoutClass === 'expanded' ? 4 : 3;

  return (
    <View style={styles.wrapper}>
      <AppText style={[styles.title, isTablet && styles.titleTablet, { color: theme.text }]}>Популярные направления</AppText>
      {isTablet ? (
        <View style={styles.gridTablet}>
          <TabletGrid
            items={popularDestinations ?? []}
            columns={tabletColumns}
            gap={16}
            rowStyle={styles.gridRowTablet}
            keyExtractor={(_destination: any, index: number) => String(index)}
            renderItem={(destination: any) => (
              <PopularDestinationCard
                destination={destination}
                style={styles.cardTablet}
                handlePressHotel={handlePressHotel}
              />
            )}
          />
        </View>
      ) : (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          {popularDestinations?.map((destination, index) => (
            <PopularDestinationCard
              key={index}
              destination={destination}
              style={[
                styles.card,
                index === popularDestinations.length - 1 && styles.lastCard,
              ]}
              handlePressHotel={handlePressHotel}
            />
          ))}
        </View>
      </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 32,
  },
  container: {
    flexDirection: 'row',
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 24,
    marginBottom: 16,
    marginTop: 16,
    marginLeft: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    marginRight: 16,
  },
  lastCard: {
    marginRight: 0,
  },
  // --- iPad only (never applied on phone) ---
  titleTablet: {
    marginLeft: 24,
  },
  gridTablet: {
    paddingHorizontal: 24,
  },
  gridRowTablet: {
    marginBottom: 16,
  },
  cardTablet: {
    width: '100%',
  },
});