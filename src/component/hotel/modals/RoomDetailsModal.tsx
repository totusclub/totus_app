import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import Modal from 'react-native-modal';
import { BlurView } from '@react-native-community/blur';
import RoomDetailsModalContent from './RoomDetailsModalContent';
import type { HotelRoom } from '../../../types/hotel';
import { useTheme } from '../../../hooks/useTheme';

type RoomDetailsModalProps = {
  visible: boolean;
  onClose: () => void;
  room: HotelRoom | null;
};

const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
  visible,
  onClose,
  room,
}) => {
  const { theme, isDark } = useTheme();
  if (!room) return null;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      style={styles.modal}
      backdropOpacity={0}
      hasBackdrop={false}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      propagateSwipe={true}
      avoidKeyboard={false}>
      {Platform.OS === 'ios' ? (
        <BlurView style={styles.blurOverlay} blurType={isDark ? 'dark' : 'light'} blurAmount={10} />
      ) : (
        <View style={[styles.blurOverlay, styles.blurOverlayAndroid, { backgroundColor: theme.overlay }]} />
      )}
      <RoomDetailsModalContent
        onClose={onClose}
        room={room}
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

export default RoomDetailsModal;

