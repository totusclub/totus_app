import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { AppText, AppButton, Toggle, RangeSlider, Chips, AppIcon } from '../../UI';
import { RootState, AppDispatch } from '../../../modules/store';
import { searchFilters, setAllMyHotels } from '../../../modules/store/slices/search';
import { useTheme } from '../../../hooks/useTheme';
import { withSearchTypeFilters } from '../../../utils/searchParamsUtils';
import { FONT_HEADING } from '../../../theme/fonts';

/**
 * Full hotel-list filters from https://totus.club/search
 * (same facet keys / filter_* query params as production).
 */
type FilterState = {
  quickConfirmation: boolean;
  priceMin: number;
  priceMax: number;
  accommodationTypes: string[];
  meals: string[];
  stars: string[];
  regions: string[];
  beachLine: string[];
  providers: string[];
  rating: string[];
  wifi: string[];
  beachSurface: string[];
  beachType: string[];
  category: string[];
  confirmability: string[];
  /** Amenity keys selected as true, e.g. ['pool', 'aquapark'] */
  amenities: string[];
};

type FiltersModalContentProps = {
  onClose: () => void;
  /**
   * iPad only. `sidebar` renders the same filter state as a persistent side
   * panel (Figma «iPad Landscape / List / Tours»): checkbox rows with hotel
   * counts, «Сбросить» in the header, «Показать N отелей» as the apply button.
   * Phone always uses the default `sheet` — its markup is untouched.
   */
  variant?: 'sheet' | 'sidebar';
  /** Current result count for the sidebar apply button. */
  resultCount?: number;
};

const WIFI_LABELS: Record<string, string> = {
  FREE: 'Бесплатный Wi-Fi',
  LOBBY_FREE: 'Бесплатный Wi-Fi в лобби',
  LOBBY_PAID: 'Платный Wi-Fi в лобби',
  LOBBY_UNKNOWN: 'Wi-Fi в лобби',
  NONE: 'Без Wi-Fi',
  PAID: 'Платный Wi-Fi',
};

const BEACH_SURFACE_LABELS: Record<string, string> = {
  SAND: 'Песок',
  'SAND+PEBBLE': 'Песок с галькой',
  PEBBLE: 'Галька',
  PLATFORM: 'Платформа',
};

const BEACH_TYPE_LABELS: Record<string, string> = {
  DESIGNATED: 'Собственный пляж',
  PUBLIC: 'Общественный пляж',
};

const CATEGORY_LABELS: Record<string, string> = {
  FAMILY: 'Для семьи',
  COUPLES: 'Для пар',
  ACTIVE: 'Активный отдых',
};

const CONFIRMABILITY_LABELS: Record<string, string> = {
  '1': 'Мгновенное подтверждение',
  '2': 'Быстрое подтверждение',
  '3': 'Любое подтверждение',
};

/** Amenity facet key → RU label (Удобства on totus.club) */
const AMENITY_FILTERS: { key: string; label: string; apiKey: string }[] = [
  { key: 'adults_only', label: 'Только для взрослых', apiKey: 'filter_adults_only' },
  { key: 'direct_flight', label: 'Прямой перелёт', apiKey: 'filter_direct_flight' },
  { key: 'aquapark', label: 'Аквапарк', apiKey: 'filter_aquapark' },
  { key: 'pool', label: 'Бассейн', apiKey: 'filter_pool' },
  { key: 'kids_pool', label: 'Детский бассейн', apiKey: 'filter_kids_pool' },
  { key: 'heated_pool', label: 'Подогреваемый бассейн', apiKey: 'filter_heated_pool' },
  { key: 'kids_club', label: 'Детский клуб', apiKey: 'filter_kids_club' },
  { key: 'kids_menu', label: 'Детское меню', apiKey: 'filter_kids_menu' },
  { key: 'nanny', label: 'Няня', apiKey: 'filter_nanny' },
  { key: 'aircon', label: 'Кондиционер', apiKey: 'filter_aircon' },
  { key: 'parking', label: 'Парковка', apiKey: 'filter_parking' },
  { key: 'bar', label: 'Бар', apiKey: 'filter_bar' },
  { key: 'massage', label: 'Массаж', apiKey: 'filter_massage' },
  { key: 'thermal_fun', label: 'Термальные процедуры', apiKey: 'filter_thermal_fun' },
  { key: 'no_single_men', label: 'Без одиноких мужчин', apiKey: 'filter_no_single_men' },
];

