import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText, AppButton } from '../UI';
import EmptyCityIcon from '../UI/icons/emptyCity';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation } from '@react-navigation/native';

type EmptyStateProps = {
  onResetFilters: () => void;
  emptyType: string;
};

const EmptyState: React.FC<EmptyStateProps> = ({ onResetFilters, emptyType }) => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <EmptyCityIcon size={80} color={theme.brand} />
        <AppText style={[styles.title, { color: theme.text }]}>Ошибка</AppText>
        <AppText style={[styles.message, { color: theme.textTertiary }]}>
          К сожалению, не найдено ни одного тура, соответствующего вашим критериям. Пожалуйста, попробуйте изменить параметры поиска или вернитесь позже.
        </AppText>
        <AppButton
          title={emptyType === 'BACK' ? 'Вернуться назад' : 'Сбросить фильтры'}
          onPress={emptyType === 'BACK' ? () => navigation.goBack() : onResetFilters}
          size="large"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 32,
  },
});

export default EmptyState;

