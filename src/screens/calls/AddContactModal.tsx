import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppIcon } from '../../component/UI';
import { useTheme } from '../../hooks/useTheme';
import { searchUserByLoyaltyId, addContact, contactExists, type Contact } from '../../modules/api/contacts';
import { getUserDisplayName } from '../../modules/api/users';
import { useSelector } from 'react-redux';
import { RootState } from '../../modules/store';

type AddContactModalProps = {
  visible: boolean;
  onClose: () => void;
  onContactAdded: (contact: Contact) => void;
};

const AddContactModal: React.FC<AddContactModalProps> = ({
  visible,
  onClose,
  onContactAdded,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user: loggedInUser } = useSelector((state: RootState) => state.auth);
  
  const [loyaltyId, setLoyaltyId] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyContact, setIsAlreadyContact] = useState(false);

  const handleSearch = async () => {
    if (!loyaltyId.trim()) {
      setError('Пожалуйста, введите Loyalty ID');
      return;
    }

    if (!loggedInUser || !(loggedInUser as any).id) {
      setError('Пожалуйста, войдите в систему');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchedUser(null);
    setIsAlreadyContact(false);

    try {
      const userId = (loggedInUser as any).id;
      // Remove all spaces from loyalty ID before searching
      const normalizedLoyaltyId = loyaltyId.replace(/\s+/g, '');
      
      // Search for user
      const user = await searchUserByLoyaltyId(normalizedLoyaltyId);
      if (!user) {
        setError('Пользователь с таким Loyalty ID не найден');
        return;
      }

      // Check if user is already in contacts
      const alreadyExists = await contactExists(userId, normalizedLoyaltyId);
      setIsAlreadyContact(alreadyExists);
      
      if (alreadyExists) {
        setError('Этот пользователь уже есть в ваших контактах');
      } else {
        setSearchedUser(user);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при поиске пользователя');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContact = async () => {
    if (!searchedUser || !loggedInUser) {
      return;
    }

    const userId = (loggedInUser as any).id;
    if (!userId) {
      setError('Ошибка: ID пользователя не найден');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      // Use the normalized loyalty ID from the searched user
      const contact = await addContact(userId, searchedUser.loyaltyId);
      onContactAdded(contact);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка при добавлении контакта');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setLoyaltyId('');
    setSearchedUser(null);
    setError(null);
    setIsInputFocused(false);
    setIsAlreadyContact(false);
    onClose();
  };

  const displayName = searchedUser ? getUserDisplayName(searchedUser) : '';

  return (
    <Modal
      style={styles.modal}
      isVisible={visible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      onBackdropPress={handleClose}
      onSwipeComplete={handleClose}
      swipeDirection="down"
      backdropOpacity={0}
      hasBackdrop={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.background,
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 20,
            },
          ]}>
          {/* Header */}
          <View style={styles.header}>
            <AppText style={[styles.headerTitle, { color: theme.text }]}>
              Добавить контакт
            </AppText>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
            </TouchableOpacity>
          </View>

          {/* Input */}
          <View style={styles.inputContainer}>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor:
                    isInputFocused || loyaltyId.length > 0
                      ? theme.brand
                      : theme.inputBorder,
                  backgroundColor: theme.inputBackground,
                },
              ]}>
              <TextInput
                allowFontScaling={false}
                style={[styles.input, { color: theme.inputText }]}
                placeholder="Loyalty ID (например: 9897 3971 0801 6689)"
                placeholderTextColor={theme.inputPlaceholder}
                value={loyaltyId}
                onChangeText={(text) => {
                  // Allow spaces for better readability, but normalize when searching
                  // Remove any non-digit characters except spaces
                  const cleaned = text.replace(/[^\d\s]/g, '');
                  setLoyaltyId(cleaned);
                  setSearchedUser(null);
                  setError(null);
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numeric"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
                maxLength={19} // 16 digits + 3 spaces max
              />
              {loyaltyId.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setLoyaltyId('');
                    setSearchedUser(null);
                    setError(null);
                  }}
                  style={styles.clearButton}>
                  <AppText style={[styles.clearButtonText, { color: theme.textTertiary }]}>
                    ✕
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
            <View
              style={[
                styles.inputUnderline,
                {
                  backgroundColor:
                    isInputFocused || loyaltyId.length > 0 ? theme.brand : theme.border,
                },
              ]}
            />
          </View>

          {/* Search Button */}
          <TouchableOpacity
            style={[
              styles.searchButton,
              { backgroundColor: theme.brand },
              (isSearching || !loyaltyId.trim()) && styles.searchButtonDisabled,
            ]}
            onPress={handleSearch}
            disabled={isSearching || !loyaltyId.trim()}>
            {isSearching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <AppText style={styles.searchButtonText}>Поиск</AppText>
            )}
          </TouchableOpacity>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <AppText style={[styles.errorText, { color: theme.error }]}>{error}</AppText>
            </View>
          )}

          {/* Searched User Info */}
          {searchedUser && !error && !isAlreadyContact && (
            <View style={[styles.userInfoContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.userInfoHeader}>
                <View style={styles.avatar}>
                  <AppText style={styles.avatarText}>
                    {displayName.charAt(0).toUpperCase()}
                  </AppText>
                </View>
                <View style={styles.userInfo}>
                  <AppText style={[styles.userName, { color: theme.text }]}>
                    {displayName}
                  </AppText>
                  <AppText style={[styles.userLoyaltyId, { color: theme.textTertiary }]}>
                    ID: {searchedUser.loyaltyId}
                  </AppText>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: theme.brand },
                  isAdding && styles.addButtonDisabled,
                ]}
                onPress={handleAddContact}
                disabled={isAdding}>
                {isAdding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AppText style={styles.addButtonText}>Добавить в контакты</AppText>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddContactModal;

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 20,
    zIndex: 1,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
    marginBottom: 10,
  },
  inputUnderline: {
    height: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  clearButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '300',
  },
  searchButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  userInfoContainer: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FACD64',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#121F24',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userLoyaltyId: {
    fontSize: 14,
  },
  addButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
