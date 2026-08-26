import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Modal from 'react-native-modal';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppButton, AppIcon } from '../../../UI';
import { useTheme } from '../../../../hooks/useTheme';

type TouristsSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (adults: number, children: number, kidsAges: number[]) => void;
  initialAdults?: number;
  initialChildren?: number;
  initialKidsAges?: number[];
};

const TouristsSelectionModal: React.FC<TouristsSelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
  initialAdults = 1,
  initialChildren = 0,
  initialKidsAges = [],
}) => {
  const { theme, isDark } = useTheme();
  // Ensure we always have valid numbers
  const getValidAdults = (value: number | undefined): number => {
    if (value === undefined || value === null || isNaN(value) || value < 1) return 1;
    return value;
  };

  const getValidChildren = (value: number | undefined): number => {
    if (value === undefined || value === null || isNaN(value) || value < 0) return 0;
    return value;
  };

  const [adults, setAdults] = useState(() => getValidAdults(initialAdults));
  const [children, setChildren] = useState(() => getValidChildren(initialChildren));
  const [kidsAges, setKidsAges] = useState<number[]>(() =>
    initialKidsAges && Array.isArray(initialKidsAges) && initialKidsAges.length > 0
      ? initialKidsAges
      : []
  );
  const insets = useSafeAreaInsets();
  const paddingBottom = insets.bottom;

  // Sync state when modal opens with new initial values
  useEffect(() => {
    if (visible) {
      setAdults(getValidAdults(initialAdults));
      setChildren(getValidChildren(initialChildren));
      setKidsAges(
        initialKidsAges && Array.isArray(initialKidsAges) && initialKidsAges.length > 0
          ? initialKidsAges
          : []
      );
    }
  }, [visible, initialAdults, initialChildren, initialKidsAges]);

  // Sync kidsAges array when children count changes
  useEffect(() => {
    if (children > kidsAges.length) {
      // Add default age (0) for new children
      setKidsAges(prev => [...prev, ...Array(children - prev.length).fill(0)]);
    } else if (children < kidsAges.length) {
      // Remove ages for removed children
      setKidsAges(prev => prev.slice(0, children));
    }
  }, [children, kidsAges.length]);

  const handleIncrementAdults = () => {
    setAdults(prev => prev + 1);
  };

  const handleDecrementAdults = () => {
    if (adults > 1) {
      setAdults(prev => prev - 1);
    }
  };

  const handleIncrementChildren = () => {
    setChildren(prev => prev + 1);
  };

  const handleDecrementChildren = () => {
    if (children > 0) {
      setChildren(prev => prev - 1);
    }
  };

  const handleAgeChange = (index: number, newAge: number) => {
    setKidsAges(prev => {
      const updated = [...prev];
      updated[index] = newAge;
      return updated;
    });
  };

  const handleIncrementAge = (index: number) => {
    if (kidsAges[index] < 16) {
      handleAgeChange(index, kidsAges[index] + 1);
    }
  };

  const handleDecrementAge = (index: number) => {
    if (kidsAges[index] > 0) {
      handleAgeChange(index, kidsAges[index] - 1);
    }
  };

  const handleConfirm = () => {
    onSelect(adults, children, kidsAges);
    onClose();
  };

  return (
    <Modal
      style={styles.modal}
      isVisible={visible}
      animationIn="fadeIn"
      animationOut="fadeOut"
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      backdropOpacity={0}
      hasBackdrop={false}>
      {/* Blur Overlay */}
      {Platform.OS === 'ios' ? (
        <BlurView
          style={styles.blurOverlay}
          blurType={isDark ? 'dark' : 'light'}
          blurAmount={10}
        />
      ) : (
        <View style={[styles.blurOverlay, styles.blurOverlayAndroid, { backgroundColor: theme.overlay }]} />
      )}
      <View
        style={[
          styles.modalContent,
          {
            backgroundColor: theme.background,
            paddingBottom: paddingBottom + 20,
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <AppText style={[styles.headerTitle, { color: theme.text }]}>Туристы</AppText>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
            </TouchableOpacity>
            <View style={[styles.headerUnderline, { backgroundColor: theme.border }]} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Adults Section */}
          <View style={styles.section}>
            <View style={styles.sectionInfo}>
              <AppText style={[styles.sectionTitle, { color: theme.text }]}>Взрослые</AppText>
              <AppText style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>
                от 17 лет и старше
              </AppText>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity
                style={[styles.counterButton, { borderColor: theme.border }]}
                onPress={handleDecrementAdults}
                disabled={adults <= 1}
                activeOpacity={0.7}>
                <AppIcon
                  name="minus"
                  size={20}
                  color={adults <= 1 ? theme.textDisabled : theme.text}
                />
              </TouchableOpacity>
              <AppText style={[styles.counterValue, { color: theme.text }]}>{adults || 1}</AppText>
              <TouchableOpacity
                style={[styles.counterButton, { borderColor: theme.border }]}
                onPress={handleIncrementAdults}
                activeOpacity={0.7}>
                <AppIcon name="plus" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Children Section */}
          <View style={styles.section}>
            <View style={styles.sectionInfo}>
              <AppText style={[styles.sectionTitle, { color: theme.text }]}>Дети</AppText>
              <AppText style={[styles.sectionSubtitle, { color: theme.textTertiary }]}>
                от 0 до 16 лет
              </AppText>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity
                style={[styles.counterButton, { borderColor: theme.border }]}
                onPress={handleDecrementChildren}
                disabled={children <= 0}
                activeOpacity={0.7}>
                <AppIcon
                  name="minus"
                  size={20}
                  color={children <= 0 ? theme.textDisabled : theme.text}
                />
              </TouchableOpacity>
              <AppText style={[styles.counterValue, { color: theme.text }]}>{children || 0}</AppText>
              <TouchableOpacity
                style={[styles.counterButton, { borderColor: theme.border }]}
                onPress={handleIncrementChildren}
                activeOpacity={0.7}>
                <AppIcon name="plus" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Children Ages Section */}
          {children > 0 && (
            <View>
              <AppText style={[styles.agesSectionTitle, { color: theme.text }]}>Возраст детей</AppText>
              {kidsAges.map((age, index) => (
                <View key={index} style={[styles.ageRow, { borderBottomColor: theme.border }]}>
                  <AppText style={[styles.ageLabel, { color: theme.text }]}>Ребёнок {index + 1}</AppText>
                  <View style={styles.ageCounter}>
                    <TouchableOpacity
                      style={[styles.counterButton, { borderColor: theme.border }]}
                      onPress={() => handleDecrementAge(index)}
                      disabled={age <= 0}
                      activeOpacity={0.7}>
                      <AppIcon
                        name="minus"
                        size={20}
                        color={age <= 0 ? theme.textDisabled : theme.text}
                      />
                    </TouchableOpacity>
                    <AppText style={[styles.counterValue, { color: theme.text }]}>{age}</AppText>
                    <TouchableOpacity
                      style={[styles.counterButton, { borderColor: theme.border }]}
                      onPress={() => handleIncrementAge(index)}
                      disabled={age >= 16}
                      activeOpacity={0.7}>
                      <AppIcon
                        name="plus"
                        size={20}
                        color={age >= 16 ? theme.textDisabled : theme.text}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Confirm Button */}
        <View style={[styles.buttonContainer, { borderTopColor: theme.border }]}>
          <AppButton
            title="Готово"
            onPress={handleConfirm}
            size="large"
          />
        </View>
      </View>
    </Modal>
  );
};

export default TouristsSelectionModal;

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  blurOverlayAndroid: {
  },
  modalContent: {
    zIndex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    flexDirection: 'column',
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
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  content: {
    paddingBottom: 16,
  },
  buttonContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
  },

  agesSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  ageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  ageLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  ageCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
});

