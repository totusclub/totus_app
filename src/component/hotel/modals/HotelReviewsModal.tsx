import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import Modal from 'react-native-modal';
import { BlurView } from '@react-native-community/blur';
import HotelReviewsModalContent from './HotelReviewsModalContent';
import type { HotelReview } from '../../../types/hotel';
import { useTheme } from '../../../hooks/useTheme';

type HotelReviewsModalProps = {
  visible: boolean;
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

const HotelReviewsModal: React.FC<HotelReviewsModalProps> = ({
  visible,
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
  const { theme, isDark } = useTheme();

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      style={styles.modal}
      backdropOpacity={0}
      hasBackdrop={false}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      propagateSwipe
      avoidKeyboard={false}>
      {Platform.OS === 'ios' ? (
        <BlurView style={styles.blurOverlay} blurType={isDark ? 'dark' : 'light'} blurAmount={10} />
      ) : (
        <View style={[styles.blurOverlay, { backgroundColor: theme.overlay }]} />
      )}
      <HotelReviewsModalContent
        onClose={onClose}
        reviews={reviews}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        error={error}
        reviewsCount={reviewsCount}
        rating={rating}
        onLoadMore={onLoadMore}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default HotelReviewsModal;