const MULTI_FILTER_KEYS = [
  'filter_hotel_type',
  'filter_meals',
  'filter_stars',
  'filter_regions',
  'filter_line',
  'filter_operators',
  'filter_rating',
  'filter_wifi',
  'filter_beach_surface',
  'filter_beach_type',
  'filter_category',
  'filter_confirmability',
] as const;

/** Keys preserved across sort / load-more (match totus.club). */
export const LIST_FILTER_PARAM_KEYS = [
  ...MULTI_FILTER_KEYS,
  'filter_price_min',
  'filter_price_max',
  'filter_instant_confirm',
  ...AMENITY_FILTERS.map(a => a.apiKey),
] as const;

const parseCsv = (value: string | number | boolean | undefined | null): string[] => {
  if (value === undefined || value === null || value === '') return [];
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
};

const selectedFromApi = (items: any[] | undefined): string[] =>
  (items || [])
    .filter((item: any) => item?.selected)
    .map((item: any) => String(item.id))
    .filter(id => id && id !== 'undefined' && id !== 'null');

const starLabel = (id: number | string): string => {
  const n = Number(id);
  if (n === 1) return '1 звезда';
  if (n > 0 && n < 5) return `${n} звезды`;
  if (n === 5) return '5 звёзд';
  return String(id);
};

const formatOptionMeta = (item: any): string => {
  const parts: string[] = [];
  if (item.hotel_count != null) {
    parts.push(`${item.hotel_count} отелей`);
  }
  if (item.min_price != null) {
    parts.push(`от ${Number(item.min_price).toLocaleString('ru-RU')} ₽`);
  }
  return parts.join(' · ');
};

const mapFacetOptions = (
  items: any[] | undefined,
  labelFn: (item: any) => string,
) =>
  (items || []).map((item: any) => ({
    label: labelFn(item),
    meta: formatOptionMeta(item) || undefined,
    count: item.hotel_count != null ? Number(item.hotel_count) : undefined,
    value: String(item.id),
    disabled: Boolean(item.disabled),
  }));

const hotelsWord = (n: number): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'отель';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'отеля';
  return 'отелей';
};

