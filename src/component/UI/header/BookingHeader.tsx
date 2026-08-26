import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppIcon from '../icons';
import AppText from '../text';
import { useTheme } from '../../../hooks/useTheme';

const BookingHeader: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={[styles.container, { borderBottomColor: theme.borderLight }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.headerButton}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
        <AppIcon name="simpleArrow" size={24} color={theme.text} />
      </TouchableOpacity>
      <AppText style={[styles.headerTitle, { color: theme.text }]}>Добавление документа</AppText>
      <View style={styles.headerButton} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    padding: 8,
    borderBottomWidth: 2,
  },
  headerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookingHeader;

