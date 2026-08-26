import React, {useState} from 'react';
import {StyleSheet, View, TouchableOpacity} from 'react-native';
import {AppIcon, AppText} from '../../UI';
import {useSelector} from 'react-redux';
import {useDispatch} from 'react-redux';
import {RootState, AppDispatch} from '../../../modules/store';
import {fetchDepartures} from '../../../modules/store/slices/departures';
import type {Departure} from '../../../types/departures';
import DepartureSelectionModal from './modals/DepartureSelectionModal';
import {useTheme} from '../../../hooks/useTheme';

type OriginFieldProps = {
  value: Departure | null;
  onChange: (departure: Departure) => void;
  style?: any;
};

const OriginField: React.FC<OriginFieldProps> = ({
  value,
  onChange,
  style,
}) => {
  const {theme} = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const {data: departuresData} = useSelector(
    (state: RootState) => state.departures,
  );
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (departure: Departure) => {
    onChange(departure);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.fieldButton, style]}
        onPress={() => {
          if (!departuresData) {
            dispatch(fetchDepartures());
          }
          setModalVisible(true);
        }}
        activeOpacity={1}>
        <View style={styles.fieldContent}>
          <AppText style={[styles.label, {color: theme.textTertiary}]}>
            Откуда?
          </AppText>
          <View style={styles.valueContainer}>
            <View style={styles.valueWithIcon}>
              <AppText style={[styles.value, {color: theme.text}]}>
                {(value as any)?.name_ru ||
                  value?.name ||
                  value?.name_en ||
                  'Москва'}
              </AppText>
              <AppIcon name="plane" size={24} color={theme.textTertiary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <DepartureSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelect}
        title="Город вылета"
      />
    </>
  );
};

export default OriginField;

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
