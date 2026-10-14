import React, {useEffect, useRef, useState} from 'react';
import Account from '../../component/account/Account';
import {AppText, Content} from '../../component/UI';
import {
  Alert,
  Dimensions,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  ImageBackground,
} from "react-native";
import { FontText as Text } from "../../component/UI/text/FontText";
import LottieView from "lottie-react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useDispatch, useSelector} from "react-redux";
import {RootState, AppDispatch} from "../../modules/store";
import {runFullSearchFlow} from "../../modules/store/slices/search.ts";
import {useAiSearch} from "../../modules/hooks/useAiSearch";
import {synthesizeGoogleTts, playGoogleTtsAudio, stopGoogleTtsAudio} from "../../modules/api/googleTtsApi.ts";
import { playSpeechStartChimeAsync } from '../../modules/audio/speechFeedback';
import { useTheme } from '../../hooks/useTheme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppIcon } from '../../component/UI';
import axios from 'axios';
import InCallManager from 'react-native-incall-manager';
import { FONT_HEADING } from '../../theme/fonts';

const {width,height} = Dimensions.get('window');

let Voice: any = null;
let Tts: any = null;
let voiceAvailable = false;
let ttsAvailable = false;

try {
    Voice = require('@react-native-voice/voice').default;
    voiceAvailable = true;
} catch (e) {
    console.warn('⚠️ @react-native-voice/voice not available:', e);
}

try {
    Tts = require('react-native-tts').default;
    ttsAvailable = true;
} catch (e) {
    console.warn('⚠️ react-native-tts not available:', e);
}

interface SearchParams {
    from_city: string;
    from_country: string;
    to_country: string;
    to_city: string;
    adults: string;
    kids: string;
    kids_ages: string[];
    start_date: string;
    nights: number;
    search_type: string;
    flex_dates: number;
    hotel_ids: string[];
    page_number: number;
    page_limit: number;
    sort_by: string;
    filter_price_min?: number;
    filter_price_max?: number;
    filter_stars?: string;
    filter_meals?: string;
    filter_instant_confirm?: boolean;
    filter_regions?: string;
    filter_line?: string;
    filter_operators?: string;
    filter_hotel_type?: string;
    filter_beach_surface?: string;
}

interface Hotel {
    id: number | string;
    name?: string;
    name_en?: string;
    city_name?: string;
    stars?: number;
    rating?: number;
    reviews?: number;
    reviews_count?: number;
    images?: any[];
    min_price?: number;
    hotel?: any;
    [key: string]: any;
}

// const BACKEND_URL = __DEV__ ? 'https://server.totus.club' : 'https://server.totus.club';
const BACKEND_URL = __DEV__ ? 'http://192.168.1.110:4444' : 'http://192.168.1.110:4444';

const AI_MESSAGES = {
    listening: 'Слушаю вас...',
    waiting: 'Нажмите микрофон и скажите, куда хотите поехать',
    thinking: 'Ищу ответ...',
    searching: 'Ищу подходящие отели...',
    speaking: 'Отвечаю...',
    searchError: 'Не удалось найти отели. Попробуйте изменить параметры',
    error: 'Что-то пошло не так. Нажмите микрофон и попробуйте снова',
} as const;

// Remove emojis and special symbols for clean TTS speech
const stripEmojisForTTS = (text: string): string => {
    return text
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols (sun, stars, etc.)
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
        .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
        .replace(/\*\*/g, '')                   // Remove markdown bold
        .replace(/\s+/g, ' ')                   // Normalize whitespace
        .trim();
};

/** Normalize @react-native-voice payloads for live + final captions (iOS/Android differ). */
function extractSpeechText(e: any): string | null {
    if (e == null) {
        return null;
    }
    if (typeof e === 'string') {
        const t = e.trim();
        return t.length > 0 ? t : null;
    }
    const v = e.value ?? e?.nativeEvent?.value;
    if (v == null) {
        return null;
    }
    if (typeof v === 'string') {
        const t = v.trim();
        return t.length > 0 ? t : null;
    }
    if (Array.isArray(v)) {
        const parts = v
            .map((x: unknown) => (typeof x === 'string' ? x : String(x)))
            .map((s) => s.trim())
            .filter(Boolean);
        const joined = parts.join(' ').trim();
        return joined.length > 0 ? joined : null;
    }
    return null;
}

