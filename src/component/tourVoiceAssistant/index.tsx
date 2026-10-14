import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  PermissionsAndroid, 
  Platform,
  Animated,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { callTourAssistant, type TourAssistantMessage } from '../../modules/api/tourAssistantApi';
import { playGoogleTtsAudio } from '../../modules/api/googleTtsApi';
import { useTheme } from '../../hooks/useTheme';
import { AppText, AppIcon } from '../UI';
import { FONT_HEADING } from '../../theme/fonts';

// Safe imports with error handling
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

type TourResult = {
    id: number;
    title: string;
    dest: string;
    price: number;
    days: number;
};

type Message = {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
};

export default function TourVoiceAssistant() {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const [isRecording, setIsRecording] = useState(false);
    const [recognized, setRecognized] = useState('');
    const [results, setResults] = useState<TourResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [voiceInitialized, setVoiceInitialized] = useState(false);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
    const [conversationHistory, setConversationHistory] = useState<TourAssistantMessage[]>([]);
    const [assistantResponse, setAssistantResponse] = useState<string>('');
    const [useGoogleTts, setUseGoogleTts] = useState(true);
    const lastRecognizedTextRef = useRef<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    
    // Animation values
    const micScale = useRef(new Animated.Value(1)).current;
    const micPulse = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // 🔒 Android mic permission
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

    useEffect(() => {
        // Initialize Voice if available
        if (!voiceAvailable || !Voice) {
            console.warn('⚠️ Voice recognition not available');
            return;
        }

        try {
            // 🎤 Voice listeners
            Voice.onSpeechResults = (e: any) => {
                if (e.value?.length) {
                    const text = e.value[0];
                    setRecognized(text);
                    lastRecognizedTextRef.current = text;
                    console.log('📝 Recognized text:', text);
                }
            };

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

            setVoiceInitialized(true);
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

    // Mic animation
    useEffect(() => {
        if (isRecording) {
            // Scale animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(micScale, {
                        toValue: 1.1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(micScale, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(micPulse, {
                        toValue: 1.3,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(micPulse, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            micScale.setValue(1);
            micPulse.setValue(1);
        }
    }, [isRecording]);

    // Fade in animation
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

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
            const available = await Voice.isAvailable();
            if (!available) {
                Alert.alert('Ошибка', 'Speech Recognition недоступен на устройстве');
                return;
            }

            setRecognized("");
            lastRecognizedTextRef.current = '';
            setIsRecording(true);
            await Voice.start('ru-RU');
            console.log('🎤 Started recording...');

        } catch (err: any) {
            console.error('Start error:', err);
            setIsRecording(false);
            Alert.alert('Ошибка', `Не удалось начать запись: ${err?.message || 'Неизвестная ошибка'}`);
        }
    };

    const stop = async () => {
        if (!voiceAvailable || !Voice) {
            return;
        }

        try {
            setIsRecording(false);
            await Voice.stop();
            console.log('🛑 Stopped recording...');
            
            setTimeout(() => {
                const textToSend = lastRecognizedTextRef.current || recognized;
                
                if (textToSend && textToSend.trim().length > 0) {
                    console.log('📤 Sending recognized text to backend:', textToSend);
                    // Add user message
                    const userMessage: Message = {
                        id: Date.now().toString(),
                        text: textToSend,
                        isUser: true,
                        timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, userMessage]);
                    sendToServer(textToSend);
                    lastRecognizedTextRef.current = '';
                } else {
                    console.log('⚠️ No recognized text to send');
                }
            }, 500);
        } catch (err: any) {
            console.error('Stop error:', err);
            try {
                await Voice.cancel();
            } catch (cancelErr) {
                console.warn('Cancel error:', cancelErr);
            }
            
            const textToSend = lastRecognizedTextRef.current || recognized;
            if (textToSend && textToSend.trim().length > 0) {
                console.log('📤 Sending recognized text to backend (after error):', textToSend);
                const userMessage: Message = {
                    id: Date.now().toString(),
                    text: textToSend,
                    isUser: true,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, userMessage]);
                sendToServer(textToSend);
                lastRecognizedTextRef.current = '';
            }
        }
    };

    const handleTourCardPress = async (tour: { id: number; title: string; dest: string; price: number; days: number }) => {
        if (loading) return;
        
        setLoading(true);
        
        const query = `Расскажи подробнее о туре: ${tour.title} в ${tour.dest}. Цена ${tour.price} рублей, длительность ${tour.days} дней. Дай больше информации об этом туре, что включено, что можно посмотреть, какие особенности.`;
        
        try {
            console.log('🤖 Sending tour to Tour Assistant:', query);
            
            const response = await callTourAssistant(query, conversationHistory);
            
            console.log('✅ Tour Assistant response received:', {
                audioSize: response.audioSize,
            });
            
            const newHistory: TourAssistantMessage[] = [
                ...conversationHistory,
                { role: 'user', content: query },
                { role: 'assistant', content: response.textResponse },
            ];
            setConversationHistory(newHistory.slice(-10));
            setAssistantResponse(response.textResponse);
            
            // Add assistant message
            const assistantMessage: Message = {
                id: Date.now().toString(),
                text: response.textResponse,
                isUser: false,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);
            
            try {
                console.log('🔊 Playing MP3 audio from backend');
                await playGoogleTtsAudio(response.audioContent, response.audioEncoding);
                console.log('✅ Audio played successfully');
            } catch (audioErr: any) {
                console.warn('⚠️ Audio playback failed:', audioErr);
            }
            
        } catch (err: any) {
            console.error('Tour Assistant API error:', err);
            const errorMessage = err?.message || 'Ошибка при получении информации о туре';
            Alert.alert('Ошибка', errorMessage);
        }
        
        setLoading(false);
    };

    async function sendToServer(text: string) {
        if (!text || text.trim().length === 0) {
            return;
        }

        setLoading(true);
        setAssistantResponse('');

        try {
            console.log('🤖 Calling Tour Assistant API (DeepSeek + Google TTS) with:', text);
            
            const response = await callTourAssistant(text, conversationHistory);
            
            console.log('✅ Tour Assistant response received:', {
                audioSize: response.audioSize,
                toursCount: response.tours.length,
            });
            
            setAssistantResponse(response.textResponse);
            
            const newHistory: TourAssistantMessage[] = [
                ...conversationHistory,
                { role: 'user', content: text },
                { role: 'assistant', content: response.textResponse },
            ];
            setConversationHistory(newHistory.slice(-10));
            setResults(response.tours);

            // Add assistant message
            const assistantMessage: Message = {
                id: Date.now().toString(),
                text: response.textResponse,
                isUser: false,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);

            try {
                console.log('🔊 Playing MP3 audio from backend');
                await playGoogleTtsAudio(response.audioContent, response.audioEncoding);
                console.log('✅ Audio played successfully');
            } catch (audioErr: any) {
                console.warn('⚠️ Audio playback failed:', audioErr);
                Alert.alert('Ошибка', 'Не удалось воспроизвести аудио');
            }

        } catch (err: any) {
            console.error('Tour Assistant API error:', err);
            const errorMessage = err?.message || 'Произошла ошибка при обращении к ассистенту';
            Alert.alert('Ошибка', errorMessage);
            setAssistantResponse(`Ошибка: ${errorMessage}`);
        }

        setLoading(false);
    }

    const tabBarHeight = 60;
    const bottomPadding = insets.bottom + tabBarHeight + 16;

    if (!voiceAvailable) {
        return (
            <View style={[styles.container, { 
                paddingTop: insets.top, 
                paddingBottom: bottomPadding,
                backgroundColor: theme.background 
            }]}>
                <AppText style={[styles.title, { color: theme.text }]}>Voice Tour Finder</AppText>
                <View style={[styles.recognizedBox, { backgroundColor: theme.backgroundSecondary }]}>
                    <AppText style={{ fontSize: 16, color: theme.error }}>
                        ⚠️ Voice recognition не доступен. Пожалуйста, установите @react-native-voice/voice
                    </AppText>
                    <AppText style={{ fontSize: 14, color: theme.textTertiary, marginTop: 8 }}>
                        Вы все еще можете нажимать на карточки туров для прослушивания информации через Google TTS.
                    </AppText>
                </View>
            </View>
        );
    }

    return (
        <Animated.View style={[
            styles.container, 
            { 
                paddingTop: insets.top, 
                paddingBottom: bottomPadding,
                backgroundColor: theme.background,
                opacity: fadeAnim
            }
        ]}>
            {/* Header with gradient */}
            <LinearGradient
                colors={isDark 
                    ? ['rgba(254, 115, 46, 0.15)', 'rgba(254, 115, 46, 0.05)', 'transparent']
                    : ['rgba(254, 115, 46, 0.1)', 'rgba(254, 115, 46, 0.05)', 'transparent']
                }
                style={styles.headerGradient}
            >
                <AppText style={[styles.title, { color: theme.text }]}>
                    Голосовой помощник
                </AppText>
                <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
                    Найди идеальный тур голосом
                </AppText>
            </LinearGradient>

            {/* Messages/Conversation Area */}
            <ScrollView 
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
            >
                {messages.length === 0 && !loading && !recognized && (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSecondary }]}>
                            <AppIcon name="microphone" size={48} color={theme.brand} />
                        </View>
                        <AppText style={[styles.emptyTitle, { color: theme.text }]}>
                            Начните разговор
                        </AppText>
                        <AppText style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
                            Нажмите и удерживайте кнопку микрофона, чтобы начать поиск туров
                        </AppText>
                    </View>
                )}

                {/* User input display */}
                {recognized && !loading && (
                    <View style={styles.messageRow}>
                        <View style={[styles.messageBubble, styles.userBubble, { backgroundColor: theme.brand }]}>
                            <AppText style={[styles.messageText, { color: theme.textInverse }]}>
                                {recognized}
                            </AppText>
                        </View>
                    </View>
                )}

                {/* Loading indicator */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.brand} />
                        <AppText style={[styles.loadingText, { color: theme.textTertiary }]}>
                            Обработка запроса...
                        </AppText>
                    </View>
                )}

                {/* Tour Results */}
                {!loading && results.length > 0 && (
                    <View style={styles.resultsSection}>
                        <AppText style={[styles.resultsTitle, { color: theme.text }]}>
                            Найденные туры
                        </AppText>
                        {results.map((tour) => (
                            <TouchableOpacity
                                key={tour.id}
                                style={[styles.tourCard, { backgroundColor: theme.cardBackground }]}
                                onPress={() => handleTourCardPress(tour)}
                                activeOpacity={0.7}
                                disabled={loading}
                            >
                                <LinearGradient
                                    colors={isDark 
                                        ? ['rgba(254, 115, 46, 0.2)', 'rgba(254, 115, 46, 0.1)']
                                        : ['rgba(254, 115, 46, 0.1)', 'rgba(254, 115, 46, 0.05)']
                                    }
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.tourCardGradient}
                                >
                                    <View style={styles.tourCardContent}>
                                        <View style={styles.tourCardHeader}>
                                            <AppText style={[styles.tourCardTitle, { color: theme.text }]}>
                                                {tour.title}
                                            </AppText>
                                            <View style={[styles.playButton, { backgroundColor: theme.brand }]}>
                                                <AppIcon name="arrowRight" size={16} color={theme.textInverse} />
                                            </View>
                                        </View>
                                        <View style={styles.tourCardDetails}>
                                            <View style={styles.tourDetailItem}>
                                                <AppIcon name="plane" size={14} color={theme.textTertiary} />
                                                <AppText style={[styles.tourDetailText, { color: theme.textTertiary }]}>
                                                    {tour.dest}
                                                </AppText>
                                            </View>
                                            <View style={styles.tourDetailItem}>
                                                <AppIcon name="document" size={14} color={theme.textTertiary} />
                                                <AppText style={[styles.tourDetailText, { color: theme.textTertiary }]}>
                                                    {tour.days} {tour.days === 1 ? 'день' : tour.days < 5 ? 'дня' : 'дней'}
                                                </AppText>
                                            </View>
                                        </View>
                                        <View style={styles.tourCardPrice}>
                                            <AppText style={[styles.tourPrice, { color: theme.brand }]}>
                                                {tour.price.toLocaleString('ru-RU')} ₽
                                            </AppText>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Messages */}
                {messages.map((message) => (
                    <View 
                        key={message.id} 
                        style={[
                            styles.messageRow,
                            message.isUser ? styles.userMessageRow : styles.assistantMessageRow
                        ]}
                    >
                        <View style={[
                            styles.messageBubble,
                            message.isUser 
                                ? [styles.userBubble, { backgroundColor: theme.brand }]
                                : [styles.assistantBubble, { backgroundColor: theme.backgroundSecondary }]
                        ]}>
                            <AppText style={[
                                styles.messageText,
                                { color: message.isUser ? theme.textInverse : theme.text }
                            ]}>
                                {message.text}
                            </AppText>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Microphone Button */}
            <View style={styles.micContainer}>
                {isRecording && (
                    <Animated.View 
                        style={[
                            styles.micPulseRing,
                            {
                                backgroundColor: theme.brand,
                                transform: [{ scale: micPulse }],
                                opacity: micPulse.interpolate({
                                    inputRange: [1, 1.3],
                                    outputRange: [0.3, 0],
                                }),
                            }
                        ]}
                    />
                )}
                <TouchableOpacity
                    onPressIn={start}
                    onPressOut={stop}
                    style={styles.micButton}
                    activeOpacity={0.9}
                    disabled={loading}
                >
                    <Animated.View
                        style={[
                            styles.micButtonInner,
                            {
                                backgroundColor: isRecording ? theme.error : theme.brand,
                                transform: [{ scale: micScale }],
                            }
                        ]}
                    >
                        <LinearGradient
                            colors={isRecording 
                                ? ['#EF4444', '#DC2626']
                                : ['#FE732E', '#F97316']
                            }
                            style={styles.micGradient}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color={theme.textInverse} />
                            ) : (
                                <AppIcon 
                                    name="microphone" 
                                    size={28} 
                                    color={theme.textInverse} 
                                />
                            )}
                        </LinearGradient>
                    </Animated.View>
                </TouchableOpacity>
                <AppText style={[styles.micHint, { color: theme.textTertiary }]}>
                    {isRecording ? 'Говорите...' : loading ? 'Обработка...' : 'Нажмите и удерживайте'}
                </AppText>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 24,
    },
    title: {
        fontFamily: FONT_HEADING,
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '400',
        marginTop: 4,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontFamily: FONT_HEADING,
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 22,
    },
    recognizedBox: {
        minHeight: 60,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    messageRow: {
        marginBottom: 12,
    },
    userMessageRow: {
        alignItems: 'flex-end',
    },
    assistantMessageRow: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    userBubble: {
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 15,
        marginTop: 12,
    },
    resultsSection: {
        marginTop: 8,
        marginBottom: 20,
    },
    resultsTitle: {
        fontFamily: FONT_HEADING,
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
    },
    tourCard: {
        borderRadius: 20,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    tourCardGradient: {
        padding: 16,
    },
    tourCardContent: {
        gap: 12,
    },
    tourCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    tourCardTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        marginRight: 12,
    },
    playButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tourCardDetails: {
        flexDirection: 'row',
        gap: 16,
    },
    tourDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tourDetailText: {
        fontSize: 14,
    },
    tourCardPrice: {
        marginTop: 4,
    },
    tourPrice: {
        fontSize: 20,
        fontWeight: '700',
    },
    micContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
    },
    micPulseRing: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    micButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FE732E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    micButtonInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    micGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    micHint: {
        fontSize: 13,
        marginTop: 12,
        textAlign: 'center',
    },
});
