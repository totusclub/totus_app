import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { Search } from './searchSection/Search';
import { PlaningTrip } from './planingTrip/PlaningTrip';

import { PopularDestinationsList } from './PopularDestinations/PopularDestinationsList';
import { useLoadHomeData } from '../../modules/hooks/loadHomeData';
import LogoSection from './logoSection/LogoSection';
import { useTheme } from '../../hooks/useTheme';
import PasscodeModal from './PasscodeModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTrackingTransparency } from '../../modules/hooks/useTrackingTransparency';
import TourVoiceAssistant from "../tourVoiceAssistant";

export const Home: React.FC = () => {
  const { homeData } = useLoadHomeData();
  const { theme } = useTheme();
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const { requestTracking, isRequested, isLoading: isTrackingLoading } = useTrackingTransparency();

  useEffect(() => {
    const init = async () => {
      const pinCode = await AsyncStorage.getItem('pinCode');
      // console.log('pinCode', pinCode);
      if (pinCode !== 'YES') {
        setShowPasscodeModal(true);
      }
      if (pinCode === 'YES') {
        setIsPasscodeVerified(true);
      }
    }

    init()
  }, []);

  // Request tracking transparency after user has experienced the app
  // Best practice: Request after a delay, not immediately on launch
  // useEffect(() => {
  //   if (!isPasscodeVerified || isRequested || isTrackingLoading) {
  //     return;
  //   }
  //
  //   // Request tracking permission after 3 seconds of app usage
  //   // This gives users time to see the app value before asking for permission
  //   const trackingTimer = setTimeout(() => {
  //     requestTracking();
  //   }, 3000);
  //
  //   return () => clearTimeout(trackingTimer);
  // }, [isPasscodeVerified, isRequested, isTrackingLoading, requestTracking]);



  const handlePasscodeVerified = async () => {
    setIsPasscodeVerified(true);
    setShowPasscodeModal(false);
    await AsyncStorage.setItem('pinCode', 'YES');
  };

  return (
    <>
      <PasscodeModal visible={showPasscodeModal} onVerified={handlePasscodeVerified} />

      {isPasscodeVerified ? (
        <ScrollView
          style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
          contentContainerStyle={[styles.contentContainer]}>
          <Search title="Путешествия начинаются здесь" />
          <PlaningTrip recommendHotels={homeData?.recomendHotels} />
          {/*<ReadyTours />*/}
          {/* <LogoSection /> */}
          <PopularDestinationsList popularDestinations={homeData?.popularDestinations} />
        </ScrollView>
      ) : (
        <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 60,
  },
});
