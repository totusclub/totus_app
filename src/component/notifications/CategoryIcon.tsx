import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {Circle, Line, Path} from 'react-native-svg';
import {useTheme} from '../../hooks/useTheme';
import type {NotificationIconKind} from '../../modules/push/pushConstants';
import TotusIcon from '../UI/icons/totus/TotusIcon';
import {
  iconBell,
  iconChat,
  iconCheck,
  iconDocVoucher,
  iconInfo,
  iconNOrder,
  iconNPayment,
  iconNPromo,
  iconNReminder,
  type TotusIconDef,
} from '../UI/icons/totus/icons.generated';

export type GlyphKind = NotificationIconKind | 'bell' | 'bellOff' | 'check' | 'gear';

type GlyphProps = {
  kind: GlyphKind;
  size?: number;
  color: string;
  strokeWidth?: number;
};

/**
 * Маленькие контурные SVG-иконки для центра уведомлений. Стиль — 24×24, скруглённые концы.
 */
/**
 * Глифы из набора Totus (стиль C) — одним цветом категории, без оранжевой детали.
 * Пока без пары в наборе: bellOff и gear — рисуются как раньше (ниже).
 */
const TOTUS_GLYPH: Partial<Record<GlyphKind, TotusIconDef>> = {
  order: iconNOrder,
  payment: iconNPayment,
  document: iconDocVoucher,
  chat: iconChat,
  plane: iconNReminder,
  tag: iconNPromo,
  bell: iconBell,
  info: iconInfo,
  check: iconCheck,
};

export const NotificationGlyph: React.FC<GlyphProps> = ({kind, size = 20, color, strokeWidth = 1.8}) => {
  const totus = TOTUS_GLYPH[kind as GlyphKind];
  if (totus) {
    return <TotusIcon icon={totus} size={size} color={color} accent={false} />;
  }
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (kind) {
    case 'bellOff':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M8.5 6.5A6 6 0 0 1 18 11v5l1.5 2H9" {...common} />
          <Path d="M6 11v5l-1.5 2H6" {...common} />
          <Path d="M10 20a2 2 0 0 0 4 0" {...common} />
          <Line x1="4" y1="4" x2="20" y2="20" {...common} />
        </Svg>
      );
    case 'gear':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="3" {...common} />
          <Path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
            {...common}
            strokeWidth={1.5}
          />
        </Svg>
      );
    default:
      return <TotusIcon icon={iconInfo} size={size} color={color} accent={false} />;
  }
};

type CategoryIconProps = {
  kind: GlyphKind;
  color: string;
  /** Диаметр круга (макет: 40–44). */
  size?: number;
  iconSize?: number;
  style?: ViewStyle;
};

/** Цветной круг 40–44 с подложкой 12 % (Dark — 20 %) и иконкой внутри (DESIGN.md «Общее»). */
const CategoryIcon: React.FC<CategoryIconProps> = ({kind, color, size = 42, iconSize, style}) => {
  const {isDark} = useTheme();
  const background = withAlpha(color, isDark ? 0.2 : 0.12);
  return (
    <View
      style={[
        styles.circle,
        {width: size, height: size, borderRadius: size / 2, backgroundColor: background},
        style,
      ]}>
      <NotificationGlyph kind={kind} size={iconSize ?? Math.round(size * 0.5)} color={color} />
    </View>
  );
};

/** '#RRGGBB' → 'rgba(r,g,b,a)'. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryIcon;
