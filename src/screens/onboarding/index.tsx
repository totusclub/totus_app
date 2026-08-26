import React, { useState } from 'react';
import { CommonActions, useNavigation } from '@react-navigation/native';
import AgreementStep from '../../component/onboarding/AgreementStep';
import OnboardingStep from '../../component/onboarding/OnboardingStep';
import { onboardingSteps } from '../../component/onboarding/constants';
import { setOnboardingCompleted } from '../../utils/onboarding';

const OnboardingScreen = () => {
    const navigation = useNavigation<any>();
    const [currentStep, setCurrentStep] = useState(0);
    const isAgreementStep = currentStep >= onboardingSteps.length;

    const handleNext = async () => {
        if (isAgreementStep) {
            await setOnboardingCompleted();
            // Navigate to main app (tab navigator)
            navigation.replace('tab');
        } else {
            setCurrentStep((prev) => Math.min(prev + 1, onboardingSteps.length));
        }
    };

    // Show agreement step (no top card)
    if (isAgreementStep) {
        return <AgreementStep currentStep={currentStep} onAgree={handleNext} />;
    }

    // Regular onboarding steps
    const currentData = onboardingSteps[currentStep];
    return (
        <OnboardingStep
            currentStep={currentStep}
            stepData={currentData}
            onNext={handleNext}
            // AgreementStep is the real last step in onboarding flow.
            // Keep regular steps on "Далее" and confirm only on agreement screen.
            isLastRegularStep={false}
        />
    );
};

export default OnboardingScreen;
