import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  StatusBar,
  ScrollView,
  View,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { FontText as Text } from '../../component/UI/text/FontText';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSelector } from 'react-redux';
import { RootState } from '../../modules/store';
import io, { Socket } from 'socket.io-client';
import {
  startOutgoingVoiceCallByLoyaltyId,
  getCurrentLoyaltyId,
  getActiveCallInfo,
  setUserLoyaltyId,
  getCurrentDeviceId,
} from '../../modules/voip/VoipService';
import { getUserById, getUserDisplayName, type User } from '../../modules/api/users';
import { getUserContacts, type Contact } from '../../modules/api/contacts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// CallModal and MinimizedCallView are handled globally in App.tsx
import { AppIcon } from '../../component/UI';
import { useTheme } from '../../hooks/useTheme';
import AddContactModal from './AddContactModal';
import { VOIP_BASE_URL } from '../../config/server';
import { callErrorText } from '../../modules/voip/callText';
import { FONT_HEADING } from '../../theme/fonts';

const BASE_URL = VOIP_BASE_URL;

const CallsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user: loggedInUser } = useSelector((state: RootState) => state.auth);
  const socketRef = useRef<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [currentLoyaltyId, setCurrentLoyaltyId] = useState<string | null>(null);
  const [addContactModalVisible, setAddContactModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  // Note: isMinimized is now managed globally in App.tsx, not here

  // Convert Contact to User format for compatibility
  const contactToUser = (contact: Contact): User => {
    return {
      id: contact.id,
      loyaltyId: contact.loyaltyId,
      name: contact.name,
      fName: contact.fName,
      lName: contact.lName,
      email: contact.email,
      phone: contact.phone,
      online: contact.online,
      hasVoipToken: contact.hasVoipToken,
      hasSocket: contact.hasSocket,
    };
  };

  // Load contacts from database
  const loadContacts = async () => {
    if (!currentUserId) {
      console.log('[CallsScreen] Cannot load contacts: currentUserId is not set');
      return;
    }
    try {
      console.log('[CallsScreen] Loading contacts for userId:', currentUserId);
      setLoading(true);
      const contacts = await getUserContacts(currentUserId);
      console.log('[CallsScreen] Loaded contacts:', contacts.length);
      // Convert contacts to User format
      const usersFromContacts = contacts.map(contactToUser);
      setUsers(usersFromContacts);
    } catch (error: any) {
      console.error('[CallsScreen] Failed to load contacts:', error);
      const errorMessage = error?.message || 'Неизвестная ошибка';
      // Only show alert if it's not a 404 (which means no contacts yet)
      if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
        Alert.alert('Ошибка', 'Не удалось загрузить список контактов. Попробуйте позже.');
      } else {
        // No contacts found - set empty array
        setUsers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize socket and get logged-in user loyalty_id
  useEffect(() => {
    let isMounted = true;

    const initializeUser = async () => {
      // Get loyalty_id from logged-in user or fetch from database
      let loyaltyId: string | null = null;

      if (loggedInUser) {
        // Store user ID for loading contacts
        const userId = (loggedInUser as any).id;
        console.log('[CallsScreen] Logged in user ID:', userId);
        if (userId && isMounted) {
          setCurrentUserId(userId);
          console.log('[CallsScreen] Set currentUserId to:', userId);
        }

        // Try to get loyalty_id from user object
        if ((loggedInUser as any).loyalty_id) {
          loyaltyId = (loggedInUser as any).loyalty_id;
        } else if ((loggedInUser as any).loyaltyId) {
          loyaltyId = (loggedInUser as any).loyaltyId;
        } else if (userId) {
          // Fetch user from database by ID to get loyalty_id
          try {
            const user = await getUserById(userId);
            if (user && isMounted) {
              loyaltyId = user.loyaltyId;
            }
          } catch (error) {
            console.error('Failed to fetch user loyalty_id:', error);
          }
        }
      }

      // Fallback to current loyalty_id from VoipService
      if (!loyaltyId) {
        loyaltyId = getCurrentLoyaltyId();
      }

      if (!isMounted) return;

      setCurrentLoyaltyId(loyaltyId);

      // Initialize VoipService with logged-in user's loyalty_id
      if (loyaltyId) {
        setUserLoyaltyId(loyaltyId);
      }

      return loyaltyId;
    };

    // Connect socket for real-time updates
    if (!socketRef.current || !socketRef.current.connected) {
      const socket = io(BASE_URL, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', async () => {
        // console.log('CallsScreen: Socket connected', socket.id);

        // Get loyalty_id and register device
        const loyaltyId = await initializeUser();

        // Use actual deviceId from VoipService if available, otherwise use temporary ID
        const deviceId = getCurrentDeviceId() || `mobile-${Date.now()}`;

        if (loyaltyId) {
          socket.emit('registerDevice', {
            deviceId: deviceId,
            loyaltyId: loyaltyId,
          });
          // console.log('CallsScreen: Registered device with socket, loyaltyId:', loyaltyId);
        } else if (deviceId) {
          // Register without loyaltyId if not available yet
          socket.emit('registerDevice', {
            deviceId: deviceId,
          });
          // console.log('CallsScreen: Registered device with socket (no loyaltyId yet)');
        }

        // Request all users' current status
        socket.emit('get-users-status');
      });

      // Listen for all users' status (when first connecting)
      socket.on('users-status', (data: { users: Array<{ id: number; loyaltyId: string; online: boolean }> }) => {
        // console.log('Users status received:', data);
        // Update contacts list with online status from socket
        setUsers((prevUsers) => {
          if (prevUsers.length === 0) {
            // If we don't have contacts yet, load them first
            loadContacts().then(() => {
              // After loading, update with socket status
              setTimeout(() => {
                setUsers((currentUsers) => {
                  return currentUsers.map((user) => {
                    const statusUser = data.users.find((u) => u.loyaltyId === user.loyaltyId);
                    return statusUser ? { ...user, online: statusUser.online } : user;
                  });
                });
              }, 100);
            });
            return prevUsers;
          }
          return prevUsers.map((user) => {
            const statusUser = data.users.find((u) => u.loyaltyId === user.loyaltyId);
            return statusUser ? { ...user, online: statusUser.online } : user;
          });
        });
      });

      // Listen for individual user online/offline status updates
      socket.on('user-status', (data: { loyaltyId: string; online: boolean }) => {
        // console.log('User status update:', data);
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.loyaltyId === data.loyaltyId
              ? { ...user, online: data.online }
              : user
          )
        );
      });

      // Listen for call state updates
      socket.on('call-state', (data: {
        callId: string;
        state: string;
        direction?: string;
        callerName?: string;
      }) => {
        // console.log('Call state update:', data);
        // Call state is handled by VoipService, but we can refresh contacts list
        if (data.state === 'ended' || data.state === 'answered') {
          loadContacts();
        }
      });

      socket.on('disconnect', () => {
        console.log('CallsScreen: Socket disconnected');
      });
    } else {
      // Socket already connected, just initialize user
      initializeUser();
    }

    // No need for polling interval - we use real-time socket updates via 'user-status' and 'users-status' events

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [loggedInUser]);

  // Load contacts when userId becomes available
  useEffect(() => {
    if (currentUserId) {
      console.log('[CallsScreen] currentUserId changed, loading contacts:', currentUserId);
      loadContacts();
    } else {
      console.log('[CallsScreen] currentUserId is not set yet');
    }
  }, [currentUserId]);

  // Timer for active calls and call state monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const info = getActiveCallInfo();

      if (info.isActive && info.startedAt) {
        setIsCallActive(true);
        const diffSec = Math.floor((Date.now() - info.startedAt) / 1000);
        setCallSeconds(diffSec);
      } else {
        setIsCallActive(false);
        setCallSeconds(0);
      }

      // Call modal is managed globally in App.tsx
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const formatCallTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Get user initial for avatar (first letter only)
  const getUserInitial = (user: User): string => {
    const displayName = getUserDisplayName(user);
    const trimmedName = displayName.trim();
    if (trimmedName.length > 0) {
      return trimmedName[0].toUpperCase();
    }
    return 'П';
  };

  const handleCallUser = async (user: User) => {
    if (!currentLoyaltyId) {
      Alert.alert('Ошибка', 'Номер карты лояльности не найден. Пожалуйста, войдите в систему.');
      return;
    }
    if (user.loyaltyId === currentLoyaltyId) {
      Alert.alert('Ошибка', 'Вы не можете позвонить себе');
      return;
    }

    // Check if device ID is available (VoIP token)
    const deviceId = getCurrentDeviceId();
    if (!deviceId) {
      Alert.alert(
        'Ошибка',
        'Устройство не зарегистрировано. Пожалуйста, подождите несколько секунд и попробуйте снова.'
      );
      return;
    }

    // Allow calling offline users if they have voipToken (can receive VoIP push)
    // If user is offline and has no voipToken, show error
    if (!user.online && !user.hasVoipToken) {
      Alert.alert('Ошибка', 'Пользователь не в сети и не может принимать звонки');
      return;
    }

    try {
      const displayName = getUserDisplayName(user);
      // console.log('📞 Calling user:', {
      //   loyaltyId: user.loyaltyId,
      //   displayName,
      //   online: user.online,
      //   hasVoipToken: user.hasVoipToken,
      //   currentDeviceId: deviceId,
      //   currentLoyaltyId: currentLoyaltyId,
      // });
      await startOutgoingVoiceCallByLoyaltyId(user.loyaltyId, displayName);
    } catch (e: any) {
      console.error('❌ Failed to start call', e);
      Alert.alert('Ошибка', `Не удалось начать звонок: ${callErrorText(e)}`);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  };

  const handleContactAdded = async (contact: Contact) => {
    // Reload contacts after adding
    await loadContacts();
  };

  const handleCopyLoyaltyId = async () => {
    if (!currentLoyaltyId) {
      Alert.alert('Ошибка', 'Номер карты лояльности не найден');
      return;
    }
    const loyaltyIdToCopy = currentLoyaltyId.replace(/\s+/g, ''); // Remove spaces for copy
    try {
      Clipboard.setString(loyaltyIdToCopy);
      Alert.alert('Скопировано', 'Номер карты лояльности скопирован в буфер обмена');
    } catch (error) {
      console.error('Error copying loyalty ID:', error);
      Alert.alert('Ошибка', 'Не удалось скопировать номер карты лояльности');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <StatusBar barStyle={theme.statusBar} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <Text allowFontScaling={false} style={[styles.headerTitle, { color: theme.text }]}>Звонки</Text>
          {loggedInUser && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: theme.brand }]}
              onPress={() => setAddContactModalVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <AppIcon name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        {loggedInUser && (
          <View style={styles.headerSubtitleContainer}>
            <Text allowFontScaling={false} style={[styles.headerSubtitle, { color: theme.textTertiary }]}>
              {(loggedInUser as any).name || (loggedInUser as any).fName || (loggedInUser as any).email || 'Пользователь'}
              {currentLoyaltyId && ` • ID: ${currentLoyaltyId}`}
            </Text>
            {currentLoyaltyId && (
              <TouchableOpacity
                onPress={handleCopyLoyaltyId}
                style={styles.copyButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <AppIcon name="copy" size={16} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        )}
        {!loggedInUser && currentLoyaltyId && (
          <View style={styles.headerSubtitleContainer}>
            <Text allowFontScaling={false} style={[styles.headerSubtitle, { color: theme.textTertiary }]}>ID: {currentLoyaltyId}</Text>
            <TouchableOpacity
              onPress={handleCopyLoyaltyId}
              style={styles.copyButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <AppIcon name="copy" size={16} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Call Timer */}
      {isCallActive && (
        <View style={styles.callTimerWrapper}>
          <Text allowFontScaling={false} style={styles.callTimerText}>
            Время звонка: {formatCallTime(callSeconds)}
          </Text>
        </View>
      )}

      {/* Users List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
        scrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={false}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        pointerEvents="auto"
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {loading && users.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.brand} />
            <Text allowFontScaling={false} style={[styles.loadingText, { color: theme.textTertiary }]}>Загрузка контактов...</Text>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text allowFontScaling={false} style={[styles.emptyText, { color: theme.textTertiary }]}>Контакты не найдены</Text>
            <Text allowFontScaling={false} style={[styles.emptySubtext, { color: theme.textTertiary }]}>
              Нажмите + чтобы добавить контакт
            </Text>
          </View>
        ) : (
          <View style={styles.usersList}>
            {users
              .filter((user) => user.loyaltyId !== currentLoyaltyId)
              .map((user) => {
                const canCall = currentLoyaltyId &&
                  (user.online || user.hasVoipToken);

                return (
                  <View
                    key={user.id}
                    style={[styles.userCard, { backgroundColor: theme.backgroundSecondary }]}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                      <View style={styles.avatar}>
                        <Text allowFontScaling={false} style={styles.avatarText}>{getUserInitial(user)}</Text>
                      </View>
                    </View>

                    {/* User Name */}
                    <View style={styles.userNameContainer}>
                      <View style={styles.userNameRow}>
                        <Text allowFontScaling={false} style={[styles.userName, { color: theme.text }]}>
                          {getUserDisplayName(user)}
                        </Text>
                        <View
                          style={[
                            styles.statusDot,
                            user.online ? styles.statusDotOnline : styles.statusDotOffline,
                            !user.online && { backgroundColor: theme.textDisabled },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Phone Button */}
                    <TouchableOpacity
                      style={[
                        styles.phoneButton,
                        !canCall && styles.phoneButtonDisabled,
                        !canCall && { backgroundColor: theme.textDisabled },
                      ]}
                      onPress={() => handleCallUser(user)}
                      disabled={!canCall}>
                      <AppIcon name="phone" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                );
              })}
          </View>
        )}
      </ScrollView>

      {/* Add Contact Modal */}
      <AddContactModal
        visible={addContactModalVisible}
        onClose={() => setAddContactModalVisible(false)}
        onContactAdded={handleContactAdded}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    justifyContent: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignContent: 'center',
  },
  headerTitle: {
    fontFamily: FONT_HEADING,
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  callTimerWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
  },
  callTimerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  usersList: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    marginBottom: 12,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 24,
    backgroundColor: '#FACD64', // Light yellow background (kept as design element)
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#121F24', // Dark color (kept as design element)
  },
  userNameContainer: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOnline: {
    backgroundColor: '#34C759', // Green (kept as design element)
  },
  statusDotOffline: {
    // Will be set dynamically via inline style
  },
  phoneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#34C759', // Green color (kept as design element)
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneButtonDisabled: {
    // Will be set dynamically via inline style
  },
});

export default CallsScreen;

