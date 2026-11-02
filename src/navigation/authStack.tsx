import * as React from 'react';
import { StyleSheet, Platform, View, useWindowDimensions } from 'react-native';
import { FontText as Text } from '../component/UI/text/FontText';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { AppIcon, AppText } from '../component/UI';
import { useSelector } from 'react-redux';
import { RootState } from '../modules/store';
import { AccountScreen, HomeScreen, OnboardingScreen, OrdersScreen, OrderDetailsScreen, LoginScreen, SignupScreen, VerificationScreen, BookingScreen, CheckoutScreen, PendingPaymentScreen, FavoritesScreen, LegalDocumentsScreen, LegalDocumentScreen, SupportChatScreen, NotificationsScreen, NotificationSettingsScreen } from '../screens';
import SearchResultScreen from '../screens/home/SearchResult';
import HotelScreen from '../screens/home/Hotel';
import TicketsScreen from '../screens/home/Tickets';
import TicketDetailsScreen from '../screens/home/TicketDetails';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../hooks/useTheme';
import { isOnboardingCompleted } from '../utils/onboarding';
// import CallsScreen from "../screens/calls/CallsScreen.tsx";
import { getUserById } from "../modules/api/users";
import TotusAiChatScreen from "../screens/ai/TotusAiChatScreen";
import { rememberNonAiTab } from '../utils/aiTabReturn';
import { useLayout } from '../hooks/useLayout';
import { useAccountTabBadge } from '../modules/push/useAccountTabBadge';
import {
  LEGAL_DOCUMENTS_ROUTE,
  LEGAL_DOCUMENT_ROUTE,
  PRIVACY_POLICY_ROUTE,
} from '../screens/legal/legalRoutes';

/**
 * iPad tab bar (Figma «iPad UI» frames): icons above labels, 5 items grouped in
 * the centre 112 pt apart, 84 pt tall in portrait / 70 pt in landscape.
 * React Navigation would otherwise put labels beside icons and stretch the
 * items across the full width on wide screens. Phone: not applied.
 */
const TABLET_TAB_ITEM_WIDTH = 112;
const TABLET_TAB_BAR_HEIGHT_PORTRAIT = 84;
const TABLET_TAB_BAR_HEIGHT_LANDSCAPE = 70;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/** Nested stack screens where the bottom tab bar must be hidden. */
const SCREENS_WITHOUT_TAB_BAR = new Set([
  'ticketDetails',
  'booking',
  'checkout',
  'pendingPayment',
  'hotelFromAi',
  'orderDetails',
  'supportChat',
  'notifications',
  'notificationSettings',
]);

function getTabBarStyle(
  route: { name: string; state?: unknown },
  theme: { navigationBackground: string },
  /** iPad only — merged on top of the phone style; null on phone. */
  tabletStyle: { height: number; paddingTop: number; paddingHorizontal: number } | null = null,
) {
  // Hide bottom tabs on the entire AI assistant flow (chat + hotel/tickets).
  if (route.name === 'VoiceAssistantStackScreen') {
    return { display: 'none' as const };
  }

  const focusedRouteName = getFocusedRouteNameFromRoute(route as any);
  if (focusedRouteName && SCREENS_WITHOUT_TAB_BAR.has(focusedRouteName)) {
    return { display: 'none' as const };
  }

  return {
    position: 'absolute' as const,
    borderTopWidth: 0,
    backgroundColor:
      Platform.OS === 'android' ? theme.navigationBackground : 'transparent',
    elevation: 0,
    ...(tabletStyle ?? {}),
  };
}

/** Android + `animation: 'none'` can show two layers repainting; freezing blurred screens avoids that. */
const nativeStackScreenOptions = {
  headerShown: false as const,
  animation: (Platform.OS === 'ios' ? 'slide_from_right' : 'none') as
    | 'slide_from_right'
    | 'none',
  ...(Platform.OS === 'android' ? { freezeOnBlur: true as const } : {}),
};

