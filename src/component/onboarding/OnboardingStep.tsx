import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../UI';
import { useTheme } from '../../hooks/useTheme';
import SplashIcon from '../UI/icons/splachIcon';
import { totalSteps, type OnboardingStep as OnboardingStepType } from './constants';

type OnboardingStepProps = {
  currentStep: number;
  stepData: OnboardingStepType;
  onNext: () => void;
  isLastRegularStep: boolean;
};

const OnboardingStep: React.FC<OnboardingStepProps> = ({
  currentStep,
  stepData,
  onNext,
  isLastRegularStep,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const layout = useMemo(() => {
    const shortScreen = height < 780;
    const veryShortScreen = height < 700;
    // Keep CTA visible on iPad iPhone-compat / small heights.
    const topCardRatio = veryShortScreen ? 0.28 : shortScreen ? 0.36 : 0.45;
    const topCardHeight = Math.min(Math.max(height * topCardRatio, 160), height * 0.5);
    const titleSize = veryShortScreen ? 28 : shortScreen ? 32 : 40;
    const titleLineHeight = veryShortScreen ? 34 : shortScreen ? 38 : 48;
    const iconWidth = Math.min(width * 0.85, shortScreen ? 280 : 343);

    return {
      topCardHeight,
      titleSize,
      titleLineHeight,
      iconWidth,
      contentPaddingTop: shortScreen ? 20 : 40,
      contentPaddingBottom: Math.max(insets.bottom, 16) + 8,
    };
  }, [height, width, insets.bottom]);

  const titleColor = theme.text;
  const descriptionColor = theme.textTertiary;
  const buttonBgColor = '#FE732E';
  const buttonTextColor = '#FFFFFF';
  const dotColor = '#FE732E';
  const contentBgColor = theme.background;
  const topCardBgColor = stepData.topCardColor;
  const inactiveDotColor =
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(31, 31, 31, 0.3)';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: contentBgColor }]}
      edges={['top']}>
      <StatusBar barStyle={theme.statusBar} />

      <View style={[styles.topCard, { height: layout.topCardHeight }]}>
        <View style={[styles.topCardBackground, { backgroundColor: topCardBgColor }]} />
        <View
          style={[
            styles.iconContainer,
            { width: layout.iconWidth, maxWidth: layout.iconWidth },
          ]}>
          <SplashIcon color="#FFFFFF" />
        </View>
      </View>

      <View
        style={[
          styles.contentContainer,
          {
            backgroundColor: contentBgColor,
            paddingTop: layout.contentPaddingTop,
            paddingBottom: layout.contentPaddingBottom,
          },
        ]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          <View style={styles.titleContainer}>
            {stepData.title.map((line, index) => (
              <AppText
                key={index}
                style={[
                  styles.title,
                  {
                    color: titleColor,
                    fontSize: layout.titleSize,
                    lineHeight: layout.titleLineHeight,
                  },
                ]}>
                {line}
              </AppText>
            ))}
          </View>

          <View style={styles.descriptionContainer}>
            {stepData.description.map((line, index) => (
              <AppText
                key={index}
                style={[styles.description, { color: descriptionColor }]}>
                {line}
              </AppText>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: buttonBgColor }]}
            onPress={onNext}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppText style={[styles.buttonText, { color: buttonTextColor }]}>
              {isLastRegularStep ? 'Начать' : 'Далее'}
            </AppText>
          </TouchableOpacity>

          <View style={styles.paginationContainer}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentStep && styles.dotActive,
                  {
                    backgroundColor:
                      index === currentStep ? dotColor : inactiveDotColor,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingStep;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topCard: {
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.2,
  },
  iconContainer: {
    aspectRatio: 343 / 186,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  titleContainer: {
    marginBottom: 16,
  },
  title: {
    fontWeight: '500',
    marginBottom: 4,
  },
  descriptionContainer: {
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 4,
  },
  footer: {
    gap: 20,
    paddingTop: 8,
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
