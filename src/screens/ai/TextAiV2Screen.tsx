import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { FontText as Text, FontTextInput as TextInput } from '../../component/UI/text/FontText';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { RootState } from '../../modules/store';
import { useTheme } from '../../hooks/useTheme';
import { AppIcon, AppText } from '../../component/UI';
import {
  createConversationV2,
  getConversationV2,
  listConversationsV2,
  sendMessageV2,
} from '../../modules/api/tourAssistantV2Client';
import type {
  TourAssistantV2ConversationSummary,
  TourAssistantV2Message,
} from '../../types/tourAssistantV2';
import { FONT_HEADING } from '../../theme/fonts';

const SUGGESTIONS = [
  'Где отдохнуть на море?',
  'Популярные направления',
  'Туры с вылетом из Москвы',
  'Горящие туры',
];

const TextAiV2Screen = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { user, userId } = useSelector((state: RootState) => state.auth);
  const userName = (user as { name?: string })?.name || '';

  const [messages, setMessages] = useState<TourAssistantV2Message[]>([]);
  const [conversations, setConversations] = useState<TourAssistantV2ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [writeText, setWriteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    const data = await createConversationV2(userId || undefined);
    setConversationId(data.conversationId);
    setMessages(data.messages || []);
    return data.conversationId;
  }, [conversationId, userId]);

  const refreshHistory = useCallback(async () => {
    try {
      const data = await listConversationsV2(userId || undefined);
      setConversations(data.conversations || []);
    } catch (e) {
      console.warn('[TextAiV2] list conversations failed', e);
    }
  }, [userId]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || writeText).trim();
    if (!text || loading) return;

    setWriteText('');
    setLoading(true);

    try {
      const cid = await ensureConversation();
      const data = await sendMessageV2(cid, text, userId || undefined);
      setMessages(data.messages);
      refreshHistory();
    } catch {
      Alert.alert('Ошибка', 'Не удалось отправить сообщение. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    Alert.alert('Новый чат', 'Начать новый разговор?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Начать',
        onPress: async () => {
          setConversationId(null);
          setMessages([]);
          setShowHistory(false);
          await ensureConversation();
          refreshHistory();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => setShowHistory((v) => !v)} style={styles.headerBtn}>
            <AppIcon name="info" size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <AppText style={[styles.headerTitle, { color: theme.brand }]}>Totus AI V2</AppText>
            <View style={[styles.aiBadge, { backgroundColor: theme.brand }]}>
              <AppIcon color="black" size={28} name="logoAi" />
            </View>
          </View>
          <TouchableOpacity onPress={handleNewChat} style={styles.headerBtn}>
            <Text style={{ color: theme.text, fontSize: 22 }}>+</Text>
          </TouchableOpacity>
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
                    setMessages(d.messages);
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
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && !loading && (
            <View style={styles.greetingSection}>
              <Text style={[styles.greetingTitle, { color: theme.text }]}>
                Привет{userName ? `, ${userName}` : ''}!
              </Text>
              <Text style={[styles.greetingSubtitle, { color: theme.text }]}>Чем могу помочь?</Text>
              <Text style={[styles.greetingHint, { color: theme.textTertiary }]}>
                AI Assistant V2 — вся логика на сервере
              </Text>
              <View style={styles.tagsContainer}>
                {SUGGESTIONS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.suggestionTag, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                    onPress={() => handleSend(tag)}
                    disabled={loading}
                  >
                    <Text style={[styles.tagText, { color: theme.text }]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.messageBubble,
                m.role === 'user' ? styles.userBubble : styles.aiBubble,
                { backgroundColor: theme.surfaceSecondary },
              ]}
            >
              {m.type === 'text' && (
                <Text style={[styles.messageText, { color: theme.text }]}>{m.content}</Text>
              )}
            </View>
          ))}

          {loading && (
            <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.surfaceSecondary }]}>
              <ActivityIndicator size="small" color={theme.textTertiary} />
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom: keyboardHeight > 0 ? 10 : insets.bottom + 80,
              backgroundColor: theme.background,
              borderTopColor: theme.border,
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.surfaceSecondary, color: theme.text }]}
            value={writeText}
            onChangeText={setWriteText}
            placeholder="Напишите сообщение..."
            placeholderTextColor={theme.textTertiary}
            editable={!loading}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.brand }, loading && styles.sendDisabled]}
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

export default TextAiV2Screen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  aiBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  historyPanel: { padding: 12, maxHeight: 160 },
  historyItem: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  greetingSection: { alignItems: 'center', marginTop: 24, marginBottom: 24 },
  greetingTitle: { fontFamily: FONT_HEADING, fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  greetingSubtitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  greetingHint: { fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  suggestionTag: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: '500' },
  messageBubble: { maxWidth: '85%', padding: 12, marginVertical: 5, borderRadius: 15 },
  userBubble: { alignSelf: 'flex-end', borderTopRightRadius: 0 },
  aiBubble: { alignSelf: 'flex-start', borderTopLeftRadius: 0 },
  messageText: { fontSize: 16, lineHeight: 22 },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    marginRight: 10,
  },
  sendButton: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
