import React from 'react';
import { StyleSheet, View, Platform, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppIcon } from '../../UI';
import ExpandableSectionModalContent from './ExpandableSectionModalContent';
import type { ApiHotelData } from '../../../types/hotel';
import { useTheme } from '../../../hooks/useTheme';

type ExpandableSectionModalProps = {
  visible: boolean;
  onClose: () => void;
  sectionId: string;
  sectionTitle: string;
  apiHotelData?: ApiHotelData; // Optional API hotel data
};

const ExpandableSectionModal: React.FC<ExpandableSectionModalProps> = ({
  visible,
  onClose,
  sectionId,
  sectionTitle,
  apiHotelData,
}) => {
  const { theme, isDark } = useTheme();
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
      backdropOpacity={0}
      hasBackdrop={false}
      animationIn="fadeIn"
      animationOut="fadeOut"
      propagateSwipe={true}>
      {Platform.OS === 'ios' ? (
        <BlurView style={styles.blurOverlay} blurType={isDark ? 'dark' : 'light'} blurAmount={10} />
      ) : (
        <View style={[styles.blurOverlay, styles.blurOverlayAndroid, { backgroundColor: theme.overlay }]} />
      )}
      <ExpandableSectionModalContent
        onClose={onClose}
        sectionId={sectionId}
        sectionTitle={sectionTitle}
        apiHotelData={apiHotelData}
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
  blurOverlayAndroid: {
  },
});

export default ExpandableSectionModal;

