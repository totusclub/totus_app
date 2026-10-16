import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppButton, AppText } from '../../UI';
import { useTheme } from '../../../hooks/useTheme';
import { FONT_HEADING } from '../../../theme/fonts';
import type { InclusionItem } from '../../../utils/bookingOffer';

/**
 * Состояния экрана бронирования — как на сайте (макет «Бронирование · ошибки и доп. услуги»,
 * утверждён 16.10.2026; totus_WEB #89): тур недоступен, не удалось загрузить / нет интернета,
 * долгая проверка у туроператора, тур раскупили при оформлении, «Что входит в тур».
 */

type NavActions = {
  /** «Выбрать другой перелёт» — нет у отеля без перелёта. */
  onOtherFlight?: () => void;
  /** «Вернуться к номерам». */
  onRooms: () => void;
};

const PlaneIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2 16l20-8-3-2-6 2.4L6 4 4 5l4.5 4.6L5 11l-2-1-1 1 2 3" />
    <Path d="M3 21h18" />
  </Svg>
);

const RetryIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 12a9 9 0 1 1-3-6.7" />
    <Path d="M21 4v5h-5" />
  </Svg>
);

const OfflineIcon = ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M2 8.5a15 15 0 0 1 20 0" />
    <Path d="M5.5 12a10 10 0 0 1 13 0" />
    <Path d="M9 15.5a5 5 0 0 1 6 0" />
    <Path d="M12 19h.01" />
    <Path d="M3 3l18 18" />
  </Svg>
);

function StatusCard({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      {children}
    </View>
  );
}

/** Тур снят / продан / протух — при открытии экрана. */
export function BookingUnavailable({ summary, onOtherFlight, onRooms }: NavActions & { summary?: string }) {
  const { theme } = useTheme();
  return (
    <StatusCard>
      <View style={[styles.icon, { backgroundColor: 'rgba(254, 115, 46, 0.12)' }]}>
        <PlaneIcon color={theme.brand} />
      </View>
      <AppText style={[styles.title, { color: theme.text }]}>Это предложение больше недоступно</AppText>
      <AppText style={[styles.text, { color: theme.textSecondary }]}>
        {onOtherFlight
          ? 'Туроператор снял тур или изменил условия, пока вы выбирали. Цены и места меняются каждую минуту — подберите другой перелёт к этому отелю или другой номер.'
          : 'Отель снял предложение или изменил условия, пока вы выбирали. Цены и места меняются каждую минуту — подберите другой номер.'}
      </AppText>
      {summary ? <AppText style={[styles.meta, { color: theme.textTertiary }]}>{summary}</AppText> : null}
      <View style={styles.actions}>
        {onOtherFlight ? (
          <>
            <AppButton title="Выбрать другой перелёт" onPress={onOtherFlight} size="large" />
            <AppButton title="Вернуться к номерам" type="outline" onPress={onRooms} size="large" />
          </>
        ) : (
          <AppButton title="Вернуться к номерам" onPress={onRooms} size="large" />
        )}
      </View>
    </StatusCard>
  );
}

/** Сбой связи или туроператора (offline — нет интернета) — тур может быть доступен, можно повторить. */
export function BookingLoadError({
  offline = false,
  onRetry,
  onOtherFlight,
  onRooms,
}: NavActions & { offline?: boolean; onRetry: () => void }) {
  const { theme } = useTheme();
  return (
    <StatusCard>
      <View style={[styles.icon, { backgroundColor: theme.backgroundSecondary }]}>
        {offline ? <OfflineIcon color={theme.textSecondary} /> : <RetryIcon color={theme.textSecondary} />}
      </View>
      <AppText style={[styles.title, { color: theme.text }]}>
        {offline ? 'Нет подключения к интернету' : 'Не удалось загрузить тур'}
      </AppText>
      <AppText style={[styles.text, { color: theme.textSecondary }]}>
        {offline
          ? 'Проверьте Wi-Fi или мобильную сеть и попробуйте ещё раз. Выбранный тур и перелёт сохранены.'
          : 'Туроператор отвечает дольше обычного или пропала связь. Тур при этом может быть доступен — попробуйте ещё раз через несколько секунд.'}
      </AppText>
      <View style={styles.actions}>
        <AppButton title="Повторить" onPress={onRetry} size="large" />
        {onOtherFlight ? (
          <AppButton title="Выбрать другой перелёт" type="outline" onPress={onOtherFlight} size="large" />
        ) : (
          <AppButton title="Вернуться к номерам" type="outline" onPress={onRooms} size="large" />
        )}
      </View>
      {!offline ? (
        <AppText style={[styles.footnote, { color: theme.textTertiary }]}>
          Не получается несколько раз подряд — напишите в чат поддержки, поможем оформить.
        </AppText>
      ) : null}
    </StatusCard>
  );
}

