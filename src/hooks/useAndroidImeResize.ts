import {useEffect} from 'react';
import {NativeModules, Platform} from 'react-native';
import {useIsFocused} from '@react-navigation/native';

type TotusKeyboardNative = {
  /** Android 15+: экран уменьшается на высоту клавиатуры нативно (как adjustResize); true — включено. */
  setImeResize?: (enabled: boolean) => Promise<boolean>;
};

const nativeKeyboard: TotusKeyboardNative | undefined =
  Platform.OS === 'android' ? NativeModules.TotusKeyboard : undefined;

/**
 * Android: пока экран в фокусе, Android сам уменьшает экран на высоту клавиатуры — поле ввода
 * внизу всегда над клавиатурой. Тот же режим, что в «Чате с поддержкой» (TotusKeyboardModule.setImeResize).
 *
 * Зачем: при targetSdk 35+ (edge-to-edge) windowSoftInputMode adjustResize на Android 15+ больше
 * не уменьшает окно. На Android ≤ 14 метод ничего не делает — там adjustResize работает сам.
 * На iOS хук ничего не делает (KeyboardAvoidingView работает как раньше).
 * При уходе с экрана (другая вкладка, экран поверх, размонтирование) режим выключается.
 */
export function useAndroidImeResize(): void {
  const isFocused = useIsFocused();

  useEffect(() => {
    const setImeResize = nativeKeyboard?.setImeResize;
    if (Platform.OS !== 'android' || !isFocused || !setImeResize) {
      return undefined;
    }
    let cancelled = false;
    setImeResize(true)
      .then(enabled => {
        if (cancelled && enabled) {
          setImeResize(false).catch(() => undefined);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      setImeResize(false).catch(() => undefined);
    };
  }, [isFocused]);
}
