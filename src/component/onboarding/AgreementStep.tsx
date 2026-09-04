import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AppText } from '../UI';
import { useTheme } from '../../hooks/useTheme';
import { agreementText, totalSteps } from './constants';
import { TabletCentered } from '../UI/tablet';

type AgreementStepProps = {
    currentStep: number;
    onAgree: () => void;
};

const AgreementStep: React.FC<AgreementStepProps> = ({ currentStep, onAgree }) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const titleColor = theme.text;
    const descriptionColor = theme.textTertiary;
    const buttonBgColor = '#FE732E';
    const buttonTextColor = '#FFFFFF';
    const dotColor = '#FE732E';
    const contentBgColor = theme.background;
    const inactiveDotColor = theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(31, 31, 31, 0.3)';
    const borderColor = theme.border;

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

                {/* Scrollable Agreement Text */}
                <ScrollView
                    style={styles.agreementScrollContainer}
                    contentContainerStyle={styles.agreementScrollContent}
                    showsVerticalScrollIndicator={true}>
                    <TabletCentered>
                    <AppText style={[styles.agreementText, { color: titleColor }]}>
                        {agreementText}
                    </AppText>
                    </TabletCentered>
                </ScrollView>

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
    agreementScrollContent: {
        paddingBottom: 8,
    },
    agreementText: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 18,
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

