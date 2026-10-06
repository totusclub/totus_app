import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Search } from './searchSection/Search';
import { PlaningTrip } from './planingTrip/PlaningTrip';

import { PopularDestinationsList } from './PopularDestinations/PopularDestinationsList';
import { useLoadHomeData } from '../../modules/hooks/loadHomeData';
import LogoSection from './logoSection/LogoSection';
import { useTheme } from '../../hooks/useTheme';
import { useTrackingTransparency } from '../../modules/hooks/useTrackingTransparency';
import TourVoiceAssistant from "../tourVoiceAssistant";

export const Home: React.FC = () => {
  const { homeData } = useLoadHomeData();
  const { theme } = useTheme();
  const { requestTracking, isRequested, isLoading: isTrackingLoading } = useTrackingTransparency();

  // Request tracking transparency after user has experienced the app
  // Best practice: Request after a delay, not immediately on launch
  // useEffect(() => {
  //   if (isRequested || isTrackingLoading) {
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
  // }, [isRequested, isTrackingLoading, requestTracking]);

  // Экрана ввода пароля (PasscodeModal, код 2103) больше нет: главная открывается сразу.
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
      contentContainerStyle={[styles.contentContainer]}>
      <Search title="Путешествия начинаются здесь" />
      <PlaningTrip recommendHotels={homeData?.recomendHotels} />
      {/*<ReadyTours />*/}
      {/* <LogoSection /> */}
      <PopularDestinationsList popularDestinations={homeData?.popularDestinations} />
    </ScrollView>
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
