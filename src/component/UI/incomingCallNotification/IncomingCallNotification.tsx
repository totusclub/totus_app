import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import {callerNameForDisplay} from '../../../modules/voip/callText';

type IncomingCallNotificationProps = {
  visible: boolean;
  callerName: string;
  onAnswer: () => void;
  onDismiss: () => void;
};

export const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  visible,
  callerName,
  onAnswer,
  onDismiss,
}) => {
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    if (visible) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{translateY: slideAnim}],
        },
      ]}>
      <View style={styles.content}>
        <View style={styles.infoContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📞</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Входящий звонок</Text>
            <Text style={styles.callerName} numberOfLines={1}>
              {callerNameForDisplay(callerName) || 'Неизвестный'}
            </Text>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.answerButton]}
            onPress={onAnswer}
            activeOpacity={0.7}>
            <Text style={styles.buttonText}>Ответить</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.dismissButton]}
            onPress={onDismiss}
            activeOpacity={0.7}>
            <Text style={styles.dismissButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '500',
    marginBottom: 2,
  },
  callerName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerButton: {
    backgroundColor: '#34C759',
  },
  dismissButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 0,
    minWidth: 36,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

