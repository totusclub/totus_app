import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { AI_NEON_COLORS, getAiNeonIconStyles } from '../../../utils/hotelUtils/aiNeonStyles';

type AiPickIconProps = {
  size?: number;
  style?: ViewStyle;
  neon?: boolean;
};

const ICON_SCALE = 0.55;

const AiPickIcon: React.FC<AiPickIconProps> = ({ size = 36, style, neon = false }) => {
  const { theme, isDark } = useTheme();
  const iconSize = Math.round(size * ICON_SCALE);
  const neonStyles = neon ? getAiNeonIconStyles(isDark) : null;

  return (
    <View style={neon ? styles.neonRingOuter : undefined}>
      {neon ? <View style={[styles.neonRingInner, { shadowColor: AI_NEON_COLORS.hot }]} /> : null}
      <View
        style={[
          styles.badge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: neon ? AI_NEON_COLORS.labelBg : theme.brand,
          },
          neonStyles,
          style,
        ]}
      >
        <Image
          source={require('../../../assets/images/ai-icon.png')}
          style={{ width: iconSize, height: iconSize }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  neonRingOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonRingInner: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 79, 163, 0.18)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 8,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AiPickIcon;
