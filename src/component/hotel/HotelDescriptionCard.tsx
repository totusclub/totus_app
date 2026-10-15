import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../UI';
import { HotelInfo } from '../UI';
import ExpandableSectionsList from './ExpandableSectionsList';
import type { ExpandableSection, ApiHotelData } from '../../types/hotel';
import { useTheme } from '../../hooks/useTheme';
import TotusIconByKey from '../UI/icons/totus/TotusIconByKey';

// Re-export ApiHotelData for backward compatibility
export type { ApiHotelData };

type HotelDescriptionCardProps = {
  hotel: HotelInfo;
  onSectionPress: (section: ExpandableSection) => void;
  apiHotelData?: ApiHotelData; // Optional API hotel data
};

const HotelDescriptionCard: React.FC<HotelDescriptionCardProps> = ({
  hotel,
  onSectionPress,
  apiHotelData,
}) => {
  const { theme } = useTheme();

  // Get description from API data
  const getDescription = (): string | null => {
    if (apiHotelData?.short_info) {
      return apiHotelData.short_info;
    }
    if (apiHotelData?.hotel_info) {
      // Use first paragraph of hotel_info if short_info is not available
      const firstParagraph = apiHotelData.hotel_info.split('\n')[0];
      return firstParagraph || apiHotelData.hotel_info.substring(0, 200) + '...';
    }
    return null;
  };
  const description = getDescription();

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
        <View style={styles.titleRow}>
          <TotusIconByKey name="sec-general" size={20} color={theme.text} />
          <AppText style={[styles.title, { color: theme.text }]}>Описание</AppText>
        </View>
      </View>

      {description && (
        <AppText style={[styles.descriptionText, { color: theme.text }]}>
          {description}
        </AppText>
      )}

      <View style={[styles.sectionsContainer, { borderTopColor: theme.borderLight }]}>
        <ExpandableSectionsList
          onSectionPress={onSectionPress}
          apiHotelData={apiHotelData}
        />
      </View>
    </View>
  );
};

export default HotelDescriptionCard;

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 8,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F1F1F1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  sectionsContainer: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
});

