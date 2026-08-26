import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { AppText, AppIcon } from '../../../UI';
import { fetchDepartures } from '../../../../modules/store/slices/departures';
import { RootState, AppDispatch } from '../../../../modules/store';
import type { Departure } from '../../../../types/departures';
import { highlightAllMatches } from '../../../UI/highlightText';
import { useTheme } from '../../../../hooks/useTheme';

type DepartureSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (departure: Departure) => void;
  title: string;
};

const DepartureSelectionModal: React.FC<DepartureSelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
  title,
}) => {
  const { theme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading, error } = useSelector(
    (state: RootState) => state.departures,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top;
  const paddingBottom = insets.bottom;

  useEffect(() => {
    if (visible) {
      // Always fetch when modal opens to ensure fresh data
      dispatch(fetchDepartures());
      setSearchQuery(''); // Reset search when modal opens
    }
  }, [visible, dispatch]);

  // Filter departures based on search query
  // state.departures.data is Departure[] (not { departures: [] })
  const filteredDepartures = useMemo(() => {
    const allDepartures = Array.isArray(data)
      ? data
      : (data as any)?.departures || [];
    if (!searchQuery.trim()) {
      return allDepartures;
    }
    const query = searchQuery.toLowerCase();
    return allDepartures.filter((departure: any) => {
      const nameRu = String(departure.name_ru || departure.name || '').toLowerCase();
      const nameEn = String(departure.name_en || '').toLowerCase();
      const iata = String(departure.iata || '').toLowerCase();
      return (
        nameRu.includes(query) ||
        nameEn.includes(query) ||
        iata.includes(query)
      );
    });
  }, [data, searchQuery]);

  const handleSelect = (departure: Departure) => {
    onSelect(departure);
    onClose();
  };

  const renderItem = ({ item }: { item: Departure }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => handleSelect(item)}>
      <View style={styles.itemContent}>
        {highlightAllMatches(
          item.name_ru,
          searchQuery,
          [styles.highlightedText, { color: theme.brand }],
          [styles.itemName, { color: theme.text }],
        )}
        {item.name_en && item.name_en !== item.name_ru && (
          <AppText style={[styles.itemSubtext, { color: theme.textTertiary }]}>{item.name_en}</AppText>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      style={styles.modal}
      isVisible={visible}
      animationIn="fadeIn"
      animationOut="fadeOut"
      backdropOpacity={0}
      hasBackdrop={false}>
      <View
        style={[
          styles.modalContent,
          {
            backgroundColor: theme.background,
            paddingTop: paddingTop + 20,
            paddingBottom: paddingBottom + 20,
          },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <AppText style={[styles.headerTitle, { color: theme.text }]}>{title}</AppText>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputWrapper,
              { borderColor: (isInputFocused || searchQuery.length > 0) ? theme.brand : theme.inputBorder },
              { backgroundColor: theme.inputBackground },
            ]}>
            <AppIcon name="search" size={20} color={theme.textTertiary} />
            <TextInput
                allowFontScaling={false}
              style={[styles.searchInput, { color: theme.inputText }]}
              placeholder="Город вылета"
              placeholderTextColor={theme.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}>
                <AppText style={[styles.clearButtonText, { color: theme.textTertiary }]}>✕</AppText>
              </TouchableOpacity>
            )}
          </View>
          <View
            style={[
              styles.inputUnderline,
              { backgroundColor: (isInputFocused || searchQuery.length > 0) ? theme.brand : theme.border },
            ]}
          />
        </View>

        {/* List */}
        <View style={styles.listContainer}>
          {loading && filteredDepartures.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.brand} />
            </View>
          ) : filteredDepartures.length > 0 ? (
            <FlatList
              data={filteredDepartures}
              renderItem={renderItem}
              keyExtractor={item => String(item.id ?? item.iata ?? item.name_en ?? item.name)}
              style={styles.departuresList}
              contentContainerStyle={styles.departuresListContent}
              showsVerticalScrollIndicator={true}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.divider }]} />}
            />
          ) : error ? (
            <View style={styles.errorContainer}>
              <AppText style={[styles.errorText, { color: theme.error }]}>
                Ошибка загрузки: {error || 'Неизвестная ошибка'}
              </AppText>
            </View>
          ) : searchQuery.trim().length > 0 ? (
            <View style={styles.emptyState}>
              <AppText style={[styles.emptyStateText, { color: theme.text }]}>
                По вашему запросу ничего не найдено
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

export default DepartureSelectionModal;

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    paddingHorizontal: 20,
    zIndex: 1,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    letterSpacing: -0.2,
    height: 52,
    gap: 10,
    marginBottom: 10,
  },
  inputUnderline: {
    height: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  clearButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
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
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  departuresList: {
    flex: 1,
  },
  departuresListContent: {
    paddingBottom: 10,
  },
  itemContainer: {
    paddingVertical: 12,
  },
  itemContent: {
    flexDirection: 'column',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 4,
  },
  highlightedText: {
    fontSize: 16,
    fontWeight: '400',
  },
  itemSubtext: {
    fontSize: 14,
    fontWeight: '400',
  },
  separator: {
    height: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
});

