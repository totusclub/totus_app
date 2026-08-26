import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText } from '../../UI';
import { highlightAllMatches } from '../../UI/highlightText';
import { useTheme } from '../../../hooks/useTheme';

type City = {
  id: string;
  name: string;
  region: string;
};

type CityItemProps = {
  city: City;
  searchQuery: string;
  onPress: (city: City) => void;
};

const CityItem: React.FC<CityItemProps> = ({ city, searchQuery, onPress }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={styles.cityItem}
      onPress={() => onPress(city)}
      activeOpacity={0.7}>
      <View>
        {highlightAllMatches(
          city.name,
          searchQuery,
          [styles.highlightedText, { color: theme.brand }],
          [styles.cityName, { color: theme.text }],
        )}
        <AppText style={[styles.cityRegion, { color: theme.textTertiary }]}>{city.region}</AppText>
      </View>
    </TouchableOpacity>
  );
};

export default CityItem;

const styles = StyleSheet.create({
  cityItem: {
    paddingVertical: 16,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  highlightedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cityRegion: {
    fontSize: 14,
    fontWeight: '400',
  },
});

