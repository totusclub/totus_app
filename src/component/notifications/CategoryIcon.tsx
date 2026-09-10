import React from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {Circle, Line, Path} from 'react-native-svg';
import {useTheme} from '../../hooks/useTheme';
import type {NotificationIconKind} from '../../modules/push/pushConstants';

export type GlyphKind = NotificationIconKind | 'bell' | 'bellOff' | 'check' | 'gear';

type GlyphProps = {
  kind: GlyphKind;
  size?: number;
  color: string;
  strokeWidth?: number;
};

/**
 * Маленькие контурные SVG-иконки для центра уведомлений (в `src/component/UI/icons` нет
 * колокольчика, рубля, ярлыка и т. п.). Стиль — 24×24, stroke 1.8, скруглённые концы.
 */
export const NotificationGlyph: React.FC<GlyphProps> = ({kind, size = 20, color, strokeWidth = 1.8}) => {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (kind) {
    case 'order':
      // Сумка / заказ
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 8h14l-1 12H6L5 8z" {...common} />
          <Path d="M9 8V6.5a3 3 0 0 1 6 0V8" {...common} />
        </Svg>
      );
    case 'payment':
      // Рубль
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 20V4h5a4 4 0 0 1 0 8H9" {...common} />
          <Line x1="7" y1="16" x2="14" y2="16" {...common} />
          <Line x1="7" y1="12" x2="9" y2="12" {...common} />
        </Svg>
      );
    case 'document':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M7 3h7l5 5v13H7V3z" {...common} />
          <Path d="M14 3v5h5" {...common} />
          <Line x1="10" y1="13" x2="16" y2="13" {...common} />
          <Line x1="10" y1="17" x2="14" y2="17" {...common} />
        </Svg>
      );
    case 'chat':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V6z" {...common} />
          <Line x1="8" y1="9" x2="16" y2="9" {...common} />
          <Line x1="8" y1="13" x2="13" y2="13" {...common} />
        </Svg>
      );
    case 'plane':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            {...common}
          />
        </Svg>
      );
    case 'tag':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 12V4h8l10 10-8 8L3 12z" {...common} />
          <Circle cx="7.5" cy="8.5" r="1.3" fill={color} stroke="none" />
        </Svg>
      );
    case 'bell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" {...common} />
          <Path d="M10 20a2 2 0 0 0 4 0" {...common} />
          <Line x1="12" y1="3" x2="12" y2="5" {...common} />
        </Svg>
      );
    case 'bellOff':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M8.5 6.5A6 6 0 0 1 18 11v5l1.5 2H9" {...common} />
          <Path d="M6 11v5l-1.5 2H6" {...common} />
          <Path d="M10 20a2 2 0 0 0 4 0" {...common} />
          <Line x1="4" y1="4" x2="20" y2="20" {...common} />
        </Svg>
      );
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 12.5l4.5 4.5L19 7.5" {...common} strokeWidth={strokeWidth + 0.4} />
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
    case 'info':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" {...common} />
          <Line x1="12" y1="11" x2="12" y2="16" {...common} />
          <Circle cx="12" cy="8" r="1" fill={color} stroke="none" />
        </Svg>
      );
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
