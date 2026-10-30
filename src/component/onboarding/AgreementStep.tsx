import React from 'react';
import { ActivityIndicator, Linking, StyleSheet, View, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { AppButton, AppText } from '../UI';
import { useTheme } from '../../hooks/useTheme';
import { useLayout, TABLET_MAX_CONTENT_WIDTH } from '../../hooks/useLayout';
import { totalSteps } from './constants';
import { TabletCentered } from '../UI/tablet';
import { FONT_HEADING } from '../../theme/fonts';
import type { LegalDocSlug } from '../../content/legalDocs';
import { fetchLegalPage, getCachedLegalPage, type LegalPage } from '../../screens/legal/legalApi';
import { buildLegalHtml, legalHtmlColors } from '../../screens/legal/legalHtml';
import { LEGAL_HTML_BASE_URL, resolveLegalLink } from '../../screens/legal/legalLinks';

/**
 * Текст пользовательского соглашения — из CMS (GET /api/pages/slug/terms), тот же документ,
 * что на сайте totus.club/terms и в «Аккаунт → Документы». Локальной копии нет:
 * документ обновляется из админки без релиза приложения.
 */
const AGREEMENT_SLUG: LegalDocSlug = 'terms';
const SITE_URL = 'https://totus.club';

type LoadState =
    | { status: 'loading' }
    | { status: 'ready'; page: LegalPage }
    | { status: 'error' };

type AgreementStepProps = {
    currentStep: number;
    onAgree: () => void;
};

const AgreementStep: React.FC<AgreementStepProps> = ({ currentStep, onAgree }) => {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { isTablet } = useLayout();

    const [state, setState] = React.useState<LoadState>(() => {
        const cached = getCachedLegalPage(AGREEMENT_SLUG);
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
        fetchLegalPage(AGREEMENT_SLUG)
            .then(page => {
                if (mounted.current) {
                    setState({ status: 'ready', page });
                }
            })
            .catch(() => {
                if (mounted.current) {
                    setState({ status: 'error' });
                }
            });
    }, []);

    React.useEffect(() => {
        if (!getCachedLegalPage(AGREEMENT_SLUG)) {
            load();
        }
    }, [load]);

    const titleColor = theme.text;
    const descriptionColor = theme.textTertiary;
    const buttonBgColor = '#FE732E';
    const buttonTextColor = '#FFFFFF';
    const dotColor = '#FE732E';
    const contentBgColor = theme.background;
    const inactiveDotColor = theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(31, 31, 31, 0.3)';
    const borderColor = theme.border;

    const html = React.useMemo(() => {
        if (state.status !== 'ready') {
            return null;
        }
        return buildLegalHtml({
            bodyHtml: state.page.content,
            // Фон документа — как фон экрана онбординга.
            colors: legalHtmlColors({ ...theme, backgroundSecondary: contentBgColor }),
            isDark,
            maxWidth: isTablet ? TABLET_MAX_CONTENT_WIDTH : undefined,
        });
    }, [state, theme, isDark, isTablet, contentBgColor]);

    /** Ссылки в соглашении: документы и страницы сайта — в браузере, остальное — как в «Документах». */
    const handleLink = React.useCallback((url: string): boolean => {
        const action = resolveLegalLink(url);
        switch (action.kind) {
            case 'stay':
                return true;
            case 'internal':
                Linking.openURL(`${SITE_URL}/${action.slug}`).catch(() => {});
                return false;
            case 'external':
                Linking.openURL(action.url).catch(() => {});
                return false;
            default:
                return false;
        }
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: contentBgColor }]} edges={['top']}>
            <StatusBar barStyle={theme.statusBar} />

            <View
                style={[
                    styles.agreementContainer,
                    {
                        backgroundColor: contentBgColor,
                        paddingBottom: Math.max(insets.bottom, 16),
                    },
                ]}>
                <TabletCentered>
                {/* Title */}
                <View style={styles.agreementTitleContainer}>
                    <AppText style={[styles.agreementTitle, { color: titleColor }]}>
                        Пользовательское соглашение приложения
                    </AppText>
                </View>

                {/* Introductory Text */}
                <View style={styles.agreementIntroContainer}>
                    <AppText style={[styles.agreementIntroText, { color: titleColor }]}>
                        Для продолжения работы с приложением необходимо принять условия использования
                    </AppText>
                </View>

                {/* Section Header */}
                <View style={styles.agreementSectionHeaderContainer}>
                    <AppText style={[styles.agreementSectionHeader, { color: descriptionColor }]}>
                        ПОЛЬЗОВАТЕЛЬСКОЕ СОГЛАШЕНИЕ
                    </AppText>
                </View>
                </TabletCentered>

                {/* Текст соглашения из CMS (GET /api/pages/slug/terms) */}
                <View style={styles.agreementScrollContainer}>
                    {html ? (
                        <WebView
                            style={[styles.agreementWebView, { backgroundColor: contentBgColor }]}
                            containerStyle={{ backgroundColor: contentBgColor }}
                            source={{ html, baseUrl: LEGAL_HTML_BASE_URL }}
                            originWhitelist={['*']}
                            javaScriptEnabled={false}
                            setSupportMultipleWindows={false}
                            allowsLinkPreview={false}
                            showsVerticalScrollIndicator={true}
                            onShouldStartLoadWithRequest={request => handleLink(request.url)}
                            onOpenWindow={event => {
                                handleLink(event.nativeEvent.targetUrl);
                            }}
                        />
                    ) : state.status === 'error' ? (
                        <View style={styles.agreementCenter}>
                            <AppText style={[styles.agreementErrorText, { color: descriptionColor }]}>
                                Не удалось загрузить пользовательское соглашение. Проверьте подключение к интернету.
                            </AppText>
                            <AppButton title="Повторить" onPress={load} size="medium" />
                        </View>
                    ) : (
                        <View style={styles.agreementCenter}>
                            <ActivityIndicator size="large" color={descriptionColor} />
                        </View>
                    )}
                </View>

                <TabletCentered>
                {/* Agree Button */}
                <View style={[styles.agreementButtonContainer, { borderTopColor: borderColor }]}>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: buttonBgColor }]}
                        onPress={onAgree}
                        activeOpacity={0.8}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <AppText style={[styles.buttonText, { color: buttonTextColor }]}>
                            Я согласен
                        </AppText>
                    </TouchableOpacity>
                </View>

                {/* Pagination Dots */}
                <View style={styles.paginationContainer}>
                    {Array.from({ length: totalSteps }).map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                index === currentStep && styles.dotActive,
                                {
                                    backgroundColor: index === currentStep
                                        ? dotColor
                                        : inactiveDotColor,
                                },
                            ]}
                        />
                    ))}
                </View>
                </TabletCentered>
            </View>
        </SafeAreaView>
    );
};

export default AgreementStep;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    agreementContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    agreementTitleContainer: {
        marginBottom: 12,
    },
    agreementTitle: {
        fontFamily: FONT_HEADING,
        fontSize: 20,
        fontWeight: '600',
        lineHeight: 24,
    },
    agreementIntroContainer: {
        marginBottom: 16,
    },
    agreementIntroText: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
    },
    agreementSectionHeaderContainer: {
        marginBottom: 12,
    },
    agreementSectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
        letterSpacing: 0.5,
    },
    agreementScrollContainer: {
        flex: 1,
        marginBottom: 16,
    },
    agreementWebView: {
        flex: 1,
    },
    agreementCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        gap: 16,
    },
    agreementErrorText: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    agreementButtonContainer: {
        paddingTop: 16,
        paddingBottom: 16,
        marginBottom: 16,
        borderTopWidth: 1,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        width: 24,
    },
});