/** Подсказка над скелетоном, если актуализация идёт дольше BOOKING_SLOW_HINT_MS. */
export function BookingSlowHint() {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      style={[styles.slow, { backgroundColor: theme.backgroundSecondary }]}>
      <ActivityIndicator size="small" color={theme.brand} />
      <View style={styles.slowText}>
        <AppText style={[styles.slowTitle, { color: theme.text }]}>Проверяем цену и места у туроператора</AppText>
        <AppText style={[styles.slowSub, { color: theme.textTertiary }]}>Обычно это 5–15 секунд. Не закрывайте экран.</AppText>
      </View>
    </View>
  );
}

/** Тур продали, пока заполняли форму (актуализация перед созданием заказа). */
export function BookingSubmitUnavailable({ onOtherFlight, onRooms }: NavActions) {
  const { theme } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[styles.soldOut, { backgroundColor: 'rgba(254, 115, 46, 0.1)', borderColor: 'rgba(254, 115, 46, 0.35)' }]}>
      <AppText style={[styles.soldOutTitle, { color: theme.mode === 'dark' ? '#FA8842' : '#C2410B' }]}>
        Этот тур только что раскупили
      </AppText>
      <AppText style={[styles.soldOutText, { color: theme.textSecondary }]}>
        Пока вы заполняли данные, туроператор продал места или изменил условия. Заказ не создан, деньги не списаны.
      </AppText>
      <View style={styles.soldOutActions}>
        {onOtherFlight ? (
          <View style={styles.soldOutButton}>
            <AppButton title="Выбрать другой перелёт" onPress={onOtherFlight} size="medium" />
          </View>
        ) : null}
        <View style={styles.soldOutButton}>
          <AppButton
            title="К номерам"
            type={onOtherFlight ? 'outline' : undefined}
            onPress={onRooms}
            size="medium"
          />
        </View>
      </View>
    </View>
  );
}

const KIND_LABEL: Record<InclusionItem['kind'], string> = {
  yes: 'Входит',
  no: 'Не входит',
  info: 'Важно',
};

function InclusionIcon({ kind, color }: { kind: InclusionItem['kind']; color: string }) {
  if (kind === 'yes') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M5 12.5l4.5 4.5L19 7.5" />
      </Svg>
    );
  }
  if (kind === 'no') {
    return (
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round">
        <Path d="M6 12h12" />
      </Svg>
    );
  }
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v6" />
      <Path d="M12 7.5v.5" />
    </Svg>
  );
}

/** «Что входит в тур» под «Итого» в «Ваш заказ». */
export function BookingInclusions({ items, title }: { items: InclusionItem[]; title: string }) {
  const { theme } = useTheme();
  if (items.length === 0) return null;
  const yesColor = theme.mode === 'dark' ? '#0DD6A4' : '#288556';
  return (
    <View style={[styles.inclusions, { backgroundColor: theme.backgroundSecondary }]}>
      <AppText style={[styles.inclusionsTitle, { color: theme.text }]}>{title}</AppText>
      {items.map(item => (
        <View
          key={item.key}
          style={styles.inclusion}
          accessible
          accessibilityLabel={`${KIND_LABEL[item.kind]}: ${item.title}${item.note ? ` ${item.note}` : ''}`}>
          <View style={styles.inclusionIcon}>
            <InclusionIcon
              kind={item.kind}
              color={item.kind === 'yes' ? yesColor : item.kind === 'no' ? theme.textTertiary : theme.textSecondary}
            />
          </View>
          <View style={styles.inclusionTextWrap}>
            <AppText style={[styles.inclusionText, { color: theme.text }]}>
              {item.title}
              {item.note ? <AppText style={{ color: theme.textTertiary }}> {item.note}</AppText> : null}
            </AppText>
            {item.detail ? (
              <AppText style={[styles.inclusionDetail, { color: theme.textTertiary }]}>{item.detail}</AppText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 24,
    lineHeight: 29,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    marginTop: 6,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
  },
  slow: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  slowText: {
    flex: 1,
    gap: 2,
  },
  slowTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  slowSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  soldOut: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  soldOutTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  soldOutText: {
    fontSize: 14,
    lineHeight: 19,
  },
  soldOutActions: {
    gap: 8,
    marginTop: 4,
  },
  soldOutButton: {
    alignSelf: 'stretch',
  },
  inclusions: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  inclusionsTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  inclusion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  inclusionIcon: {
    paddingTop: 0,
  },
  inclusionTextWrap: {
    flex: 1,
  },
  inclusionText: {
    fontSize: 14,
    lineHeight: 18,
  },
  inclusionDetail: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
  },
});
