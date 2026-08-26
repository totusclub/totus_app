import React, { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText } from '../../UI';

type ReadyTour = {
  id: string;
  title: string;
  images: string[];
};

const readyToursData: ReadyTour[] = [
  {
    id: 'allInclusive',
    title: 'Туры под ключ',
    images: [
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: 'family',
    title: 'Семейные',
    images: [
      'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1500043204503-0a11fcb0a8be?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: 'romantic',
    title: 'Романтические',
    images: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: 'adventure',
    title: 'Приключения',
    images: [
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
    ],
  },
];

export const ReadyTours: React.FC = () => {
  const [activeTourId, setActiveTourId] = useState<string>(readyToursData[0].id);

  const activeTour = useMemo(
    () => readyToursData.find((tour) => tour.id === activeTourId) ?? readyToursData[0],
    [activeTourId],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {readyToursData.map((tour) => {
          const isActive = tour.id === activeTourId;
          const tabTextStyles = isActive
            ? [styles.tabText, styles.tabTextActive]
            : [styles.tabText];

          return (
            <TouchableOpacity
              key={tour.id}
              onPress={() => setActiveTourId(tour.id)}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <AppText style={tabTextStyles}>
                {tour.title}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.gallery}>
        <View style={styles.galleryTopRow}>
          {activeTour.images.slice(0, 2).map((image, index) => (
            <Image
              key={`${activeTour.id}-top-${index}`}
              source={{ uri: image }}
              style={[styles.galleryImageTop, index === 0 && styles.galleryImageTopLeft]}
            />
          ))}
        </View>

        <Image
          source={{ uri: activeTour.images[2] }}
          style={styles.galleryImageBottom}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  tabsContainer: {
    paddingRight: 16,
  },
  tabButton: {
    marginRight: 24,
  },
  tabText: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 20,
    color: '#7A7A7A',
  },
  tabTextActive: {
    color: '#FE732E',
  },
  gallery: {
    marginTop: 20,
  },
  galleryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  galleryImageTop: {
    flex: 1,
    height: 140,
    borderRadius: 20,
  },
  galleryImageTopLeft: {
    marginRight: 12,
  },
  galleryImageBottom: {
    height: 164,
    borderRadius: 20,
    width: '100%',
  },
});