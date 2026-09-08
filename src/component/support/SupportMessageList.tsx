import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {ActivityIndicator, Animated, FlatList, StyleSheet, View} from 'react-native';
import {AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import type {UiSupportMessage} from '../../modules/hooks/useSupportChat';
import SupportMessageBubble from './SupportMessageBubble';
import {dayKey, formatDaySeparator} from './supportDates';

type Props = {
  messages: UiSupportMessage[]; // новые → старые
  hasMore: boolean;
  loadingMore: boolean;
  staffTyping: boolean;
  bubbleMaxWidth: number;
  onLoadMore: () => void;
  onRetry: (clientMsgId: string) => void;
  onRemoveFailed: (clientMsgId: string) => void;
  onOpenOrder?: (orderId: number | string) => void;
  bottomInset?: number;
};

type Row =
  | {type: 'message'; key: string; message: UiSupportMessage}
  | {type: 'day'; key: string; label: string};

/** Три точки «оператор печатает». */
const TypingDots: React.FC = () => {
  const {theme} = useTheme();
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const animations = dots.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(value, {toValue: 1, duration: 300, useNativeDriver: true}),
          Animated.timing(value, {toValue: 0, duration: 300, useNativeDriver: true}),
          Animated.delay(450 - i * 150),
        ]),
      ),
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, [dots]);

  return (
    <View style={styles.typingRow}>
      <View style={[styles.typingBubble, {backgroundColor: theme.backgroundSecondary}]}>
        {dots.map((value, i) => (
          <Animated.View
            key={i}
            style={[
              styles.typingDot,
              {
                backgroundColor: theme.textTertiary,
                opacity: value.interpolate({inputRange: [0, 1], outputRange: [0.35, 1]}),
                transform: [{translateY: value.interpolate({inputRange: [0, 1], outputRange: [0, -3]})}],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

/** Inverted FlatList с разделителями дат («Сегодня» / «Вчера» / дата). */
const SupportMessageList: React.FC<Props> = ({
  messages,
  hasMore,
  loadingMore,
  staffTyping,
  bubbleMaxWidth,
  onLoadMore,
  onRetry,
  onRemoveFailed,
  onOpenOrder,
  bottomInset = 0,
}) => {
  const {theme} = useTheme();

  // Разделитель дня ставим ПОСЛЕ последнего (самого старого в дне) сообщения —
  // в inverted-списке он окажется над первым сообщением дня.
  const rows = useMemo<Row[]>(() => {
    const result: Row[] = [];
    for (let i = 0; i < messages.length; i += 1) {
      const m = messages[i];
      result.push({type: 'message', key: m.key, message: m});
      const older = messages[i + 1];
      const thisDay = dayKey(m.createdAt);
      if (thisDay && (!older || dayKey(older.createdAt) !== thisDay)) {
        result.push({type: 'day', key: `day:${thisDay}:${m.key}`, label: formatDaySeparator(m.createdAt)});
      }
    }
    return result;
  }, [messages]);

  const renderItem = useCallback(
    ({item}: {item: Row}) => {
      if (item.type === 'day') {
        return (
          <View style={styles.dayRow}>
            <View style={[styles.dayPill, {backgroundColor: theme.backgroundSecondary}]}>
              <AppText style={[styles.dayText, {color: theme.textTertiary}]}>{item.label}</AppText>
            </View>
          </View>
        );
      }
      return (
        <SupportMessageBubble
          message={item.message}
          maxWidth={bubbleMaxWidth}
          onRetry={onRetry}
          onRemoveFailed={onRemoveFailed}
          onOpenOrder={onOpenOrder}
        />
      );
    },
    [bubbleMaxWidth, onOpenOrder, onRemoveFailed, onRetry, theme],
  );

  return (
    <FlatList
      data={rows}
      inverted
      keyExtractor={item => item.key}
      renderItem={renderItem}
      style={styles.list}
      contentContainerStyle={[styles.content, {paddingTop: bottomInset + 8}]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={staffTyping ? <TypingDots /> : null}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.textTertiary} />
          </View>
        ) : null
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    paddingBottom: 8,
  },
  dayRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loader: {
    paddingVertical: 12,
  },
  typingRow: {
    paddingHorizontal: 16,
    marginVertical: 3,
    alignItems: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

export default SupportMessageList;
