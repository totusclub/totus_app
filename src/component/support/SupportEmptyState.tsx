import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import type {SupportHours} from '../../modules/api/supportChat';
import type {SupportQuickTopic} from '../../modules/support/supportConstants';
import SupportAvatar from './SupportAvatar';
import SupportQuickTopics from './SupportQuickTopics';
import { FONT_HEADING } from '../../theme/fonts';

type Props = {
  hours: SupportHours | null;
  onSelectTopic: (topic: SupportQuickTopic) => void;
  disabled?: boolean;
};

const DEFAULT_HOURS_TEXT =
  'Служба поддержки Totus Club отвечает ежедневно. Среднее время ответа — 5 минут.';

/** Пустое состояние (первое открытие): аватар, «Напишите нам», часы работы, чипы. */
const SupportEmptyState: React.FC<Props> = ({hours, onSelectTopic, disabled}) => {
  const {theme} = useTheme();
  const text = hours?.text?.trim() || DEFAULT_HOURS_TEXT;

  return (
    <View style={styles.container}>
      <SupportAvatar size={72} online />
      <AppText style={[styles.title, {color: theme.text}]}>Напишите нам</AppText>
      <AppText style={[styles.text, {color: theme.textTertiary}]}>{text}</AppText>
      <View style={styles.topics}>
        <SupportQuickTopics layout="wrap" onSelect={onSelectTopic} disabled={disabled} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 12,
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 340,
  },
  topics: {
    marginTop: 12,
    maxWidth: 420,
  },
});

export default SupportEmptyState;
