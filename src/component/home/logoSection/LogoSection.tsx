import React from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { AppIcon } from '../../UI';

export default function LogoSection() {
  const logos = Array.from({ length: 3 }, (_, i) => ({ id: i + 1 }));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.logoSection}>
      {logos.map((logo) => (
        <View key={logo.id} style={styles.logoContainer}>
          {logo.id === 1 && <AppIcon name="partner1" size={120} color="#ffffff" />}
          {logo.id === 2 && <AppIcon name="partner2" size={120} color="#8080804D" />}
          {logo.id === 3 && <AppIcon name="partner3" size={120} color="#8080804D" />}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  logoSection: {
    paddingHorizontal: 16,
    marginTop: 30,
  },
  logoContainer: {
    marginRight: 16,
    paddingHorizontal: 15,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'black',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});