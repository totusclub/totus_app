import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppIcon } from '../../UI';
import { transformApiDataToSections } from '../../../modules/hooks/useExpandableSections';
import type { ApiHotelData } from '../../../types/hotel';
import { useTheme } from '../../../hooks/useTheme';
import { FONT_HEADING } from '../../../theme/fonts';

type ExpandableSectionModalContentProps = {
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  apiHotelData?: ApiHotelData; // Optional API hotel data
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ICON_BASE_URL = 'https://img.cdn.level.travel/';
const ExpandableSectionModalContent: React.FC<ExpandableSectionModalContentProps> = ({
  onClose,
  sectionId,
  sectionTitle,
  apiHotelData,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const modalHeight = SCREEN_HEIGHT * 0.9;

  const sections = transformApiDataToSections(sectionId, apiHotelData);
  // console.log("sections", sections)
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, maxHeight: modalHeight },
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, { borderBottomColor: theme.borderLight }]}>
          <AppText style={[styles.headerTitle, { color: theme.text }]}>{sectionTitle}</AppText>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AppText style={[styles.emptyText, { color: theme.textTertiary }]}>Нет данных</AppText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          {sections.map((section, index) => (
            <View key={`section-${index}`} style={styles.section}>
              <View style={[styles.itemsContainer, { backgroundColor: theme.backgroundTertiary }]}>
                {section.items.map((item, itemIndex) => (
                  <View key={`item-${itemIndex}`} style={styles.item}>
                    {item.icon_path ? (
                      <Image
                        source={{ uri: `${ICON_BASE_URL}${item.icon_path}` }}
                        style={[styles.itemIcon, { tintColor: theme.text }]}
                        resizeMode="contain"
                      />
                    ) : (
                      <AppIcon name="checkmark" size={20} color={theme.text} />
                    )}
                    <AppText style={[styles.itemText, { color: theme.text }]}>{item.title}</AppText>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'flex-start',
  },
  header: {
    marginBottom: 24,
  },
  itemIcon: {
    width: 24,
    height: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '500',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  itemsContainer: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});

export default ExpandableSectionModalContent;

