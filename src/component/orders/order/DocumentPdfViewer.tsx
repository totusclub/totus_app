import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import RNFS from 'react-native-fs';
import { AppText, AppIcon } from '../../UI';
import { downloadOrderDocumentWithFeedback } from '../../../utils/downloadOrderDocument';
import { useTheme } from '../../../hooks/useTheme';

type DocumentPdfViewerProps = {
  visible: boolean;
  title?: string;
  url: string | null;
  onClose: () => void;
};

type ViewerSource =
  | { type: 'uri'; uri: string }
  | { type: 'html'; html: string };

function buildPdfJsHtml(base64: string): string {
  // Keep base64 out of the outer template quotes carefully — only [A-Za-z0-9+/=].
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
  <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"><\/script>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; min-height: 100%; background: #525659; }
    #status { color: #fff; font: 15px -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 40px 20px; }
    #pages { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 10px 0 40px; }
    canvas { width: 100% !important; height: auto !important; background: #fff; }
  </style>
</head>
<body>
  <div id="status">Загрузка PDF…</div>
  <div id="pages"></div>
  <script>
    (function () {
      var statusEl = document.getElementById('status');
      var pagesEl = document.getElementById('pages');
      function fail(msg) {
        statusEl.style.display = 'block';
        statusEl.textContent = msg || 'Не удалось отобразить PDF';
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: msg || 'fail' }));
        }
      }
      function done() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }
      }
      try {
        if (typeof pdfjsLib === 'undefined') {
          fail('PDF library missing');
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        var b64 = '${base64}';
        var raw = atob(b64);
        var bytes = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        pdfjsLib.getDocument({ data: bytes }).promise.then(function (pdf) {
          statusEl.style.display = 'none';
          var scale = Math.min(2, Math.max(1, (window.innerWidth - 16) / 595));
          var chain = Promise.resolve();
          for (var p = 1; p <= pdf.numPages; p++) {
            (function (pageNum) {
              chain = chain.then(function () {
                return pdf.getPage(pageNum).then(function (page) {
                  var viewport = page.getViewport({ scale: scale });
                  var canvas = document.createElement('canvas');
                  var ctx = canvas.getContext('2d');
                  canvas.width = viewport.width;
                  canvas.height = viewport.height;
                  pagesEl.appendChild(canvas);
                  return page.render({ canvasContext: ctx, viewport: viewport }).promise;
                });
              });
            })(p);
          }
          return chain.then(done);
        }).catch(function (e) {
          fail(String(e && e.message || e));
        });
      } catch (e) {
        fail(String(e && e.message || e));
      }
    })();
  <\/script>
