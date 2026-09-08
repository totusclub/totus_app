import React from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import {SUPPORT_QUICK_TOPICS, type SupportQuickTopic} from '../../modules/support/supportConstants';

type Props = {
  onSelect: (topic: SupportQuickTopic) => void;
  disabled?: boolean;
  /** Горизонтальная лента (над композером) или перенос по строкам (пустое состояние). */
  layout?: 'scroll' | 'wrap';
  topics?: SupportQuickTopic[];
};

/** Чипы быстрых тем: «Вопрос по заказу», «Изменить бронирование», … */
const SupportQuickTopics: React.FC<Props> = ({
  onSelect,
  disabled = false,
  layout = 'scroll',
  topics = SUPPORT_QUICK_TOPICS,
}) => {
  const {theme} = useTheme();

  const chips = topics.map(topic => (
    <TouchableOpacity
      key={topic.key}
      disabled={disabled}
      onPress={() => onSelect(topic)}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <AppText style={[styles.chipText, {color: theme.text}]}>{topic.label}</AppText>
    </TouchableOpacity>
  ));

  if (layout === 'wrap') {
    return <View style={styles.wrap}>{chips}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scroll}>
      {chips}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default SupportQuickTopics;
