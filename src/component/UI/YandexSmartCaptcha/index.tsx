import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import AppText from '../text';
import { useTheme } from '../../../hooks/useTheme';
import { YANDEX_SMARTCAPTCHA_SITEKEY } from '../../../config/captcha';
import {
  buildCaptchaViewport,
  getCaptchaBoxHeight,
  getCaptchaCssWidth,
  getCaptchaScale,
  getCheckboxHeight,
} from './layout';

export type CaptchaStatus =
  | 'loading'
  | 'ready'
  | 'solved'
  | 'error'
  | 'expired';

type Props = {
  onTokenChange: (token: string) => void;
  /** Increment to force widget remount after failed/expired token. */
  resetKey?: number;
  onStatusChange?: (status: CaptchaStatus) => void;
  /**
   * Прокрутка формы: когда Яндекс показывает задание, форма прокручивается так, чтобы
   * картинка, поле ввода и «Отправить» были видны целиком (и снова — когда открылась клавиатура).
   */
  scrollRef?: React.RefObject<ScrollView | null>;
};

/** Отступ над окном капчи при прокрутке к заданию. */
const SCROLL_GAP = 12;

const buildCaptchaHtml = (sitekey: string, viewport: string) => `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="${viewport}" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
      overflow: auto;
      -webkit-tap-highlight-color: transparent;
    }
    #captcha-container {
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
      min-height: 100px;
      width: 100%;
      padding: 2px 0;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div id="captcha-container"></div>
  <script>
    function post(type, payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
      }
    }

    // Высота чекбокса (CSS px). С открытым заданием Яндекс накрывает всю страницу — высота
    // документа равна окну, поэтому меряем только контейнер; окно под задание растит приложение.
    function reportHeight() {
      var c = document.getElementById('captcha-container');
      var h = Math.ceil(Math.max(c.getBoundingClientRect().height || 0, c.scrollHeight || 0));
      post('height', { height: h });
    }

    function renderCaptcha() {
      if (!window.smartCaptcha) {
        post('error', {});
        return;
      }
      try {
        // События задания — через subscribe: параметры render вида 'challenge-visible-callback'
        // Яндекс не вызывает (проверено 19.10.2026), из-за этого окно не росло под задание.
        var widgetId = window.smartCaptcha.render('captcha-container', {
          sitekey: ${JSON.stringify(sitekey)},
          hl: 'ru',
          // Режим для WebView по рекомендации Яндекса.
          webview: true,
          callback: function (token) {
            post('success', { token: token || '' });
            setTimeout(reportHeight, 50);
          }
        });
        var on = function (event, fn) {
          try { window.smartCaptcha.subscribe(widgetId, event, fn); } catch (e) {}
        };
        on('challenge-visible', function () {
          post('challenge', { open: true });
          setTimeout(reportHeight, 80);
        });
        on('challenge-hidden', function () {
          post('challenge', { open: false });
          setTimeout(reportHeight, 80);
        });
        on('network-error', function () { post('network_error', {}); });
        on('javascript-error', function () { post('error', {}); });
        on('token-expired', function () { post('expired', {}); });
        post('ready', {});
        setTimeout(reportHeight, 120);
        setTimeout(reportHeight, 500);
      } catch (e) {
        post('error', {});
      }
    }

    var script = document.createElement('script');
    script.src = 'https://smartcaptcha.yandexcloud.net/captcha.js';
    script.async = true;
    script.onload = function () { renderCaptcha(); };
    script.onerror = function () { post('error', {}); };
    document.head.appendChild(script);

    window.addEventListener('resize', reportHeight);
    setInterval(reportHeight, 1000);
  </script>
</body>
</html>
`;

