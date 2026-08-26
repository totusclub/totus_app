import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Modal from 'react-native-modal';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppIcon, AppButton } from '../../UI';
import { useTheme } from '../../../hooks/useTheme';

type SortOption = {
  id: string;
  label: string;
  icon: string;
};

type SortModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: SortOption) => void;
  selectedOption: string;
  options?: SortOption[];
};

const defaultSortOptions: SortOption[] = [
  { id: 'recommended', label: 'По рекомендации', icon: 'recommended' },
  { id: 'highRating', label: 'Высокий рейтинг', icon: 'star' },
  { id: 'cheapFirst', label: 'Сначала дешёвые', icon: 'lineArrowDown' },
  { id: 'expensiveFirst', label: 'Сначала дорогие', icon: 'lineArrowUp' },
];

const SortModal: React.FC<SortModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedOption,
  options = defaultSortOptions,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [pendingOption, setPendingOption] = useState(selectedOption);

  useEffect(() => {
    if (visible) {
      setPendingOption(selectedOption);
    }
  }, [visible, selectedOption]);

  const handleConfirm = () => {
    const option = options.find((item) => item.id === pendingOption);
    if (option) {
      onSelect(option);
    }
    onClose();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      animationIn={'fadeIn'}
      animationOut={'fadeOut'}
      swipeDirection={['down']}
      style={styles.modal}
      backdropOpacity={0}
      hasBackdrop={false}
    >

      {Platform.OS === 'ios' ? (
        <BlurView
          style={styles.blurOverlay}
          blurType={isDark ? 'dark' : 'light'}
          blurAmount={2}
        />
      ) : (
        <View style={[styles.blurOverlay, styles.blurOverlayAndroid, { backgroundColor: theme.overlay }]} />
      )}
      <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: insets.bottom }]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        {options.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              { borderBottomColor: theme.borderLight },
              index === options.length - 1 && styles.optionLast,
            ]}
            onPress={() => setPendingOption(option.id)}
          >
            <View style={styles.optionLeft}>
              <AppIcon name={option.icon} size={24} color={theme.text} />
              <AppText style={[styles.optionText, { color: theme.text }]}>{option.label}</AppText>
            </View>
            {pendingOption === option.id && (
              <AppIcon name="checkmark" size={24} color={theme.brand} />
            )}
          </TouchableOpacity>
        ))}

        <View style={[styles.buttonContainer, { borderTopColor: theme.borderLight }]}>
          <AppButton title="Применить" onPress={handleConfirm} size="large" />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  blurOverlayAndroid: {
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionLast: {
    borderBottomWidth: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '400',
  },
  buttonContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});

export default SortModal;
