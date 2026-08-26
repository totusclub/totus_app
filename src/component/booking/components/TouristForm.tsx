import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import RNModal from 'react-native-modal';
import { AppText, AppInput, Toggle, AppIcon, DateInput } from '../../UI';
import type { Tourist, TouristErrors } from '../../../types/booking';
import { useTheme } from '../../../hooks/useTheme';
import {
  documentTypeMap,
  documentTypeReverseMap,
  nationalityMap,
  nationalityReverseMap,
  citizenshipOptions,
  documentTypeOptions,
  getChildAgeRange,
  getNamePlaceholder,
  DEFAULT_NATIONALITY_ID,
} from '../../../utils/booking/documentMappings';

interface TouristFormProps {
  tourist: Tourist;
  index: number;
  errors: TouristErrors;
  onUpdate: (key: keyof Tourist, value: string | boolean | number, additionalUpdates?: Partial<Tourist>) => void;
  onClearPatronymicError: () => void;
  showDivider: boolean;
  onNoPatronymicToggle: (newValue: boolean) => void;
}

export const TouristForm: React.FC<TouristFormProps> = ({
  tourist,
  index,
  errors,
  onUpdate,
  showDivider,
  onNoPatronymicToggle,
}) => {
  const { theme } = useTheme();
  const isChild = tourist.child || false;
  const noPatronymic = tourist.noPatronymic || false;
  const isInternationalPassport = tourist.doc_type === 'international_passport' || tourist.doc_type === 'international_passport_other';
  const isInternalPassport = tourist.doc_type === 'internal_passport';

  const [citizenshipModalVisible, setCitizenshipModalVisible] = useState(false);
  const [documentTypeModalVisible, setDocumentTypeModalVisible] = useState(false);
  const citizenshipLocked = citizenshipOptions.length <= 1;

  // Keep the payload consistent with the single allowed citizenship
  useEffect(() => {
    if (citizenshipLocked && tourist.nationality_id !== DEFAULT_NATIONALITY_ID) {
      onUpdate('nationality_id', DEFAULT_NATIONALITY_ID);
    }
  }, [citizenshipLocked, tourist.nationality_id, onUpdate]);

  const handlePatronymicChange = (value: string) => {
    onUpdate('patronymic', value);
    // If user types something, disable the "no patronymic" toggle
    if (value && value.trim() !== '') {
      onUpdate('noPatronymic', false);
    }
  };

  const handleNoPatronymicToggle = () => {
    const newNoPatronymic = !noPatronymic;
    onNoPatronymicToggle(newNoPatronymic);
  };

  // Handle passport number input with length restriction
  const handlePassportNumberChange = (value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');

    // Determine max length based on document type
    let maxLength: number;
    if (isInternationalPassport) {
      maxLength = 9;
    } else if (isInternalPassport) {
      maxLength = 10;
    } else {
      // For other document types, allow up to 10 digits
      maxLength = 10;
    }

    // Limit to max length
    const limitedValue = digitsOnly.slice(0, maxLength);

    onUpdate('passport_number', limitedValue);
  };


  const getPassportPlaceholder = () => {
    if (isInternationalPassport) {
      return 'Серия и номер документа (9 цифр)';
    } else if (isInternalPassport) {
      return 'Серия и номер документа (10 цифр)';
    }
    return 'Серия и номер документа';
  };

  return (
    <>
      <View style={styles.touristForm}>
        {showDivider && <View style={[styles.divider, { backgroundColor: theme.divider }]} />}

        <View style={styles.touristHeader}>
          <AppText style={[styles.touristTitle, { color: theme.text }]}>{isChild ? 'Ребенок' : 'Взрослый'}</AppText>
          <AppText style={[styles.touristSubtitle, { color: theme.textTertiary }]}>
            {isChild ? getChildAgeRange(tourist.child_age) : 'старше 17 лет'}
          </AppText>
        </View>

        <View style={styles.form}>

          <AppInput
            value={tourist.name}
            onChange={(value) => onUpdate('name', value)}
            placeholder={getNamePlaceholder('name', tourist.doc_type)}
            autoCapitalize="words"
            focusBorderColor={theme.brand}
          />
          {errors.name && (
            <AppText style={[styles.fieldError, { color: theme.error }]}>{errors.name}</AppText>
          )}

          <AppInput
            value={tourist.surname}
            onChange={(value) => onUpdate('surname', value)}
            placeholder={getNamePlaceholder('surname', tourist.doc_type)}
            autoCapitalize="words"
            focusBorderColor={theme.brand}
          />
          {errors.surname && (
            <AppText style={[styles.fieldError, { color: theme.error }]}>{errors.surname}</AppText>
          )}

          <AppInput
            value={tourist.patronymic}
            onChange={handlePatronymicChange}
            placeholder={getNamePlaceholder('patronymic', tourist.doc_type)}
            autoCapitalize="words"
            disabled={noPatronymic}
            focusBorderColor={theme.brand}
          />
          {errors.patronymic && (
            <AppText style={[styles.fieldError, { color: theme.error }]}>{errors.patronymic}</AppText>
          )}

          <View style={styles.toggleContainer}>
            <AppText style={[styles.toggleLabel, { color: theme.text }]}>Нет отчества</AppText>
            <View style={styles.toggleWrapper}>
              <Toggle
                label=""
                value={noPatronymic}
                onToggle={handleNoPatronymicToggle}
              />
            </View>
          </View>

          <DateInput
            value={tourist.birthday}
            onChange={(value) => onUpdate('birthday', value)}
            placeholder="DD.MM.YYYY"
            label="Дата рождения"
            error={errors.birthday}
            allowPastDates={true}
            allowFutureDates={false}
            focusBorderColor={theme.brand}
          />

          <View style={styles.genderContainer}>
            <AppText style={[styles.genderLabel, { color: theme.text }]}>Пол:</AppText>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => onUpdate('gender', 'M')}
                activeOpacity={0.7}>
                <View style={[styles.radioCircle, { borderColor: theme.textDisabled }, tourist.gender === 'M' && { borderColor: theme.brand }]}>
                  {tourist.gender === 'M' && <View style={[styles.radioInner, { backgroundColor: theme.brand }]} />}
                </View>
                <AppText style={[styles.radioLabel, { color: theme.text }]}>Мужской</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => onUpdate('gender', 'F')}
                activeOpacity={0.7}>
                <View style={[styles.radioCircle, { borderColor: theme.textDisabled }, tourist.gender === 'F' && { borderColor: theme.brand }]}>
                  {tourist.gender === 'F' && <View style={[styles.radioInner, { backgroundColor: theme.brand }]} />}
                </View>
                <AppText style={[styles.radioLabel, { color: theme.text }]}>Женский</AppText>
              </TouchableOpacity>
            </View>
          </View>
          {errors.gender && (
            <AppText style={[styles.fieldError, { color: theme.error }]}>{errors.gender}</AppText>
          )}

          <TouchableOpacity
            style={[styles.dropdown, { borderColor: theme.inputBorder }]}
            onPress={() => setCitizenshipModalVisible(true)}
            activeOpacity={citizenshipLocked ? 1 : 0.7}
            disabled={citizenshipLocked}>
            <View style={styles.dropdownContent}>
              <AppText style={[styles.dropdownLabel, { color: theme.inputPlaceholder }]}>Гражданство</AppText>
              <View style={styles.dropdownValueContainer}>
                <AppText style={[styles.dropdownValue, { color: theme.text }]}>
                  {nationalityReverseMap[tourist.nationality_id || DEFAULT_NATIONALITY_ID] || 'Россия'}
                </AppText>
                {!citizenshipLocked && (
                  <AppIcon name="arrowDown" size={16} color={theme.textDisabled} />
                )}
              </View>
            </View>
          </TouchableOpacity>
          {errors.nationality_id && (
            <AppText style={[styles.fieldError, { color: theme.error }]}>{errors.nationality_id}</AppText>
          )}

          <TouchableOpacity
            style={[styles.dropdown, { borderColor: theme.inputBorder }]}
            onPress={() => setDocumentTypeModalVisible(true)}
            activeOpacity={0.7}>
            <View style={styles.dropdownContent}>
              <AppText style={[styles.dropdownLabel, { color: theme.inputPlaceholder }]}>Документ</AppText>
              <View style={styles.dropdownValueContainer}>
                <AppText style={[styles.dropdownValue, { color: theme.text }]}>
                  {documentTypeReverseMap[tourist.doc_type] || 'Заграничный паспорт РФ'}
                </AppText>
                <AppIcon name="arrowDown" size={16} color={theme.textDisabled} />
              </View>
            </View>
          </TouchableOpacity>
          {errors.doc_type && (
            <AppText style={[styles.fieldError, { color: theme.error }]}>{errors.doc_type}</AppText>
          )}

          <AppInput
            value={tourist.passport_number.toString()}
            onChange={handlePassportNumberChange}
            placeholder={getPassportPlaceholder()}
            keyboardType="numeric"
            focusBorderColor={theme.brand}
          />
          {errors.passport_number && (
            <AppText style={[styles.fieldError, { color: theme.error }]}>{errors.passport_number}</AppText>
          )}

          <DateInput
            value={tourist.passport_expires_on}
            onChange={(value) => onUpdate('passport_expires_on', value)}
            placeholder="DD.MM.YYYY"
            label="Срок действия документа"
            error={errors.passport_expires_on}
            allowPastDates={false}
            focusBorderColor={theme.brand}
          />
        </View>
      </View>

      {/* Citizenship Modal */}
      <RNModal
        isVisible={citizenshipModalVisible && !citizenshipLocked}
        onBackdropPress={() => setCitizenshipModalVisible(false)}
        onSwipeComplete={() => setCitizenshipModalVisible(false)}
        swipeDirection="down"
        backdropOpacity={0}
        hasBackdrop={false}
        style={styles.modal}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={() => setCitizenshipModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
              <AppText style={[styles.modalTitle, { color: theme.text }]}>Гражданство</AppText>
              <TouchableOpacity onPress={() => setCitizenshipModalVisible(false)}>
                <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.modalList}>
              {citizenshipOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalItem}
                  onPress={() => {
                    onUpdate('nationality_id', nationalityMap[option]);
                    setCitizenshipModalVisible(false);
                  }}>
                  <AppText style={[styles.modalItemText, { color: theme.text }]}>{option}</AppText>
                  {tourist.nationality_id === nationalityMap[option] && (
                    <AppIcon name="checkmark" size={20} color={theme.brand} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </RNModal>

      {/* Document Type Modal */}
      <Modal
        visible={documentTypeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDocumentTypeModalVisible(false)}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={() => setDocumentTypeModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.borderLight }]}>
              <AppText style={[styles.modalTitle, { color: theme.text }]}>Документ</AppText>
              <TouchableOpacity onPress={() => setDocumentTypeModalVisible(false)}>
                <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.modalList}>
              {documentTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.modalItem}
                  onPress={() => {
                    onUpdate('doc_type', documentTypeMap[option]);
                    setDocumentTypeModalVisible(false);
                  }}>
                  <AppText style={[styles.modalItemText, { color: theme.text }]}>{option}</AppText>
                  {tourist.doc_type === documentTypeMap[option] && (
                    <AppIcon name="checkmark" size={20} color={theme.brand} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  touristForm: {
    marginTop: 20,
  },
  closeText: {
    fontSize: 24,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  touristHeader: {
    marginBottom: 20,
  },
  touristTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  touristSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  form: {
    gap: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  toggleWrapper: {
    marginBottom: -8,
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 24,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  dropdown: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dropdownContent: {
    width: '100%',
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 4,
  },
  dropdownValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    fontSize: 16,
    fontWeight: '400',
    flex: 1,
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: -12,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalList: {
    paddingVertical: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '400',
  },
});

