import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import Modal from 'react-native-modal';
import { BlurView } from '@react-native-community/blur';
import AllOptionsModalContent from './AllOptionsModalContent';
import type { HotelRoom, HotelSearchSnapshot } from '../../../types/hotel';
import type { AiRoomPick } from '../../../utils/hotelUtils/aiRoomPick';
import { useTheme } from '../../../hooks/useTheme';

type AllOptionsModalProps = {
  visible: boolean;
  onClose: () => void;
  room: HotelRoom | null;
  selectedDate?: string | null;
  requestId: string | null;
  aiRoomPick?: AiRoomPick | null;
  hotelMeta: {
    name?: string;
    country?: string;
    city?: string;
  };
  searchContext: HotelSearchSnapshot | null;
  searchType?: string;
};

const AllOptionsModal: React.FC<AllOptionsModalProps> = ({
  visible,
  onClose,
  room,
  selectedDate,
  requestId,
  aiRoomPick = null,
  hotelMeta,
  searchContext,
  searchType,
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
      <AllOptionsModalContent
        onClose={onClose}
        room={room}
        selectedDate={selectedDate}
        requestId={requestId}
        hotelMeta={hotelMeta}
        searchContext={searchContext}
        searchType={searchType}
        aiRoomPick={aiRoomPick}
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

export default AllOptionsModal;

