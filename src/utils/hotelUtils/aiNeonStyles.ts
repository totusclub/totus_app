import { Platform, ViewStyle, TextStyle } from 'react-native';

export const AI_NEON_COLORS = {
  primary: '#FE732E',
  secondary: '#FFB07A',
  hot: '#FF4FA3',
  glow: '#FF8A3D',
  ring: '#FFD4B8',
  text: '#FFFFFF',
  labelBg: 'rgba(254, 115, 46, 0.94)',
  surface: 'rgba(254, 115, 46, 0.12)',
  surfaceSoft: 'rgba(255, 175, 135, 0.14)',
  border: '#FF9A5C',
};

const neonShadow = (
  color: string,
  radius: number,
  opacity: number,
): Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'> => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: Platform.OS === 'android' ? Math.round(radius / 2) : 0,
});

export function getAiNeonCardStyles(isDark: boolean): {
  wrapper: ViewStyle;
  card: ViewStyle;
  label: ViewStyle;
  labelText: TextStyle;
} {
  return {
    wrapper: {
      borderRadius: 26,
      padding: 2,
      marginBottom: 4,
      backgroundColor: AI_NEON_COLORS.border,
      ...neonShadow(AI_NEON_COLORS.glow, isDark ? 18 : 14, isDark ? 0.95 : 0.72),
    },
    card: {
      borderWidth: 1.5,
      borderColor: AI_NEON_COLORS.primary,
      backgroundColor: isDark ? 'rgba(254, 115, 46, 0.1)' : 'rgba(254, 115, 46, 0.06)',
    },
    label: {
      position: 'absolute',
      top: 12,
      left: 12,
      zIndex: 3,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: AI_NEON_COLORS.ring,
      backgroundColor: AI_NEON_COLORS.labelBg,
      ...neonShadow(AI_NEON_COLORS.hot, 10, 0.75),
    },
    labelText: {
      color: AI_NEON_COLORS.text,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
  };
}

export function getAiNeonOfferStyles(isDark: boolean): {
  section: ViewStyle;
  sectionTitle: TextStyle;
  offer: ViewStyle;
  offerPrice: TextStyle;
  offerBadge: ViewStyle;
  offerBadgeText: TextStyle;
} {
  return {
    section: {
      borderWidth: 1.5,
      borderColor: AI_NEON_COLORS.primary,
      borderRadius: 18,
      padding: 10,
      backgroundColor: isDark ? 'rgba(254, 115, 46, 0.12)' : AI_NEON_COLORS.surfaceSoft,
      ...neonShadow(AI_NEON_COLORS.glow, 12, isDark ? 0.8 : 0.6),
    },
    sectionTitle: {
      color: AI_NEON_COLORS.primary,
      fontWeight: '700',
    },
    offer: {
      borderWidth: 1.5,
      borderColor: AI_NEON_COLORS.secondary,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255, 138, 61, 0.14)' : 'rgba(254, 115, 46, 0.1)',
      ...neonShadow(AI_NEON_COLORS.hot, 8, 0.55),
    },
    offerPrice: {
      color: AI_NEON_COLORS.primary,
      fontWeight: '700',
    },
    offerBadge: {
      alignSelf: 'flex-start',
      marginBottom: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: AI_NEON_COLORS.ring,
      backgroundColor: AI_NEON_COLORS.labelBg,
    },
    offerBadgeText: {
      color: AI_NEON_COLORS.text,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
  };
}

export function getAiNeonIconStyles(isDark: boolean): ViewStyle {
  return {
    ...neonShadow(AI_NEON_COLORS.glow, isDark ? 14 : 10, 0.9),
    borderWidth: 1.5,
    borderColor: AI_NEON_COLORS.ring,
  };
}
