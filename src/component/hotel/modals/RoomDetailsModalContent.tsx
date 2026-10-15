import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppIcon } from '../../UI';
import type { HotelRoom } from '../../../types/hotel';
import { transformRoomImages } from '../../../modules/hooks/useRoomTransformers';
import { useTheme } from '../../../hooks/useTheme';
import HotelIcons from '../../UI/icons/hotelIcons';
import { FONT_HEADING } from '../../../theme/fonts';

type RoomDetailsModalContentProps = {
  onClose: () => void;
  room: HotelRoom;
};

const RoomDetailsModalContent: React.FC<RoomDetailsModalContentProps> = ({
  onClose,
  room,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const images = transformRoomImages(room.room.images);
  const imageWidth = windowWidth;
  const imageHeight = Math.min(
    Math.round(imageWidth * 0.68),
    Math.round(windowHeight * 0.34),
  );
  /**
   * Supplier watermark sits in the lower-left corner of the source photo.
   * `cover` alone trims top and bottom equally, so the frame is clipped while
   * the image is drawn taller and pinned to the top — the bottom strip that
   * carries the watermark falls outside the visible area.
   */
  const imageRenderHeight = Math.round(imageHeight * 1.18);
  const modalHeight = windowHeight * 0.9;
  const showLogoPlaceholder = images.length === 0;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / imageWidth);
    setCurrentImageIndex(index);
  };

  const renderImageItem = ({ item }: { item: any }) => (
    <View style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}>
      <Image
        source={item}
        style={[styles.image, { width: imageWidth, height: imageRenderHeight }]}
        resizeMode="cover"
      />
    </View>
  );
  return (
    <View style={[styles.container, { backgroundColor: theme.background, maxHeight: modalHeight }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
        <AppText style={[styles.headerTitle, { color: theme.text }]}>О номере</AppText>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        bounces={true}>
        {/* Room Name */}
        <AppText style={[styles.roomName, { color: theme.text }]}>{room.room.name_ru}</AppText>

        {/* Description */}
        {room.room.description && (
          <AppText style={[styles.description, { color: theme.text }]}>{room.room.description}</AppText>
        )}

        {/* Image Slider or Totus logo when room has no photos */}
        {showLogoPlaceholder ? (
          <View
            style={[
              styles.imageSliderContainer,
              styles.logoPlaceholder,
              {
                width: imageWidth,
                height: imageHeight,
                backgroundColor: theme.backgroundTertiary,
              },
            ]}
          >
            <AppIcon name="radiologo" size={96} color={theme.text} />
          </View>
        ) : (
          <View style={styles.imageSliderContainer}>
            <FlatList
              ref={flatListRef}
              data={images}
              renderItem={renderImageItem}
              keyExtractor={(item, index) => `image-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              snapToInterval={imageWidth}
              decelerationRate="fast"
              nestedScrollEnabled={true}
              scrollEnabled={true}
              bounces={false}
              getItemLayout={(data, index) => ({
                length: imageWidth,
                offset: imageWidth * index,
                index,
              })}
            />
            {/* Pagination Dots - Gradient size from big to small */}
            {images.length > 1 && (
              <View style={styles.paginationContainer}>
                {(() => {
                  const maxVisibleDots = 9; // Show max 9 dots
                  const totalImages = images.length;
                  const dots: React.ReactElement[] = [];

                  if (totalImages <= maxVisibleDots) {
                    // Show all dots if total images <= maxVisibleDots
                    images.forEach((_, index) => {
                      const distance = Math.abs(index - currentImageIndex);
                      const size = Math.max(4, 8 - distance * 0.8); // Decrease size based on distance
                      const isActive = index === currentImageIndex;

                      dots.push(
                        <View
                          key={`dot-${index}`}
                          style={[
                            styles.paginationDot,
                            {
                              width: isActive ? 8 : size,
                              height: isActive ? 8 : size,
                              borderRadius: isActive ? 4 : size / 2,
                              backgroundColor: isActive ? theme.brand : theme.border,
                            },
                          ]}
                        />
                      );
                    });
                  } else {
                    // Show sliding window of dots
                    const windowSize = maxVisibleDots - 2; // Reserve 2 spots for start/end indicators
                    const startIndex = Math.max(0, Math.min(currentImageIndex - Math.floor(windowSize / 2), totalImages - windowSize));
                    const endIndex = Math.min(startIndex + windowSize, totalImages);

                    // Show start indicator if not at beginning
                    if (startIndex > 0) {
                      dots.push(
                        <View
                          key="dot-start"
                          style={[
                            styles.paginationDot,
                            {
                              width: 4,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: theme.border,
                            },
                          ]}
                        />
                      );
                    }

                    // Show dots in window with gradient size
                    for (let i = startIndex; i < endIndex; i++) {
                      const distance = Math.abs(i - currentImageIndex);
                      const size = Math.max(4, 8 - distance * 0.8);
                      const isActive = i === currentImageIndex;

                      dots.push(
                        <View
                          key={`dot-${i}`}
                          style={[
                            styles.paginationDot,
                            {
                              width: isActive ? 8 : size,
                              height: isActive ? 8 : size,
                              borderRadius: isActive ? 4 : size / 2,
                              backgroundColor: isActive ? theme.brand : theme.border,
                            },
                          ]}
                        />
                      );
                    }

                    // Show end indicator if not at end
                    if (endIndex < totalImages) {
                      dots.push(
                        <View
                          key="dot-end"
                          style={[
                            styles.paginationDot,
                            {
                              width: 4,
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: theme.border,
                            },
                          ]}
                        />
                      );
                    }
                  }

                  return dots;
                })()}
              </View>
            )}
          </View>
        )}

        {/* Facilities List */}
        {room.room.facilities && room.room.facilities.length > 0 ? (
          <View style={[styles.facilitiesContainer, { backgroundColor: theme.backgroundTertiary }]}>
            {room.room.facilities.map((facility, index) => (
              <View key={`facility-${facility.id}-${index}`} style={styles.facilityItem}>
                <HotelIcons name={facility.group_identifier} label={facility.name} size={24} color={theme.text} />
                <AppText style={[styles.facilityText, { color: theme.text }]}>{facility.name}</AppText>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <AppText style={[styles.noDataText, { color: theme.textTertiary }]}>Нет данных об удобствах</AppText>
          </View>
        )}
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    paddingTop: 16,
  },
  roomName: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: 12,
  },
  imageSliderContainer: {
    marginBottom: 24,
    marginHorizontal: -16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 0,
    borderRadius: 12,
  },
  imageContainer: {
    borderRadius: 0,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  image: {
    borderRadius: 0,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  paginationDot: {
  },
  facilitiesContainer: {
    gap: 16,
    padding: 8,
    borderRadius: 16,
  },
  facilityItem: {
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  facilityText: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  noDataContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
});

export default RoomDetailsModalContent;

