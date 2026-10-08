import {useCallback, useEffect, useRef, useState} from 'react';
import {useIsFocused} from '@react-navigation/native';
import {
  AppState,
  Dimensions,
  Keyboard,
  NativeModules,
  Platform,
  View,
  type KeyboardEvent,
} from 'react-native';

/** Опрос положения клавиатуры, пока экран открыт (Android): ловит конец анимации, смену высоты. */
const POLL_INTERVAL_MS = 250;

type KeyboardFrame = {screenY: number; height: number};

/** Ответ NativeModules.TotusKeyboard.getInsets() — WindowInsets окна, в dp. */
export type NativeKeyboardInsets = {
  imeVisible: boolean;
  imeBottom: number;
  navBottom: number;
  windowHeight: number;
};

type TotusKeyboardNative = {
  getInsets: () => Promise<NativeKeyboardInsets | null>;
  /** Android 15+: экран уменьшается на высоту клавиатуры нативно (как adjustResize); true — включено. */
  setImeResize?: (enabled: boolean) => Promise<boolean>;
};

const nativeKeyboard: TotusKeyboardNative | undefined =
  Platform.OS === 'android' ? NativeModules.TotusKeyboard : undefined;

/**
 * Основной расчёт (Android, по WindowInsets): верх клавиатуры в координатах окна =
 * высота окна − нижний отступ IME. Поднимаем ровно на перекрытие контейнера.
 * Если окно уже уменьшилось (старый Android, adjustResize) — перекрытия нет, 0.
 */
export function computeInsetFromNative(
  containerY: number,
  containerHeight: number,
  native: NativeKeyboardInsets,
): number {
  if (!native.imeVisible || native.imeBottom <= 0 || containerHeight <= 0) {
    return 0;
  }
  const keyboardTop = native.windowHeight - native.imeBottom;
  const inset = Math.round(containerY + containerHeight - keyboardTop);
  return inset > 0 && inset < containerHeight ? inset : 0;
}

/**
 * Запасной расчёт (сборка без нативного модуля) — по событию keyboardDidShow:
 * бóльшая из оценок «низ контейнера − screenY» и «height + нижняя панель − свободное место под контейнером».
 */
export function computeKeyboardInset(
  containerY: number,
  containerHeight: number,
  screenHeight: number,
  keyboard: KeyboardFrame,
  navBottomInset: number,
): number {
  if (!keyboard.height || containerHeight <= 0) {
    return 0;
  }
  const containerBottom = containerY + containerHeight;
  const byScreenY = containerBottom - keyboard.screenY;
  const freeBelow = Math.max(0, screenHeight - containerBottom);
  const byHeight = keyboard.height + Math.max(0, navBottomInset) - freeBelow;
  const inset = Math.round(Math.max(byScreenY, byHeight));
  return inset > 0 && inset < containerHeight ? inset : 0;
}

/**
 * Android: на сколько поднять экран над клавиатурой. На iOS всегда 0 и без подписок/опроса —
 * там KeyboardAvoidingView (behavior="padding") работает как раньше.
 *
 * При targetSdk 35+ Android включает edge-to-edge, и adjustResize больше не уменьшает окно.
 * Основной путь (Android 15+): пока экран открыт, NativeModules.TotusKeyboard.setImeResize(true) —
 * Android сам уменьшает экран на высоту клавиатуры, как adjustResize раньше; JS ничего не считает,
 * отступ 0. При уходе с экрана — setImeResize(false).
 * Запасной путь (старый Android или сборка без setImeResize): расчёт по WindowInsets / событиям,
 * опрос каждые 250 мс, пока экран открыт.
 *
 * containerRef — внешний контейнер экрана, размер которого НЕ зависит от отступа (по нему меряем).
 */
export function useAndroidKeyboardInset(navBottomInset: number) {
  const containerRef = useRef<View>(null);
  const keyboardRef = useRef<KeyboardFrame | null>(null);
  const navInsetRef = useRef(navBottomInset);
  navInsetRef.current = navBottomInset;
  const [inset, setInset] = useState(0);
  const isAndroid = Platform.OS === 'android';
  // Чат может остаться под другим экраном (детали заказа) — режим только пока чат на экране
  const isFocused = useIsFocused();

  const recompute = useCallback(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    node.measureInWindow((_x, y, _width, height) => {
      if (nativeKeyboard?.getInsets) {
        nativeKeyboard
          .getInsets()
          .then(native => {
            if (native) {
              const next = computeInsetFromNative(y, height, native);
              setInset(prev => (prev === next ? prev : next));
            } else {
              applyFallback(y, height);
            }
          })
          .catch(() => applyFallback(y, height));
      } else {
        applyFallback(y, height);
      }
    });

    function applyFallback(y: number, height: number) {
      const keyboard = keyboardRef.current;
      const next = keyboard
        ? computeKeyboardInset(y, height, Dimensions.get('screen').height, keyboard, navInsetRef.current)
        : 0;
      setInset(prev => (prev === next ? prev : next));
    }
  }, []);

  // Запасной путь: события клавиатуры + опрос (только пока приложение на экране)
  const fallbackActiveRef = useRef(false);
  const startFallback = useCallback(() => {
    fallbackActiveRef.current = true;
    const onShow = (event: KeyboardEvent) => {
      keyboardRef.current = {
        screenY: event.endCoordinates.screenY,
        height: event.endCoordinates.height,
      };
      recompute();
    };
    const onHide = () => {
      keyboardRef.current = null;
      recompute();
    };
    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    let timer: ReturnType<typeof setInterval> | null = setInterval(recompute, POLL_INTERVAL_MS);
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (!timer) {
          timer = setInterval(recompute, POLL_INTERVAL_MS);
        }
        recompute();
      } else if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    return () => {
      fallbackActiveRef.current = false;
      if (timer) {
        clearInterval(timer);
      }
      keyboardRef.current = null;
      showSub.remove();
      hideSub.remove();
      appStateSub.remove();
    };
  }, [recompute]);

  useEffect(() => {
    if (!isAndroid || !isFocused) {
      return undefined;
    }
    let cancelled = false;
    let stopFallback: (() => void) | null = null;
    const setImeResize = nativeKeyboard?.setImeResize;

    if (setImeResize) {
      setImeResize(true)
        .then(enabled => {
          if (cancelled) {
            if (enabled) {
              setImeResize(false).catch(() => undefined);
            }
            return;
          }
          if (enabled) {
            setInset(0); // экран уменьшает сам Android
          } else {
            stopFallback = startFallback();
          }
        })
        .catch(() => {
          if (!cancelled) {
            stopFallback = startFallback();
          }
        });
    } else {
      stopFallback = startFallback();
    }

    return () => {
      cancelled = true;
      stopFallback?.();
      setInset(0);
      setImeResize?.(false).catch(() => undefined);
    };
  }, [isAndroid, isFocused, startFallback]);

  const onContainerLayout = useCallback(() => {
    if (fallbackActiveRef.current) {
      recompute();
    }
  }, [recompute]);

  return {containerRef, onContainerLayout, inset};
}
