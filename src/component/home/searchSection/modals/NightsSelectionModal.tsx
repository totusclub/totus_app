import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  Pressable,
  Modal as NativeModal,
  useWindowDimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppButton } from '../../../UI';
import { useTheme } from '../../../../hooks/useTheme';
import { FONT_HEADING } from '../../../../theme/fonts';
import { useLayout } from '../../../../hooks/useLayout';
import { TabletSheetBackdrop, TABLET_SHEET_WIDTH, tabletSheetStyles } from './tabletSheet';

type NightsSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (nights: number) => void;
  initialNights?: number;
};

const MIN_NIGHTS = 1;
const MAX_NIGHTS = 30;

const NightsSelectionModal: React.FC<NightsSelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
  initialNights = 7,
}) => {
  const { theme, isDark } = useTheme();
  const [nights, setNights] = useState(initialNights);
  const [flexibleNights, setFlexibleNights] = useState(false);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { isTablet } = useLayout();
  const paddingBottom = insets.bottom;
  // Sheet has 20px outer padding + 12px slider padding on both sides.
  // iPad: окно 540 по центру (tabletSheet.tsx) — ползунок по ширине окна, а не экрана.
  const sliderLength = Math.max(200, (isTablet ? TABLET_SHEET_WIDTH : windowWidth) - 64);

  useEffect(() => {
    if (visible) {
      setNights(initialNights);
    }
  }, [visible, initialNights]);

  const handleConfirm = () => {
    onSelect(nights);
    onClose();
  };

  /** Android: community Slider often fails inside modals / with RN touch order; stepper is reliable. */
  const nightsPicker =
    Platform.OS === 'android' ? (
      <View style={styles.androidStepperRow} collapsable={false}>
        <TouchableOpacity
          style={[
            styles.androidStepperBtn,
            { borderColor: theme.border, backgroundColor: theme.surfaceSecondary },
          ]}
          onPress={() => setNights((v) => Math.max(MIN_NIGHTS, v - 1))}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppText style={[styles.androidStepperBtnText, { color: theme.text }]}>−</AppText>
        </TouchableOpacity>
        <View style={styles.androidStepperValueWrap}>
          <AppText style={[styles.androidStepperValue, { color: theme.text }]}>{nights}</AppText>
          <AppText style={[styles.androidStepperHint, { color: theme.textTertiary }]}>ночей</AppText>
        </View>
        <TouchableOpacity
          style={[
            styles.androidStepperBtn,
            { borderColor: theme.border, backgroundColor: theme.surfaceSecondary },
          ]}
          onPress={() => setNights((v) => Math.min(MAX_NIGHTS, v + 1))}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppText style={[styles.androidStepperBtnText, { color: theme.text }]}>+</AppText>
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.sliderContainer} collapsable={false}>
        <MultiSlider
          values={[nights]}
          onValuesChange={values => setNights(values[0])}
          min={MIN_NIGHTS}
          max={MAX_NIGHTS}
          step={1}
          snapped
          sliderLength={sliderLength}
          containerStyle={styles.sliderInner}
          trackStyle={styles.sliderTrack}
          selectedStyle={{ backgroundColor: theme.brand }}
          unselectedStyle={{ backgroundColor: theme.borderSecondary || theme.border }}
          markerStyle={[
            styles.sliderMarker,
            {
              backgroundColor: '#FFFFFF',
              borderColor: 'rgba(0,0,0,0.08)',
              shadowColor: '#000',
            },
          ]}
          pressedMarkerStyle={[
            styles.sliderMarkerPressed,
            {
              backgroundColor: '#FFFFFF',
              borderColor: 'rgba(0,0,0,0.12)',
              shadowColor: '#000',
            },
          ]}
        />
      </View>
    );

  const sheet = (
    <>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <AppText style={[styles.headerTitle, { color: theme.text }]}>
            Количество ночей: {nights}
          </AppText>
          <TouchableOpacity
            activeOpacity={1}
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
          </TouchableOpacity>
          <View style={[styles.headerUnderline, { backgroundColor: theme.border }]} />
        </View>
      </View>

      {nightsPicker}

      <View style={styles.toggleContainer}>
        <View style={styles.toggleContent}>
          <View>
            <AppText style={[styles.toggleTitle, { color: theme.text }]}>
              Длительность тура ±2 ночи
            </AppText>
            <AppText style={[styles.toggleSubtitle, { color: theme.textTertiary }]}>
              Бывает выгоднее
            </AppText>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleSwitch,
              { backgroundColor: flexibleNights ? theme.brand : theme.border },
            ]}
            onPress={() => setFlexibleNights(!flexibleNights)}
            activeOpacity={1}>
            <View
              style={[
                styles.toggleCircle,
                { backgroundColor: theme.surface },
                flexibleNights && styles.toggleCircleActive,
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <AppButton title="Готово" onPress={handleConfirm} size="large" />
      </View>
    </>
  );

  const sheetWrapperStyle = [
    styles.modalContent,
    {
      backgroundColor: theme.background,
      paddingBottom,
      ...(Platform.OS === 'android' ? { width: '100%' as const } : {}),
    },
    isTablet && [tabletSheetStyles.card, styles.modalContentTablet],
  ];

  if (Platform.OS === 'android') {
    return (
      <NativeModal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}>
        <View style={styles.androidRoot} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть"
            onPress={onClose}
            style={[styles.androidBackdrop, { backgroundColor: theme.overlay }]}
          />
          <View style={sheetWrapperStyle} collapsable={false}>
            {sheet}
          </View>
        </View>
      </NativeModal>
    );
  }

  return (
    <Modal
      style={[styles.modal, isTablet && tabletSheetStyles.modal]}
      isVisible={visible}
      animationIn="fadeIn"
      animationOut="fadeOut"
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      propagateSwipe
      backdropOpacity={0}
      hasBackdrop={false}>
      <BlurView
        style={styles.blurOverlay}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={10}
      />
      {isTablet ? <TabletSheetBackdrop onClose={onClose} isDark={isDark} blur={false} /> : null}
      <View style={sheetWrapperStyle}>{sheet}</View>
    </Modal>
  );
};

export default NightsSelectionModal;

const styles = StyleSheet.create({
  androidRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  androidBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  modalContent: {
    zIndex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    minHeight: 320,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: Platform.OS === 'android' ? 16 : 0,
  },
  // iPad only: высота по содержимому (на телефоне шторка не ниже 320).
  modalContentTablet: {
    minHeight: undefined,
  },
  header: {
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    position: 'relative',
  },
  headerTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '700',
  },
  headerUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
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
  sliderContainer: {
    marginBottom: 32,
    paddingHorizontal: 12,
    paddingVertical: 16,
    minHeight: 56,
    alignItems: 'center',
  },
  sliderInner: {
    height: 40,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 3,
    borderRadius: 1.5,
  },
  sliderMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.5,
    elevation: 3,
  },
  sliderMarkerPressed: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 3.5,
    elevation: 4,
  },
  androidStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 4,
    gap: 12,
  },
  androidStepperBtn: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidStepperBtnText: {
    fontSize: 32,
    fontWeight: '500',
    lineHeight: 36,
  },
  androidStepperValueWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  androidStepperValue: {
    fontSize: 40,
    fontWeight: '700',
  },
  androidStepperHint: {
    fontSize: 13,
    marginTop: 2,
  },
  toggleContainer: {
    marginBottom: 24,
  },
  toggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  buttonContainer: {
    marginTop: 'auto',
  },
});
