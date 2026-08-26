import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppIcon from '../icons';
import AppText from '../text';
import { useTheme } from '../../../hooks/useTheme';

const OrdersHeader: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
        <AppIcon name="simpleArrow" size={24} color={theme.text} />
      </TouchableOpacity>
      <AppText style={[styles.headerTitle, { color: theme.text }]}>Мои заказы</AppText>
      <View style={styles.placeholder} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
});

export default OrdersHeader;

