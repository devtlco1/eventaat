import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Restaurant } from '../lib/types';

type Props = {
  restaurant: Restaurant;
  onPress: () => void;
};

export function RestaurantCard({ restaurant, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <Text style={styles.kicker}>Restaurant</Text>
      <Text style={styles.name}>{restaurant.name}</Text>
      <Text style={styles.line}>
        {restaurant.city}
        {restaurant.area ? ` · ${restaurant.area}` : ''}
      </Text>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, restaurant.isActive ? styles.badgeOn : styles.badgeOff]}>
          <Text style={restaurant.isActive ? styles.badgeTextOn : styles.badgeTextOff}>
            {restaurant.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.4,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  name: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  line: { fontSize: 15, color: '#475569', marginTop: 4 },
  badgeRow: { flexDirection: 'row', marginTop: 10 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999 },
  badgeOn: { backgroundColor: '#dcfce7' },
  badgeOff: { backgroundColor: '#f1f5f9' },
  badgeTextOn: { fontSize: 12, fontWeight: '600', color: '#166534' },
  badgeTextOff: { fontSize: 12, fontWeight: '600', color: '#64748b' },
});
