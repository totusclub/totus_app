import { Platform, useWindowDimensions } from 'react-native';

/**
 * iPad-only layout helpers.
 *
 * IMPORTANT: everything tablet-specific in the app is gated by `isTablet`.
 * On iPhone (and on Android) `isTablet` is always `false`, so every consumer
 * must fall back to its pre-existing behaviour — the phone UI must not change.
 */

/** True only for iPad builds of the iOS app. Never true on iPhone or Android. */
export const IS_TABLET: boolean =
  Platform.OS === 'ios' && (Platform as { isPad?: boolean }).isPad === true;

/** Design breakpoints (points): compact = phone, medium = iPad portrait, expanded = iPad landscape / large iPad. */
export type LayoutClass = 'compact' | 'medium' | 'expanded';

export const TABLET_CONTENT_PADDING = 24;
/** Max width for single-column forms/reading content on iPad (booking, checkout, login…). */
export const TABLET_MAX_CONTENT_WIDTH = 640;
/** Width of the secondary (right) column on iPad two-column screens. */
export const TABLET_SIDE_COLUMN_WIDTH = 340;

export type Layout = {
  /** iPad build — all tablet branches must check this first. */
  isTablet: boolean;
  isLandscape: boolean;
  width: number;
  height: number;
  layoutClass: LayoutClass;
  /** Grid columns for card lists (1 on phone). */
  columns: number;
  /** Horizontal screen padding (16 on phone, 24 on iPad). */
  contentPadding: number;
  /** Max width for centered single-column content (undefined on phone). */
  maxContentWidth: number | undefined;
};

export function getLayoutClass(width: number, isTablet: boolean): LayoutClass {
  if (!isTablet) {
    return 'compact';
  }
  return width >= 900 ? 'expanded' : 'medium';
}

export function getColumns(width: number, isTablet: boolean): number {
  if (!isTablet) {
    return 1;
  }
  return width >= 1100 ? 3 : 2;
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const isTablet = IS_TABLET;
  return {
    isTablet,
    isLandscape: width > height,
    width,
    height,
    layoutClass: getLayoutClass(width, isTablet),
    columns: getColumns(width, isTablet),
    contentPadding: isTablet ? TABLET_CONTENT_PADDING : 16,
    maxContentWidth: isTablet ? TABLET_MAX_CONTENT_WIDTH : undefined,
  };
}
