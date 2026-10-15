import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '../UI';
import { FONT_HEADING } from '../../theme/fonts';

/**
 * Карта лояльности в «Аккаунте» — утверждённый макет 15.10.2026
 * (холст «Карта лояльности · новый дизайн»): светлая тема — вариант C «Светлая»,
 * тёмная — вариант B «Графит». Пропорции банковской карты 1,586 : 1.
 * Шрифты: «Карта лояльности» — Forum (FONT_HEADING), остальное — Museo по fontWeight.
 */
export const LOYALTY_CARD_COLORS = {
  light: {
    bg: '#F7F3EE',
    border: '#E6DFD6',
    ink: '#1F1F1F',
    sub: '#5E5B56',
    brand: '#C24A0E',
    bird: '#FE732E',
    ringA: '#FE732E',
    ringAOpacity: 0.16,
    ringB: '#FE732E',
    ringBOpacity: 0.07,
    line: '#E6DFD6',
    copyBg: '#FFFFFF',
    copyBorder: '#E6DFD6',
    copyAccent: '#FE732E',
  },
  dark: {
    bg: '#1C1B1A',
    border: '#2C2C2C',
    ink: '#FFFFFF',
    sub: '#BDB6AE',
    brand: '#FE732E',
    bird: '#FE732E',
    ringA: '#FE732E',
    ringAOpacity: 0.22,
    ringB: '#FFFFFF',
    ringBOpacity: 0.05,
    line: 'rgba(255, 255, 255, 0.12)',
    copyBg: 'rgba(255, 255, 255, 0.08)',
    copyBorder: 'transparent',
    copyAccent: '#FFFFFF',
  },
} as const;

/** Номер группами по 4: «5281 0473 9916 2045». */
export function formatLoyaltyNumber(value: string | number | undefined | null): string {
  const cleaned = String(value ?? '').replace(/\s/g, '');
  if (!cleaned) return '0000 0000 0000 0000';
  return cleaned.match(/.{1,4}/g)?.join(' ') ?? cleaned;
}

