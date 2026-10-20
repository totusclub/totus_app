import React, { useContext, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import FiltersModalContent from './FiltersModalContent';
import { useTheme } from '../../../hooks/useTheme';
import { useFiltersOpen } from '../FiltersOpenContext';

/** SearchResultHeader: 40 content + 2 bottom border. */
const SEARCH_HEADER_HEIGHT = 42;
/** `Content` (UI/content): marginBottom when the bottom tab bar is shown. */
const CONTENT_BOTTOM_MARGIN = 12;

/**
 * Part of the screen hidden by the bottom tab bar. The tab bar is
 * `position: 'absolute'` (authStack getTabBarStyle), so the results screen —
 * and this sheet — run under it: the screen ends at the bottom safe-area inset
 * + 12, the tab bar starts at its full height (icons + labels + inset).
 * Without the lift «Применить» sat under «Поиск / Заказы / Аккаунт»
 * (iPhone, iPad portrait and Android). 0 outside a tab navigator.
 */
export function tabBarOverlap(tabBarHeight: number | undefined, bottomInset: number): number {
  if (!tabBarHeight || tabBarHeight <= 0) {
    return 0;
  }
  return Math.max(0, Math.round(tabBarHeight - bottomInset - CONTENT_BOTTOM_MARGIN));
}

/**
 * Mounts the full filter tree as soon as search facets arrive (collapsed,
 * zero-height). The header filter button stays disabled until that mount
 * finishes — then a tap only flips `visible` and the complete list appears.
 */
const FiltersModal: React.FC = () => {
  const { theme } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Measured tab bar height (undefined outside the tab navigator).
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const bottomOverlap = tabBarOverlap(tabBarHeight, insets.bottom);
  const {
    visible,
    shouldMountBody,
    availableHeight,
    close,
    markBodyReady,
  } = useFiltersOpen();
  const allowBackdropClose = useRef(false);
  const readyReportedRef = useRef(false);

  /**
   * `availableHeight` is the measured safe-area container (device height minus
   * the status bar, and minus the bottom inset when a tab bar is present), so
   * only the app header has to be subtracted. The window-based value is just a
   * fallback for the very first frame, before onLayout has run.
   */
  const usableHeight =
    availableHeight > 0 ? availableHeight : windowHeight - insets.top;
  // The sheet ends above the tab bar: same top edge (under the header), shorter by the overlap.
  const sheetHeight = Math.max(240, usableHeight - SEARCH_HEADER_HEIGHT - bottomOverlap);

  useEffect(() => {
    if (!shouldMountBody) {
      readyReportedRef.current = false;
    }
  }, [shouldMountBody]);

  useEffect(() => {
    allowBackdropClose.current = false;
    if (!visible) {
      return;
    }

    const unlock = setTimeout(() => {
      allowBackdropClose.current = true;
    }, 200);

    return () => {
      clearTimeout(unlock);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [visible, close]);

  if (!shouldMountBody) {
    return null;
  }

  const handleBackdropPress = () => {
    if (!allowBackdropClose.current) return;
    close();
  };

  const handleBodyLayout = () => {
    if (readyReportedRef.current) {
      return;
    }
    readyReportedRef.current = true;
    // Let the first layout commit finish, then unlock the filter button.
    requestAnimationFrame(() => {
      markBodyReady();
    });
  };

  return (
    <View
      style={visible ? styles.rootOpen : styles.rootClosed}
      pointerEvents={visible ? 'auto' : 'none'}
      collapsable={false}>
      <Pressable
        style={[
          styles.backdrop,
          {
            backgroundColor: theme.overlay,
            opacity: visible ? 0.45 : 0,
          },
        ]}
        onPress={handleBackdropPress}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            // Keep real height while closed so layout/onLayout still run
            // inside the height:0 clipped root (needed for bodyReady).
            height: sheetHeight,
            // Lift above the absolute tab bar so «Применить» stays visible and tappable.
            marginBottom: bottomOverlap,
          },
        ]}
        onLayout={handleBodyLayout}>
        <FiltersModalContent onClose={close} aboveTabBar={bottomOverlap > 0} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootOpen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
    justifyContent: 'flex-end',
  },
  /**
   * Closed: keep the subtree mounted (instant open) but collapse it to zero
   * height and clip it so it cannot steal list taps.
   */
  rootClosed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 0,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
});

export default FiltersModal;