const HomeStackScreen = () => (
  <Stack.Navigator screenOptions={nativeStackScreenOptions}>
    <Stack.Screen name="home" component={HomeScreen} />
    <Stack.Screen name="searchResult" component={SearchResultScreen} />
    <Stack.Screen name="hotel" component={HotelScreen} />
    <Stack.Screen name="tickets" component={TicketsScreen} />
    <Stack.Screen name="ticketDetails" component={TicketDetailsScreen} />
    <Stack.Screen name="booking" component={BookingScreen} />
    <Stack.Screen name="checkout" component={CheckoutScreen} />
    <Stack.Screen name="pendingPayment" component={PendingPaymentScreen} />
  </Stack.Navigator>
);


const OrdersStackScreen = () => (
  <Stack.Navigator screenOptions={nativeStackScreenOptions}>
    <Stack.Screen name="orders" component={OrdersScreen} />
    <Stack.Screen name="orderDetails" component={OrderDetailsScreen} />
    <Stack.Screen name="checkout" component={CheckoutScreen} />
    <Stack.Screen name="pendingPayment" component={PendingPaymentScreen} />
  </Stack.Navigator>
);


// Calling stack — restore with tab below if needed.
// const ChatStackScreen = () => (
//   <Stack.Navigator screenOptions={nativeStackScreenOptions}>
//     <Stack.Screen name="chat" component={ChatScreen} />
//   </Stack.Navigator>
// );

const FavoritesStackScreen = () => (
  <Stack.Navigator screenOptions={nativeStackScreenOptions}>
    <Stack.Screen name="favorites" component={FavoritesScreen} />
    <Stack.Screen name="hotel" component={HotelScreen} />
    <Stack.Screen name="tickets" component={TicketsScreen} />
    <Stack.Screen name="ticketDetails" component={TicketDetailsScreen} />
    <Stack.Screen name="booking" component={BookingScreen} />
    <Stack.Screen name="checkout" component={CheckoutScreen} />
    <Stack.Screen name="pendingPayment" component={PendingPaymentScreen} />
  </Stack.Navigator>
);

const VoiceAssistantStackScreen = () => (
  <Stack.Navigator screenOptions={nativeStackScreenOptions}>
    <Stack.Screen name="aiTextScreen" component={TotusAiChatScreen} />
    <Stack.Screen name="hotelFromAi" component={HotelScreen} />
    <Stack.Screen name="tickets" component={TicketsScreen} />
    <Stack.Screen name="ticketDetails" component={TicketDetailsScreen} />
    <Stack.Screen name="booking" component={BookingScreen} />
    <Stack.Screen name="checkout" component={CheckoutScreen} />
    <Stack.Screen name="pendingPayment" component={PendingPaymentScreen} />
  </Stack.Navigator>
);

