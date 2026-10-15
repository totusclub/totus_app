import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {AppIcon, AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import type {UiSupportMessage} from '../../modules/hooks/useSupportChat';
import type {SupportMessageMeta} from '../../modules/api/supportChat';
import {SUPPORT_DISPLAY_NAME} from '../../modules/support/supportConstants';
import {formatMessageTime} from './supportDates';

type Props = {
  message: UiSupportMessage;
  /** Максимальная ширина пузыря (iPhone ≤ 290, iPad ≤ 70 % колонки). */
  maxWidth: number;
  onRetry?: (clientMsgId: string) => void;
  onRemoveFailed?: (clientMsgId: string) => void;
  onOpenOrder?: (orderId: number | string) => void;
};

/** Двойная галочка «Прочитано» (белая на брендовом пузыре). */
const DoubleCheck: React.FC<{color: string; size?: number}> = ({color, size = 14}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M2.5 12.5L7 17L14.5 8.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9.5 15.5L11 17L21.5 6.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const OrderCard: React.FC<{
  meta: SupportMessageMeta;
  mine: boolean;
  onPress?: () => void;
}> = ({meta, mine, onPress}) => {
  const {theme} = useTheme();
  const title = meta.orderTitle || `Заказ № ${meta.orderId}`;
  const bg = mine ? 'rgba(255,255,255,0.18)' : theme.background;
  const titleColor = mine ? '#FFFFFF' : theme.text;
  const subColor = mine ? 'rgba(255,255,255,0.8)' : theme.textTertiary;
  const content = (
    <View style={[styles.orderCard, {backgroundColor: bg, borderColor: mine ? 'transparent' : theme.border}]}>
      <View style={[styles.orderIcon, {backgroundColor: mine ? 'rgba(255,255,255,0.2)' : theme.backgroundTertiary}]}>
        <AppIcon name="order" size={16} color={mine ? '#FFFFFF' : theme.brand} accent={!mine} />
      </View>
      <View style={styles.orderTextCol}>
        <AppText style={[styles.orderTitle, {color: titleColor}]} numberOfLines={1}>
          {title}
        </AppText>
        {meta.orderSubtitle ? (
          <AppText style={[styles.orderSubtitle, {color: subColor}]} numberOfLines={2}>
            {meta.orderSubtitle}
          </AppText>
        ) : null}
      </View>
      {onPress ? <AppIcon name="arrowRight" size={12} color={subColor} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
};

const SupportMessageBubble: React.FC<Props> = ({
  message,
  maxWidth,
  onRetry,
  onRemoveFailed,
  onOpenOrder,
}) => {
  const {theme} = useTheme();
  const mine = message.senderRole === 'user';
  const system = message.senderRole === 'system';
  const failed = message.status === 'failed';
  const sending = message.status === 'sending';
  const time = formatMessageTime(message.createdAt);
  const senderName = message.senderName
    ? `${message.senderName} · ${SUPPORT_DISPLAY_NAME}`
    : SUPPORT_DISPLAY_NAME;
  const orderId = message.meta?.orderId;

  if (system) {
    return (
      <View style={styles.systemRow}>
        <AppText style={[styles.systemText, {color: theme.textTertiary}]}>{message.body}</AppText>
      </View>
    );
  }

  const bubbleBg = mine ? theme.brand : theme.backgroundSecondary;
  const textColor = mine ? '#FFFFFF' : theme.text;
  const metaColor = mine ? 'rgba(255,255,255,0.75)' : theme.textTertiary;

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.column, {maxWidth}]}>
        {!mine ? (
          <AppText style={[styles.senderName, {color: theme.textTertiary}]} numberOfLines={1}>
            {senderName}
          </AppText>
        ) : null}

        <View
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
            {backgroundColor: bubbleBg, opacity: sending ? 0.7 : 1},
          ]}>
          {orderId != null && orderId !== '' ? (
            <OrderCard
              meta={message.meta as SupportMessageMeta}
              mine={mine}
              onPress={onOpenOrder ? () => onOpenOrder(orderId) : undefined}
            />
          ) : null}

          {message.body ? (
            <AppText style={[styles.body, {color: textColor}]} selectable>
              {message.body}
            </AppText>
          ) : null}

          <View style={styles.metaRow}>
            <AppText style={[styles.time, {color: metaColor}]}>{time}</AppText>
            {mine && message.status === 'sent' ? (
              message.readAt ? (
                <DoubleCheck color="#FFFFFF" />
              ) : (
                <AppIcon name="checkmark" size={13} color={metaColor} />
              )
            ) : null}
            {mine && sending ? (
              <AppText style={[styles.time, {color: metaColor}]}>· отправка</AppText>
            ) : null}
          </View>
        </View>

        {failed && message.clientMsgId ? (
          <View style={styles.failedRow}>
            <AppText style={[styles.failedText, {color: theme.error}]}>Не отправлено</AppText>
            <TouchableOpacity
              onPress={() => onRetry?.(message.clientMsgId as string)}
              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
              <AppText style={[styles.failedAction, {color: theme.brand}]}>Повторить</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onRemoveFailed?.(message.clientMsgId as string)}
              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
              <AppText style={[styles.failedAction, {color: theme.textTertiary}]}>Удалить</AppText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 3,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
  },
  column: {
    gap: 4,
  },
  senderName: {
    fontSize: 12,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 16,
    gap: 6,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 4,
  },
  body: {
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginRight: 4,
  },
  failedText: {
    fontSize: 12,
  },
  failedAction: {
    fontSize: 12,
    fontWeight: '600',
  },
  systemRow: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginVertical: 6,
  },
  systemText: {
    fontSize: 12,
    textAlign: 'center',
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 200,
  },
  orderIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderTextCol: {
    flex: 1,
    gap: 1,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderSubtitle: {
    fontSize: 12,
  },
});

export default SupportMessageBubble;
