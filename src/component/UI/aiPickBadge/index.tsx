import React from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../text';
import { useTheme } from '../../../hooks/useTheme';

type AiPickBadgeProps = {
  variant?: 'overlay' | 'inline';
  style?: ViewStyle;
};

const GRADIENT_COLORS = ['#FF9A56', '#FE732E', '#F2552C'];
const GRADIENT_LOCATIONS = [0, 0.55, 1];

const AiPickBadge: React.FC<AiPickBadgeProps> = ({ variant = 'overlay', style }) => {
  const { isDark } = useTheme();
  const isOverlay = variant === 'overlay';

  return (
    <View
      style={[
        styles.shadowWrap,
        isOverlay ? styles.overlay : styles.inline,
        isDark && styles.shadowWrapDark,
        style,
      ]}
    >
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.gradient}
      >
        <View style={styles.innerBorder}>
          <View style={styles.content}>
            <View style={styles.aiMark}>
              <AppText style={styles.aiMarkText}>AI</AppText>
            </View>
            <AppText style={styles.label}>Подбор</AppText>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 999,
    shadowColor: '#FE732E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  shadowWrapDark: {
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  overlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 3,
  },
  inline: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  gradient: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  innerBorder: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.42)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 6 : 5,
  },
  aiMark: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  aiMarkText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    lineHeight: 12,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
});

export default AiPickBadge;