/** Инициалы владельца: «Анна Смирнова» → «АС», одно имя → одна буква. */
export function loyaltyInitials(name: string | undefined | null): string {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

const BIRD = [
  'M37.506 13.8006C40.5881 12.2067 44.305 11.8301 47.7147 12.7683C47.9195 12.8221 48.1789 12.9061 48.4246 12.9868C48.585 13.0373 48.7386 13.0877 48.8683 13.1281L49.3291 13.2323L49.5475 13.3063L49.7182 12.664C49.7523 12.5329 49.7933 12.3782 49.8308 12.2168C49.8923 11.968 49.9571 11.7091 50.0186 11.5006C51.0015 8.15817 53.2883 5.2428 56.2987 3.4909C58.7562 1.97101 61.0088 1.36574 63.1864 1.64484L63.4663 0.444394C62.6198 0.165299 61.671 0.0173454 60.6436 0.000532467C58.1316 -0.0230056 55.4727 0.733576 52.5272 2.32408C50.2063 3.59514 48.1379 5.55553 46.5337 8.00685C43.5711 8.06065 40.7894 8.75671 38.4685 10.0345C35.5503 11.662 33.4956 13.4845 32.1918 15.6097C31.6628 16.4772 31.2907 17.3515 31.0859 18.2089L32.2703 18.6057C33.1748 16.6386 34.8847 15.0716 37.506 13.804V13.8006Z',
  'M68.4128 25.5122C63.9689 23.424 58.6068 22.6237 52.0195 23.0609C46.7257 23.4408 41.2954 25.3171 36.2952 28.4914C30.8752 26.0805 25.2196 25.0112 19.9258 25.4079C13.3487 25.9325 8.1676 27.5028 4.08209 30.2164C2.44037 31.316 1.0649 32.5501 0 33.885L0.904467 34.7358C4.2937 31.8607 8.99359 30.3375 14.8847 30.2097C22.0044 29.8634 29.2266 32.3147 34.7252 36.9349C35.0597 37.2106 35.4658 37.5839 35.8515 37.9369C36.0938 38.1589 36.3293 38.3741 36.5341 38.5557L37.0324 38.9962L37.0734 38.9457L37.1314 38.9995L37.5683 38.4783C37.7458 38.2665 37.9472 38.0176 38.1554 37.7587C38.483 37.3552 38.8243 36.9315 39.1144 36.6087C43.8587 31.242 50.6406 27.7651 57.7433 27.0724C63.5695 26.3427 68.4469 27.1666 72.232 29.517L73 28.5419C71.7474 27.3784 70.2047 26.3562 68.4128 25.5055V25.5122Z',
];

const RING_A =
  'M216.266 179.412C175.668 241.172 183.117 326.357 232.904 369.671C282.69 412.985 355.968 398.03 396.566 336.271C437.164 274.511 429.714 189.325 379.928 146.012C330.141 102.698 256.864 117.653 216.266 179.412ZM363.478 307.485C351.137 326.258 333.29 339.032 313.863 342.997C294.435 346.961 275.019 341.792 259.885 328.626C244.751 315.46 235.14 295.375 233.165 272.791C231.19 250.206 237.013 226.972 249.354 208.198C261.694 189.425 279.542 176.651 298.969 172.686C318.396 168.722 337.813 173.891 352.946 187.057C368.08 200.223 377.692 220.308 379.667 242.892C381.642 265.477 375.818 288.711 363.478 307.485Z';
const RING_B =
  'M28.6048 11.6649C-40.4742 46.2758 -73.4926 135.052 -45.1405 209.943C-16.7883 284.834 62.2019 317.491 131.281 282.88C200.36 248.269 233.378 159.493 205.026 84.6015C176.674 9.71036 97.6838 -22.946 28.6048 11.6649ZM112.438 233.108C91.44 243.628 67.8783 244.675 46.9363 236.017C25.9943 227.359 9.38752 209.706 0.769232 186.941C-7.84905 164.176 -7.77287 138.164 0.981014 114.628C9.7349 91.0913 26.4494 71.9581 47.4475 61.4373C68.4457 50.9165 92.0075 49.87 112.949 58.5279C133.891 67.1857 150.498 84.8389 159.116 107.604C167.735 130.369 167.659 156.38 158.905 179.917C150.151 203.454 133.436 222.587 112.438 233.108Z';

type LoyaltyCardProps = {
  number: string | number | undefined | null;
  name: string;
  isDark: boolean;
  isTablet?: boolean;
  onCopy: () => void;
};

const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ number, name, isDark, isTablet, onCopy }) => {
  const c = isDark ? LOYALTY_CARD_COLORS.dark : LOYALTY_CARD_COLORS.light;
  const initials = loyaltyInitials(name);
  return (
    <View
      accessibilityLabel="Карта лояльности"
      style={[styles.card, isTablet && styles.cardTablet, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox="0 0 359 220"
        preserveAspectRatio="xMidYMid slice"
        pointerEvents="none">
        <Path d={RING_A} fill={c.ringA} fillOpacity={c.ringAOpacity} />
        <Path d={RING_B} fill={c.ringB} fillOpacity={c.ringBOpacity} />
      </Svg>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleCol}>
            <AppText
              style={[styles.title, { color: c.ink }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}>
              Карта лояльности
            </AppText>
            <AppText style={[styles.club, { color: c.brand }]}>Totus Club</AppText>
          </View>
          <Svg width={52} height={28} style={styles.bird} viewBox="0 0 73 39" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {BIRD.map((d) => (
              <Path key={d.slice(0, 12)} d={d} fill={c.bird} />
            ))}
          </Svg>
        </View>

        <View style={styles.numberBlock}>
          <View style={styles.numberRow}>
            <AppText
              style={[styles.number, { color: c.ink }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {formatLoyaltyNumber(number)}
            </AppText>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Скопировать номер карты"
              onPress={onCopy}
              activeOpacity={0.7}
              style={[styles.copyButton, { backgroundColor: c.copyBg, borderColor: c.copyBorder }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z"
                  stroke={c.ink}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"
                  stroke={c.copyAccent}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
          <AppText style={[styles.caption, { color: c.sub }]}>Ваш персональный номер</AppText>
        </View>

        <View style={[styles.footer, { borderTopColor: c.line }]}>
          <AppText style={[styles.name, { color: c.ink }]} numberOfLines={1}>
            {name}
          </AppText>
          {initials ? (
            <View style={styles.monogram}>
              <AppText style={styles.monogramText}>{initials}</AppText>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTablet: {
    maxWidth: 520,
  },
  content: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  bird: {
    flexShrink: 0,
  },
  titleCol: {
    flexShrink: 1,
    gap: 4,
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: 0.5,
  },
  club: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  numberBlock: {
    gap: 2,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  number: {
    flexShrink: 1,
    fontSize: 21,
    lineHeight: 26,
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  copyButton: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0,
  },
  monogram: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: 16,
    backgroundColor: '#FE732E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#1F1F1F',
  },
});

export default LoyaltyCard;
