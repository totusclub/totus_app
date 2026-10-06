import React from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { AppButton, AppText } from '../../component/UI';
import { useTheme } from '../../hooks/useTheme';
import { useLayout, TABLET_MAX_CONTENT_WIDTH } from '../../hooks/useLayout';
import { findLegalDoc, isLegalDocSlug, type LegalDocSlug } from '../../content/legalDocs';
import { PRIVACY_POLICY_SECTIONS } from '../../content/privacyPolicy';
import LegalHeader from './LegalHeader';
import { fetchLegalPage, getCachedLegalPage, LegalPageError, type LegalPage } from './legalApi';
import { buildLegalHtml, legalHtmlColors, privacySectionsToHtml } from './legalHtml';
import { LEGAL_HTML_BASE_URL, resolveLegalLink } from './legalLinks';
import { LEGAL_DOCUMENT_ROUTE, type LegalDocumentParams } from './legalRoutes';

/** Документ, для которого офлайн есть зашитая копия (как было до CMS). */
const OFFLINE_FALLBACK_SLUG: LegalDocSlug = 'privacy-policy';
const OFFLINE_FALLBACK_NOTICE =
  'Не удалось загрузить актуальную версию документа — показана сохранённая в приложении. ' +
  'Актуальная версия откроется при подключении к интернету.';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; page: LegalPage }
  | { status: 'fallback' }
  | { status: 'error'; error: LegalPageError };

function errorText(error: LegalPageError): string {
  if (error.kind === 'not_found') {
    return 'Документ пока недоступен. Попробуйте позже.';
  }
  if (error.kind === 'network') {
    return 'Не удалось загрузить документ. Проверьте подключение к интернету.';
  }
  return 'Не удалось загрузить документ. Попробуйте ещё раз.';
}

/**
 * Юридический документ из CMS (GET /api/pages/slug/:slug), HTML в WebView.
 * Ссылки на другие документы открываются здесь же, прочие — во внешнем браузере.
 * Маршруты: legalDocument {slug} и старый privacyPolicy (slug = privacy-policy).
 */
const LegalDocumentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params ?? {}) as Partial<LegalDocumentParams>;
  const slug: LegalDocSlug = isLegalDocSlug(params.slug) ? params.slug : OFFLINE_FALLBACK_SLUG;
  const listTitle = findLegalDoc(slug)?.title ?? params.title ?? 'Документ';

  const insets = useSafeAreaInsets();
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;
  const { theme, isDark } = useTheme();
  const { isTablet } = useLayout();

  const [state, setState] = React.useState<LoadState>(() => {
    const cached = getCachedLegalPage(slug);
    return cached ? { status: 'ready', page: cached } : { status: 'loading' };
  });
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = React.useCallback(() => {
    setState({ status: 'loading' });
    fetchLegalPage(slug)
      .then(page => {
        if (mounted.current) {
          setState({ status: 'ready', page });
        }
      })
      .catch(e => {
        if (!mounted.current) {
          return;
        }
        if (slug === OFFLINE_FALLBACK_SLUG) {
          // Офлайн / CMS ещё не заполнена: показать зашитую политику, как раньше.
          setState({ status: 'fallback' });
          return;
        }
        setState({
          status: 'error',
          error: e instanceof LegalPageError ? e : new LegalPageError('network', String(e)),
        });
      });
  }, [slug]);

  React.useEffect(() => {
    if (!getCachedLegalPage(slug)) {
      load();
    }
  }, [slug, load]);

  const title =
    state.status === 'ready' && state.page.name ? state.page.name : listTitle;

  const html = React.useMemo(() => {
    let bodyHtml: string | null = null;
    let notice: string | undefined;
    if (state.status === 'ready') {
      bodyHtml = state.page.content;
    } else if (state.status === 'fallback') {
      bodyHtml = privacySectionsToHtml(
        PRIVACY_POLICY_SECTIONS,
        'Политика обработки персональных данных Totus Club',
      );
      notice = OFFLINE_FALLBACK_NOTICE;
    }
    if (bodyHtml === null) {
      return null;
    }
    return buildLegalHtml({
      bodyHtml,
      colors: legalHtmlColors(theme),
      isDark,
      bottomInset: Math.max(tabBarHeight, insets.bottom),
      maxWidth: isTablet ? TABLET_MAX_CONTENT_WIDTH : undefined,
      notice,
    });
  }, [state, theme, isDark, tabBarHeight, insets.bottom, isTablet]);

  /** true — WebView продолжает загрузку (якорь / сам документ), false — обработали сами. */
  const handleLink = React.useCallback(
    (url: string): boolean => {
      const action = resolveLegalLink(url);
      switch (action.kind) {
        case 'stay':
          return true;
        case 'internal':
          if (action.slug !== slug) {
            const next: LegalDocumentParams = {
              slug: action.slug,
              title: findLegalDoc(action.slug)?.title,
            };
            navigation.push(LEGAL_DOCUMENT_ROUTE, next);
          }
          return false;
        case 'external':
          Linking.openURL(action.url).catch(() => {});
          return false;
        default:
          return false;
      }
    },
    [navigation, slug],
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundSecondary, paddingTop: insets.top },
      ]}>
      <LegalHeader title={title} onBack={() => navigation.goBack()} />

      {html ? (
        <WebView
          style={[styles.webView, { backgroundColor: theme.backgroundSecondary }]}
          containerStyle={{ backgroundColor: theme.backgroundSecondary }}
          source={{ html, baseUrl: LEGAL_HTML_BASE_URL }}
          originWhitelist={['*']}
          javaScriptEnabled={false}
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          onShouldStartLoadWithRequest={request => handleLink(request.url)}
          onOpenWindow={event => {
            handleLink(event.nativeEvent.targetUrl);
          }}
        />
      ) : state.status === 'error' ? (
        <View style={styles.center}>
          <AppText style={[styles.errorText, { color: theme.textSecondary }]}>
            {errorText(state.error)}
          </AppText>
          <AppButton title="Повторить" onPress={load} size="medium" />
        </View>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.textTertiary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});

export default LegalDocumentScreen;
