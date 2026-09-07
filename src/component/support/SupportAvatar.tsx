import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppIcon} from '../UI';
import {useTheme} from '../../hooks/useTheme';

type Props = {
  size?: number;
  /** Зелёная точка «онлайн» (макет «Support chat»). */
  online?: boolean;
};

/** Аватар поддержки: брендовый круг с белой птицей Totus. */
const SupportAvatar: React.FC<Props> = ({size = 40, online = false}) => {
  const {theme} = useTheme();
  const dot = Math.max(10, Math.round(size * 0.28));
  return (
    <View style={{width: size, height: size}}>
      <View
        style={[
          styles.circle,
          {width: size, height: size, borderRadius: size / 2, backgroundColor: theme.brand},
        ]}>
        <AppIcon name="bird" size={Math.round(size * 0.55)} color="#FFFFFF" />
      </View>
      {online ? (
        <View
          style={[
            styles.dot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: theme.success,
              borderColor: theme.background,
            },
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    borderWidth: 2,
  },
});

export default SupportAvatar;
