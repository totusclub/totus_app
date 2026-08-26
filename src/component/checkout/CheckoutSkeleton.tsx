import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, SkeletonBox, SkeletonGroup } from '../UI';
import { useTheme } from '../../hooks/useTheme';

const SECTIONS: Array<{ withHeader?: boolean; rows: number }> = [
  { withHeader: true, rows: 4 },
  { rows: 2 },
  { rows: 3 },
  { rows: 2 },
  { rows: 2 },
];

/** Mirrors CheckoutItems section cards + CheckoutCard footer. */
const CheckoutSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}>
        <SkeletonGroup>
          {SECTIONS.map((section, sectionIndex) => (
            <View
              key={`section-${sectionIndex}`}
              style={[
                styles.sectionCard,
                { backgroundColor: theme.cardBackground, borderColor: theme.border },
              ]}>
              {section.withHeader ? (
                <View style={styles.sectionHeader}>
                  <SkeletonBox width={168} height={20} />
                </View>
              ) : null}

              <View style={styles.sectionTitle}>
                <SkeletonBox width={132} height={18} />
              </View>

              <View
                style={[
                  styles.infoItemsLayout,
                  { backgroundColor: theme.backgroundSecondary },
                ]}>
                {Array.from({ length: section.rows }).map((_, rowIndex) => (
                  <View
                    key={`row-${sectionIndex}-${rowIndex}`}
                    style={[
                      styles.infoItem,
                      { borderBottomColor: theme.divider },
                      rowIndex === section.rows - 1 && styles.infoItemLast,
                    ]}>
                    <View style={styles.infoItemContent}>
                      <SkeletonBox width="55%" height={20} />
                      <SkeletonBox width="80%" height={18} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </SkeletonGroup>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom,
            backgroundColor: theme.cardBackground,
            borderTopColor: theme.borderLight,
          },
        ]}>
        <SkeletonGroup>
          <View style={styles.totalPriceContent}>
            <SkeletonBox width={96} height={16} />
            <SkeletonBox width={148} height={24} />
          </View>
          <SkeletonBox height={52} radius={14} />
        </SkeletonGroup>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  sectionCard: {
    marginHorizontal: 8,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionHeader: {
    paddingVertical: 12,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  infoItemsLayout: {
    borderRadius: 16,
    width: '100%',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  infoItemLast: {
    borderBottomWidth: 0,
  },
  infoItemContent: {
    flex: 1,
    gap: 4,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  totalPriceContent: {
    marginBottom: 12,
    gap: 4,
  },
});

export default CheckoutSkeleton;