const YandexSmartCaptcha: React.FC<Props> = ({
  onTokenChange,
  resetKey = 0,
  onStatusChange,
  scrollRef,
}) => {
  const { theme } = useTheme();
  const [status, setStatus] = useState<CaptchaStatus>('loading');
  const [localReset, setLocalReset] = useState(0);
  const statusRef = useRef<CaptchaStatus>('loading');
  // Ширина окна — по первому замеру: смена ширины перезагрузила бы капчу и сбросила ответ.
  const [boxWidth, setBoxWidth] = useState(0);
  const scale = useMemo(() => getCaptchaScale(boxWidth), [boxWidth]);
  const [reportedHeight, setReportedHeight] = useState(0);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const webHeight = getCaptchaBoxHeight(reportedHeight, scale, challengeOpen);
  const boxRef = useRef<View>(null);
  const scrollPending = useRef(false);

  const emitStatus = useCallback(
    (next: CaptchaStatus) => {
      statusRef.current = next;
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange],
  );

  const remountKey = `${resetKey}-${localReset}`;

  const html = useMemo(
    () =>
      boxWidth > 0
        ? buildCaptchaHtml(
            YANDEX_SMARTCAPTCHA_SITEKEY,
            buildCaptchaViewport(getCaptchaCssWidth(boxWidth, scale), scale),
          )
        : '',
    [boxWidth, scale],
  );

  const onWrapLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0) setBoxWidth(prev => (prev > 0 ? prev : w));
  }, []);

  /** Прокрутить форму к окну капчи: верх окна — под верх экрана, задание видно целиком. */
  const scrollToCaptcha = useCallback(() => {
    const scroll = scrollRef?.current as any;
    const box = boxRef.current as any;
    const inner = scroll?.getInnerViewRef?.() ?? scroll?.getInnerViewNode?.();
    if (!scroll || !box || !inner || typeof box.measureLayout !== 'function') return;
    try {
      box.measureLayout(
        inner,
        (_x: number, y: number) => {
          scroll.scrollTo({ y: Math.max(0, y - SCROLL_GAP), animated: true });
        },
        () => {},
      );
    } catch {
      /* нет замера — форма остаётся как есть */
    }
  }, [scrollRef]);

  // Окно выросло под задание → прокрутка после того, как новая высота применилась (onLayout).
  const onBoxLayout = useCallback(() => {
    if (!scrollPending.current) return;
    scrollPending.current = false;
    scrollToCaptcha();
  }, [scrollToCaptcha]);

  // Клавиатура открылась над заданием (поле ввода Яндекса) → ещё раз к окну капчи.
  useEffect(() => {
    if (!challengeOpen) return;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(scrollToCaptcha, 60);
    });
    return () => sub.remove();
  }, [challengeOpen, scrollToCaptcha]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data || '{}');
        const type = data?.type;
        const token = typeof data?.token === 'string' ? data.token : '';

        if (type === 'height') {
          const next = Math.round(Number(data?.height) || 0);
          if (Number.isFinite(next) && next > 0) {
            setReportedHeight(prev => (Math.abs(next - prev) > 2 ? next : prev));
          }
          return;
        }

        if (type === 'challenge') {
          const open = Boolean(data?.open);
          if (open) scrollPending.current = true;
          setChallengeOpen(open);
          return;
        }

        if (type === 'ready') {
          emitStatus('ready');
          return;
        }

        if (type === 'success') {
          emitStatus('solved');
          onTokenChange(token);
          setChallengeOpen(false);
          return;
        }

        if (type === 'expired') {
          emitStatus('expired');
          onTokenChange('');
          return;
        }

        if (type === 'error' || type === 'network_error') {
          emitStatus('error');
          onTokenChange('');
        }
      } catch {
        /* ignore non-JSON */
      }
    },
    [emitStatus, onTokenChange],
  );

  const handleRetry = useCallback(() => {
    onTokenChange('');
    emitStatus('loading');
    setChallengeOpen(false);
    setReportedHeight(0);
    setLocalReset(k => k + 1);
  }, [emitStatus, onTokenChange]);

  if (!YANDEX_SMARTCAPTCHA_SITEKEY) {
    return (
      <AppText style={[styles.hint, { color: theme.textTertiary }]}>
        Капча не настроена
      </AppText>
    );
  }

  return (
    <View style={styles.wrap} onLayout={onWrapLayout}>
      {(status === 'loading' || status === 'error') && (
        <View style={styles.statusRow}>
          {status === 'loading' ? (
            <>
              <ActivityIndicator color={theme.brand} />
              <AppText style={[styles.hint, { color: theme.textTertiary }]}>
                Загрузка проверки…
              </AppText>
            </>
          ) : (
            <>
              <AppText style={[styles.hint, { color: theme.error }]}>
                Не удалось загрузить капчу
              </AppText>
              <TouchableOpacity onPress={handleRetry} hitSlop={12}>
                <AppText style={[styles.retry, { color: theme.brand }]}>
                  Обновить
                </AppText>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {status !== 'error' && html ? (
        <View
          ref={boxRef}
          onLayout={onBoxLayout}
          style={[
            styles.webviewBox,
            { height: webHeight, minHeight: getCheckboxHeight(scale) },
          ]}>
          <WebView
            key={remountKey}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://totus.club' }}
            onMessage={onMessage}
            onLoadStart={() => {
              if (statusRef.current !== 'solved') {
                emitStatus('loading');
              }
            }}
            onError={() => {
              emitStatus('error');
              onTokenChange('');
            }}
            onHttpError={() => {
              emitStatus('error');
              onTokenChange('');
            }}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            scrollEnabled
            nestedScrollEnabled
            // Увеличение пальцами (viewport разрешает до 3×); Android: без кнопок +/−.
            scalesPageToFit
            setBuiltInZoomControls
            setDisplayZoomControls={false}
            setSupportMultipleWindows={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            androidLayerType="hardware"
            style={styles.webview}
          />
        </View>
      ) : null}

      {status === 'ready' ? (
        <AppText style={[styles.hint, { color: theme.textTertiary }]}>
          Отметьте «Я не робот», затем дождитесь активации кнопки
        </AppText>
      ) : null}

      {status === 'expired' ? (
        <TouchableOpacity onPress={handleRetry} hitSlop={12}>
          <AppText style={[styles.retry, { color: theme.brand }]}>
            Капча истекла — обновить
          </AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default YandexSmartCaptcha;
export { YANDEX_SMARTCAPTCHA_SITEKEY };

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
  },
  webviewBox: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  retry: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});
