import React, {useCallback, useState} from 'react';
import {Platform, StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import {AppIcon, AppText} from '../UI';
import {useTheme} from '../../hooks/useTheme';
import {SUPPORT_MESSAGE_MAX_LENGTH} from '../../modules/api/supportChat';

type Props = {
  onSend: (text: string) => void | Promise<void>;
  onTyping?: (text: string) => void;
  disabled?: boolean;
  /** Ошибка отправки (русский текст) — показывается над полем. */
  errorText?: string | null;
  onDismissError?: () => void;
  bottomInset?: number;
  /** Слот над полем (чипы быстрых тем). */
  above?: React.ReactNode;
};

/** Поле «Напишите сообщение…» + круглая брендовая кнопка отправки. */
const SupportComposer: React.FC<Props> = ({
  onSend,
  onTyping,
  disabled = false,
  errorText,
  onDismissError,
  bottomInset = 0,
  above,
}) => {
  const {theme} = useTheme();
  const [text, setText] = useState('');
  const canSend = !disabled && text.trim().length > 0;

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      onTyping?.(value);
    },
    [onTyping],
  );

  const handleSend = useCallback(() => {
    const body = text.trim();
    if (!body || disabled) return;
    setText('');
    onTyping?.('');
    onSend(body);
  }, [disabled, onSend, onTyping, text]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: Math.max(bottomInset, 8),
        },
      ]}>
      {errorText ? (
        <TouchableOpacity onPress={onDismissError} activeOpacity={0.8} style={styles.errorRow}>
          <AppIcon name="warning" size={14} color={theme.error} />
          <AppText style={[styles.errorText, {color: theme.error}]} numberOfLines={2}>
            {errorText}
          </AppText>
        </TouchableOpacity>
      ) : null}

      {above ? <View style={styles.above}>{above}</View> : null}

      <View style={styles.row}>
        <View
          style={[
            styles.inputWrap,
            {backgroundColor: theme.inputBackground, borderColor: theme.inputBorder},
          ]}>
          <TextInput
            allowFontScaling={false}
            style={[styles.input, {color: theme.inputText}]}
            value={text}
            onChangeText={handleChange}
            placeholder="Напишите сообщение…"
            placeholderTextColor={theme.inputPlaceholder}
            multiline
            maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
            editable={!disabled}
            returnKeyType="default"
            textAlignVertical="center"
            accessibilityLabel="Сообщение в поддержку"
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
          style={[styles.sendButton, {opacity: canSend ? 1 : 0.45}]}
          accessibilityRole="button"
          accessibilityLabel="Отправить">
          <AppIcon name="sendButton" size={40} color={theme.brand} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    gap: 8,
  },
  above: {
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    fontFamily: 'Golos Text',
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 118,
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
  },
});

export default SupportComposer;
