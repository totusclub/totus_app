import React, { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppIcon, AppText } from '../UI';
import { generateSectionsFromData } from '../../modules/hooks/useExpandableSections';
import type { ExpandableSection, ApiHotelData } from '../../types/hotel';
import { useTheme } from '../../hooks/useTheme';

type ExpandableSectionsListProps = {
  onSectionPress: (section: ExpandableSection) => void;
  apiHotelData?: ApiHotelData; // Optional API hotel data
};

const ExpandableSectionsList: React.FC<ExpandableSectionsListProps> = ({
  onSectionPress,
  apiHotelData,
}) => {
  const { theme } = useTheme();
  // Generate sections directly from backend data
  const sections = useMemo(() => {
    return generateSectionsFromData(apiHotelData);
  }, [apiHotelData]);

  // Don't render if no sections have data
  if (sections.length === 0) {
    return null;
  }

  return (
    <View>
      {sections.map((section, index) => (
        <TouchableOpacity
          key={section.id}
          style={[
            styles.expandableSection,
            index < sections.length - 1 && [styles.expandableSectionBorder, { borderBottomColor: theme.borderLight }],
          ]}
          onPress={() => onSectionPress(section)}>
          <View style={styles.expandableContent}>
            <View style={styles.expandableIcon}>
              <View style={[styles.expandableIconCircle, { borderColor: theme.border }]} />
            </View>
            <View style={styles.expandableTextContainer}>
              <AppText style={[styles.expandableTitle, { color: theme.text }]}>{section.title}</AppText>
              <AppText style={[styles.expandableSubtitle, { color: theme.textTertiary }]}>{section.subtitle}</AppText>
            </View>
          </View>
          <View style={styles.arrowIconWrapper}>
            <AppIcon name="simpleArrow" size={20} color={theme.text} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default ExpandableSectionsList;

const styles = StyleSheet.create({
  expandableSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  expandableSectionBorder: {
    borderBottomWidth: 1,
  },
  expandableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandableIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandableIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  expandableTextContainer: {
    flex: 1,
  },
  expandableTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  expandableSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  arrowIconWrapper: {
    transform: [{ rotate: '180deg' }],
  },
});

