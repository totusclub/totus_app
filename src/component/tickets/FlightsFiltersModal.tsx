import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton, AppText, Toggle } from '../UI';
import {
  buildFilterSections,
  getFastConfirmIds,
} from '../../utils/ticketsUtils/filterSections';
import { normalizeTicketsFilterSelections } from '../../utils/ticketsUtils/sanitizeTicketsFilterPayload';
import { useTheme } from '../../hooks/useTheme';
import { FONT_HEADING } from '../../theme/fonts';

/** TicketsHeader: 40 content + 2 bottom border — same as hotel SearchResultHeader. */
const TICKETS_HEADER_HEIGHT = 42;

type FlightsFiltersModalProps = {
  visible: boolean;
  filters: any;
  selectedFilters: Record<string, string[]>;
  /** Package base price — flight options show "от {netPrice + min_fuel_charge}". */
  netPrice?: number;
  onApply: (selections: Record<string, string[]>) => void;
  onClose: () => void;
};

const FlightsFiltersModal: React.FC<FlightsFiltersModalProps> = ({
  visible,
  filters,
  selectedFilters,
  netPrice,
  onApply,
  onClose,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // RN Modal is fullscreen (not clipped by Content SafeAreaView), so height is:
  // device window − status bar − tickets header.
  const sheetHeight = Math.max(
    240,
    windowHeight - insets.top - TICKETS_HEADER_HEIGHT,
  );

  const sections = useMemo(
    () => buildFilterSections(filters, netPrice),
    [filters, netPrice],
  );
  const [pendingSelections, setPendingSelections] = useState<
    Record<string, string[]>
  >(selectedFilters);

  useEffect(() => {
    if (visible) {
      setPendingSelections(selectedFilters);
    }
  }, [visible, selectedFilters]);

  const fastConfirmOn = (pendingSelections.confirmability?.length ?? 0) > 0;

  const toggleValue = useCallback((sectionId: string, optionId: string) => {
    setPendingSelections(prev => {
      const current = prev[sectionId] || [];
      const nextValues = current.includes(optionId)
        ? current.filter(item => item !== optionId)
        : [...current, optionId];
      return { ...prev, [sectionId]: nextValues };
    });
  }, []);

  const toggleFastConfirm = useCallback(() => {
    setPendingSelections(prev => ({
      ...prev,
      confirmability: prev.confirmability?.length ? [] : getFastConfirmIds(filters),
    }));
  }, [filters]);

  const handleApply = useCallback(() => {
    onApply(normalizeTicketsFilterSelections(pendingSelections));
    onClose();
  }, [onApply, onClose, pendingSelections]);

  // Match hotel filters: reset only clears local draft until "Применить".
  const handleResetLocal = useCallback(() => {
    setPendingSelections({});
  }, []);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen">
      <View style={styles.root}>
        <Pressable
          style={[styles.backdrop, { backgroundColor: theme.overlay }]}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            { height: sheetHeight, backgroundColor: theme.background },
          ]}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View
                style={[
                  styles.headerContent,
                  { borderBottomColor: theme.borderLight },
                ]}>
                <AppText style={[styles.headerTitle, { color: theme.text }]}>
                  Фильтры
                </AppText>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    onPress={handleResetLocal}
                    style={styles.headerButton}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                    <AppText
                      style={[styles.resetText, { color: theme.textTertiary }]}>
                      Сбросить
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.headerButton}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                    <AppText style={[styles.cancelText, { color: theme.brand }]}>
                      Отменить
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
              <View style={styles.filterSection}>
                <Toggle
                  label="Быстрое подтверждение"
                  value={fastConfirmOn}
                  onToggle={toggleFastConfirm}
                />
              </View>
              {sections.map(section => (
                <View key={section.id} style={styles.filterSection}>
                  <AppText
                    style={[styles.filterSectionTitle, { color: theme.text }]}>
                    {section.title}
                  </AppText>
                  <View style={styles.chipsWrap}>
                    {section.options.map(option => {
                      const active = Boolean(
                        pendingSelections[section.id]?.includes(option.id),
                      );
                      return (
                        <TouchableOpacity
                          key={option.id}
                          style={[
                            styles.chip,
                            { backgroundColor: theme.backgroundTertiary },
                            active && { backgroundColor: theme.brand },
                          ]}
                          onPress={() => toggleValue(section.id, option.id)}>
                          <AppText
                            style={[
                              styles.chipText,
                              { color: active ? '#FFFFFF' : theme.text },
                            ]}>
                            {option.label}
                          </AppText>
                          {option.meta ? (
                            <AppText
                              style={[
                                styles.chipMeta,
                                {
                                  color: active
                                    ? '#FFFFFF'
                                    : theme.textTertiary,
                                },
                              ]}>
                              {option.meta}
                            </AppText>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View
              style={[
                styles.buttonContainer,
                {
                  paddingBottom: Math.max(insets.bottom, 12),
                  borderTopColor: theme.borderLight,
                },
              ]}>
              <AppButton title="Применить" onPress={handleApply} size="large" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  resetText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  filterSection: {
    gap: 12,
    marginBottom: 8,
    paddingBottom: 8,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipMeta: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
  },
  buttonContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});

export default FlightsFiltersModal;
