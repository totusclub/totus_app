import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppIcon, AppButton } from '../../UI';
import { useTheme } from '../../../hooks/useTheme';
import { formatPrice } from '../../../utils/ticketsUtils/flightTransformers';
import {
  clearRoomFilters,
  cloneRoomFilters,
  getConfirmabilityLabel,
  selectConfirmabilityFilter,
  toggleFreeCancelFilter,
  toggleMealFilter,
  toggleOperatorFilter,
  type HotelRoomFilters,
  type RoomFilterOption,
} from '../../../utils/hotelUtils/roomFilters';

type RoomFiltersProps = {
  filters: HotelRoomFilters | null;
  hasActiveFilters?: boolean;
  loading?: boolean;
  compact?: boolean;
  onChange: (
    filters: HotelRoomFilters | ((current: HotelRoomFilters) => HotelRoomFilters),
  ) => void;
  onClear?: () => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEADER_HEIGHT = 52;
const MODAL_HANDLE_HEIGHT = 20;
const MODAL_FOOTER_HEIGHT = 72;

function getFreeCancelLabel(option: RoomFilterOption): string {
  return option.id === true ? 'Бесплатная отмена' : 'Любые условия отмены';
}

function formatOfferCount(count: number | undefined): string {
  if (count == null) return '';
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} предложение`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} предложения`;
  }
  return `${count} предложений`;
}

type FilterOptionRowProps = {
  option: RoomFilterOption;
  label: string;
  selected: boolean;
  disabled?: boolean;
  mode?: 'checkbox' | 'radio';
  onToggle: () => void;
};

