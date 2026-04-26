import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EventCard } from '../components/EventCard';
import { RestaurantCard } from '../components/RestaurantCard';
import { useAuth } from '../context/AuthContext';
import { type EventFeedItem, fetchHomeData, listMyNotifications } from '../lib/api';
import type { Restaurant } from '../lib/types';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { token, signOut } = useAuth();
  const [eventRows, setEventRows] = useState<EventFeedItem[] | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotif, setUnreadNotif] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const { eventFeed, restaurants: rList } = await fetchHomeData(token);
      setEventRows(eventFeed);
      setRestaurants(rList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setEventRows(null);
      setRestaurants(null);
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

  const refreshUnread = useCallback(async () => {
    if (!token) {
      setUnreadNotif(0);
      return;
    }
    try {
      const { unreadCount } = await listMyNotifications(token, { limit: 1 });
      setUnreadNotif(unreadCount);
    } catch {
      setUnreadNotif(null);
    }
  }, [token]);

  React.useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      void load();
      void refreshUnread();
    });
    return unsub;
  }, [navigation, load, refreshUnread]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={homeHeaderStyles.row}>
          <Pressable
            onPress={() => navigation.navigate('Reservations')}
            hitSlop={8}
            style={homeHeaderStyles.btn}
          >
            <Text style={homeHeaderStyles.link}>Reservations</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Notifications')}
            hitSlop={8}
            style={homeHeaderStyles.btn}
          >
            <Text style={homeHeaderStyles.link}>
              {unreadNotif != null && unreadNotif > 0
                ? `Notif (${unreadNotif})`
                : 'Notif'}
            </Text>
          </Pressable>
          <Pressable onPress={() => void signOut()} hitSlop={8} style={homeHeaderStyles.btn}>
            <Text style={homeHeaderStyles.muted}>Log out</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, signOut, unreadNotif]);

  const isUnauthorized = error?.includes('401') || error?.toLowerCase().includes('unauthor');

  if (error && eventRows === null && restaurants === null) {
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

  const rList = restaurants ?? [];
  const eList = eventRows ?? [];

  return (
    <ScrollView
      style={styles.listWrap}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.sectionTitle}>Event nights</Text>
      {eList.length === 0 ? (
        <Text style={styles.emptyMuted}>
          No upcoming approved events. Check back when venues publish one.
        </Text>
      ) : (
        eList.map((row) => (
          <EventCard
            key={row.event.id}
            event={row.event}
            hostName={row.hostName}
            onPress={() =>
              navigation.navigate('EventDetail', {
                eventId: row.event.id,
                restaurantId: row.event.restaurantId,
                eventTitle: row.event.title,
              })
            }
          />
        ))
      )}

      <Text style={styles.sectionTitleSpaced}>Restaurants</Text>
      {rList.length === 0 ? (
        <Text style={styles.emptyMuted}>No restaurants to show yet.</Text>
      ) : (
        rList.map((r) => (
          <RestaurantCard
            key={r.id}
            restaurant={r}
            onPress={() =>
              navigation.navigate('RestaurantDetail', { restaurantId: r.id, name: r.name })
            }
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  listWrap: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  sectionTitleSpaced: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyMuted: { color: '#94a3b8', fontSize: 15, lineHeight: 22, marginBottom: 4 },
  centered: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  errorText: { color: '#b91c1c', textAlign: 'center', fontSize: 16 },
  mutedHint: { color: '#64748b', textAlign: 'center', marginTop: 8 },
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

const homeHeaderStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { marginLeft: 6 },
  link: { color: '#2563eb', fontSize: 15, fontWeight: '500' },
  muted: { color: '#64748b', fontSize: 15, fontWeight: '500' },
});
