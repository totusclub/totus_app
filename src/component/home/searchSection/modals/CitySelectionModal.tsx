import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppIcon } from '../../../UI';
import EmptyCityIcon from '../../../UI/icons/emptyCity';
import CityItem from '../CityItem';
import { useTheme } from '../../../../hooks/useTheme';

type City = {
  id: string;
  name: string;
  region: string;
};

type CitySelectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (city: City) => void;
  title: string;
};

// Mock data
const MOCK_CITIES: City[] = [
  { id: '1', name: 'Москва', region: 'Россия' },
  { id: '2', name: 'Санкт-Петербург', region: 'Россия' },
  { id: '3', name: 'Новосибирск', region: 'Сибирь' },
  { id: '4', name: 'Екатеринбург', region: 'Урал' },
  { id: '5', name: 'Казань', region: 'Татарстан' },
  { id: '6', name: 'Нижний Новгород', region: 'Россия' },
  { id: '7', name: 'Челябинск', region: 'Урал' },
  { id: '8', name: 'Самара', region: 'Поволжье' },
  { id: '9', name: 'Омск', region: 'Сибирь' },
  { id: '10', name: 'Ростов-на-Дону', region: 'Юг России' },
  { id: '11', name: 'Уфа', region: 'Башкортостан' },
  { id: '12', name: 'Красноярск', region: 'Сибирь' },
  { id: '13', name: 'Воронеж', region: 'Центральная Россия' },
  { id: '14', name: 'Пермь', region: 'Урал' },
  { id: '15', name: 'Волгоград', region: 'Калужская область' },
];

const CitySelectionModal: React.FC<CitySelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
  title,
}) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top;
  const paddingBottom = insets.bottom;

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) {
      return MOCK_CITIES;
    }
    const query = searchQuery.toLowerCase();
    return MOCK_CITIES.filter(
      city =>
        city.name.toLowerCase().includes(query) ||
        city.region.toLowerCase().includes(query),
    );
  }, [searchQuery]);

  const handleSelect = (city: City) => {
    onSelect(city);
    onClose();
  };

  const renderCityItem = ({ item }: { item: City }) => (
    <CityItem
      city={item}
      searchQuery={searchQuery}
      onPress={handleSelect}
    />
  );

  return (
    <Modal
      style={styles.modal}
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
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
              placeholder="Город"
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

        {/* City List or Empty State */}
        <View style={styles.listContainer}>
          {filteredCities.length > 0 ? (
            <FlatList
              data={filteredCities}
              renderItem={renderCityItem}
              keyExtractor={item => item.id}
              style={styles.cityList}
              contentContainerStyle={styles.cityListContent}
              showsVerticalScrollIndicator={true}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.divider }]} />}
            />
          ) : searchQuery.trim().length > 0 ? (
            <View style={styles.emptyState}>
              <EmptyCityIcon size={62} color={theme.brand} />
              <AppText style={[styles.emptyStateText, { color: theme.text }]}>
                По вашему запросу город не найден
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

export default CitySelectionModal;

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
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  cityList: {
    flex: 1,
  },
  cityListContent: {
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
  cityRegion: {
    fontSize: 14,
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
});

