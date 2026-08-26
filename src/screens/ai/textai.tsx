import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../modules/store';
import { useTheme } from '../../hooks/useTheme';
import { AppIcon, AppText } from '../../component/UI';
import {
  createConversationV2,
  getConversationV2,
  listConversationsV2,
  sendMessageV2,
  deleteConversationV2,
} from '../../modules/api/tourAssistantV2Client';
import type {
  AiHotelResult,
  TourAssistantV2ConversationSummary,
  TourAssistantV2Message,
  TourAssistantV2SearchParams,
  TourAssistantV2SearchSession,
} from '../../types/tourAssistantV2';
import { buildAiHotelRouteParams } from '../../utils/aiHotelNavigation';
import TypewriterText from '../../component/ai/TypewriterText';
import TypingIndicator from '../../component/ai/TypingIndicator';

const CONV_STORAGE_KEY = 'tour_assistant_v2_active_conversation';

const SUGGESTIONS = [
  { label: 'Отдых на море', text: 'Хочу отдохнуть на море в июле' },
  { label: 'Туры из Москвы', text: 'Туры с вылетом из Москвы' },
  { label: 'Дубай', text: 'Хочу поехать в Дубай' },
  { label: 'Hilton Dubai', text: 'Покажи Hilton Dubai Palm' },
];

function mapMessagesWithHotels(
  messages: TourAssistantV2Message[],
  resultsHotels: AiHotelResult[],
): Array<TourAssistantV2Message & { displayHotels?: AiHotelResult[] }> {
  const lastAssistantWithHotelsIdx = [...messages]
    .map((m, i) => ({ m, i }))
    .reverse()
    .find(({ m }) => m.role === 'assistant' && (m.hotels?.length || m.type === 'hotels'))?.i;

  return messages.map((m, i) => {
    const hotels = m.hotels?.length ? m.hotels : undefined;
    const displayHotels =
      hotels ||
      (i === lastAssistantWithHotelsIdx && resultsHotels.length ? resultsHotels : undefined);
    return { ...m, displayHotels };
  });
}

const AiChatScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const isNearBottomRef = useRef(true);
  const { user, userId } = useSelector((state: RootState) => state.auth);
  const userName = (user as { name?: string } | null)?.name || '';

  const [messages, setMessages] = useState<
    Array<TourAssistantV2Message & { displayHotels?: AiHotelResult[] }>
  >([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<TourAssistantV2SearchParams>({});
  const [searchSession, setSearchSession] = useState<TourAssistantV2SearchSession | null>(null);
  const [writeText, setWriteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<TourAssistantV2ConversationSummary[]>([]);
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null);
  const [navigatingHotelId, setNavigatingHotelId] = useState<string | null>(null);
  const shouldAnimateNextResponse = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setNavigatingHotelId(null);
    }, []),
  );

  const storageKey = `${CONV_STORAGE_KEY}_${userId || 'guest'}`;

  const applyResponse = useCallback((data: {
    messages: TourAssistantV2Message[];
    results: { hotels: AiHotelResult[] };
    searchParams?: TourAssistantV2SearchParams;
    searchSession?: TourAssistantV2SearchSession;
  }) => {
    setMessages(mapMessagesWithHotels(data.messages, data.results?.hotels || []));
    if (data.searchParams) setSearchParams(data.searchParams);
    if (data.searchSession) setSearchSession(data.searchSession);
  }, []);

  const openHotelFromAi = useCallback(
    (hotel: AiHotelResult) => {
      const hotelData = (hotel.hotel as AiHotelResult) || hotel;
      const hotelId = hotelData.id || hotel.id;
      if (!hotelId) return;

      const id = String(hotelId);
      setNavigatingHotelId(id);
      const routeParams = buildAiHotelRouteParams(searchParams, hotelId, {
        ...hotelData,
        ...hotel,
        id: hotelId,
      });
      (navigation as { navigate: (a: string, b: object) => void }).navigate(
        'hotelFromAi',
        routeParams,
      );
    },
    [navigation, searchParams],
  );

  const refreshHistory = useCallback(async () => {
    try {
      const data = await listConversationsV2(userId || undefined);
      setConversations(data.conversations || []);
    } catch (e) {
      console.warn('[AiChat] list conversations failed', e);
    }
  }, [userId]);

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    const data = await createConversationV2(userId || undefined);
    setConversationId(data.conversationId);
    if (data.searchParams) setSearchParams(data.searchParams);
    await AsyncStorage.setItem(storageKey, data.conversationId);
    return data.conversationId;
  }, [conversationId, userId, storageKey]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    let cancelled = false;

    async function restoreConversation() {
      setInitializing(true);
      try {
        const savedId = await AsyncStorage.getItem(storageKey);
        if (savedId) {
          const data = await getConversationV2(savedId, userId || undefined);
          if (!cancelled && data.messages?.length) {
            setConversationId(savedId);
            applyResponse(data);
            return;
          }
        }

        const list = await listConversationsV2(userId || undefined);
        const recent = list.conversations?.[0];
        if (recent && !cancelled) {
          const data = await getConversationV2(recent.id, userId || undefined);
          if (data.messages?.length) {
            setConversationId(data.conversationId);
            await AsyncStorage.setItem(storageKey, data.conversationId);
            applyResponse(data);
          }
        }
      } catch {
        await AsyncStorage.removeItem(storageKey);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    restoreConversation();
    return () => {
      cancelled = true;
    };
  }, [storageKey, userId, applyResponse]);

  useEffect(() => {
    if (conversationId) {
      AsyncStorage.setItem(storageKey, conversationId).catch(() => {});
    }
  }, [conversationId, storageKey]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        // Only scroll — KeyboardAvoidingView already shifts the input.
        // Do not also change paddingBottom (that caused input flash/jump while typing).
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      },
    );
    return () => {
      show.remove();
    };
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
    const t = setTimeout(() => {
      if (isNearBottomRef.current) {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [messages, loading]);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      isNearBottomRef.current = distanceFromBottom < 120;
    },
    [],
  );

  const scrollToBottomIfNeeded = useCallback(() => {
    if (isNearBottomRef.current) {
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  }, []);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || writeText).trim();
    if (!text || loading) return;

    const optimisticUserMsg: TourAssistantV2Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      type: 'text',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setWriteText('');
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setLoading(true);
    shouldAnimateNextResponse.current = true;
    isNearBottomRef.current = true;

    try {
      const cid = await ensureConversation();
      const data = await sendMessageV2(cid, text, userId || undefined);
      applyResponse(data);

      if (shouldAnimateNextResponse.current) {
        const lastAssistant = [...(data.messages || [])]
          .reverse()
          .find((m) => m.role === 'assistant');
        if (lastAssistant?.content) {
          setAnimatingMessageId(lastAssistant.id);
        }
      }
      shouldAnimateNextResponse.current = false;

      refreshHistory();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          type: 'text',
          content: 'Не удалось обработать запрос. Попробуйте ещё раз.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    if (messages.length === 0 && !conversationId) return;
    Alert.alert('Новый чат', 'Начать новый разговор?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Начать',
        onPress: async () => {
          if (conversationId) {
            try {
              await deleteConversationV2(conversationId, userId || undefined);
            } catch {
              /* ignore */
            }
          }
          setConversationId(null);
          setMessages([]);
          setSearchParams({});
          setSearchSession(null);
          setWriteText('');
          setShowHistory(false);
          await AsyncStorage.removeItem(storageKey);
          await ensureConversation();
          refreshHistory();
        },
      },
    ]);
  };

  const formatDateForCard = (dateString: string, nights: number): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
      ];
      const month = months[date.getMonth()];
      let nightsText = `${nights} ночей`;
      if (nights === 1) nightsText = '1 ночь';
      else if (nights < 5) nightsText = `${nights} ночи`;
      return `от ${day} ${month} на ${nightsText}`;
    } catch {
      return '';
    }
  };

  const renderHotelCard = (hotel: AiHotelResult, index: number) => {
    const hotelData = (hotel.hotel as AiHotelResult) || hotel;
    const hotelName = hotelData.name || hotel.name || 'Отель';
    const stars = hotelData.stars || hotel.stars || 0;
    const city = hotelData.city_name || hotel.city_name || '';
    const rating = hotelData.rating || hotel.rating || 0;
    const reviews = hotelData.reviews_count || hotel.reviews_count || 0;
    const hotelId = hotelData.id || hotel.id || `hotel-${index}`;
    const amenities = hotel.amenities || [];
    const description = (hotel.description || '').trim();
    const dateInfo = formatDateForCard(
      searchParams.start_date || '',
      searchParams.nights || 7,
    );

    let imageSource: { uri: string } | null = null;
    const images = hotelData.images || hotel.images;
    if (images?.length) {
      const first = images[0] as Record<string, string> | string;
      if (typeof first === 'string') imageSource = { uri: first };
      else if (first.webp_x620) imageSource = { uri: first.webp_x620 };
      else if (first.x500) imageSource = { uri: first.x500 };
      else if (first.uri) imageSource = { uri: first.uri };
    }

    const minPrice = hotel.room_price || hotel.min_price || hotelData.min_price;
    const priceText = minPrice ? `${Math.round(Number(minPrice)).toLocaleString('ru-RU')} ₽` : null;
    const roomType = hotel.room_type || '';
    const mealType = hotel.meal_type || '';

    return (
      <TouchableOpacity
        key={String(hotelId)}
        activeOpacity={0.9}
        disabled={navigatingHotelId === String(hotelId)}
        onPress={() => openHotelFromAi(hotel)}
        style={[styles.hotelCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
      >
        {imageSource ? (
          <ImageBackground source={imageSource} style={styles.hotelImage} resizeMode="cover">
            <View style={styles.actionHotelButton}>
              {navigatingHotelId === String(hotelId) ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <AppIcon name="aiActionButton" size={36} color="black" />
              )}
            </View>
          </ImageBackground>
        ) : null}
        <View style={styles.hotelInfo}>
          <View style={styles.hotelHeaderRow}>
            {dateInfo ? (
              <Text allowFontScaling={false} style={[styles.hotelDate, { color: theme.textTertiary }]}>
                {dateInfo}
              </Text>
            ) : <View />}
            {priceText && (
              <Text allowFontScaling={false} style={[styles.hotelPrice, { color: theme.brand }]}>
                {priceText}
              </Text>
            )}
          </View>
          <Text allowFontScaling={false} style={[styles.hotelName, { color: theme.text }]} numberOfLines={2}>
            {hotelName}
          </Text>
          {city ? (
            <Text allowFontScaling={false} style={[styles.hotelCity, { color: theme.textSecondary }]}>
              {city}
            </Text>
          ) : null}
          {(roomType || mealType) ? (
            <Text allowFontScaling={false} style={[styles.hotelRoomType, { color: theme.textSecondary }]} numberOfLines={2}>
              {[roomType, mealType].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {description ? (
            <Text allowFontScaling={false} style={[styles.hotelDescription, { color: theme.textTertiary }]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
          {amenities.length > 0 && (
            <Text allowFontScaling={false} style={[styles.hotelAmenities, { color: theme.textSecondary }]} numberOfLines={1}>
              {amenities.join(' · ')}
            </Text>
          )}
          <View style={[styles.hotelFooter, { borderTopColor: theme.border }]}>
            {stars > 0 && (
              <View style={styles.starsContainer}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Text key={i} style={[styles.star, { color: theme.textTertiary }, i < stars && styles.starFilled]}>
                    ★
                  </Text>
                ))}
              </View>
            )}
            {(rating > 0 || reviews > 0) && (
              <View style={styles.hotelRating}>
                {reviews > 0 && (
                  <Text allowFontScaling={false} style={[styles.reviewsText, { color: theme.textTertiary }]}>
                    {reviews} отзывов
                  </Text>
                )}
                {rating > 0 && (
                  <View style={[styles.ratingBadge, { backgroundColor: theme.success }]}>
                    <Text allowFontScaling={false} style={styles.ratingText}>{Number(rating).toFixed(1)}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              style={styles.backButton}
            >
              <Text allowFontScaling={false} style={[styles.backButtonText, { color: theme.text }]}>←</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerTitleContainer}>
            <Text allowFontScaling={false} style={[styles.headerTitle, { color: theme.brand }]}>Totus</Text>
            <View style={[styles.aiBadge, { backgroundColor: theme.brand, borderColor: theme.brand }]}>
              <AppIcon color="black" size={36} name="logoAi" />
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setShowHistory((v) => !v)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              style={styles.resetButton}
            >
              <AppIcon name="info" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleResetChat}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              style={styles.resetButton}
            >
              <Text allowFontScaling={false} style={{ color: theme.text, fontSize: 22 }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showHistory && conversations.length > 0 && (
          <View style={[styles.historyPanel, { backgroundColor: theme.surfaceSecondary }]}>
            <AppText style={{ color: theme.textSecondary, marginBottom: 8, fontSize: 12 }}>
              История
            </AppText>
            {conversations.slice(0, 8).map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.historyItem}
                onPress={async () => {
                  setConversationId(c.id);
                  setShowHistory(false);
                  setLoading(true);
                  try {
                    const d = await getConversationV2(c.id, userId || undefined);
                    applyResponse(d);
                    await AsyncStorage.setItem(storageKey, c.id);
                  } catch {
                    Alert.alert('Ошибка', 'Не удалось загрузить чат');
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <AppText style={{ color: theme.text }} numberOfLines={1}>
                  {c.title}
                </AppText>
                {c.preview ? (
                  <AppText style={{ color: theme.textTertiary, fontSize: 12 }} numberOfLines={1}>
                    {c.preview}
                  </AppText>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {messages.length === 0 && !loading && !initializing && (
            <View style={styles.greetingSection}>
              <Text allowFontScaling={false} style={[styles.greetingTitle, { color: theme.text }]}>
                Привет{userName ? `, ${userName}` : ''}!
              </Text>
              <Text allowFontScaling={false} style={[styles.greetingSubtitle, { color: theme.text }]}>
                Ваш персональный travel-консьерж
              </Text>
              <Text allowFontScaling={false} style={[styles.greetingHint, { color: theme.textTertiary }]}>
                Подберу отель или тур — просто напишите, куда хотите поехать
              </Text>
              <View style={styles.tagsContainer}>
                {SUGGESTIONS.map((tag) => (
                  <TouchableOpacity
                    key={tag.text}
                    style={[styles.suggestionTag, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                    onPress={() => handleSend(tag.text)}
                    disabled={loading}
                  >
                    <Text allowFontScaling={false} style={[styles.tagText, { color: theme.text }]}>
                      {tag.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m) => (
            <View key={m.id} style={styles.messageWrapper}>
              <View
                style={[
                  styles.messageBubble,
                  m.role === 'user'
                    ? [styles.userBubble, { backgroundColor: theme.surfaceSecondary }]
                    : [styles.aiBubble, { backgroundColor: theme.surfaceSecondary }],
                ]}
              >
                {m.role === 'assistant' ? (
                  <TypewriterText
                    allowFontScaling={false}
                    text={m.content}
                    style={[styles.messageText, { color: theme.text }]}
                    animate={m.id === animatingMessageId}
                    onProgress={scrollToBottomIfNeeded}
                    onComplete={() => {
                      setAnimatingMessageId(null);
                      scrollToBottomIfNeeded();
                    }}
                  />
                ) : (
                  <Text allowFontScaling={false} style={[styles.messageText, { color: theme.text }]}>
                    {m.content}
                  </Text>
                )}
              </View>
              {m.displayHotels &&
                m.displayHotels.length > 0 &&
                m.id !== animatingMessageId && (
                <View style={styles.hotelsContainer}>
                  {m.displayHotels.map((hotel, i) => renderHotelCard(hotel, i))}
                </View>
              )}
            </View>
          ))}

          {initializing && (
            <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.surfaceSecondary }]}>
              <TypingIndicator color={theme.textTertiary} />
            </View>
          )}

          {loading && (
            <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.surfaceSecondary }]}>
              <TypingIndicator color={theme.textTertiary} />
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: theme.background,
              borderTopColor: theme.border,
            },
          ]}
        >
          <TextInput
            allowFontScaling={false}
            style={[styles.textInput, { backgroundColor: theme.surfaceSecondary, color: theme.text }]}
            value={writeText}
            onChangeText={setWriteText}
            placeholder="Куда хотите поехать?"
            placeholderTextColor={theme.textTertiary}
            editable={!loading}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.brand }, loading && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <AppIcon name="sendButton" size={49} color="black" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AiChatScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  backButtonText: { fontSize: 24, fontWeight: '400' },
  resetButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  aiBadge: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  historyPanel: { padding: 12, maxHeight: 180 },
  historyItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  greetingSection: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  greetingTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  greetingSubtitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  greetingHint: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  tagsContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  suggestionTag: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: '500' },
  messageWrapper: { marginBottom: 10 },
  messageBubble: { maxWidth: '85%', padding: 12, marginVertical: 5, borderRadius: 15 },
  userBubble: { alignSelf: 'flex-end', borderTopRightRadius: 0 },
  aiBubble: { alignSelf: 'flex-start', borderTopLeftRadius: 0 },
  messageText: { fontSize: 16, lineHeight: 22 },
  inputContainer: {
    flexDirection: 'row', paddingHorizontal: 20, paddingTop: 15,
    alignItems: 'center', borderTopWidth: 1, zIndex: 10,
  },
  textInput: {
    flex: 1, height: 50, borderRadius: 25, paddingHorizontal: 20,
    fontSize: 16, marginRight: 10,
  },
  sendButton: { width: 50, height: 50, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  hotelsContainer: { marginVertical: 10, gap: 12 },
  hotelCard: {
    borderRadius: 12, overflow: 'hidden', marginVertical: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
    width: '85%', borderWidth: 1, padding: 16,
  },
  hotelImage: {
    width: '100%', height: 130, backgroundColor: '#1a1a1a',
    borderRadius: 8, overflow: 'hidden', alignItems: 'flex-end', justifyContent: 'flex-end',
  },
  actionHotelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotelInfo: { paddingTop: 12 },
  hotelHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hotelName: { fontSize: 16, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  starsContainer: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 16 },
  starFilled: { color: '#FE732E' },
  hotelCity: { fontSize: 14, marginBottom: 4 },
  hotelRoomType: { fontSize: 13, marginBottom: 4, fontWeight: '500' },
  hotelDescription: { fontSize: 13, marginBottom: 4, lineHeight: 18 },
  hotelAmenities: { fontSize: 12, marginBottom: 6 },
  hotelDate: { fontSize: 13, fontWeight: '500' },
  hotelFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, marginTop: 8, paddingTop: 8,
  },
  hotelRating: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingText: { color: 'white', fontSize: 12, fontWeight: '600' },
  reviewsText: { fontSize: 12 },
  hotelPrice: { fontSize: 18, fontWeight: '600' },
});
