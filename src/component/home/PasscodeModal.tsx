import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import Modal from 'react-native-modal';
import { AppText, AppButton } from '../UI';
import { useTheme } from '../../hooks/useTheme';

type PasscodeModalProps = {
  visible: boolean;
  onVerified: () => void;
};

const CORRECT_PASSCODE = '2103';

const PasscodeModal: React.FC<PasscodeModalProps> = ({ visible, onVerified }) => {
  const { theme } = useTheme();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPasscode('');
      setError(null);
    }
  }, [visible]);

  const handleVerify = () => {
    if (passcode === CORRECT_PASSCODE) {
      setError(null);
      onVerified();
    } else {
      setError('Неверный пароль. Попробуйте снова.');
      setPasscode('');
    }
  };

  const handlePasscodeChange = (text: string) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');
    setPasscode(numericText);
    setError(null);

    // Auto-verify when 4 digits are entered
    if (numericText.length === 4) {
      if (numericText === CORRECT_PASSCODE) {
        setError(null);
        onVerified();
      } else {
        setError('Неверный пароль. Попробуйте снова.');
        setPasscode('');
      }
    }
  };

  return (
    <Modal
      isVisible={visible}
      style={styles.modal}
      backdropOpacity={0.8}
      animationIn="fadeIn"
      animationOut="fadeOut"
      backdropColor={theme.overlay}
      avoidKeyboard={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}>
        <View style={[styles.content, { backgroundColor: theme.cardBackground }]}>
          <AppText style={[styles.title, { color: theme.text }]}>Введите пароль</AppText>
          <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
            Для доступа к приложению
          </AppText>

          <View style={styles.inputContainer}>
            <TextInput
                allowFontScaling={false}
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: error ? theme.error : theme.inputBorder,
                  color: theme.inputText,
                },
              ]}
              value={passcode}
              onChangeText={handlePasscodeChange}
              placeholder="1234"
              placeholderTextColor={theme.inputPlaceholder}
              keyboardType="numeric"
              secureTextEntry={true}
              maxLength={4}
              autoFocus={true}
            />
            {error && (
              <AppText style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    paddingHorizontal: 20,
  },
  content: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 8,
    textAlign: 'center',

  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default PasscodeModal;

