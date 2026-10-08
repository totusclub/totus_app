import {useCallback, useEffect, useRef, useState} from 'react';
import {Dimensions, Keyboard, Platform, View, type KeyboardEvent} from 'react-native';

/** Повторный замер после открытия клавиатуры: на старых Android окно уменьшается не сразу. */
const REMEASURE_DELAYS_MS = [0, 120, 300, 600];

type KeyboardFrame = {screenY: number; height: number};

/**
 * Сколько нужно поднять экран снизу, чтобы контейнер не перекрывался клавиатурой (dp).
 *
 *  - byScreenY: низ контейнера минус верх клавиатуры из события;
 *  - byHeight: высота клавиатуры + нижняя системная панель (navBottomInset) минус то, что уже
 *    свободно под контейнером (окно уменьшилось или контейнер не доходит до низа экрана).
 *
 * React Native 0.79 на Android присылает height = IME − системные панели, а screenY берёт из
 * getWindowVisibleDisplayFrame — при edge-to-edge (targetSdk 35+) верх клавиатуры по нему
 * оказывается ниже настоящего примерно на высоту панели навигации, и поле остаётся под
 * клавиатурой. Поэтому берём бóльшую из двух оценок.
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
 * Android: на сколько поднять экран над клавиатурой. На iOS всегда 0 и без подписок —
 * там KeyboardAvoidingView (behavior="padding") работает как раньше.
 *
 * Почему нужно: при targetSdk 35+ Android включает edge-to-edge, и windowSoftInputMode
 * adjustResize больше не уменьшает окно — поле ввода внизу оказывается под клавиатурой.
 * На старых Android adjustResize ещё работает: контейнер сам становится ниже, свободное место
 * под ним учитывается, и двойного подъёма нет.
 *
 * containerRef — внешний контейнер экрана, размер которого НЕ зависит от отступа (по нему меряем).
 * onContainerLayout — повесить на него же: пересчёт, если окно изменилось при открытой клавиатуре.
 */
export function useAndroidKeyboardInset(navBottomInset: number) {
  const containerRef = useRef<View>(null);
  const keyboardRef = useRef<KeyboardFrame | null>(null);
  const navInsetRef = useRef(navBottomInset);
  navInsetRef.current = navBottomInset;
  const [inset, setInset] = useState(0);
  const isAndroid = Platform.OS === 'android';

  const recompute = useCallback(() => {
    const keyboard = keyboardRef.current;
    const node = containerRef.current;
    if (!keyboard || !node) {
      return;
    }
    node.measureInWindow((_x, y, _width, height) => {
      if (keyboardRef.current !== keyboard) {
        return; // клавиатура уже закрылась или сменилась
      }
      setInset(
        computeKeyboardInset(y, height, Dimensions.get('screen').height, keyboard, navInsetRef.current),
      );
    });
  }, []);

  useEffect(() => {
    if (!isAndroid) {
      return undefined;
    }
    let timers: ReturnType<typeof setTimeout>[] = [];
    const clearTimers = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    const onShow = (event: KeyboardEvent) => {
      keyboardRef.current = {
        screenY: event.endCoordinates.screenY,
        height: event.endCoordinates.height,
      };
      clearTimers();
      timers = REMEASURE_DELAYS_MS.map(delay => setTimeout(recompute, delay));
    };
    const onHide = () => {
      keyboardRef.current = null;
      clearTimers();
      setInset(0);
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      clearTimers();
      keyboardRef.current = null;
      showSub.remove();
      hideSub.remove();
    };
  }, [isAndroid, recompute]);

  const onContainerLayout = useCallback(() => {
    if (keyboardRef.current) {
      recompute();
    }
  }, [recompute]);

  return {containerRef, onContainerLayout, inset};
}
