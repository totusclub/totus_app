import React, { useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    Image,
    Dimensions,
    TouchableOpacity,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    LayoutChangeEvent,
} from 'react-native';
import { AppIcon, AppText, AppButton, AiPickBadge } from '../index';
import { useTheme } from '../../../hooks/useTheme';
import { useLayout } from '../../../hooks/useLayout';
import type { AiPriceChange } from '../../../utils/hotelUtils/aiRoomPick';
import { getAiPriceChangeLabel } from '../../../utils/hotelUtils/aiRoomPick';

import type { HotelInfo as HotelCardInfo } from '../../../types/hotel/hotelCard';
import { FONT_HEADING } from '../../../theme/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Re-export for backward compatibility
export type HotelInfo = HotelCardInfo;

type HotelCardProps = {
    hotel: HotelInfo;
    footer?: React.ReactNode;
    imageHeight?: number;
    showAddress?: boolean;
    showTags?: boolean;
    onPress?: () => void;
    isSearchResult?: boolean; // true for search results, false for hotel detail
    showSlider?: boolean; // Show image slider for hotel detail page
    dateRange?: string; // Formatted date range (e.g., "от 17 мая на 7 ночей")
    // Room card specific props
    type?: 'hotel' | 'room';
    roomFeatures?: string[]; // Features list for room cards
    onViewAllOptions?: () => void; // Handler for "Все варианты" button
    onMoreDetails?: () => void; // Handler for "Подробнее о номере" button
    onReviewsPress?: () => void; // Handler for reviews count tap
    showAiBadge?: boolean;
    aiPriceChange?: AiPriceChange | null;
    // iPad grid: the card fills its grid cell, the title and the tags reserve a fixed
    // height, and the price is pinned to the bottom — every card in a row lines up.
    equalHeight?: boolean;

};