function FilterOptionRow({
  option,
  label,
  selected,
  disabled,
  mode = 'checkbox',
  onToggle,
}: FilterOptionRowProps) {
  const { theme } = useTheme();
  const meta =
    option.count != null
      ? `${formatOfferCount(option.count)}${
          option.min_price != null && option.count > 0
            ? ` от ${formatPrice(option.min_price)}`
            : ''
        }`
      : '';

  return (
    <TouchableOpacity
      style={[
        styles.optionRow,
        { borderBottomColor: theme.borderLight },
        selected && { backgroundColor: theme.backgroundTertiary },
        disabled && styles.optionDisabled,
      ]}
      onPress={disabled ? undefined : onToggle}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.optionLeft}>
        {mode === 'radio' ? (
          <View
            style={[
              styles.radioOuter,
              { borderColor: selected ? theme.brand : theme.border },
            ]}
          >
            {selected ? (
              <View style={[styles.radioInner, { backgroundColor: theme.brand }]} />
            ) : null}
          </View>
        ) : (
          <View
            style={[
              styles.checkbox,
              {
                borderColor: selected ? theme.brand : theme.border,
                backgroundColor: selected ? theme.brand : 'transparent',
              },
            ]}
          >
            {selected ? <AppIcon name="checkmark" size={14} color="#FFFFFF" /> : null}
          </View>
        )}
        <View style={styles.optionTextWrap}>
          <AppText style={[styles.optionLabel, { color: theme.text }]}>{label}</AppText>
          {meta ? (
            <AppText style={[styles.optionMeta, { color: theme.textSecondary }]}>
              {meta}
            </AppText>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

type FilterSectionProps = {
  title: string;
  children: React.ReactNode;
};

function FilterSection({ title, children }: FilterSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
      <AppText style={[styles.sectionTitle, { color: theme.text }]}>{title}</AppText>
      {children}
    </View>
  );
}

const RoomFilters: React.FC<RoomFiltersProps> = ({
  filters,
  hasActiveFilters = false,
  loading = false,
  compact = false,
  onChange,
  onClear,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const modalHeight = SCREEN_HEIGHT * 0.85;
  const scrollMaxHeight =
    modalHeight -
    MODAL_HEADER_HEIGHT -
    MODAL_HANDLE_HEIGHT -
    MODAL_FOOTER_HEIGHT -
    insets.bottom -
    24;

  const [modalVisible, setModalVisible] = useState(false);
  const [draftFilters, setDraftFilters] = useState<HotelRoomFilters | null>(null);

  useEffect(() => {
    if (modalVisible && filters) {
      setDraftFilters(cloneRoomFilters(filters));
    }
  }, [modalVisible, filters]);

  if (!filters) return null;

  const hasMeals = (filters.meals ?? []).length > 0;
  const hasFreeCancel = (filters.free_cancel ?? []).length > 0;
  const hasConfirmability = (filters.confirmability ?? []).length > 0;
  const hasOperators = (filters.operators ?? []).length > 0;

  if (!hasMeals && !hasFreeCancel && !hasConfirmability && !hasOperators) {
    return null;
  }

  const handleOpen = () => setModalVisible(true);

  const handleClose = () => setModalVisible(false);

  const handleApply = () => {
    if (draftFilters) {
      onChange(draftFilters);
    }
    setModalVisible(false);
  };

  const handleDraftClear = () => {
    if (!draftFilters) return;
    setDraftFilters(clearRoomFilters(draftFilters));
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {loading ? (
        <AppText style={[styles.loadingText, { color: theme.textSecondary }]}>
          Обновляем варианты...
        </AppText>
      ) : null}

      <View style={styles.triggerRow}>
        <TouchableOpacity
          style={[
            styles.filtersButton,
            compact && styles.filtersButtonCompact,
            {
              backgroundColor: hasActiveFilters ? theme.brand : theme.backgroundTertiary,
              borderColor: hasActiveFilters ? theme.brand : theme.border,
            },
          ]}
          onPress={handleOpen}
          activeOpacity={0.7}
        >
          <AppIcon
            name="filters"
            size={compact ? 14 : 18}
            color={hasActiveFilters ? '#FFFFFF' : theme.text}
          />
          <AppText
            style={[
              styles.filtersButtonText,
              compact && styles.filtersButtonTextCompact,
              { color: hasActiveFilters ? '#FFFFFF' : theme.text },
            ]}
          >
            Фильтры
          </AppText>
        </TouchableOpacity>

        {hasActiveFilters && onClear ? (
          <TouchableOpacity onPress={onClear} activeOpacity={0.7}>
            <AppText
              style={[
                styles.clearLink,
                compact && styles.clearLinkCompact,
                { color: theme.brand },
              ]}
            >
              Сбросить
            </AppText>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        isVisible={modalVisible}
        onBackdropPress={handleClose}
        animationIn="fadeIn"
        animationOut="fadeOut"
        style={styles.modal}
        backdropOpacity={0}
        hasBackdrop={false}
        propagateSwipe
      >
        {Platform.OS === 'ios' ? (
          <BlurView
            style={styles.blurOverlay}
            blurType={isDark ? 'dark' : 'light'}
            blurAmount={2}
            pointerEvents="none"
          />
        ) : (
          <View
            style={[styles.blurOverlay, { backgroundColor: theme.overlay }]}
            pointerEvents="none"
          />
        )}

        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.background,
              maxHeight: modalHeight,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={styles.modalHeader}>
            <AppText style={[styles.modalTitle, { color: theme.text }]}>
              Фильтры номеров
            </AppText>
            <TouchableOpacity onPress={handleDraftClear} activeOpacity={0.7}>
              <AppText style={[styles.resetDraftText, { color: theme.brand }]}>
                Сбросить
              </AppText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={[styles.scrollView, { maxHeight: scrollMaxHeight }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            bounces
          >
            {hasMeals && draftFilters?.meals ? (
              <FilterSection title="Питание">
                {draftFilters.meals.map((meal) => (
                  <FilterOptionRow
                    key={String(meal.id)}
                    option={meal}
                    label={meal.name || String(meal.id)}
                    selected={Boolean(meal.selected)}
                    disabled={meal.disabled}
                    onToggle={() =>
                      setDraftFilters((current) =>
                        current ? toggleMealFilter(current, String(meal.id)) : current,
                      )
                    }
                  />
                ))}
              </FilterSection>
            ) : null}

            {hasFreeCancel && draftFilters?.free_cancel ? (
              <FilterSection title="Отмена">
                {draftFilters.free_cancel.map((item) => (
                  <FilterOptionRow
                    key={String(item.id)}
                    option={item}
                    label={getFreeCancelLabel(item)}
                    selected={Boolean(item.selected)}
                    disabled={item.disabled}
                    onToggle={() =>
                      setDraftFilters((current) =>
                        current ? toggleFreeCancelFilter(current, Boolean(item.id)) : current,
                      )
                    }
                  />
                ))}
              </FilterSection>
            ) : null}

            {hasConfirmability && draftFilters?.confirmability ? (
              <FilterSection title="Подтверждение">
                {draftFilters.confirmability.map((item) => (
                  <FilterOptionRow
                    key={String(item.id)}
                    option={item}
                    label={getConfirmabilityLabel(item)}
                    selected={Boolean(item.selected)}
                    disabled={item.disabled}
                    mode="radio"
                    onToggle={() =>
                      setDraftFilters((current) =>
                        current
                          ? selectConfirmabilityFilter(current, Number(item.id))
                          : current,
                      )
                    }
                  />
                ))}
              </FilterSection>
            ) : null}

            {hasOperators && draftFilters?.operators ? (
              <FilterSection title="Туроператор">
                {draftFilters.operators.map((operator) => (
                  <FilterOptionRow
                    key={String(operator.id)}
                    option={operator}
                    label={operator.name || String(operator.id)}
                    selected={Boolean(operator.selected)}
                    disabled={operator.disabled}
                    onToggle={() =>
                      setDraftFilters((current) =>
                        current
                          ? toggleOperatorFilter(current, Number(operator.id))
                          : current,
                      )
                    }
                  />
                ))}
              </FilterSection>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.borderLight }]}>
            <AppButton title="Применить" onPress={handleApply} size="large" />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  containerCompact: {
    marginBottom: 0,
    paddingHorizontal: 0,
    flexShrink: 0,
  },
  loadingText: {
    fontSize: 13,
    marginBottom: 8,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  filtersButtonCompact: {
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  filtersButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filtersButtonTextCompact: {
    fontSize: 12,
  },
  clearLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearLinkCompact: {
    fontSize: 12,
  },
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
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    flexShrink: 1,
    zIndex: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  resetDraftText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  section: {
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
    marginBottom: 2,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  optionMeta: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
});

export default RoomFilters;
