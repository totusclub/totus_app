import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { TotusIconDef } from './icons.generated';

/**
 * Иконка Totus (стиль C): линия 1,5, скруглённые концы, одна оранжевая деталь.
 * Тот же набор, что на сайте (totus_WEB, src/components/icons/totus) — данные из scripts/icons/totus-icons.json.
 *
 *   import TotusIcon from '../UI/icons/totus/TotusIcon';
 *   import { iconSearch } from '../UI/icons/totus/icons.generated';
 *   <TotusIcon icon={iconSearch} size={20} color={theme.text} />
 */
export interface TotusIconProps {
  icon: TotusIconDef;
  size?: number;
  /** Цвет линии — обычно цвет текста темы. */
  color?: string;
  /** Цвет оранжевой детали. По умолчанию фирменный #FE732E. */
  accentColor?: string;
  /** false — иконка одним цветом, без оранжевой детали (на оранжевом или цветном фоне). */
  accent?: boolean;
  /** true — залить контуры их же цветом (звёзды отеля). */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const TOTUS_ICON_ACCENT = '#FE732E';

const TotusIcon = ({
  icon,
  size = 24,
  color = '#1F1F1F',
  accentColor = TOTUS_ICON_ACCENT,
  accent = true,
  filled = false,
  style,
}: TotusIconProps) => {
  const acc = accent ? accentColor : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {icon.p.map((d, i) => {
        const c = icon.f || icon.a.includes(i) ? acc : color;
        return (
          <Path
            key={i}
            d={d}
            stroke={c}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={icon.f || filled ? c : 'none'}
          />
        );
      })}
    </Svg>
  );
};

export default TotusIcon;