const HotelCard: React.FC<HotelCardProps> = ({
    hotel,
    footer,
    imageHeight = 200,
    showAddress = false,
    showTags = false,
    onPress,
    showSlider = false,
    dateRange,
    type = 'hotel',
    roomFeatures = [],
    onViewAllOptions,
    onMoreDetails,
    onReviewsPress,
    showAiBadge = false,
    aiPriceChange = null,
    equalHeight = false,
}) => {
    const { theme } = useTheme();
    // iPad: the card sits in a grid cell / column, so the module-scope screen width is wrong
    // before the first onLayout — estimate one grid cell from the live window width instead.
    const { isTablet, width: windowWidth, columns } = useLayout();
    const tabletFallbackWidth = Math.floor((windowWidth - 48 - 16 * (columns - 1)) / columns) - 32;
    const isRoomCard = type === 'room';
    const [imageSectionWidth, setImageSectionWidth] = useState(0);
    const resolvedImageWidth =
        imageSectionWidth > 0
            ? imageSectionWidth
            : isRoomCard
              ? (isTablet ? tabletFallbackWidth : SCREEN_WIDTH - 16)
              : (isTablet ? tabletFallbackWidth : SCREEN_WIDTH - 48);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const images = hotel.images && hotel.images.length > 0
        ? hotel.images
        : isRoomCard
          ? []
          : [require('../../../assets/images/cardImage.png')];
    const showLogoPlaceholder = isRoomCard && images.length === 0;

    const firstImage = images[0];

    const renderRoomLogoPlaceholder = () => (
        <View
            style={[
                styles.imageWrapper,
                styles.roomImageWrapper,
                styles.roomLogoPlaceholder,
                {
                    height: imageHeight,
                    width: resolvedImageWidth,
                    backgroundColor: theme.backgroundTertiary,
                },
            ]}
        >
            <AppIcon name="radiologo" size={Math.min(96, imageHeight * 0.45)} color={theme.text} />
        </View>
    );
    const renderReviewCount = (iconSize: number) => {
        const reviewLabel = hotel.reviews > 0 ? `${hotel.reviews} отзывов` : 'Отзывы';
        const content = (
            <>
                <AppIcon name="review" size={iconSize} color={theme.text} />
                <AppText style={[styles.reviewText, { color: theme.text }]}>{reviewLabel}</AppText>
            </>
        );
        if (onReviewsPress) {
            return (
                <TouchableOpacity
                    style={styles.reviewCount}
                    onPress={onReviewsPress}
                    activeOpacity={0.7}>
                    {content}
                </TouchableOpacity>
            );
        }
        return <View style={styles.reviewCount}>{content}</View>;
    };

    const renderAiBadge = () => {
        if (!showAiBadge) return null;
        return <AiPickBadge variant="overlay" />;
    };

    const renderAiPriceChange = () => {
        if (!showAiBadge || !aiPriceChange || aiPriceChange.delta === 0) return null;
        const color = aiPriceChange.delta > 0 ? theme.brand : theme.success;
        return (
            <AppText style={[styles.priceIncreaseText, { color }]}>
                {getAiPriceChangeLabel(aiPriceChange)}
            </AppText>
        );
    };

    const cardContainerStyle = [
        styles.card,
        isRoomCard && styles.roomCard,
        { backgroundColor: theme.cardBackground },
    ];

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / resolvedImageWidth);
        setCurrentImageIndex(index);
    };

    const handleImageSectionLayout = (event: LayoutChangeEvent) => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        if (nextWidth > 0 && nextWidth !== imageSectionWidth) {
            setImageSectionWidth(nextWidth);
        }
    };

    const renderImageItem = ({ item }: { item: any; index: number }) => (
        <View
            style={[
                styles.imageWrapper,
                isRoomCard && styles.roomImageWrapper,
                { height: imageHeight, width: resolvedImageWidth },
            ]}
        >
            <Image
                source={item}
                style={[styles.cardImage, isRoomCard && styles.roomCardImage, { height: imageHeight, width: resolvedImageWidth }]}
                resizeMode="cover"
            />
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity activeOpacity={1} onPress={() => onPress ? onPress() : null} style={[styles.card, { backgroundColor: theme.cardBackground }, equalHeight && styles.cardEqualHeight]}>
                {(showSlider || isRoomCard) && images.length > 1 ? (
                    <View style={styles.imageSection} onLayout={handleImageSectionLayout}>
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
                            snapToInterval={resolvedImageWidth}
                            decelerationRate="fast"
                            getItemLayout={
                                resolvedImageWidth > 0
                                    ? (_, index) => ({
                                          length: resolvedImageWidth,
                                          offset: resolvedImageWidth * index,
                                          index,
                                      })
                                    : undefined
                            }
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
                        {renderAiBadge()}
                    </View>
                ) : (
                    <View style={styles.imageSection} onLayout={handleImageSectionLayout}>
                        {showLogoPlaceholder ? (
                            renderRoomLogoPlaceholder()
                        ) : (
                            <View
                                style={[
                                    styles.imageWrapper,
                                    isRoomCard && styles.roomImageWrapper,
                                    { height: imageHeight, width: resolvedImageWidth },
                                ]}
                            >
                                <Image
                                    source={firstImage}
                                    style={[
                                        styles.cardImage,
                                        isRoomCard && styles.roomCardImage,
                                        { height: imageHeight, width: resolvedImageWidth },
                                    ]}
                                    resizeMode="cover"
                                />
                                {renderAiBadge()}
                            </View>
                        )}
                    </View>
                )}



                {/* Room Card Specific: More Details Link */}
                {isRoomCard && (
                    <TouchableOpacity activeOpacity={1} style={styles.moreDetailsLink} onPress={onMoreDetails}>
                        <AppText style={styles.moreDetailsText}>Подробнее о номере</AppText>
                    </TouchableOpacity>
                )}

                {/* Room Card Specific: Features List */}
                {isRoomCard && roomFeatures.length > 0 && (
                    <View style={styles.featuresContainer}>
                        {roomFeatures.map((feature, index) => (
                            <View key={`feature-${index}`} style={styles.featureItem}>
                                <AppIcon name="checkmark" size={16} color={theme.text} />
                                <AppText style={[styles.featureText, { color: theme.text }]}>{feature}</AppText>
                            </View>
                        ))}
                    </View>
                )}


                {onPress ? (
                    <View
                        activeOpacity={0.94}
                        onPress={onPress}
                        style={[styles.content, equalHeight && styles.contentEqualHeight]}>
                        {!isRoomCard && (
                            <View style={styles.ratingRow}>
                                {Array.from({ length: 5 }).map((_, index) => {
                                    const isFilled = index < hotel.stars;
                                    return (
                                        <AppIcon
                                            key={`star-${index}`}
                                            name={isFilled ? 'starFilled' : 'star'}
                                            size={16}
                                            color={theme.brand}
                                        />
                                    );
                                })}
                            </View>
                        )}

                        <AppText
                            numberOfLines={equalHeight ? 2 : undefined}
                            style={[styles.hotelName, { color: theme.text }, equalHeight ? styles.hotelNameEqualHeight : {}]}>
                            {hotel.name}
                        </AppText>

                        {!isRoomCard && (
                            <View style={styles.reviewRow}>
                                <View style={styles.ratingBadge}>
                                    <AppText style={styles.ratingBadgeText}>{hotel.rating.toFixed(1)}</AppText>
                                </View>
                                {!showAddress && <AppIcon name="documents" size={18} color={theme.textTertiary} />}
                                {renderReviewCount(showAddress ? 16 : 15)}
                            </View>
                        )}

                        {showAddress && (
                            <AppText style={[styles.address, { color: theme.textTertiary }]}>
                                {hotel.address || 'Адрес не указан'}
                            </AppText>
                        )}

                        {showTags && (
                            <View style={[styles.tagsContainer, equalHeight && styles.tagsContainerEqualHeight]}>
                                {hotel.tags.map((tag, index) => (
                                    <View key={`${hotel.id}-${tag}`} style={[styles.tag, { backgroundColor: theme.backgroundTertiary }]}>
                                        <AppText style={[styles.tagText, { color: theme.text }, equalHeight ? styles.tagTextEqualHeight : {}]}>{tag}</AppText>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Show price only for hotel cards in search results, not on hotel detail page */}
                        {!isRoomCard && !showAddress && (
                            <View style={[styles.priceSection, equalHeight && styles.priceSectionBottom]}>
                                <AppText style={styles.priceText}>{hotel.price}</AppText>
                                <AppText style={[styles.dateText, { color: theme.textTertiary }]}>
                                    {dateRange || hotel.dateRange}
                                </AppText>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.content}>
                        {!isRoomCard && (
                            <>
                                <View style={styles.ratingRow}>
                                    {Array.from({ length: 5 }).map((_, index) => {
                                        const isFilled = index < hotel.stars;
                                        return (
                                            <AppIcon
                                                key={`star-${index}`}
                                                name={isFilled ? 'starFilled' : 'star'}
                                                size={16}
                                                color={theme.brand}
                                            />
                                        );
                                    })}
                                </View>

                                <AppText style={[styles.hotelName, { color: theme.text }]}>{hotel.name}</AppText>

                                <View style={styles.reviewRow}>
                                    <View style={styles.ratingBadge}>
                                        <AppText style={styles.ratingBadgeText}>{hotel.rating.toFixed(1)}</AppText>
                                    </View>
                                    {!showAddress && <AppIcon name="documents" size={18} color={theme.textTertiary} />}
                                    {renderReviewCount(showAddress ? 16 : 15)}
                                </View>
                            </>
                        )}

                        {isRoomCard && <AppText style={styles.hotelName}>{hotel.name}</AppText>}

                        {showAddress && (
                            <AppText style={[styles.address, { color: theme.textTertiary }]}>
                                {hotel.address || 'Адрес не указан'}
                            </AppText>
                        )}

                        {showTags && (
                            <View style={styles.tagsContainer}>
                                {hotel.tags.map((tag, index) => (
                                    <View key={`${hotel.id}-${tag}`} style={[styles.tag, { backgroundColor: theme.backgroundTertiary }]}>
                                        <AppText style={[styles.tagText, { color: theme.text }]}>{tag}</AppText>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Show price only for room cards */}
                        {isRoomCard && (
                            <View style={styles.roomPriceWrap}>
                                <View style={styles.priceSection}>
                                    <AppText style={styles.priceText}>{hotel.price}</AppText>
                                    <AppText style={[styles.priceSubtext, { color: theme.textTertiary }]}>{hotel.dateRange}</AppText>
                                </View>
                                {renderAiPriceChange()}
                            </View>
                        )}

                        {/* Room Card Specific: View All Options Button */}
                        {isRoomCard && onViewAllOptions && (
                            <AppButton
                                title="Все варианты"
                                onPress={onViewAllOptions}
                                size="large"
                            />
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    } else {
        return (
            <View style={cardContainerStyle}>
                {(showSlider || isRoomCard) && images.length > 1 ? (
                    <View style={styles.imageSection} onLayout={handleImageSectionLayout}>
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
                            snapToInterval={resolvedImageWidth}
                            decelerationRate="fast"
                            getItemLayout={
                                resolvedImageWidth > 0
                                    ? (_, index) => ({
                                          length: resolvedImageWidth,
                                          offset: resolvedImageWidth * index,
                                          index,
                                      })
                                    : undefined
                            }
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
                        {renderAiBadge()}
                    </View>
                ) : (
                    <View style={styles.imageSection} onLayout={handleImageSectionLayout}>
                        {showLogoPlaceholder ? (
                            renderRoomLogoPlaceholder()
                        ) : (
                            <View
                                style={[
                                    styles.imageWrapper,
                                    isRoomCard && styles.roomImageWrapper,
                                    { height: imageHeight, width: resolvedImageWidth },
                                ]}
                            >
                                <Image
                                    source={firstImage}
                                    style={[
                                        styles.cardImage,
                                        isRoomCard && styles.roomCardImage,
                                        { height: imageHeight, width: resolvedImageWidth },
                                    ]}
                                    resizeMode="cover"
                                />
                                {renderAiBadge()}
                            </View>
                        )}
                    </View>
                )}
                {isRoomCard && (
                    <View style={styles.roomCardHeader}>

                        <AppText style={[styles.hotelName, { color: theme.text }]}>{hotel.name}</AppText>
                    </View>
                )}
                {/* Room Card Specific: More Details Link */}
                {isRoomCard && (
                    <TouchableOpacity activeOpacity={1} style={styles.moreDetailsLink} onPress={onMoreDetails}>
                        <AppText style={styles.moreDetailsText}>Подробнее о номере</AppText>
                    </TouchableOpacity>
                )}

                {/* Room Card Specific: Features List */}
                {isRoomCard && roomFeatures.length > 0 && (
                    <View style={styles.featuresContainer}>
                        {roomFeatures.map((feature, index) => (
                            <View key={`feature-${index}`} style={styles.featureItem}>
                                <AppIcon name="checkmark" size={16} color={theme.text} />
                                <AppText style={[styles.featureText, { color: theme.text }]}>{feature}</AppText>
                            </View>
                        ))}
                    </View>
                )}

                {onPress ? (
                    <View
                        activeOpacity={0.94}
                        onPress={onPress}
                        style={styles.content}>
                        {!isRoomCard && (
                            <View style={styles.ratingRow}>
                                {Array.from({ length: 5 }).map((_, index) => {
                                    const isFilled = index < hotel.stars;
                                    return (
                                        <AppIcon
                                            key={`star-${index}`}
                                            name={isFilled ? 'starFilled' : 'star'}
                                            size={16}
                                            color={theme.brand}
                                        />
                                    );
                                })}
                            </View>
                        )}

                        <AppText style={[styles.hotelName, { color: theme.text }]}>{hotel.name}</AppText>

                        {!isRoomCard && (
                            <View style={styles.reviewRow}>
                                <View style={styles.ratingBadge}>
                                    <AppText style={styles.ratingBadgeText}>{hotel.rating.toFixed(1)}</AppText>
                                </View>
                                {!showAddress && <AppIcon name="documents" size={18} color={theme.textTertiary} />}
                                {renderReviewCount(showAddress ? 16 : 15)}
                            </View>
                        )}

                        {showAddress && (
                            <AppText style={[styles.address, { color: theme.textTertiary }]}>
                                {hotel.address || 'Адрес не указан'}
                            </AppText>
                        )}

                        {showTags && (
                            <View style={styles.tagsContainer}>
                                {hotel.tags.map((tag, index) => (
                                    <View key={`${hotel.id}-${tag}`} style={[styles.tag, { backgroundColor: theme.backgroundTertiary }]}>
                                        <AppText style={[styles.tagText, { color: theme.text }]}>{tag}</AppText>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Show price only for hotel cards in search results, not on hotel detail page */}
                        {!isRoomCard && !showAddress && (
                            <View style={styles.priceSection}>
                                <AppText style={styles.priceText}>{hotel.price}</AppText>
                                <AppText style={[styles.dateText, { color: theme.textTertiary }]}>
                                    {dateRange || hotel.dateRange}
                                </AppText>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.content}>
                        {!isRoomCard && (
                            <>
                                <View style={styles.ratingRow}>
                                    {Array.from({ length: 5 }).map((_, index) => {
                                        const isFilled = index < hotel.stars;
                                        return (
                                            <AppIcon
                                                key={`star-${index}`}
                                                name={isFilled ? 'starFilled' : 'star'}
                                                size={16}
                                                color={theme.brand}
                                            />
                                        );
                                    })}
                                </View>

                                <AppText style={[styles.hotelName, { color: theme.text }]}>{hotel.name}</AppText>

                                <View style={styles.reviewRow}>
                                    <View style={styles.ratingBadge}>
                                        <AppText style={styles.ratingBadgeText}>{hotel.rating.toFixed(1)}</AppText>
                                    </View>
                                    {!showAddress && <AppIcon name="documents" size={18} color={theme.textTertiary} />}
                                    {renderReviewCount(showAddress ? 16 : 15)}
                                </View>
                            </>
                        )}


                        {showAddress && (
                            <AppText style={[styles.address, { color: theme.textTertiary }]}>
                                {hotel.address || 'Адрес не указан'}
                            </AppText>
                        )}

                        {showTags && (
                            <View style={styles.tagsContainer}>
                                {hotel.tags.map((tag, index) => (
                                    <View key={`${hotel.id}-${tag}`} style={[styles.tag, { backgroundColor: theme.backgroundTertiary }]}>
                                        <AppText style={[styles.tagText, { color: theme.text }]}>{tag}</AppText>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Show price only for room cards */}
                        {isRoomCard && (
                            <View style={styles.roomPriceWrap}>
                                <View style={styles.priceSection}>
                                    <AppText style={styles.priceText}>{hotel.price}</AppText>
                                    <AppText style={[styles.priceSubtext, { color: theme.textTertiary }]}>{hotel.dateRange}</AppText>
                                </View>
                                {renderAiPriceChange()}
                            </View>
                        )}

                        {/* Room Card Specific: View All Options Button */}
                        {isRoomCard && onViewAllOptions && (
                            <AppButton
                                title="Все варианты"
                                onPress={onViewAllOptions}
                                size="large"
                            />
                        )}
                    </View>
                )}
                {footer}
            </View>
        );
    }

};

export default HotelCard;

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: 16,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 6,
        marginBottom: 8,

    },
    roomCard: {
        padding: 0,
        overflow: 'hidden',
    },
    roomCardHeader: {
        paddingTop: 12,
        paddingHorizontal: 16,
    },
    imageSection: {
        position: 'relative',
        width: '100%',
        alignSelf: 'stretch',
    },
    moreDetailsLink: {
        paddingHorizontal: 16,
        paddingTop: 12,
        alignSelf: 'flex-start',
    },
    moreDetailsText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FE732E',
        textDecorationLine: 'underline',
    },
    featuresContainer: {
        paddingHorizontal: 16,
        gap: 8,
        marginTop: 4,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        fontSize: 12,
        flex: 1,
    },
    imageWrapper: {
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 0,
        alignItems: 'flex-start',
        position: 'relative',
    },
    roomImageWrapper: {
        borderRadius: 0,
        width: '100%',
    },
    roomLogoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardImage: {
        resizeMode: 'cover',
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    roomCardImage: {
        borderRadius: 0,
    },
    content: {
        gap: 12,
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
    },
    ratingRow: {
        flexDirection: 'row',
        gap: 4,
    },
    hotelName: {
        fontFamily: FONT_HEADING,
        fontSize: 16,
        lineHeight: 20,
        fontWeight: '500',
        fontStyle: 'normal',
    },
    reviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ratingBadge: {
        backgroundColor: '#288556',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    ratingBadgeText: {
        color: '#FFFFFF',
        fontWeight: '500',
        fontSize: 12,
    },
    reviewText: {
        fontSize: 14,
        fontWeight: '400',
    },
    address: {
        fontSize: 12,
        lineHeight: 20,
    },
    priceSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    roomPriceWrap: {
        gap: 4,
        marginTop: 4,
    },
    priceIncreaseText: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    priceText: {
        fontSize: 20,
        fontWeight: '500',
        color: '#FE732E',
        lineHeight: 24,
    },
    priceSubtext: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
    },
    dateText: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 18,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
    },
    reviewCount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        marginBottom: 4,
        flexWrap: 'wrap',
        paddingHorizontal: 16,
    },
    paginationDot: {
        backgroundColor: '#D0D0D0',
    },
    paginationText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 8,
    },

    // --- equalHeight (iPad grid) ---
    cardEqualHeight: {
        flex: 1,
    },
    contentEqualHeight: {
        flex: 1,
    },
    // two lines are always reserved (hotelName lineHeight 20 × 2)
    hotelNameEqualHeight: {
        minHeight: 40,
    },
    // two rows of tags are always reserved: tag = 6 + 16 + 6, rows gap 8
    tagsContainerEqualHeight: {
        minHeight: 64,
        alignContent: 'flex-start',
    },
    tagTextEqualHeight: {
        lineHeight: 16,
    },
    // pushes the price to the bottom of the stretched card
    priceSectionBottom: {
        marginTop: 'auto',
    },
});

