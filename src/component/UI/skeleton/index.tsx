import React from 'react';
import { View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTheme } from '../../../hooks/useTheme';

type SkeletonGroupProps = {
  children: React.ReactNode;
};

/** Shimmer wrapper with app theme colors — use around a mirrored component tree. */
export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({ children }) => {
  const { theme } = useTheme();
  return (
    <SkeletonPlaceholder
      backgroundColor={theme.backgroundTertiary}
      highlightColor={theme.backgroundSecondary}>
      <View>{children}</View>
    </SkeletonPlaceholder>
  );
};

type SkeletonBoxProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Single shimmer shape standing in for one piece of real content. */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height = 16,
  radius = 4,
  style,
}) => <View style={[{ width, height, borderRadius: radius }, style]} />;

export default SkeletonGroup;
