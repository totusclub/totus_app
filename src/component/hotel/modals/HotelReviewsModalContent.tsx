import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppButton, AppIcon } from '../../UI';
import type { HotelReview } from '../../../types/hotel';
import { useTheme } from '../../../hooks/useTheme';
import { FONT_HEADING } from '../../../theme/fonts';

type HotelReviewsModalContentProps = {
  onClose: () => void;
  reviews: HotelReview[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  reviewsCount: number;
  rating: number;
  onLoadMore: () => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function ReviewAvatar() {
  return (
    <View style={styles.avatarWrap}>
      <AppIcon name="radiologo" size={40} color="black" />
    </View>
  );
}
function formatReviewDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const HotelReviewsModalContent: React.FC<HotelReviewsModalContentProps> = ({
  onClose,
  reviews,
  loading,
  loadingMore,
  hasMore,
  error,
  reviewsCount,
  rating,
  onLoadMore,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const modalHeight = SCREEN_HEIGHT * 0.9;

  const subTitle =
    reviewsCount > 0
      ? `${reviewsCount} отзывов${rating > 0 ? ` · рейтинг ${rating.toFixed(1)}` : ''}`
      : '';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          height: modalHeight,
          paddingBottom: insets.bottom,
        },
      ]}>
      <View style={styles.header}>
        <View style={[styles.headerContent, { borderBottomColor: theme.borderLight }]}>
          <View style={styles.headerTitles}>
            <AppText style={[styles.headerTitle, { color: theme.text }]}>Отзывы</AppText>
            {subTitle ? (
              <AppText style={[styles.headerSubTitle, { color: theme.textTertiary }]}>
                {subTitle}
              </AppText>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {loading && reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.brand} />
          <AppText style={[styles.emptyText, { color: theme.textTertiary }]}>
            Загрузка отзывов...
          </AppText>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <AppText style={[styles.emptyText, { color: theme.textTertiary }]}>{error}</AppText>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AppText style={[styles.emptyText, { color: theme.textTertiary }]}>Нет отзывов</AppText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 16 },
          ]}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled">
          {reviews.map(review => (
            <View
              key={review.id}
              style={[styles.reviewCard, { backgroundColor: theme.backgroundTertiary }]}>
              <View style={styles.reviewHeader}>
                <ReviewAvatar />
                <View style={styles.reviewMeta}>
                  <View style={styles.authorRow}>
                    <AppText style={[styles.authorName, { color: theme.text }]}>
                      {review.name}
                    </AppText>
                    {review.average_rating > 0 && (
                      <View style={styles.ratingBadge}>
                        <AppText style={styles.ratingBadgeText}>{review.average_rating}</AppText>
                      </View>
                    )}
                  </View>
                  {review.title ? (
                    <AppText style={[styles.reviewTitle, { color: theme.textTertiary }]}>
                      {review.title}
                    </AppText>
                  ) : null}
                  <AppText style={[styles.reviewDate, { color: theme.textTertiary }]}>
                    {formatReviewDate(review.created_at)}
                  </AppText>
                </View>
              </View>
              <AppText style={[styles.reviewContent, { color: theme.text }]}>
                {review.content}
              </AppText>
              {review.answer ? (
                <View style={[styles.hotelAnswer, { backgroundColor: theme.background }]}>
                  <AppText style={[styles.answerLabel, { color: theme.textTertiary }]}>
                    Ответ отеля
                  </AppText>
                  <AppText style={[styles.answerText, { color: theme.text }]}>
                    {review.answer}
                  </AppText>
                </View>
              ) : null}
            </View>
          ))}
          {hasMore && (
            <AppButton
              title={loadingMore ? 'Загрузка...' : 'Показать ещё'}
              onPress={onLoadMore}
              size="large"
              disabled={loadingMore}
            />
          )}
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
    overflow: 'hidden',
  },
  header: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitles: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '500',
  },
  headerSubTitle: {
    fontSize: 13,
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
    minHeight: 0,
  },
  scrollContent: {
    gap: 12,
  },
  reviewCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewMeta: {
    flex: 1,
    gap: 2,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
  },
  ratingBadge: {
    backgroundColor: '#288556',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  reviewTitle: {
    fontSize: 12,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  hotelAnswer: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FE732E',
    gap: 4,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  answerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});

export default HotelReviewsModalContent;
