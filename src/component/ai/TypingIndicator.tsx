import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

type TypingIndicatorProps = {
  color?: string;
};

const Dot = ({
  color,
  delay,
}: {
  color: string;
  delay: number;
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [delay, opacity]);

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color, opacity }]}
    />
  );
};

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  color = '#999999',
}) => (
  <View style={styles.row} accessibilityLabel="AI is typing">
    <Dot color={color} delay={0} />
    <Dot color={color} delay={160} />
    <Dot color={color} delay={320} />
  </View>
);

export default TypingIndicator;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
});
