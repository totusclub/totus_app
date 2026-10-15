import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import AppIcon from '../icons';
import AppText from '../text';
import { useTheme } from '../../../hooks/useTheme';

type AppButtonProps = {
  title?: string;
  onPress?: () => void;
  type?: 'outline' | 'warning' | 'small' | 'transparent';
  size?: 'sm' | 'medium' | 'large';
  disabled?: boolean;
  icon?: string;
  isProcessing?: boolean;
  style?: StyleProp<ViewStyle>;
};

const AppButton = ({
  title,
  onPress,
  type,
  size = 'medium',
  disabled = false,
  icon,
  isProcessing,
  style,
}: AppButtonProps) => {
  const { theme } = useTheme();
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          paddingVertical: 11,
          fontSize: 14,
        };
      case 'large':
        return {
          paddingVertical: 18,
          fontSize: 16,
        };
      default: // medium
        return {
          paddingVertical: 14,
          fontSize: 16,
        };
    }
  }, [size]);

  const buttonStyle = useMemo(() => {
    const baseStyle = {
      backgroundColor: type === 'transparent' ? 'transparent' : theme.brand,
      borderRadius: 9999, // Fully rounded (circular)
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: 8,
      paddingVertical: sizeStyles.paddingVertical,
      paddingHorizontal: sizeStyles.paddingVertical * 2,
    };

    switch (type) {
      case 'outline':
        return {
          button: {
            ...baseStyle,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: theme.text,
          },
          text: { ...styles.buttonText, fontSize: sizeStyles.fontSize, color: theme.text },
        };
      case 'warning':
        return {
          button: {
            ...baseStyle,
            borderWidth: 1,
            borderColor: theme.warning,
            backgroundColor: theme.backgroundTertiary,
          },
          text: { ...styles.buttonText, fontSize: sizeStyles.fontSize, color: theme.warning },
        };
      case 'transparent':
        return {
          button: baseStyle,
          text: { ...styles.buttonText, fontSize: sizeStyles.fontSize, color: theme.text },
        };
      case 'small':
        return {
          button: {
            width: 46,
            height: 46,
            borderRadius: 12,
            backgroundColor: theme.overlayLight,
            borderWidth: 1,
            borderColor: theme.border,
            justifyContent: 'center' as const,
            alignItems: 'center' as const,
          },
          text: undefined,
        };
      default:
        return {
          button: baseStyle,
          text: { ...styles.buttonText, fontSize: sizeStyles.fontSize, color: theme.textInverse },
        };
    }
  }, [type, sizeStyles, theme]);

  const handlePress = useCallback(() => {
    if (!disabled && !isProcessing) {
      onPress?.();
    }
  }, [disabled, isProcessing, onPress]);

  const iconSize = size === 'sm' ? 16 : size === 'large' ? 20 : 18;
  const iconColor = useMemo(() => {
    if (disabled) return theme.textDisabled;
    if (type === 'outline') return theme.text;
    if (type === 'warning') return theme.warning;
    if (type === 'transparent') return theme.text;
    return theme.textInverse;
  }, [type, theme, disabled]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[
        buttonStyle.button,
        disabled && { ...styles.disabled, backgroundColor: theme.backgroundTertiary },
        type === 'small' && { width: 46, height: 46 },
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || isProcessing}>
      {isProcessing ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && type !== 'small' && (
            <AppIcon
              name={icon}
              size={iconSize}
              color={iconColor}
              accent={type === 'outline' || type === 'transparent'}
            />
          )}
          {type === 'small' && icon && (
            <AppIcon name={icon} size={24} color={disabled ? theme.textDisabled : theme.textInverse} accent={false} />
          )}
          {title && buttonStyle.text && (
            <AppText
              style={[
                buttonStyle.text,
                disabled && { color: theme.textDisabled },
              ]}>
              {title}
            </AppText>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default AppButton;

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
