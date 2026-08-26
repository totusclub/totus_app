import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import AppText from '../text';
import { useTheme } from '../../../hooks/useTheme';
import { YANDEX_SMARTCAPTCHA_SITEKEY } from '../../../config/captcha';

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
};

const CHECKBOX_HEIGHT = 108;
const CHALLENGE_HEIGHT = 360;

const buildCaptchaHtml = (sitekey: string) => `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
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

    function reportHeight() {
      var h = Math.max(
        document.documentElement.scrollHeight || 0,
        document.body.scrollHeight || 0,
        document.getElementById('captcha-container').scrollHeight || 0,
        ${CHECKBOX_HEIGHT}
      );
      post('height', { height: h });
    }

    function renderCaptcha() {
      if (!window.smartCaptcha) {
        post('error', {});
        return;
      }
      try {
        window.smartCaptcha.render('captcha-container', {
          sitekey: ${JSON.stringify(sitekey)},
          hl: 'ru',
          callback: function (token) {
            post('success', { token: token || '' });
            setTimeout(reportHeight, 50);
          },
          'error-callback': function () { post('error', {}); },
          'network-error-callback': function () { post('network_error', {}); },
          'token-expired-callback': function () { post('expired', {}); },
          'challenge-visible-callback': function () {
            post('challenge', { open: true });
            setTimeout(reportHeight, 80);
          },
          'challenge-hidden-callback': function () {
            post('challenge', { open: false });
            setTimeout(reportHeight, 80);
          }
        });
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
}) => {
  const { theme } = useTheme();
  const [status, setStatus] = useState<CaptchaStatus>('loading');
  const [webHeight, setWebHeight] = useState(CHECKBOX_HEIGHT);
  const [localReset, setLocalReset] = useState(0);
  const statusRef = useRef<CaptchaStatus>('loading');

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
    () => buildCaptchaHtml(YANDEX_SMARTCAPTCHA_SITEKEY),
    [],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data || '{}');
        const type = data?.type;
        const token = typeof data?.token === 'string' ? data.token : '';

        if (type === 'height') {
          const next = Math.round(Number(data?.height) || 0);
          if (Number.isFinite(next) && next > 0) {
            setWebHeight(prev => {
              const target = Math.min(Math.max(next, CHECKBOX_HEIGHT), 520);
              return Math.abs(target - prev) > 8 ? target : prev;
            });
          }
          return;
        }

        if (type === 'challenge') {
          if (data?.open) {
            setWebHeight(prev => Math.max(prev, CHALLENGE_HEIGHT));
          }
          return;
        }

        if (type === 'ready') {
          emitStatus('ready');
          return;
        }

        if (type === 'success') {
          emitStatus('solved');
          onTokenChange(token);
          setWebHeight(CHECKBOX_HEIGHT);
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
    setWebHeight(CHECKBOX_HEIGHT);
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
    <View style={styles.wrap}>
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

      {status !== 'error' ? (
        <View style={[styles.webviewBox, { height: webHeight }]}>
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
    minHeight: CHECKBOX_HEIGHT,
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