</body>
</html>`;
}

/**
 * Full-screen in-app PDF viewer.
 *
 * iOS: WKWebView renders remote PDF URLs natively.
 * Android: download → PDF.js canvas render (WebView has no native PDF).
 */
const DocumentPdfViewer: React.FC<DocumentPdfViewerProps> = ({
  visible,
  title,
  url,
  onClose,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [source, setSource] = useState<ViewerSource | null>(null);
  const [downloading, setDownloading] = useState(false);
  const localPathRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cleanupFile = () => {
      const path = localPathRef.current;
      localPathRef.current = null;
      if (path) RNFS.unlink(path).catch(() => undefined);
    };

    const prepare = async () => {
      cleanupFile();
      setSource(null);

      if (!visible || !url) {
        setLoading(false);
        setError(false);
        return;
      }

      setLoading(true);
      setError(false);

      // iOS: remote HTTPS PDF works natively in WKWebView — no download needed.
      if (Platform.OS === 'ios') {
        if (cancelled) return;
        setSource({ type: 'uri', uri: url });
        return;
      }

      // Android: download then render with PDF.js (no native PDF in WebView).
      try {
        const path = `${RNFS.CachesDirectoryPath}/order_doc_${Date.now()}.pdf`;
        const download = await RNFS.downloadFile({
          fromUrl: url,
          toFile: path,
        }).promise;

        if (cancelled) {
          RNFS.unlink(path).catch(() => undefined);
          return;
        }

        if (download.statusCode != null && download.statusCode >= 400) {
          throw new Error(`HTTP ${download.statusCode}`);
        }

        const stat = await RNFS.stat(path);
        if (!stat || Number(stat.size) <= 0) {
          throw new Error('Empty file');
        }

        localPathRef.current = path;
        const base64 = await RNFS.readFile(path, 'base64');
        if (cancelled) return;

        setSource({ type: 'html', html: buildPdfJsHtml(base64) });
        setLoading(false);
      } catch (err) {
        console.error('[DocumentPdfViewer] android prepare failed:', err);
        if (cancelled) return;
        // Last-resort public viewer (only works for publicly reachable PDFs).
        setSource({
          type: 'uri',
          uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`,
        });
      }
    };

    prepare();

    return () => {
      cancelled = true;
      // Do not unlink here while WebView may still need the file —
      // cleanup happens on next open / close.
    };
  }, [visible, url]);

  const handleClose = () => {
    const path = localPathRef.current;
    localPathRef.current = null;
    if (path) RNFS.unlink(path).catch(() => undefined);
    setSource(null);
    setLoading(true);
    setError(false);
    onClose();
  };

  const handleDownload = async () => {
    if (!url || downloading) return;
    setDownloading(true);
    try {
      await downloadOrderDocumentWithFeedback(url, title);
    } finally {
      setDownloading(false);
    }
  };

  const handleWebMessage = (raw: string) => {
    try {
      const msg = JSON.parse(raw);
      if (msg?.type === 'ready') {
        setLoading(false);
        setError(false);
      }
      if (msg?.type === 'error') {
        setLoading(false);
        setError(true);
      }
    } catch {
      // ignore
    }
  };

  if (!visible || !url) return null;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.background,
          paddingTop: Math.max(insets.top, 8),
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}>
        <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.headerLeft}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
          </TouchableOpacity>

          <AppText style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title || 'Документ'}
          </AppText>

          <TouchableOpacity
            onPress={handleDownload}
            disabled={downloading}
            style={styles.headerRight}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            {downloading ? (
              <ActivityIndicator size="small" color={theme.brand} />
            ) : (
              <AppIcon name="download" size={24} color={theme.text} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.viewer}>
          {source ? (
            <WebView
              key={`${source.type}:${source.type === 'uri' ? source.uri : 'html'}`}
              source={
                source.type === 'uri'
                  ? { uri: source.uri }
                  : {
                      html: source.html,
                      baseUrl: 'https://cdn.jsdelivr.net',
                    }
              }
              style={styles.webview}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              allowFileAccess
              allowFileAccessFromFileURLs
              allowUniversalAccessFromFileURLs
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              startInLoadingState
              scalesPageToFit
              onLoadEnd={() => {
                // iOS native PDF / Google viewer — hide spinner when page loads.
                if (source.type === 'uri') setLoading(false);
              }}
              onError={event => {
                console.error('[DocumentPdfViewer] webview error', event.nativeEvent);
                setLoading(false);
                setError(true);
              }}
              onHttpError={event => {
                if (event.nativeEvent.statusCode >= 400) {
                  console.error('[DocumentPdfViewer] http error', event.nativeEvent);
                  setLoading(false);
                  setError(true);
                }
              }}
              onMessage={event => handleWebMessage(event.nativeEvent.data)}
            />
          ) : null}

          {(loading || !source) && !error ? (
            <View
              style={[styles.loadingOverlay, { backgroundColor: theme.background }]}
              pointerEvents="none">
              <ActivityIndicator size="large" color={theme.brand} />
              <AppText style={[styles.loadingText, { color: theme.textTertiary }]}>
                Открываем документ…
              </AppText>
            </View>
          ) : null}

          {error ? (
            <View style={[styles.errorOverlay, { backgroundColor: theme.background }]}>
              <AppText style={[styles.errorText, { color: theme.textTertiary }]}>
                Не удалось отобразить PDF в приложении.
              </AppText>
              {url ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(url).catch(() => undefined)}
                  style={[styles.errorButton, { backgroundColor: theme.brand }]}>
                  <AppText style={[styles.errorButtonText, { color: theme.textInverse }]}>
                    Открыть в браузере
                  </AppText>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={handleClose} style={styles.errorLink}>
                <AppText style={[styles.errorLinkText, { color: theme.text }]}>
                  Закрыть
                </AppText>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerLeft: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  viewer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: '#525659',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 1,
  },
  loadingText: {
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
    zIndex: 1,
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  errorButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  errorLinkText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default DocumentPdfViewer;