const AccountStackScreen = () => {
  const { accessToken, user: userFromState, fullAuth } = useSelector(
    (state: RootState) => state.auth
  );

  // If user is logged in -> go to account
  // If not -> go to login
  const initialRoute = accessToken ? "account" : "login";

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={nativeStackScreenOptions}>
      <Stack.Screen name="login" component={LoginScreen} />
      <Stack.Screen name="signup" component={SignupScreen} />
      <Stack.Screen name="verification" component={VerificationScreen} />
      <Stack.Screen name="account" component={AccountScreen} />
      <Stack.Screen name="favorites" component={FavoritesScreen} />
      {/* «Избранное» из «Аккаунта»: отель и бронирование в этом же стеке — «Назад» возвращает по шагам
          (раньше переход к отелю отсюда некуда было выполнить: маршрута hotel в стеке не было). */}
      <Stack.Screen name="hotel" component={HotelScreen} />
      <Stack.Screen name="tickets" component={TicketsScreen} />
      <Stack.Screen name="ticketDetails" component={TicketDetailsScreen} />
      <Stack.Screen name="booking" component={BookingScreen} />
      <Stack.Screen name="checkout" component={CheckoutScreen} />
      <Stack.Screen name="pendingPayment" component={PendingPaymentScreen} />
      {/* «Документы» ООО «ТОТУСКЛАБ» из CMS; старый маршрут privacyPolicy открывает документ privacy-policy */}
      <Stack.Screen name={LEGAL_DOCUMENTS_ROUTE} component={LegalDocumentsScreen} />
      <Stack.Screen name={LEGAL_DOCUMENT_ROUTE} component={LegalDocumentScreen} />
      <Stack.Screen
        name={PRIVACY_POLICY_ROUTE}
        component={LegalDocumentScreen}
        initialParams={{ slug: 'privacy-policy' }}
      />
      <Stack.Screen name="supportChat" component={SupportChatScreen} />
      <Stack.Screen name="notifications" component={NotificationsScreen} />
      <Stack.Screen name="notificationSettings" component={NotificationSettingsScreen} />
    </Stack.Navigator>
  );
};


const TabBar = () => {
  const { theme, isDark } = useTheme();
  const { accessToken, userId } = useSelector((state: RootState) => state.auth);
  const [userAccess, setUserAccess] = React.useState<0 | 1 | null>(null);
  const isLoggedIn = !!accessToken;
  const { isTablet, isLandscape } = useLayout();
  const { width: windowWidth } = useWindowDimensions();
  // Непрочитанные уведомления → бейдж на вкладке «Аккаунт» (push-уведомления, этап 2).
  const accountBadge = useAccountTabBadge();

  // access 0 = show AI & Calling, access 1 = hide
  React.useEffect(() => {
    if (!isLoggedIn || !userId) {
      setUserAccess(null);
      return;
    }
    getUserById(userId)
      .then((user) => {
        if (!user) {
          // Network/API miss — keep calling/AI visible
          setUserAccess(0);
          return;
        }
        const a = user?.access;
        setUserAccess(a === 0 || a === false ? 0 : 1);
      })
      .catch(() => setUserAccess(0)); // On error, show tabs (allow access)
  }, [isLoggedIn, userId]);

  // iPad only: number of visible tabs → symmetric padding that centres the group.
  const visibleTabCount =
    2 + (isLoggedIn && userAccess === 0 ? 1 : 0) + (isLoggedIn ? 1 : 0) + 1;
  const tabletTabBarOptions = isTablet
    ? {
        tabBarLabelPosition: 'below-icon' as const,
        tabBarItemStyle: { flex: 0, width: TABLET_TAB_ITEM_WIDTH },
        tabBarIconStyle: { marginTop: 0 },
      }
    : {};
  const tabletTabBarStyle = isTablet
    ? {
        height: isLandscape ? TABLET_TAB_BAR_HEIGHT_LANDSCAPE : TABLET_TAB_BAR_HEIGHT_PORTRAIT,
        paddingTop: 6,
        paddingHorizontal: Math.max(
          0,
          (windowWidth - visibleTabCount * TABLET_TAB_ITEM_WIDTH) / 2,
        ),
      }
    : null;

  return (
    <Tab.Navigator
      // «Назад» на корне вкладки — на вкладку, с которой пришли (история), а не всегда на «Поиск».
      backBehavior="history"
      screenListeners={({ route }) => ({
        // Remember tab on leave — so AI ← returns here (not always Home).
        blur: () => {
          rememberNonAiTab(route.name);
        },
        focus: () => {
          rememberNonAiTab(route.name);
        },
      })}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
            // console.log('route',route)
            if(route.name==='VoiceAssistantStackScreen'){
                return (
                    <View style={{width:60,height:60,borderRadius:30,marginTop:-25}}>
                        {/*<LottieView style={{width:60,height:60}} source={require('../assets/lottie/ai.json')} autoPlay loop />*/}
                        <AppIcon name={'radiologo'} size={60} color={color} />
                    </View>
                )
            }else{
                return <AppIcon name={route.name} size={size} color={color} />;
            }

        },
        tabBarLabel: ({ focused }) => {
          let label;

        if (route.name === 'HomeStackScreen') {
          label = 'Поиск';
        } else if (route.name === 'OrdersStackScreen') {
          label = 'Заказы';
        } else if (route.name === 'FavoritesStackScreen') {
          label = 'Избранное';
        } else if (route.name === 'ChatStackScreen') {
            label = 'Звонки';
        } else if (route.name === 'VoiceAssistantStackScreen') {
          label = 'Totus AI';
        } else if (route.name === 'AccountStackScreen') {
          label = 'Аккаунт';
        }

          return (
            <AppText
              style={{
                color: focused ? theme.tabBarActive : theme.tabBarInactive,
                fontSize: 12,
              }}>
              {label}
            </AppText>
          );
        },
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: theme.tabBarInactive,
        headerShown: false,
        tabBarBackground: () => {
          const backgroundColor = theme.navigationBackground;
          return Platform.OS === 'ios' ? (
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType={isDark ? 'dark' : 'light'}
              blurAmount={10}
              reducedTransparencyFallbackColor={backgroundColor}
            />
          ) : (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor }]}
            />
          );
        },
        tabBarStyle: getTabBarStyle(route, theme, tabletTabBarStyle),
        ...tabletTabBarOptions,
      })}>
      <Tab.Screen name="HomeStackScreen" component={HomeStackScreen} />
      <Tab.Screen name="OrdersStackScreen" component={OrdersStackScreen} />
        {isLoggedIn && userAccess === 0 && (
            <Tab.Screen name="VoiceAssistantStackScreen" component={VoiceAssistantStackScreen} />
        )}
      {isLoggedIn ? (
        <Tab.Screen name="FavoritesStackScreen" component={FavoritesStackScreen} />
      ) : null}

      {/* Calling tab hidden from tab bar — restore with:
      import CallsScreen / ChatScreen, uncomment ChatStackScreen above, then:
      <Tab.Screen name="ChatStackScreen" component={CallsScreen} />
      */}
      <Tab.Screen
        name="AccountStackScreen"
        component={AccountStackScreen}
        options={{
          tabBarBadge: accountBadge,
          tabBarBadgeStyle: { backgroundColor: theme.brand, color: '#FFFFFF', fontSize: 11 },
        }}
      />
    </Tab.Navigator>
  );
};

