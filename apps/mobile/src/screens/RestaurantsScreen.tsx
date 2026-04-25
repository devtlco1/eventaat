import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { fetchRestaurants } from '../lib/api';
import type { Restaurant } from '../lib/types';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Restaurants'>;

export function RestaurantsScreen({ navigation }: Props) {
  const { token, signOut } = useAuth();
  const [items, setItems] = useState<Restaurant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const list = await fetchRestaurants(token);
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems(null);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  React.useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      void load();
    });
    return unsub;
  }, [navigation, load]);

  const isUnauthorized = error?.includes('401') || error?.toLowerCase().includes('unauthor');

  if (error && items === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        {isUnauthorized ? <Text style={styles.mutedHint}>Session may have expired.</Text> : null}
        <Pressable
          onPress={async () => {
            if (isUnauthorized) {
              await signOut();
            } else {
              void onRefresh();
            }
          }}
          style={({ pressed }) => [styles.retry, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.retryText}>{isUnauthorized ? 'Sign in again' : 'Try again'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.listWrap}>
      <FlatList
        data={items ?? []}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Text style={styles.caption}>
            {items?.length == null
              ? 'Loading…'
              : `${items.length} place${items.length === 1 ? '' : 's'}`}
          </Text>
        }
        contentContainerStyle={items?.length ? styles.listContent : styles.emptyContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate('RestaurantDetail', { restaurantId: item.id, name: item.name })
            }
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.line}>
              {item.city}
              {item.area ? ` · ${item.area}` : ''}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, item.isActive ? styles.badgeOn : styles.badgeOff]}>
                <Text style={item.isActive ? styles.badgeTextOn : styles.badgeTextOff}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !error && !refreshing && items && items.length === 0 ? (
            <Text style={styles.mutedCenter}>No restaurants to show yet.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listWrap: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { padding: 16, paddingBottom: 32 },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  caption: { color: '#64748b', fontSize: 13, marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  name: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  line: { fontSize: 15, color: '#475569', marginTop: 4 },
  badgeRow: { flexDirection: 'row', marginTop: 10 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999 },
  badgeOn: { backgroundColor: '#dcfce7' },
  badgeOff: { backgroundColor: '#f1f5f9' },
  badgeTextOn: { fontSize: 12, fontWeight: '600', color: '#166534' },
  badgeTextOff: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  centered: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  errorText: { color: '#b91c1c', textAlign: 'center', fontSize: 16 },
  mutedHint: { color: '#64748b', textAlign: 'center', marginTop: 8 },
  mutedCenter: { color: '#94a3b8', textAlign: 'center', fontSize: 15 },
  retry: {
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600' },
});
