import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader, SkeletonBox, SkeletonGroup } from '../UI';
import { useTheme } from '../../hooks/useTheme';
import { BookingSlowHint } from './components/BookingStatus';

/**
 * Mirrors the booking screen: contacts card, tourist forms, order summary, footer CTA.
 * slowHint — актуализация у туроператора идёт дольше обычного: подсказка над заглушками.
 */
const BookingSkeleton: React.FC<{ slowHint?: boolean }> = ({ slowHint = false }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const renderInput = (key: string) => (
    <SkeletonBox key={key} height={52} radius={12} />
  );

  const renderTouristForm = (index: number) => (
    <View key={`tourist-${index}`} style={styles.touristForm}>
      {index > 0 ? (
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />
      ) : null}

      <View style={styles.sectionHeader}>
        <SkeletonBox width={130} height={24} style={styles.sectionTitle} />
        <SkeletonBox width={110} height={18} />
      </View>

      <View style={styles.form}>
        {renderInput(`name-${index}`)}
        {renderInput(`surname-${index}`)}
        {renderInput(`patronymic-${index}`)}

        <View style={styles.toggleRow}>
          <SkeletonBox width={112} height={20} />
          <SkeletonBox width={48} height={28} radius={14} />
        </View>

        <SkeletonBox height={52} radius={12} />

        <View style={styles.genderRow}>
          <SkeletonBox width={38} height={20} />
          <View style={styles.radioGroup}>
            <View style={styles.radioButton}>
              <SkeletonBox width={20} height={20} radius={10} />
              <SkeletonBox width={72} height={20} />
            </View>
            <View style={styles.radioButton}>
              <SkeletonBox width={20} height={20} radius={10} />
              <SkeletonBox width={72} height={20} />
            </View>
          </View>
        </View>

        <SkeletonBox height={52} radius={12} />
        <SkeletonBox height={52} radius={12} />
        {renderInput(`passport-${index}`)}
        <SkeletonBox height={52} radius={12} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {slowHint ? <BookingSlowHint /> : null}
        <SkeletonGroup>
          <View style={[styles.formCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeader}>
              <SkeletonBox width={210} height={24} style={styles.sectionTitle} />
              <SkeletonBox width={190} height={18} />
            </View>

            <View style={styles.form}>
              {renderInput('email')}
              {renderInput('phone')}
            </View>
          </View>

          <View style={[styles.formCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeader}>
              <SkeletonBox width={110} height={24} style={styles.sectionTitle} />
              <SkeletonBox width="90%" height={18} />
            </View>

            {[0, 1].map(renderTouristForm)}
          </View>

          <View style={styles.orderCard}>
            <SkeletonBox width={104} height={20} style={styles.orderTitle} />
            <View style={styles.orderRow}>
              <SkeletonBox width="55%" height={18} />
              <SkeletonBox width={92} height={18} />
            </View>
            <SkeletonBox width="65%" height={16} />
            <View style={styles.orderRow}>
              <SkeletonBox width={132} height={18} />
              <SkeletonBox width={80} height={18} />
            </View>
            <View style={[styles.orderDivider, { backgroundColor: theme.borderLight }]} />
            <View style={styles.orderRow}>
              <SkeletonBox width={64} height={20} />
              <SkeletonBox width={104} height={20} />
            </View>
          </View>

          <View style={styles.legalWrap}>
            <SkeletonBox height={16} />
            <SkeletonBox height={16} />
            <SkeletonBox width="70%" height={16} style={styles.legalLastLine} />
          </View>
        </SkeletonGroup>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: theme.cardBackground,
            borderTopColor: theme.borderLight,
          },
        ]}>
        <SkeletonGroup>
          <SkeletonBox height={56} radius={999} />
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
  scrollContent: {
    paddingBottom: 24,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 20,
    gap: 4,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  form: {
    gap: 16,
  },
  touristForm: {
    marginTop: 20,
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 24,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderCard: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 20,
    gap: 6,
  },
  orderTitle: {
    marginBottom: 4,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  orderDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  legalWrap: {
    marginBottom: 8,
    paddingHorizontal: 20,
    gap: 4,
    alignItems: 'center',
  },
  legalLastLine: {
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});

export default BookingSkeleton;
