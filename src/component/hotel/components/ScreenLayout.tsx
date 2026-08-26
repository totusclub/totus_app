import React, { ReactNode, forwardRef } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { AppHeader } from '../../UI';
import { useTheme } from '../../../hooks/useTheme';

type ScreenLayoutProps = {
  children: ReactNode;
  /** When false (e.g. hotelFromAi), no tab bar or bottom safe-area padding. */
  hasBottomTabBar?: boolean;
};

const TAB_BAR_CONTENT_PADDING = 100;

const ScreenLayout = forwardRef<ScrollView, ScreenLayoutProps>(
  ({ children, hasBottomTabBar = true }, ref) => {
    const { theme } = useTheme();
    const contentPaddingBottom = hasBottomTabBar ? TAB_BAR_CONTENT_PADDING : 0;

    return (
      <View style={[styles.wrapper, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
          <AppHeader />
          <ScrollView
            ref={ref}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: contentPaddingBottom },
            ]}>
            <View style={styles.content}>{children}</View>
          </ScrollView>
        </View>
      </View>
    );
  },
);

ScreenLayout.displayName = 'ScreenLayout';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    gap: 8,
    flex: 1,
  },
  scrollContent: {},
  content: {
    paddingHorizontal: 8,
    paddingTop: 20,
    gap: 24,
  },
});

export default ScreenLayout;