const FiltersModalContent: React.FC<FiltersModalContentProps> = ({
  onClose,
  variant = 'sheet',
  resultCount,
}) => {
  const isSidebar = variant === 'sidebar';
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();

  // Narrow selector — whole `search` slice re-renders on every progress tick.
  const hotels = useSelector((state: RootState) => state.search.hotels);
  const searchType = useSelector(
    (state: RootState) => state.search.searchParams?.search_type,
  );
  const apiFilters = hotels?.filters;
  const requestId = hotels?.request_id;

  const priceBounds = useMemo(() => {
    const min = Number(
      apiFilters?.prices?.min ?? hotels?.statistics?.shown_min_price ?? 0,
    );
    const max = Number(
      apiFilters?.prices?.max ?? hotels?.statistics?.shown_max_price ?? min,
    );
    return { min, max: max >= min ? max : min };
  }, [apiFilters?.prices?.min, apiFilters?.prices?.max, hotels?.statistics]);

  const buildInitialFilters = useCallback((): FilterState => {
    const pick = (
      applied: string | number | boolean | undefined | null,
      fromSelected: string[],
    ): string[] => {
      if (applied !== undefined && applied !== null) {
        return parseCsv(applied);
      }
      return fromSelected;
    };

    const priceMin =
      hotels?.filter_price_min !== undefined && hotels?.filter_price_min !== null
        ? Number(hotels.filter_price_min)
        : priceBounds.min;
    const priceMax =
      hotels?.filter_price_max !== undefined && hotels?.filter_price_max !== null
        ? Number(hotels.filter_price_max)
        : priceBounds.max;

    const amenities: string[] = [];
    for (const a of AMENITY_FILTERS) {
      const applied = hotels?.[a.apiKey];
      if (applied === true || applied === 'true') {
        amenities.push(a.key);
        continue;
      }
      const facet = apiFilters?.[a.key];
      const trueOpt = Array.isArray(facet)
        ? facet.find((x: any) => x?.id === true || x?.id === 'true')
        : null;
      if (trueOpt?.selected) amenities.push(a.key);
    }

    return {
      quickConfirmation: Boolean(hotels?.filter_instant_confirm),
      priceMin: Number.isFinite(priceMin) ? priceMin : priceBounds.min,
      priceMax: Number.isFinite(priceMax) ? priceMax : priceBounds.max,
      accommodationTypes: pick(
        hotels?.filter_hotel_type,
        selectedFromApi(apiFilters?.hotel_type),
      ),
      meals: pick(hotels?.filter_meals, selectedFromApi(apiFilters?.meals)),
      stars: pick(hotels?.filter_stars, selectedFromApi(apiFilters?.stars)).filter(
        id => id !== '0',
      ),
      regions: pick(hotels?.filter_regions, selectedFromApi(apiFilters?.regions)),
      beachLine: pick(hotels?.filter_line, selectedFromApi(apiFilters?.line)),
      providers: pick(
        hotels?.filter_operators,
        selectedFromApi(apiFilters?.operators),
      ),
      rating: pick(hotels?.filter_rating, selectedFromApi(apiFilters?.rating)),
      wifi: pick(hotels?.filter_wifi, selectedFromApi(apiFilters?.wifi)),
      beachSurface: pick(
        hotels?.filter_beach_surface,
        selectedFromApi(apiFilters?.beach_surface),
      ),
      beachType: pick(
        hotels?.filter_beach_type,
        selectedFromApi(apiFilters?.beach_type),
      ),
      category: pick(
        hotels?.filter_category,
        selectedFromApi(apiFilters?.category),
      ),
      confirmability: pick(
        hotels?.filter_confirmability,
        selectedFromApi(apiFilters?.confirmability),
      ),
      amenities,
    };
  }, [hotels, apiFilters, priceBounds.min, priceBounds.max]);

  const [filters, setFilters] = useState<FilterState>(buildInitialFilters);
  const appliedFiltersKey = useMemo(() => {
    if (!hotels) return '';
    return LIST_FILTER_PARAM_KEYS.map(key => `${key}:${String((hotels as any)[key] ?? '')}`).join(
      '|',
    );
  }, [hotels]);
  const syncedFiltersKeyRef = useRef<string | null>(null);

  // Sync draft only when applied list filters / request change.
  useEffect(() => {
    const key = `${requestId ?? ''}|${appliedFiltersKey}`;
    if (syncedFiltersKeyRef.current === key) {
      return;
    }
    syncedFiltersKeyRef.current = key;
    setFilters(buildInitialFilters());
  }, [requestId, appliedFiltersKey, buildInitialFilters]);

  const accommodationOptions = useMemo(
    () =>
      mapFacetOptions(apiFilters?.hotel_type, (h: any) => h.name || String(h.id)),
    [apiFilters?.hotel_type],
  );

  const mealsOptions = useMemo(
    () =>
      mapFacetOptions(apiFilters?.meals, (m: any) => m.name || String(m.id)),
    [apiFilters?.meals],
  );

  const starOptions = useMemo(
    () =>
      mapFacetOptions(
        (apiFilters?.stars || []).filter((s: any) => String(s.id) !== '0'),
        (s: any) => starLabel(s.id),
      ),
    [apiFilters?.stars],
  );

  const regionsOptions = useMemo(
    () =>
      mapFacetOptions(apiFilters?.regions, (r: any) => r.name || String(r.id)),
    [apiFilters?.regions],
  );

  const beachLineOptions = useMemo(
    () =>
      mapFacetOptions(apiFilters?.line, (l: any) => `${l.id}-я линия`),
    [apiFilters?.line],
  );

  const providerOptions = useMemo(
    () =>
      mapFacetOptions(apiFilters?.operators, (o: any) => o.name || String(o.id)),
    [apiFilters?.operators],
  );

  const ratingOptions = useMemo(
    () =>
      mapFacetOptions(apiFilters?.rating, (r: any) => `от ${r.id}`),
    [apiFilters?.rating],
  );

  const wifiOptions = useMemo(
    () =>
      mapFacetOptions(
        apiFilters?.wifi,
        (w: any) => WIFI_LABELS[String(w.id)] || w.name || String(w.id),
      ),
    [apiFilters?.wifi],
  );

  const beachSurfaceOptions = useMemo(
    () =>
      mapFacetOptions(
        apiFilters?.beach_surface,
        (b: any) =>
          BEACH_SURFACE_LABELS[String(b.id)] || b.name || String(b.id),
      ),
    [apiFilters?.beach_surface],
  );

  const beachTypeOptions = useMemo(
    () =>
      mapFacetOptions(
        apiFilters?.beach_type,
        (b: any) => BEACH_TYPE_LABELS[String(b.id)] || b.name || String(b.id),
      ),
    [apiFilters?.beach_type],
  );

  const categoryOptions = useMemo(
    () =>
      mapFacetOptions(
        apiFilters?.category,
        (c: any) => CATEGORY_LABELS[String(c.id)] || c.name || String(c.id),
      ),
    [apiFilters?.category],
  );

  const confirmabilityOptions = useMemo(
    () =>
      mapFacetOptions(
        apiFilters?.confirmability,
        (c: any) =>
          CONFIRMABILITY_LABELS[String(c.id)] || c.name || String(c.id),
      ),
    [apiFilters?.confirmability],
  );

  const amenityOptions = useMemo(() => {
    return AMENITY_FILTERS.filter(a => {
      const facet = apiFilters?.[a.key];
      if (!Array.isArray(facet) || facet.length === 0) return false;
      const trueOpt = facet.find(
        (x: any) => x?.id === true || String(x?.id) === 'true',
      );
      return trueOpt && !trueOpt.disabled;
    }).map(a => {
      const facet = apiFilters?.[a.key] || [];
      const trueOpt = facet.find(
        (x: any) => x?.id === true || String(x?.id) === 'true',
      );
      const meta = formatOptionMeta(trueOpt || {});
      return {
        label: a.label,
        meta,
        count: trueOpt?.hotel_count != null ? Number(trueOpt.hotel_count) : undefined,
        value: a.key,
        disabled: false,
      };
    });
  }, [apiFilters]);

  const hasPriceFilter =
    !!apiFilters?.prices && priceBounds.max >= priceBounds.min;

  const toggleInList = (key: keyof FilterState, value: string) => {
    setFilters(prev => {
      const list = prev[key];
      if (!Array.isArray(list)) return prev;
      const next = list.includes(value)
        ? list.filter(item => item !== value)
        : [...list, value];
      return { ...prev, [key]: next };
    });
  };

  const handleResetLocal = () => {
    const availableStars = (apiFilters?.stars || [])
      .map((s: any) => String(s.id))
      .filter((id: string) => id && id !== '0');

    setFilters({
      quickConfirmation: false,
      priceMin: priceBounds.min,
      priceMax: priceBounds.max,
      accommodationTypes: [],
      meals: [],
      stars: availableStars,
      regions: [],
      beachLine: [],
      providers: [],
      rating: [],
      wifi: [],
      beachSurface: [],
      beachType: [],
      category: [],
      confirmability: [],
      amenities: [],
    });
  };

  const handleApply = () => {
    if (!hotels?.request_id || !hotels?.readyOperators) {
      onClose();
      return;
    }

    const filterParams: Record<string, unknown> = {
      request_id: hotels.request_id,
      readyOperators: hotels.readyOperators,
      page_number: 1,
      page_limit: 20,
      sort_by: hotels.sort_by || 'relevance',
      filter_instant_confirm: filters.quickConfirmation,
      filter_price_min: filters.priceMin,
      filter_price_max: filters.priceMax,
      filter_hotel_type: filters.accommodationTypes.join(','),
      filter_meals: filters.meals.join(','),
      filter_stars: filters.stars.join(','),
      filter_regions: filters.regions.join(','),
      filter_line: filters.beachLine.join(','),
      filter_operators: filters.providers.join(','),
      filter_rating: filters.rating.join(','),
      filter_wifi: filters.wifi.join(','),
      filter_beach_surface: filters.beachSurface.join(','),
      filter_beach_type: filters.beachType.join(','),
      filter_category: filters.category.join(','),
      filter_confirmability: filters.confirmability.join(','),
    };

    for (const a of AMENITY_FILTERS) {
      filterParams[a.apiKey] = filters.amenities.includes(a.key) ? true : '';
    }

    dispatch(setAllMyHotels([]));
    dispatch(
      searchFilters(
        withSearchTypeFilters(
          searchType || hotels?.search_type,
          filterParams,
        ) as any,
      ),
    );
    onClose();
  };

  /** iPad sidebar: checkbox row with the hotel count on the right (Figma). */
  const renderCheckRows = (
    options: { label: string; value: string; count?: number; disabled?: boolean }[],
    selected: string[],
    stateKey: keyof FilterState,
  ) => (
    <View style={sidebarStyles.rows}>
      {options.map(option => {
        const isSelected = selected.includes(option.value);
        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.7}
            disabled={option.disabled}
            onPress={() => toggleInList(stateKey, option.value)}
            style={[sidebarStyles.row, option.disabled && sidebarStyles.rowDisabled]}>
            <View
              style={[
                sidebarStyles.checkbox,
                {
                  backgroundColor: isSelected ? theme.brand : 'transparent',
                  borderColor: isSelected ? theme.brand : theme.textDisabled,
                },
              ]}>
              {isSelected ? <AppIcon name="checkmark" size={14} color="#FFFFFF" accent={false} /> : null}
            </View>
            <AppText style={[sidebarStyles.rowLabel, { color: theme.text }]} numberOfLines={1}>
              {option.label}
            </AppText>
            {option.count != null ? (
              <AppText style={[sidebarStyles.rowCount, { color: theme.textTertiary }]}>
                {option.count}
              </AppText>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderChipSection = (
    title: string,
    options: { label: string; value: string; meta?: string; count?: number; disabled?: boolean }[],
    selected: string[],
    stateKey: keyof FilterState,
  ) => {
    if (!options.length) return null;
    if (isSidebar) {
      return (
        <View style={sidebarStyles.section}>
          <AppText style={[sidebarStyles.sectionTitle, { color: theme.text }]}>{title}</AppText>
          {renderCheckRows(options, selected, stateKey)}
        </View>
      );
    }
    return (
      <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
        <AppText style={[styles.sectionTitle, { color: theme.text }]}>{title}</AppText>
        <Chips
          options={options}
          selected={selected}
          onToggle={value => toggleInList(stateKey, String(value))}
        />
      </View>
    );
  };

  if (isSidebar) {
    const count = resultCount ?? hotels?.hotels_count ?? 0;
    return (
      <View style={sidebarStyles.container}>
        <View style={sidebarStyles.header}>
          <AppText style={[sidebarStyles.headerTitle, { color: theme.text }]}>Фильтры</AppText>
          <TouchableOpacity
            onPress={handleResetLocal}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppText style={[sidebarStyles.resetText, { color: theme.brand }]}>Сбросить</AppText>
          </TouchableOpacity>
        </View>

        {hasPriceFilter && (
          <View style={sidebarStyles.section}>
            <RangeSlider
              label="Цена за тур"
              min={filters.priceMin}
              max={filters.priceMax}
              minValue={priceBounds.min}
              maxValue={priceBounds.max}
              onMinChange={value => setFilters(prev => ({ ...prev, priceMin: value }))}
              onMaxChange={value => setFilters(prev => ({ ...prev, priceMax: value }))}
            />
          </View>
        )}

        {renderChipSection('Звёзды', starOptions, filters.stars, 'stars')}
        {renderChipSection('Питание', mealsOptions, filters.meals, 'meals')}
        {renderChipSection('Линия пляжа', beachLineOptions, filters.beachLine, 'beachLine')}
        {renderChipSection('Удобства', amenityOptions, filters.amenities, 'amenities')}
        {renderChipSection('Тип размещения', accommodationOptions, filters.accommodationTypes, 'accommodationTypes')}
        {renderChipSection('Регион', regionsOptions, filters.regions, 'regions')}
        {renderChipSection('Рейтинг', ratingOptions, filters.rating, 'rating')}
        {renderChipSection('Туроператор', providerOptions, filters.providers, 'providers')}
        {renderChipSection('Wi-Fi', wifiOptions, filters.wifi, 'wifi')}
        {renderChipSection('Покрытие пляжа', beachSurfaceOptions, filters.beachSurface, 'beachSurface')}
        {renderChipSection('Тип пляжа', beachTypeOptions, filters.beachType, 'beachType')}
        {renderChipSection('Категория', categoryOptions, filters.category, 'category')}
        {renderChipSection('Подтверждение', confirmabilityOptions, filters.confirmability, 'confirmability')}

        <View style={sidebarStyles.section}>
          <Toggle
            label="Быстрое подтверждение"
            value={filters.quickConfirmation}
            onToggle={() =>
              setFilters(prev => ({
                ...prev,
                quickConfirmation: !prev.quickConfirmation,
              }))
            }
          />
        </View>

        <AppButton
          title={`Показать ${count} ${hotelsWord(count)}`}
          onPress={handleApply}
          size="medium"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={[styles.headerContent, { borderBottomColor: theme.borderLight }]}>
          <AppText style={[styles.headerTitle, { color: theme.text }]}>Фильтры</AppText>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleResetLocal}
              style={styles.headerButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <AppText style={[styles.resetText, { color: theme.textTertiary }]}>
                Сбросить
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <AppText style={[styles.cancelText, { color: theme.brand }]}>Отменить</AppText>
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
        <View style={styles.section}>
          <Toggle
            label="Быстрое подтверждение"
            value={filters.quickConfirmation}
            onToggle={() =>
              setFilters(prev => ({
                ...prev,
                quickConfirmation: !prev.quickConfirmation,
              }))
            }
          />
        </View>

        {hasPriceFilter && (
          <RangeSlider
            label="Стоимость, ₽"
            min={filters.priceMin}
            max={filters.priceMax}
            minValue={priceBounds.min}
            maxValue={priceBounds.max}
            onMinChange={value => setFilters(prev => ({ ...prev, priceMin: value }))}
            onMaxChange={value => setFilters(prev => ({ ...prev, priceMax: value }))}
          />
        )}

        {renderChipSection(
          'Тип размещения',
          accommodationOptions,
          filters.accommodationTypes,
          'accommodationTypes',
        )}
        {renderChipSection('Питание', mealsOptions, filters.meals, 'meals')}
        {renderChipSection('Количество звёзд', starOptions, filters.stars, 'stars')}

        {renderChipSection('Регион', regionsOptions, filters.regions, 'regions')}
        {renderChipSection(
          'Линия пляжа',
          beachLineOptions,
          filters.beachLine,
          'beachLine',
        )}
        {renderChipSection(
          'Туроператор',
          providerOptions,
          filters.providers,
          'providers',
        )}
        {renderChipSection('Рейтинг', ratingOptions, filters.rating, 'rating')}
        {renderChipSection('Wi-Fi', wifiOptions, filters.wifi, 'wifi')}
        {renderChipSection(
          'Покрытие пляжа',
          beachSurfaceOptions,
          filters.beachSurface,
          'beachSurface',
        )}
        {renderChipSection(
          'Тип пляжа',
          beachTypeOptions,
          filters.beachType,
          'beachType',
        )}
        {renderChipSection(
          'Категория',
          categoryOptions,
          filters.category,
          'category',
        )}
        {renderChipSection(
          'Подтверждение',
          confirmabilityOptions,
          filters.confirmability,
          'confirmability',
        )}

        {amenityOptions.length > 0 ? (
          <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
            <AppText style={[styles.sectionTitle, { color: theme.text }]}>
              Удобства
            </AppText>
            <View style={styles.amenitiesList}>
              {amenityOptions.map(option => {
                const selected = filters.amenities.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.amenityRow,
                      {
                        backgroundColor: selected
                          ? theme.backgroundTertiary
                          : theme.background,
                        borderColor: selected ? theme.brand : theme.borderLight,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => toggleInList('amenities', option.value)}>
                    <View style={styles.amenityText}>
                      <AppText style={[styles.amenityLabel, { color: theme.text }]}>
                        {option.label}
                      </AppText>
                      {option.meta ? (
                        <AppText
                          style={[styles.amenityMeta, { color: theme.textTertiary }]}>
                          {option.meta}
                        </AppText>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.switchTrack,
                        {
                          backgroundColor: selected
                            ? theme.brand
                            : theme.borderSecondary,
                        },
                      ]}>
                      <View
                        style={[
                          styles.switchThumb,
                          selected ? styles.switchThumbActive : null,
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}
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
  );
};

const styles = StyleSheet.create({
  container: {
    // Fills the sheet from FiltersModal so the height is defined in one place.
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  section: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  amenitiesList: {
    gap: 8,
  },
  amenityRow: {
    minHeight: 58,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  amenityText: {
    flex: 1,
    gap: 2,
  },
  amenityLabel: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  amenityMeta: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 15,
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  buttonContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
});

/** iPad sidebar only (Figma «iPad Landscape / List / Tours» → Filters panel). */
const sidebarStyles = StyleSheet.create({
  container: {
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  rows: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 30,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  rowCount: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default FiltersModalContent;
