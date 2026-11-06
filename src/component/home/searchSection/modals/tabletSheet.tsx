import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';

/**
 * iPad: окна формы поиска (Куда, Город вылета, Выберите дату, Количество ночей, Туристы) —
 * карточка 540 pt по центру экрана вместо окна на весь экран / шторки во всю ширину
 * (макет «iPad: компактные окна поиска», утверждён 07.11.2026).
 * Содержимое, тексты и логика окон не меняются; на телефоне эти стили не применяются
 * (каждое окно проверяет `isTablet` из hooks/useLayout).
 */
export const TABLET_SHEET_WIDTH = 540;
/** Высота окна — не больше 80% экрана. */
export const TABLET_SHEET_MAX_HEIGHT_RATIO = 0.8;
/** Окна со списком (направления, города, календарь): фиксированная высота, список прокручивается внутри. */
export const TABLET_LIST_SHEET_MAX_HEIGHT = 800;
/** Ячейка календаря на iPad (на телефоне — квадрат 1/7 ширины). */
export const TABLET_CALENDAR_CELL_HEIGHT = 48;

/** Высота окна со списком для экрана высотой `windowHeight`. */
export function tabletListSheetHeight(windowHeight: number): number {
  return Math.round(
    Math.min(TABLET_LIST_SHEET_MAX_HEIGHT, windowHeight * TABLET_SHEET_MAX_HEIGHT_RATIO),
  );
}

export const tabletSheetStyles = StyleSheet.create({
  /**
   * Контейнер react-native-modal: карточка по центру по вертикали.
   * Без alignItems: 'center' — иначе обёртка окна сжимается до ширины карточки и размытие
   * фона ложится только полосой 540 pt (скриншоты владельца 07.11). По горизонтали карточку
   * центрирует её alignSelf, фон растягивается на весь экран.
   */
  modal: {
    margin: 0,
    justifyContent: 'center',
  },
  /** Сама карточка: поверх «на весь экран» (position absolute) и «шторки снизу» стилей окна. */
  card: {
    position: 'relative',
    alignSelf: 'center',
    width: TABLET_SHEET_WIDTH,
    maxHeight: '80%',
    borderRadius: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});

/**
 * Фон под карточкой на iPad: размытие, как у окон «Ночи» и «Туристы» на телефоне,
 * касание по фону закрывает окно. `blur={false}` — окно уже рисует своё размытие, нужен только тап.
 */
export const TabletSheetBackdrop: React.FC<{ onClose: () => void; isDark: boolean; blur?: boolean }> = ({
  onClose,
  isDark,
  blur = true,
}) => (
  <>
    {blur && Platform.OS === 'ios' ? (
      <BlurView style={tabletSheetStyles.backdrop} blurType={isDark ? 'dark' : 'light'} blurAmount={10} />
    ) : null}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Закрыть"
      onPress={onClose}
      style={tabletSheetStyles.backdrop}>
      <View />
    </Pressable>
  </>
);
