import React, { useState, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppIcon, AppText } from '../../UI';
import TouristsSelectionModal from './modals/TouristsSelectionModal';
import { useTheme } from '../../../hooks/useTheme';
import { formatTouristsText } from './utils/searchHelpers';

type TouristsFieldProps = {
  value: string; // Format: "2 взрослых" / "5 человек"
  onChange: (tourists: string) => void;
  onTouristsChange?: (
    adults: number,
    children: number,
    kidsAges: number[],
  ) => void;
  style?: any;
  initialAdults?: number;
  initialChildren?: number;
  initialKidsAges?: number[];
};

const TouristsField: React.FC<TouristsFieldProps> = ({
  value,
  onChange,
  onTouristsChange,
  style,
  initialAdults,
  initialChildren = 0,
  initialKidsAges = [],
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const initialTourists = useMemo(() => {
    if (initialAdults !== undefined) {
      return { adults: initialAdults, children: initialChildren };
    }
    const match = value.match(/\d+/);
    const total = match ? parseInt(match[0], 10) : 2;
    return { adults: total, children: 0 };
  }, [value, initialAdults, initialChildren]);

  const handleSelect = (
    adults: number,
    children: number,
    kidsAges: number[],
  ) => {
    onChange(formatTouristsText(String(adults), String(children)));
    onTouristsChange?.(adults, children, kidsAges);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fieldButton, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={1}>
        <View style={styles.fieldContent}>
          <AppText style={[styles.label, { color: theme.textTertiary }]}>
            Туристы
          </AppText>
          <View style={styles.valueContainer}>
            <View style={styles.valueWithIcon}>
              <AppText style={[styles.value, { color: theme.text }]}>
                {value}
              </AppText>
              <AppIcon
                name="OrdersStackScreen"
                size={24}
                color={theme.textTertiary}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <TouristsSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelect}
        initialAdults={initialTourists.adults}
        initialChildren={initialTourists.children}
        initialKidsAges={initialKidsAges}
      />
    </>
  );
};

export default TouristsField;

const styles = StyleSheet.create({
  fieldButton: {
    marginBottom: 16,
  },
  fieldContent: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 3,
    marginTop: 8,
  },
  valueContainer: {
    paddingBottom: 8,
    position: 'relative',
  },
  valueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
});