const AuthStack = () => {
  const { fullAuth } = useSelector((state: RootState) => state.auth);
  const [initialRoute, setInitialRoute] = React.useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
    const {user: loggedInUser} = useSelector((state: RootState) => state.auth);


  React.useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await isOnboardingCompleted();
        setInitialRoute(completed ? 'tab' : 'onboarding');
      } catch (error) {
        setInitialRoute('onboarding');
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboarding();
  }, []);

  // Don't render until we know the initial route
  if (isLoading || !initialRoute) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={nativeStackScreenOptions}>
      <Stack.Screen name="onboarding" component={OnboardingScreen} />
      <Stack.Screen name="ticketDetails" component={TicketDetailsScreen} />
      <Stack.Screen name="booking" component={BookingScreen} />
      <Stack.Screen name="checkout" component={CheckoutScreen} />
      <Stack.Screen name="pendingPayment" component={PendingPaymentScreen} />
      <Stack.Screen name="hotelFromAi" component={HotelScreen} />
      {/* Заказ, открытый не из списка «Заказы» (чат Маши, оплата, поддержка, push): поверх вкладок,
          «Назад» — на экран, с которого пришли (src/navigation/historyNavigation.ts). */}
      <Stack.Screen name="orderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="tab" component={TabBar} />
    </Stack.Navigator>
  );
};

export default AuthStack;
