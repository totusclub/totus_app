import {useEffect, useRef, useState} from 'react';
import {Keyboard, Platform, View, type KeyboardEvent} from 'react-native';

/**
 * Android: на сколько клавиатура перекрывает экран снизу (dp). На iOS всегда 0 — там
 * KeyboardAvoidingView (behavior="padding") работает как раньше.
 *
 * Почему нужно: при targetSdk 35+ Android включает edge-to-edge, и windowSoftInputMode
 * adjustResize больше не уменьшает окно — поле ввода внизу оказывается под клавиатурой.
 * На старых Android adjustResize ещё работает, поэтому отступ не берётся «на веру» из высоты
 * клавиатуры, а считается по факту: низ экрана-контейнера (measureInWindow) минус верх клавиатуры.
 * Если окно уже уменьшилось, перекрытия нет — отступ 0 (без двойного подъёма).
 */
export function useAndroidKeyboardInset() {
  const containerRef = useRef<View>(null);
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    let active = true;

    const onShow = (event: KeyboardEvent) => {
      const keyboardTop = event.endCoordinates.screenY;
      const node = containerRef.current;
      if (!node || !event.endCoordinates.height) {
        return;
      }
      node.measureInWindow((_x, y, _width, height) => {
        if (!active) {
          return;
        }
        // Не ограничиваем высотой клавиатуры: на Android она не включает панель навигации,
        // а при edge-to-edge контейнер доходит до низа экрана — нужен подъём на всё перекрытие.
        const overlap = Math.round(y + height - keyboardTop);
        setInset(overlap > 0 && overlap < height ? overlap : 0);
      });
    };
    const onHide = () => {
      if (active) {
        setInset(0);
      }
    };

    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      active = false;
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return {containerRef, inset};
}