const AiScreen = () => {
    const { theme, isDark } = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets()
    const {user} = useSelector((state: RootState) => state.auth);
    const userName = (user as any)?.name || '';
    const { allMyHotels, hotels, loading: hotelLoad, requestId } = useSelector(
        (state: RootState) => state.search,
    );
    const aiSearch = useAiSearch();
    const lastSearchedParamsRef = useRef<any>(null);
    
    const [startAnimation, setStartAnimation] = useState(false)
    const [isRecording, setIsRecording] = useState(false);
    const [recognized, setRecognized] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string, hotels?: any[]}>>([]);
    const [assistantResponse, setAssistantResponse] = useState<string>('');
    const lastRecognizedTextRef = useRef<string>('');
    const [aiState, setAiState] = useState<{ message: string; recording: boolean; animation: boolean }>({
        message: AI_MESSAGES.waiting,
        recording: false,
        animation: false,
    });
    const [searchParams, setSearchParams] = useState<SearchParams>({
        from_city: '',
        from_country: 'RU',
        to_country: '',
        to_city: '',
        adults: '1',
        kids: '0',
        kids_ages: [],
        start_date: '',
        nights: 1,
        search_type: 'package',
        flex_dates: 0,
        hotel_ids: [],
        page_number: 1,
        page_limit: 3,
        sort_by: 'relevance',
    });
    const [displayedHotels, setDisplayedHotels] = useState<Hotel[]>([]);
    const lastRequestIdRef = useRef<string | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stopRef = useRef<(options?: { skipSend?: boolean }) => Promise<void>>(undefined);

    const requestMicPermission = async () => {
        if (Platform.OS !== 'android') return true;

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.log('Mic permission error:', err);
            return false;
        }
    };

    // Keep screen awake while on this screen
    useEffect(() => {
        console.log('🔆 Keeping screen awake');
        InCallManager.setKeepScreenOn(true);
        
        return () => {
            console.log('🔅 Allowing screen to sleep');
            InCallManager.setKeepScreenOn(false);
        };
    }, []);

    useEffect(() => {
        if (!voiceAvailable || !Voice) {
            console.warn('⚠️ Voice recognition not available');
            return;
        }
        try {
            const scheduleSilenceAutoSend = () => {
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
                silenceTimerRef.current = setTimeout(() => {
                    silenceTimerRef.current = null;
                    if (lastRecognizedTextRef.current) {
                        console.log('🎤 4s silence after answer – auto-send');
                        stopRef.current?.();
                    }
                }, 4000);
            };

            const onSpeechCaption = (e: any) => {
                const text = extractSpeechText(e);
                if (!text) {
                    return;
                }
                setRecognized(text);
                lastRecognizedTextRef.current = text;
                scheduleSilenceAutoSend();
                console.log('📝 Speech caption (partial/final):', text);
            };

            Voice.onSpeechResults = onSpeechCaption;
            Voice.onSpeechPartialResults = onSpeechCaption;

            Voice.onSpeechError = (e: any) => {
                console.log('Speech error:', e);
                setIsRecording(false);
            };

            Voice.onSpeechStart = () => {
                console.log('✅ Speech recognition started');
            };

            Voice.onSpeechEnd = () => {
                console.log('✅ Speech recognition ended');
                setIsRecording(false);
            };

        } catch (err) {
            console.error('❌ Failed to initialize Voice:', err);
        }

        return () => {
            if (Voice) {
                try {
                    Voice.destroy().then(() => {
                        Voice.removeAllListeners();
                    }).catch((e: any) => {
                        console.warn('Error cleaning up Voice:', e);
                    });
                } catch (e) {
                    console.warn('Error destroying Voice:', e);
                }
            }
        };
    }, []);

    // Auto-start recording when navigating from Text AI screen (only then)
    const hasAutoStartedRef = useRef(false);
    useEffect(() => {
        const autoStart = !!(route.params as any)?.autoStart;
        if (!autoStart || hasAutoStartedRef.current || !voiceAvailable || !Voice) return;
        hasAutoStartedRef.current = true;
        console.log('[AiScreen] Auto-start recording: navigated from Text AI');
        const t = setTimeout(() => start(), 400);
        return () => clearTimeout(t);
    }, [route.params]);

    const start = async () => {
        if (!voiceAvailable || !Voice) {
            Alert.alert('Ошибка', 'Распознавание речи недоступно');
            return;
        }

        const hasMic = await requestMicPermission();
        if (!hasMic) {
            Alert.alert('Ошибка', 'Разрешение на микрофон не выдано');
            return;
        }

        try {
            stopGoogleTtsAudio();

            const available = await Voice.isAvailable();
            if (!available) {
                Alert.alert('Ошибка', 'Speech Recognition недоступен на устройстве');
                return;
            }

            setRecognized("");
            lastRecognizedTextRef.current = '';
            try {
                if (typeof Voice.destroy === 'function') {
                    await Voice.destroy();
                }
            } catch {
                /* re-binds NativeEventEmitter listeners for this session */
            }

            await playSpeechStartChimeAsync();

            setAiState({ message: AI_MESSAGES.listening, recording: true, animation: true });
            setIsRecording(true);

            await Voice.start('ru-RU');
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
                silenceTimerRef.current = null;
                if (lastRecognizedTextRef.current) return;
                console.log('🎤 4s silence – auto-stop, no send');
                stopRef.current?.({ skipSend: true });
            }, 4000);
            console.log('🎤 Started recording...');

        } catch (err: any) {
            console.error('Start error:', err);
            setIsRecording(false);
            Alert.alert('Ошибка', `Не удалось начать запись: ${err?.message || 'Неизвестная ошибка'}`);
        }
    };

    const stop = async (options?: { skipSend?: boolean }) => {
        const skipSend = options?.skipSend ?? false;
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        if (!voiceAvailable || !Voice) {
            return;
        }

        try {
            setIsRecording(false);
            await Voice.stop();
            console.log('🛑 Stopped recording...');

            if (skipSend) {
                setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
                lastRecognizedTextRef.current = '';
                setRecognized('');
                return;
            }

            setAiState({ message: AI_MESSAGES.thinking, recording: false, animation: true })
            setTimeout(() => {
                const textToSend = lastRecognizedTextRef.current || recognized;
                if (textToSend && textToSend.trim().length > 0) {
                    console.log('📤 Sending recognized text to backend:', textToSend);
                    sendToServer(textToSend);
                    lastRecognizedTextRef.current = '';
                    setRecognized('');
                } else {
                    console.log('⚠️ No recognized text to send');
                    setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
                }
            }, 500);
        } catch (err: any) {
            console.error('Stop error:', err);
            try {
                await Voice.cancel();
            } catch (cancelErr) {
                console.warn('Cancel error:', cancelErr);
            }
            if (skipSend) {
                setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
                lastRecognizedTextRef.current = '';
                setRecognized('');
                return;
            }
            const textToSend = lastRecognizedTextRef.current || recognized;
            if (textToSend && textToSend.trim().length > 0) {
                console.log('📤 Sending recognized text to backend (after error):', textToSend);
                sendToServer(textToSend);
                lastRecognizedTextRef.current = '';
                setRecognized('');
            } else {
                setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
            }
        }
    };

    // Keep ref updated to latest stop function for use in callbacks
    stopRef.current = stop;

    async function sendToServer(text: string) {
        if (!text || text.trim().length === 0) {
            return;
        }

        setLoading(true);
        setAssistantResponse(''); // Clear previous response
        setAiState({ message: AI_MESSAGES.thinking, recording: false, animation: true });

        try {
            console.log('🤖 Calling Tour Assistant Stream API with:', text);

            // Same as text AI: send real current page so backend can force next page for "другие"/"ещё"
            const currentPageFromHook = aiSearch.getCurrentPage();
            const currentSearchParamsForBackend = {
                ...searchParams,
                page_number: currentPageFromHook > 0 ? currentPageFromHook : (searchParams.page_number ?? 1),
            };

            const historyWithUser = [...conversationHistory.map(m => ({ role: m.role, content: m.content, hotels: m.hotels })), { role: 'user', content: text }];
            const resp = await axios.post(`${BACKEND_URL}/api/tour-assistant/stream`, {
                text: text,
                conversationHistory: historyWithUser,
                currentSearchParams: currentSearchParamsForBackend,
            });

            const { chatMode, nextQuestion, searchParams: updatedParams } = resp.data;

            // Same pagination keywords as text AI
            const userWantsMore = text && (
                text.toLowerCase().includes('другие') ||
                text.toLowerCase().includes('ещё') ||
                text.toLowerCase().includes('еще') ||
                text.toLowerCase().includes('ещо') ||
                text.toLowerCase().includes('следующие') ||
                text.toLowerCase().includes('дальше') ||
                text.toLowerCase().includes('ищи') ||
                text.toLowerCase().includes('поищи') ||
                text.toLowerCase().includes('найди') ||
                text.toLowerCase().includes('предлагай')
            );
            const hasSearch = aiSearch.hasActiveSearch();

            // "Pagination first" – same as text AI: user said "другие"/"ещё" and we have a search → load next page, TTS only
            if (userWantsMore && hasSearch) {
                const nextPage = aiSearch.getCurrentPage() + 1;
                const searchMsg = nextQuestion && nextQuestion.trim() ? nextQuestion : 'Ищу ещо варианты для вас...';
                const newHistory = [
                    ...conversationHistory,
                    { role: 'user', content: text },
                    { role: 'assistant', content: searchMsg },
                ];
                setConversationHistory(newHistory.slice(-10));
                setAssistantResponse(searchMsg);
                setAiState({ message: AI_MESSAGES.searching, recording: false, animation: true });
                try {
                    const ttsText = stripEmojisForTTS(searchMsg);
                    console.log('🔊 TTS text:', ttsText);
                    const ttsSearch = await synthesizeGoogleTts(ttsText, {
                        languageCode: 'ru-RU',
                        ssmlGender: 'FEMALE',
                        audioEncoding: 'MP3',
                        voiceName: 'ru-RU-Chirp3-HD-Aoede',
                    });
                    await playGoogleTtsAudio(ttsSearch.audioContent, ttsSearch.audioEncoding);
                } catch (_) {}
                try {
                    const { fullList, newHotels } = await aiSearch.loadNextPage(nextPage);
                    setDisplayedHotels([...fullList]);
                    setSearchParams(prev => ({ ...prev, page_number: nextPage }));
                    lastSearchedParamsRef.current = { ...searchParams, _to_city: searchParams.to_city, page_number: nextPage };
                    setConversationHistory(prev => {
                        const p = [...prev];
                        const last = p.length - 1;
                        if (last >= 0 && p[last].role === 'assistant') {
                            p[last] = { ...p[last], hotels: (newHotels || []).map((h: any) => ({ ...h })) };
                        }
                        return p.slice(-10);
                    });
                    const hotelCount = (newHotels || []).length;
                    const totalCount = fullList.length;
                    const resultMsg = hotelCount > 0
                        ? `Нашёл ещё ${hotelCount} ${hotelCount === 1 ? 'вариант' : hotelCount < 5 ? 'варианта' : 'вариантов'}. Всего ${totalCount}. Хотите посмотреть ещё или уточнить поиск?`
                        : 'Больше вариантов не найдено. Хотите изменить параметры?';
                    const ttsTextResult = stripEmojisForTTS(resultMsg);
                    console.log('🔊 TTS text:', ttsTextResult);
                    const ttsResult = await synthesizeGoogleTts(ttsTextResult, {
                        languageCode: 'ru-RU',
                        ssmlGender: 'FEMALE',
                        audioEncoding: 'MP3',
                        voiceName: 'ru-RU-Chirp3-HD-Aoede',
                    });
                    setAiState({ message: AI_MESSAGES.speaking, recording: false, animation: true });
                    await playGoogleTtsAudio(ttsResult.audioContent, ttsResult.audioEncoding);
                    setTimeout(() => start(), 400);
                } catch (e: any) {
                    console.error('[AiScreen] Pagination load error:', e);
                    const isNetwork = e?.message === 'Network Error' || e?.code === 'ERR_NETWORK';
                    const msg = isNetwork ? 'Проверьте подключение к интернету и попробуйте снова.' : (e?.userMessage || 'Не удалось загрузить ещё варианты. Попробуйте ещё раз.');
                    try {
                        const ttsTextErr = stripEmojisForTTS(msg);
                        console.log('🔊 TTS text:', ttsTextErr);
                        const errTts = await synthesizeGoogleTts(ttsTextErr, {
                            languageCode: 'ru-RU',
                            ssmlGender: 'FEMALE',
                            audioEncoding: 'MP3',
                            voiceName: 'ru-RU-Chirp3-HD-Aoede',
                        });
                        await playGoogleTtsAudio(errTts.audioContent, errTts.audioEncoding);
                        setTimeout(() => start(), 400);
                    } catch (_) {}
                }
                setLoading(false);
                setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
                return;
            }

            // Update conversation history (normal path)
            const newHistory = [
                ...conversationHistory,
                { role: 'user', content: text },
                { role: 'assistant', content: nextQuestion || '' },
            ];
            setConversationHistory(newHistory.slice(-10));
            setAssistantResponse(nextQuestion || '');

            if (chatMode) {
                // Play TTS for chat response
                try {
                    const ttsTextChat = stripEmojisForTTS(nextQuestion || 'Чем еще могу помочь?');
                    console.log('🔊 TTS text:', ttsTextChat);
                    const ttsResponse = await synthesizeGoogleTts(ttsTextChat, {
                        languageCode: 'ru-RU',
                        ssmlGender: 'FEMALE',
                        audioEncoding: 'MP3',
                        voiceName: 'ru-RU-Chirp3-HD-Aoede', // Female voice
                    });

                    setAiState({ message: AI_MESSAGES.speaking, recording: false, animation: true });
                    const audioState = await playGoogleTtsAudio(ttsResponse.audioContent, ttsResponse.audioEncoding);

                    if (audioState.finished) {
                        console.log('🎧 Audio finished');
                        setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
                    }
                    setTimeout(() => start(), 400);
                } catch (audioErr: any) {
                    console.warn('⚠️ Audio playback failed:', audioErr);
                    setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
                    setTimeout(() => start(), 400);
                }
            } else {
                // In search mode - save updated searchParams
                // IMPORTANT: Always update searchParams with the latest page_number from AI
                if (updatedParams && Object.keys(updatedParams).length > 0) {
                    setSearchParams(prev => {
                        const merged = { ...prev, ...updatedParams };
                        // Ensure page_number is always updated from AI's response
                        if (updatedParams.page_number !== undefined) {
                            merged.page_number = updatedParams.page_number;
                        }
                        return merged;
                    });
                }

                // Check if this is pagination (user wants more results) - check BEFORE allFieldsFilled
                const params = { ...searchParams, ...updatedParams };
                const paramToCity = params.to_city || '';
                delete params.to_city;
                if (!params.from_city && params.from_country) {
                    params.from_city = 'Moscow';
                }

                // AI-BASED PAGINATION DETECTION - Trust AI completely
                // AI determines pagination through page_number in searchParams
                const currentPage = aiSearch.getCurrentPage();
                const lastSearched = lastSearchedParamsRef.current;
                const aiPageNumber = updatedParams?.page_number || 1;
                
                // Check if core search params changed (country, date, city)
                // This helps distinguish between pagination and new search
                const coreParamsChanged = lastSearched && (
                    lastSearched.to_country !== params.to_country ||
                    lastSearched.start_date !== params.start_date ||
                    (lastSearched._to_city || '') !== paramToCity
                );

                // Same as text AI: pagination when active search + (AI says next page OR user said "другие"/"ещё")
                const userWantsPagination = text && (
                    text.toLowerCase().includes('другие') ||
                    text.toLowerCase().includes('ещё') ||
                    text.toLowerCase().includes('еще') ||
                    text.toLowerCase().includes('ещо') ||
                    text.toLowerCase().includes('следующие') ||
                    text.toLowerCase().includes('дальше') ||
                    text.toLowerCase().includes('ищи') ||
                    text.toLowerCase().includes('поищи') ||
                    text.toLowerCase().includes('найди') ||
                    text.toLowerCase().includes('предлагай')
                );
                const isPagination = aiSearch.hasActiveSearch() &&
                    !coreParamsChanged &&
                    (aiPageNumber > 1 || userWantsPagination);

                // Next page: when user asked for more, use currentPage+1; else use AI's page_number
                const pageNum = isPagination && userWantsPagination
                    ? Math.max(aiPageNumber, currentPage + 1)
                    : (updatedParams?.page_number ?? searchParams?.page_number ?? 1);

                console.log('[AiScreen] Pagination detection:', {
                    aiPageNumber,
                    currentPage,
                    userWantsPagination,
                    isPagination,
                    pageNum,
                });

                // Check if all required search fields are filled
                // Required fields: from_city/from_country, to_country, adults, start_date, nights, filter_price_max, kids, kids_ages (if kids > 0)
                // But skip this check if it's pagination (all fields should already be filled)
                const mergedForCheck = { ...searchParams, ...updatedParams };
                const hasFrom = mergedForCheck.from_city || mergedForCheck.from_country;
                const hasToCountry = mergedForCheck.to_country;
                const hasAdults = mergedForCheck.adults;
                const hasStartDate = mergedForCheck.start_date;
                const hasNights = mergedForCheck.nights;
                const hasPriceMax = mergedForCheck.filter_price_max;
                const hasKids = mergedForCheck.kids !== undefined && mergedForCheck.kids !== null;
                const kidsValue = parseInt(mergedForCheck.kids || '0', 10);
                const hasKidsAges = kidsValue === 0 || (mergedForCheck.kids_ages && Array.isArray(mergedForCheck.kids_ages));
                
                // IMPORTANT: If it's pagination, always allow search to proceed
                // Pagination means we already have an active search with all fields filled
                const allFieldsFilled = isPagination || (
                    hasFrom &&
                    hasToCountry &&
                    hasAdults &&
                    hasStartDate &&
                    hasNights &&
                    hasPriceMax &&
                    hasKids &&
                    hasKidsAges
                );
                
                console.log('[AiScreen] Required fields check:', {
                    isPagination,
                    hasFrom,
                    hasToCountry,
                    hasAdults,
                    hasStartDate,
                    hasNights,
                    hasPriceMax,
                    hasKids,
                    hasKidsAges,
                    kidsValue,
                    allFieldsFilled,
                });

                if (!allFieldsFilled && !isPagination) {
                    // Still missing fields → ask next question (but not if it's pagination)
                    if (nextQuestion && nextQuestion.trim()) {
                        try {
                            const ttsTextQuestion = stripEmojisForTTS(nextQuestion);
                            console.log('🔊 TTS text:', ttsTextQuestion);
                            const ttsResponse = await synthesizeGoogleTts(ttsTextQuestion, {
                                languageCode: 'ru-RU',
                                ssmlGender: 'FEMALE',
                                audioEncoding: 'MP3',
                                voiceName: 'ru-RU-Chirp3-HD-Aoede',
                            });

                            setAiState({ message: AI_MESSAGES.speaking, recording: false, animation: true });
                            const audioState = await playGoogleTtsAudio(ttsResponse.audioContent, ttsResponse.audioEncoding);

                            if (audioState.finished) {
                                setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
                            }
                            setTimeout(() => start(), 400);
                        } catch (audioErr: any) {
                            console.warn('⚠️ Audio playback failed:', audioErr);
                            setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
                            setTimeout(() => start(), 400);
                        }
                    }
                } else {
                    // All fields filled OR pagination → start search
                    console.log('[AiScreen] All fields filled or pagination, starting search...');
                    // Build filterParams from searchParams (filters are optional)
                    const filterParams: any = {
                        page_number: pageNum,
                        page_limit: 3, // ALWAYS 3 hotels per page - CRITICAL
                        sort_by: 'relevance',
                    };

                    // Extract filters from searchParams if they exist
                    const filterFields = [
                        'filter_price_min',
                        'filter_price_max',
                        'filter_stars',
                        'filter_meals',
                        'filter_instant_confirm',
                        'filter_regions',
                        'filter_line',
                        'filter_operators',
                        'filter_hotel_type',
                        'filter_beach_surface',
                    ];

                    // Use merged params (searchParams + updatedParams) to get all filters
                    // For pagination, use searchParams (already contains filters from previous search)
                    // For new search, use merged params (includes filters from updatedParams)
                    const paramsForFilters = isPagination ? searchParams : { ...searchParams, ...updatedParams };
                    
                    console.log('[AiScreen] Extracting filters from:', {
                        isPagination,
                        searchParamsFilters: {
                            price_min: searchParams.filter_price_min,
                            price_max: searchParams.filter_price_max,
                        },
                        updatedParamsFilters: {
                            price_min: updatedParams?.filter_price_min,
                            price_max: updatedParams?.filter_price_max,
                        },
                        paramsForFiltersFilters: {
                            price_min: paramsForFilters.filter_price_min,
                            price_max: paramsForFilters.filter_price_max,
                        },
                    });
                    
                    for (const field of filterFields) {
                        if (paramsForFilters[field] !== undefined && paramsForFilters[field] !== null && paramsForFilters[field] !== '') {
                            filterParams[field] = paramsForFilters[field];
                        }
                    }
                    
                    console.log('[AiScreen] Final filterParams:', filterParams);

                    // Set default filters only if not specified by user.
                    // Match kedam-WEB: never invent AI meal filter when user did not specify one.
                    if (!filterParams.filter_price_min) {
                        filterParams.filter_price_min = 0;
                    }
                    if (!filterParams.filter_instant_confirm) {
                        filterParams.filter_instant_confirm = false;
                    }
                    if (!filterParams.filter_stars) {
                        filterParams.filter_stars = '3,4,5';
                    }

                    // Update searchParams
                    setSearchParams(prev => ({ ...prev, ...updatedParams, page_number: pageNum }));

                    // Use AI's message if available, otherwise default
                    const searchTtsMessage = nextQuestion && nextQuestion.trim()
                        ? nextQuestion
                        : (pageNum > 1 ? 'Ищу ещё варианты для вас...' : 'Ищу подходящие отели для вас...');

                    // Play searching message via TTS
                    setAiState({ message: AI_MESSAGES.searching, recording: false, animation: true });
                    try {
                        const ttsTextSearch = stripEmojisForTTS(searchTtsMessage);
                        console.log('🔊 TTS text:', ttsTextSearch);
                        const ttsResponse = await synthesizeGoogleTts(ttsTextSearch, {
                            languageCode: 'ru-RU',
                            ssmlGender: 'FEMALE',
                            audioEncoding: 'MP3',
                            voiceName: 'ru-RU-Chirp3-HD-Aoede',
                        });
                        await playGoogleTtsAudio(ttsResponse.audioContent, ttsResponse.audioEncoding);
                    } catch (audioErr: any) {
                        console.warn('⚠️ Audio playback failed:', audioErr);
                    }

                    // Perform search (new) or pagination (next page)
                    try {
                        let foundHotels: any[] | { fullList: any[]; newHotels: any[] } = [];
                        if (isPagination) {
                            // Get the actual current page from the hook
                            const actualCurrentPage = aiSearch.getCurrentPage();
                            console.log('[AiScreen] Pagination requested - pageNum:', pageNum, 'actualCurrentPage:', actualCurrentPage, 'isPagination:', isPagination);
                            
                            // Ensure we're loading a page that's actually next
                            // If pageNum is valid and > current, use it; otherwise increment
                            let actualNextPage: number;
                            if (pageNum > actualCurrentPage) {
                                actualNextPage = pageNum;
                            } else {
                                actualNextPage = actualCurrentPage + 1;
                            }
                            
                            // Double-check: ensure we're not loading the same page
                            if (actualNextPage <= actualCurrentPage) {
                                console.warn('[AiScreen] WARNING: actualNextPage', actualNextPage, 'is not greater than current', actualCurrentPage, '- incrementing');
                                actualNextPage = actualCurrentPage + 1;
                            }
                            
                            console.log('[AiScreen] Loading next page:', actualNextPage, '(current:', actualCurrentPage, ')');
                            const nextResult = await aiSearch.loadNextPage(actualNextPage);
                            foundHotels = nextResult; // { fullList, newHotels }
                            console.log('[AiScreen] Loaded', nextResult.newHotels.length, 'new hotels for page', actualNextPage, 'total', nextResult.fullList.length);
                            
                            lastSearchedParamsRef.current = { ...params, _to_city: paramToCity };
                            if (nextResult.newHotels.length === 0) {
                                console.warn('[AiScreen] No new hotels loaded for page', actualNextPage);
                            }
                        } else {
                            lastSearchedParamsRef.current = { ...params, _to_city: paramToCity };
                            console.log('[AiScreen] Starting new search with params:', params);
                            foundHotels = await aiSearch.runSearch(params, filterParams);
                        }

                        // Pagination: foundHotels is { fullList, newHotels }; new search: Hotel[]
                        const isPaginationResult = foundHotels && typeof foundHotels === 'object' && !Array.isArray(foundHotels) && 'fullList' in foundHotels && 'newHotels' in foundHotels;
                        const fullList = isPaginationResult ? (foundHotels as { fullList: any[] }).fullList : (Array.isArray(foundHotels) ? foundHotels : []);
                        const hotelsForMessage = isPaginationResult ? (foundHotels as { newHotels: any[] }).newHotels : (Array.isArray(foundHotels) ? foundHotels : []);

                        setDisplayedHotels([...fullList]);
                        setConversationHistory(prev => {
                            const updated = [...prev];
                            const lastIdx = updated.length - 1;
                            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                                updated[lastIdx] = {
                                    role: updated[lastIdx].role,
                                    content: updated[lastIdx].content,
                                    hotels: hotelsForMessage.map((h: any) => ({ ...h })),
                                };
                            }
                            return updated;
                        });

                        const totalHotelsToShow = hotelsForMessage.length;
                        if (totalHotelsToShow > 0) {
                            const hotelCount = hotelsForMessage.length;
                            const totalCount = fullList.length;
                            const hotelMessage = isPagination && hotelCount > 0
                                ? `Нашёл ещё ${hotelCount} ${hotelCount === 1 ? 'вариант' : hotelCount < 5 ? 'варианта' : 'вариантов'}. Всего ${totalCount}. Хотите посмотреть ещё или уточнить поиск?`
                                : `Нашёл ${hotelCount} ${hotelCount === 1 ? 'вариант' : hotelCount < 5 ? 'варианта' : 'вариантов'}. Хотите посмотреть ещё или уточнить поиск?`;
                            try {
                                const ttsTextHotel = stripEmojisForTTS(hotelMessage);
                                console.log('🔊 TTS text:', ttsTextHotel);
                                const ttsResponse = await synthesizeGoogleTts(ttsTextHotel, {
                                    languageCode: 'ru-RU',
                                    ssmlGender: 'FEMALE',
                                    audioEncoding: 'MP3',
                                    voiceName: 'ru-RU-Chirp3-HD-Aoede',
                                });
                                await playGoogleTtsAudio(ttsResponse.audioContent, ttsResponse.audioEncoding);
                                setTimeout(() => start(), 400);
                            } catch (audioErr: any) {
                                console.warn('⚠️ Hotel message audio failed:', audioErr);
                            }
                        } else {
                            const noHotelsMessage = isPagination
                                ? 'Больше вариантов не найдено. Хотите изменить параметры?'
                                : 'К сожалению, не найдено отелей. Попробуйте изменить критерии.';
                            try {
                                const ttsTextNoHotels = stripEmojisForTTS(noHotelsMessage);
                                console.log('🔊 TTS text:', ttsTextNoHotels);
                                const ttsResponse = await synthesizeGoogleTts(ttsTextNoHotels, {
                                    languageCode: 'ru-RU',
                                    ssmlGender: 'FEMALE',
                                    audioEncoding: 'MP3',
                                    voiceName: 'ru-RU-Chirp3-HD-Aoede',
                                });
                                await playGoogleTtsAudio(ttsResponse.audioContent, ttsResponse.audioEncoding);
                                setTimeout(() => start(), 400);
                            } catch (audioErr: any) {
                                console.warn('⚠️ No hotels message audio failed:', audioErr);
                            }
                        }
                        setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
                    } catch (searchErr: any) {
                        console.error('[AiScreen] Search error:', searchErr);
                        setAiState({ message: AI_MESSAGES.searchError, recording: false, animation: false });
                        const isNetwork = searchErr?.message === 'Network Error' || searchErr?.code === 'ERR_NETWORK';
                        const errorMsg = searchErr?.userMessage || (isNetwork ? 'Проверьте подключение к интернету и попробуйте снова.' : (searchErr?.message || 'Произошла ошибка при поиске отелей'));
                        try {
                            const ttsTextSearchErr = stripEmojisForTTS(isNetwork ? errorMsg : `Извините, ${errorMsg}. Попробуйте ещё раз.`);
                            console.log('🔊 TTS text:', ttsTextSearchErr);
                            const ttsResponse = await synthesizeGoogleTts(ttsTextSearchErr, {
                                languageCode: 'ru-RU',
                                ssmlGender: 'FEMALE',
                                audioEncoding: 'MP3',
                                voiceName: 'ru-RU-Chirp3-HD-Aoede',
                            });
                            await playGoogleTtsAudio(ttsResponse.audioContent, ttsResponse.audioEncoding);
                            setTimeout(() => start(), 400);
                        } catch (audioErr) {
                            console.warn('⚠️ Error audio playback failed:', audioErr);
                        }
                    }
                }
            }

        } catch (err: any) {
            console.error('Tour Assistant API error:', err);
            const isNetwork = err?.message === 'Network Error' || err?.code === 'ERR_NETWORK';
            const errorMessage = isNetwork
                ? 'Проверьте подключение к интернету и попробуйте снова.'
                : (err?.response?.data?.error || err?.message || 'Произошла ошибка при обращении к ассистенту');
            setAssistantResponse(`Ошибка: ${errorMessage}`);
            setAiState({ message: AI_MESSAGES.error, recording: false, animation: false });
            try {
                const ttsTextApiErr = stripEmojisForTTS(isNetwork ? errorMessage : `Извините, ${errorMessage}. Попробуйте ещё раз.`);
                console.log('🔊 TTS text:', ttsTextApiErr);
                const ttsResponse = await synthesizeGoogleTts(ttsTextApiErr, {
                    languageCode: 'ru-RU',
                    ssmlGender: 'FEMALE',
                    audioEncoding: 'MP3',
                    voiceName: 'ru-RU-Chirp3-HD-Aoede', // Female voice
                });
                await playGoogleTtsAudio(ttsResponse.audioContent, ttsResponse.audioEncoding);
                setTimeout(() => start(), 400);
            } catch (audioErr) {
                console.warn('⚠️ Error audio playback failed:', audioErr);
            }
        }

        setLoading(false);
    }

    // Show hotels from aiSearch hook (replaces old useEffect with Redux state)
    useEffect(() => {
        if (aiSearch.displayedHotels && aiSearch.displayedHotels.length > 0) {
            setDisplayedHotels(aiSearch.displayedHotels);
        } else if (!aiSearch.hotelLoading && aiSearch.displayedHotels.length === 0 && aiSearch.hasActiveSearch()) {
            // Search completed but no hotels found
            setDisplayedHotels([]);
        }
    }, [aiSearch.displayedHotels, aiSearch.hotelLoading]);

    const handleResetChat = () => {
        if (conversationHistory.length === 0 && !assistantResponse && displayedHotels.length === 0) return;
        
        Alert.alert(
            'Начать заново',
            'Вы уверены, что хотите очистить историю разговора и начать новый чат?',
            [
                {
                    text: 'Отмена',
                    style: 'cancel',
                },
                {
                    text: 'Начать заново',
                    style: 'destructive',
                    onPress: () => {
                        setConversationHistory([]);
                        setAssistantResponse('');
                        setDisplayedHotels([]);
                        setSearchParams({
                            from_city: '',
                            from_country: 'RU',
                            to_country: '',
                            to_city: '',
                            adults: '1',
                            kids: '0',
                            kids_ages: [],
                            start_date: '',
                            nights: 1,
                            search_type: 'package',
                            flex_dates: 0,
                            hotel_ids: [],
                            page_number: 1,
                            page_limit: 3,
                            sort_by: 'relevance',
                        });
                        lastRequestIdRef.current = null;
                        lastSearchedParamsRef.current = null;
                        aiSearch.resetSearch();
                        setAiState({ message: AI_MESSAGES.waiting, recording: false, animation: false });
                    },
                },
            ]
        );
    };

    const formatDateForCard = (dateString: string, nights: number): string => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            const day = date.getDate();
            const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                           'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
            const month = months[date.getMonth()];
            
            let nightsText = '';
            if (nights === 1) {
                nightsText = '1 ночь';
            } else if (nights < 5) {
                nightsText = `${nights} ночи`;
            } else {
                nightsText = `${nights} ночей`;
            }
            
            return `от ${day} ${month} на ${nightsText}`;
        } catch (e) {
            return '';
        }
    };

    const renderHotelCard = (hotel: Hotel, index: number, theme: any) => {
        // Handle nested hotel structure (hotel.hotel)
        const hotelData = (hotel as any).hotel || hotel;
        
        const hotelName = hotelData.name || hotelData.name_en || hotel.name || hotel.name_en || 'Отель';
        const stars = hotelData.stars || hotel.stars || 0;
        const city = hotelData.city_name || hotel.city_name || '';
        const rating = hotelData.rating || hotel.rating || 0;
        const reviews = hotelData.reviews_count || hotelData.reviews || hotel.reviews || 0;
        const hotelId = hotelData.id || hotel.id || `hotel-${index}`;
        
        // Format date and nights
        const dateInfo = formatDateForCard(searchParams.start_date, searchParams.nights);

        // Handle images
        let imageSource = null;
        if (hotelData.images && hotelData.images.length > 0) {
            const firstImage = hotelData.images[0];
            if (typeof firstImage === 'string') {
                imageSource = { uri: firstImage };
            } else if (firstImage.webp_x620) {
                imageSource = { uri: firstImage.webp_x620 };
            } else if (firstImage.x500) {
                imageSource = { uri: firstImage.x500 };
            } else if (firstImage.uri) {
                imageSource = firstImage;
            } else {
                imageSource = firstImage;
            }
        } else if (hotel.images && hotel.images.length > 0) {
            const firstImage = hotel.images[0];
            if (typeof firstImage === 'string') {
                imageSource = { uri: firstImage };
            } else {
                imageSource = firstImage;
            }
        }

        // Get price if available
        const minPrice = (hotel as any).min_price || hotel.min_price;
        const priceText = minPrice ? `${minPrice.toLocaleString('ru-RU')} ₽` : null;

        return (
            <View key={hotelId} style={[styles.hotelCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                {imageSource && (
                    <ImageBackground
                        source={imageSource}
                        style={styles.hotelImage}
                        resizeMode="cover"
                    >
                        <TouchableOpacity 
                            style={styles.actionHotelButton}
                            onPress={() => {
                                const hotelId = hotelData.id || hotel.id;
                                if (hotelId) {
                                    (navigation as any).navigate('hotelFromAi', {
                                        hotelId: String(hotelId),
                                        searchParams: {
                                            ...searchParams,
                                            hotel_ids: [String(hotelId)],
                                        },
                                        searchSnapshot: {
                                            startDateISO: searchParams.start_date,
                                            nights: searchParams.nights,
                                            adults: parseInt(searchParams.adults) || 1,
                                            kids: parseInt(searchParams.kids) || 0,
                                            kidsAges: searchParams.kids_ages || [],
                                        },
                                    });
                                }
                            }}
                        >
                            <AppIcon name={'aiActionButton'} size={36} color={'black'}/>
                        </TouchableOpacity>
                    </ImageBackground>
                )}
                <View style={styles.hotelInfo}>
                    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                        {dateInfo && (
                            <Text allowFontScaling={false} style={[styles.hotelDate, { color: theme.textTertiary }]}>{dateInfo}</Text>
                        )}
                        {priceText && (
                            <Text allowFontScaling={false} style={[styles.hotelPrice, { color: theme.brand }]}>{priceText}</Text>
                        )}
                    </View>
                    <View style={styles.hotelHeader}>
                        <Text allowFontScaling={false} style={[styles.hotelName, { color: theme.text }]} numberOfLines={2}>
                            {hotelName}
                        </Text>
                    </View>
                    {city && (
                        <Text allowFontScaling={false} style={[styles.hotelCity, { color: theme.textSecondary }]}>{city}</Text>
                    )}

                    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:theme.border,marginTop:8,paddingTop:4}}>
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
                                        {reviews} {reviews === 1 ? 'отзыв' : reviews < 5 ? 'отзыва' : 'отзывов'}
                                    </Text>
                                )}
                                {rating > 0 && (
                                    <View style={[styles.ratingBadge, { backgroundColor: theme.success }]}>
                                        <Text allowFontScaling={false} style={styles.ratingText}>{rating.toFixed(1)}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                </View>
            </View>
        );
    };


    return (
        <Content>
            <View style={{flex: 1, backgroundColor: theme.background}}>
                {/* Header */}
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
                            <AppIcon color={'black'} size={36} name={'logoAi'}/>
                        </View>
                    </View>
                    <View style={styles.headerRightRow}>
                        <TouchableOpacity
                            onPress={handleResetChat}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                            style={styles.resetButton}
                            disabled={conversationHistory.length === 0 && !assistantResponse && displayedHotels.length === 0}
                        >
                            <AppIcon name={'info'} size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            <ScrollView 
                style={{flex: 1,paddingBottom:80,marginBottom:130}}
                contentContainerStyle={{padding: 15}}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.welcomeWrap}>
                    <View style={styles.robo}>
                        {(aiState.animation || isRecording) ? (
                            <LottieView style={styles.lessenLottie} source={require('../../assets/lottie/lesen.json')} autoPlay loop />
                        ) : (
                            <AppIcon name={'radiologo'} size={width / 2} color={theme.text} />
                        )}
                    </View>
                    <View>
                        <AppText style={[styles.welcomeText, { color: theme.textTertiary }]}>
                            {aiState.message === AI_MESSAGES.waiting && conversationHistory.length > 0
                                ? (() => {
                                    const last = [...conversationHistory].reverse().find(m => m.role === 'assistant' && m.content?.trim());
                                    return last?.content?.trim() || AI_MESSAGES.waiting;
                                  })()
                                : aiState.message}
                        </AppText>
                        {isRecording && (
                            <View
                                style={[
                                    styles.liveSpeechBubble,
                                    { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                                ]}
                            >
                                <Text
                                    allowFontScaling={false}
                                    style={[styles.liveSpeechLabel, { color: theme.textTertiary }]}
                                >
                                    Ваш вопрос
                                </Text>
                                <Text
                                    allowFontScaling={false}
                                    style={[styles.liveSpeechText, { color: theme.text }]}
                                    numberOfLines={14}
                                >
                                    {recognized?.trim()
                                        ? recognized.trim()
                                        : 'Говорите — текст появится здесь…'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Voice: only show hotels – last result (3 hotels), no conversation. Same logic/pagination as text AI. */}
                {(() => {
                    const lastWithHotels = [...conversationHistory].reverse().find(m => m.role === 'assistant' && m.hotels && m.hotels.length > 0);
                    const lastResultHotels = lastWithHotels?.hotels ?? [];
                    if (lastResultHotels.length === 0) return null;
                    return (
                        <View style={styles.hotelsContainer}>
                            {lastResultHotels.map((hotel: any, hotelIndex: number) => {
                                if (!hotel || typeof hotel !== 'object') return null;
                                return renderHotelCard(hotel, hotelIndex, theme);
                            })}
                        </View>
                    );
                })()}

                {/*{loading && (*/}
                {/*    <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.surfaceSecondary }]}>*/}
                {/*        /!*<Text allowFontScaling={false} style={[styles.messageText, { color: theme.textTertiary }]}>Ищу отели...</Text>*!/*/}
                {/*    </View>*/}
                {/*)}*/}
            </ScrollView>

            <View
                pointerEvents="box-none"
                style={[
                    styles.promptWrapp,
                    {
                        // Lift mic bubble above bottom tab bar so it doesn't block tab presses
                        bottom: insets.bottom + 70,
                        paddingBottom: insets.bottom + 15,
                    },
                ]}
            >
                {aiState.animation && !isRecording ? null : (
                    <View style={[styles.voiceMessageBubble, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                        <Text allowFontScaling={false} style={[styles.voiceMessageText, { color: theme.text }]}>
                            {isRecording ? 'Нажмите чтобы остановить' : 'Нажмите на микрофон чтобы продолжить'}
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    style={[styles.recordingButton, (loading || hotelLoad) && styles.recordingButtonDisabled]}
                    onPress={() => {
                        if (isRecording) {
                            stop();
                        } else {
                            start();
                        }
                    }}
                    disabled={loading || hotelLoad}
                    activeOpacity={0.7}
                >
                    <LottieView style={styles.micLottie} source={require('../../assets/lottie/mic.json')} autoPlay={isRecording} loop={isRecording} />
                </TouchableOpacity>
            </View>
            </View>
        </Content>
    );
};
export default AiScreen;

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    backButtonText: {
        fontSize: 24,
        fontWeight: '400',
    },
    resetButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontFamily: FONT_HEADING,
        fontSize: 20,
        fontWeight: 'bold',
    },
    aiBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    headerRight: {
        width: 40,
    },
    headerRightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    welcomeWrap:{
        gap:30,
        marginVertical:10,
        justifyContent:'center',
        flex:1
    },
    welcome:{
        fontFamily: FONT_HEADING,
        fontSize: 32,
        textAlign:'center',
        fontWeight:'500',
    },
    welcomeText:{
        textAlign:'center',
    },
    liveSpeechBubble: {
        marginTop: 16,
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    liveSpeechLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    liveSpeechText: {
        fontSize: 17,
        lineHeight: 24,
        fontWeight: '500',
    },
    robo:{
        width:width/2,
        justifyContent:'center',
        alignItems:'center',
        marginHorizontal:width/5,
        height:width/2,
    },
    roboLottie:{
        width:width/2,
        height:width/2,
    },
    lessenLottie:{
        width:'150%',
        height:'150%',
    },
    promptWrapp:{
        position: 'absolute',
        bottom: 0,
        right: 0,
        left: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 0,
        gap: 16,
        backgroundColor: 'transparent',
    },
    recording:{
        height:60,
        position:'absolute',
        width:width-100,
        top:15,
        zIndex:9999,
        left:15,
        borderBottomLeftRadius:30,
        borderTopLeftRadius:30,
        alignItems:"center",
        flexDirection:'row',
        paddingLeft:35
    },
    recordingText: {
        fontSize: 14,
        marginLeft: 10,
        flex: 1,
    },
    recordingLottie:{
        width:width/4,
        height:40,
        marginLeft:-35,
    },
    recordingButton:{
        width:100,
        height:100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    recordingHint:{
        fontSize: 13,
        textAlign: 'right',
    },
    voiceMessageBubble: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    voiceMessageInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    voiceMessageText: {
        fontSize: 11,
        fontWeight: '600',
    },
    recordingButtonDisabled: {
        opacity: 0.5,
    },
    micLottie:{
        width:'80%',
        height:'80%',
        justifyContent:'center',
        alignItems:'center',
    },
    responseContainer: {
        borderRadius: 12,
        padding: 15,
        marginVertical: 10,
    },
    responseText: {
        fontSize: 16,
        lineHeight: 22,
    },
    messageWrapper: {
        marginBottom: 10,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 12,
        marginVertical: 5,
        borderRadius: 15,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderTopRightRadius: 0,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        borderTopLeftRadius: 0,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    hotelsContainer: {
        marginVertical: 10,
        gap: 12,
    },
    hotelsTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
    },
    hotelCard: { 
        borderRadius: 12, 
        overflow: 'hidden', 
        marginVertical: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
        width: '100%',
        borderWidth: 1,
        padding: 16,
    },
    hotelImage: { width: '100%', height: 140, backgroundColor: '#1a1a1a', objectFit: 'cover', borderRadius: 8, overflow: 'hidden', alignItems: 'flex-end', justifyContent: 'flex-end' },
    hotelInfo: { paddingTop: 12 },
    hotelHeader: { marginBottom: 8 },
    hotelName: { fontFamily: FONT_HEADING, fontSize: 16, fontWeight: '600', marginBottom: 4 },
    starsContainer: { flexDirection: 'row', gap: 2, marginTop: 4 },
    star: { fontSize: 18 },
    starFilled: { color: '#FE732E' },
    hotelCity: { fontSize: 14, marginBottom: 6 },
    hotelDate: { fontSize: 13, fontWeight: '500' },
    hotelRating: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    ratingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    ratingText: { color: 'white', fontSize: 12, fontWeight: '600' },
    reviewsText: { fontSize: 12 },
    hotelPrice: { fontSize: 18, fontWeight: '600' },
    actionHotelButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        marginBottom: 8,
        marginRight: 8,
    },
})