import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { FontTextInput as TextInput } from '../../../UI/text/FontText';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { AppText, AppIcon } from '../../../UI';
import EmptyCityIcon from '../../../UI/icons/emptyCity';
import { fetchDestinations } from '../../../../modules/store/slices/destinations';
import { RootState, AppDispatch } from '../../../../modules/store';
import type { DestinationResult } from '../../../../types/destinations';
import { highlightAllMatches } from '../../../UI/highlightText';
import { useTheme } from '../../../../hooks/useTheme';
import {
  DEFAULT_BROWSE_COUNTRIES,
  countryImageSrc,
  countryLetter,
  splitBrowseCountries,
  type BrowseCountry,
} from '../utils/countryImages';
import { loadBrowseCountries } from '../utils/browseCountries';

type DestinationSelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: DestinationResult, type: string) => void;
  title: string;
  fromCity?: string;
  searchType?: 'package' | 'hotel';
};

const ignorName = ['Крым', 'Донецк', 'Луганск', 'Ялта', 'Yalta'];

type ResultGroup = { key: string; type: string; title: string; items: DestinationResult[] };

const DestinationSelectionModal: React.FC<DestinationSelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
  title,
  fromCity = 'Moscow',
  searchType = 'package',
}) => {
  const { theme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { data, status, error } = useSelector(
    (state: RootState) => state.destinations,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  // Страны для списка по нажатию (до ввода текста) — как на сайте: до ответа справочника — встроенный список.
  const [browseCountries, setBrowseCountries] = useState<BrowseCountry[]>(DEFAULT_BROWSE_COUNTRIES);
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top;
  const paddingBottom = insets.bottom;
  // Reset search query when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
    }
  }, [visible]);

  // По нажатию — сразу список стран (Level.Travel /references/destinations), как на сайте.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    loadBrowseCountries(fromCity).then(list => {
      if (!cancelled && list) setBrowseCountries(list);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, fromCity]);

  const isTypingSearch = searchQuery.trim().length > 0;

  // Debounced search — только после ввода текста (пустой запрос autocomplete_v2 отдаёт пустые группы)
  useEffect(() => {
    if (!visible || !searchQuery.trim()) return;

    const timeoutId = setTimeout(() => {
      dispatch(
        fetchDestinations({
          query: searchQuery || '',
          from_city: fromCity,
          search_type: searchType,
        }),
      );
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, visible, dispatch, fromCity, searchType]);

  // Filter and group results
  const groupedResults = useMemo((): ResultGroup[] => {
    // Без ввода — популярные страны, затем остальные (как на сайте)
    if (!isTypingSearch) {
      const { popular, other } = splitBrowseCountries(browseCountries);
      return [
        { key: 'popular', type: 'countries', title: 'Популярные страны', items: popular as DestinationResult[] },
        { key: 'other', type: 'countries', title: 'Другие страны', items: other as DestinationResult[] },
      ].filter(group => group.items.length > 0);
    }
    if (!data || data.length === 0) return [];
    const countries = data
      .filter(item => item?.group_name === 'countries')
      .flatMap(item => item?.results || []);

    const regions = data
      .filter(item => item?.group_name === 'regions')
      .flatMap(item =>
        item?.results?.filter(
          c => !ignorName.some(name => c.active_regions?.includes(name)),
        ) || [],
      );

    const metaregions = data
      .filter(item => item?.group_name === 'metaregions')
      .flatMap(item =>
        item?.results?.filter(
          m => !ignorName.some(name => m.description?.includes(name)),
        ) || [],
      );

    const hotels = data
      .filter(item => item?.group_name === 'hotels')
      .flatMap(item =>
        item?.results?.filter(
          m =>
            !ignorName.some(name => m.city_name?.includes(name)) &&
            !ignorName.some(name => m.name?.includes(name)),
        ) || [],
      );

    return [
      { key: 'countries', type: 'countries', title: 'Страны', items: countries },
      { key: 'regions', type: 'regions', title: 'Регионы', items: regions },
      { key: 'metaregions', type: 'metaregions', title: 'Мегарегионы', items: metaregions },
      { key: 'hotels', type: 'hotels', title: 'Отели', items: hotels },
    ].filter(group => group.items.length > 0);
  }, [data, isTypingSearch, browseCountries]);

  const handleSelect = (item: DestinationResult, type: string) => {
    onSelect(item, type);
    onClose();
  };

  // Кружок 40: у страны — своя картинка по ISO2 (как на сайте; картинки Level.Travel битые)
  // или первая буква названия; у курорта, региона и отеля — картинка из ответа, если есть.
  const renderAvatar = (result: DestinationResult, type: string) => {
    if (type === 'countries') {
      const src = countryImageSrc(result.iso2);
      if (src) {
        return (
          <Image
            source={{ uri: src }}
            style={[styles.itemImage, { backgroundColor: theme.backgroundSecondary }]}
            resizeMode="cover"
          />
        );
      }
      return (
        <View
          style={[
            styles.itemImage,
            styles.itemLetter,
            { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          ]}>
          <AppText style={[styles.itemLetterText, { color: theme.brand }]}>
            {countryLetter(result.name || (result as any).name_ru || result.name_en)}
          </AppText>
        </View>
      );
    }
    if (!result?.image) return null;
    return (
      <Image
        source={{ uri: result.image }}
        style={styles.itemImage}
        resizeMode="cover"
      />
    );
  };

  const renderItem = (result: DestinationResult, type: string) => {
    // Determine subtitle based on type
    let subtitle: string | undefined;
    if (type === 'countries') {
      subtitle = result.visa_type || undefined;
    } else if (type === 'regions') {
      subtitle = result.active_regions;
    } else if (type === 'metaregions') {
      subtitle = result.country_name_ru;
    } else if (type === 'hotels') {
      subtitle = result.city_name;
    }

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleSelect(result, type)}
        activeOpacity={0.7}>
        <View style={styles.itemContent}>
          {renderAvatar(result, type)}
          <View style={styles.itemTextContainer}>
            {highlightAllMatches(
              result.name || (result as any).name_ru || result.name_en || '',
              searchQuery,
              StyleSheet.flatten([styles.highlightedText, { color: theme.brand }]),
              StyleSheet.flatten([styles.itemName, { color: theme.text }]),
            )}
            {subtitle && (
              <AppText style={[styles.itemSubtext, { color: theme.textTertiary }]}>{subtitle}</AppText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = ({ item }: { item: ResultGroup }) => {
    return (
      <View style={styles.section}>
        <AppText style={[styles.sectionTitle, { color: theme.brand }]}>{item.title}</AppText>
        {item.items.map((result, index) => (
          <View key={`${result.iso2 || result.id}-${index}`}>
            {renderItem(result, item.type)}
          </View>
        ))}
      </View>
    );
  };
  // console.log('groupedResults', groupedResults)
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
              { borderColor: isInputFocused || searchQuery.length > 0 ? theme.brand : theme.inputBorder },
              { backgroundColor: theme.inputBackground },
            ]}>
            <AppIcon name="search" size={20} color={theme.textTertiary} />
            <TextInput
                allowFontScaling={false}
              style={[styles.searchInput, { color: theme.inputText }]}
              placeholder="Страна, город, регион или отель"
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

        {/* Results List or Loading/Empty State */}
        <View style={styles.listContainer}>
          {isTypingSearch && status === 'loading' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.brand} />
            </View>
          ) : isTypingSearch && status === 'failed' ? (
            <View style={styles.emptyState}>
              <AppText style={[styles.errorText, { color: theme.error }]}>
                Ошибка: {error || 'Не удалось загрузить данные'}
              </AppText>
            </View>
          ) : groupedResults.length > 0 ? (
            <FlatList
              data={groupedResults}
              renderItem={renderSection}
              keyExtractor={item => item.key}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
              contentContainerStyle={styles.resultsListContent}
              showsVerticalScrollIndicator={true}
            />
          ) : status === 'succeeded' ? (
            <View style={styles.emptyState}>
              <EmptyCityIcon size={62} color={theme.brand} />
              <AppText style={[styles.emptyStateText, { color: theme.text }]}>
                {searchQuery.trim().length > 0
                  ? 'По вашему запросу ничего не найдено'
                  : 'Начните вводить название страны или города'}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

export default DestinationSelectionModal;

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
  headerTitle: {
    fontSize: 16,
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
  searchContainer: {
    marginBottom: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
    marginBottom: 10,
  },
  inputUnderline: {
    height: 1,
  },
  searchInput: {
    flex: 1,
    letterSpacing: -0.2,
    fontSize: 16,
    fontWeight: '400',
  },
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: 10,
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
  // Список — как на сайте (search.module.css: .searchGroupListText, .searchGroupListItem,
  // .destinationImage, .destinationInfo): заголовок 14 оранжевым, строка от 48, кружок 40, отступ 12.
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 4,
  },
  itemContainer: {
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  itemLetter: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  itemLetterText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
  },
  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  highlightedText: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemSubtext: {
    fontSize: 12,
    fontWeight: '400',
  },
  separator: {
    height: 1,
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
    marginTop: 24,
    textAlign: 'center',
  },
  loadingContainer: {
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
});

