import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { listMyNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/api';
import type { InAppNotification } from '../lib/types';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function NotificationsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [list, setList] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = await listMyNotifications(token, { limit: 50 });
      setList(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onPressRow = useCallback(
    async (n: InAppNotification) => {
      if (!token) return;
      if (!n.readAt) {
        try {
          await markNotificationRead(token, n.id);
          setList((prev) =>
            prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
          );
          setUnreadCount((c) => Math.max(0, c - 1));
        } catch {
          setError('Could not mark as read');
          return;
        }
      }
      if (n.reservationId) {
        navigation.navigate('ReservationDetail', { kind: 'TABLE', id: n.reservationId });
      } else if (n.eventReservationId) {
        navigation.navigate('ReservationDetail', { kind: 'EVENT', id: n.eventReservationId });
      }
    },
    [token, navigation],
  );

  const onReadAll = useCallback(async () => {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      setList((prev) => prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      setError('Could not mark all as read');
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

  return (
    <ScrollView
      style={styles.listWrap}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {loading && list.length === 0 ? <Text style={styles.muted}>Loading…</Text> : null}
      <View style={styles.headerRow}>
        <Text style={styles.count}>
          {unreadCount} unread{unreadCount > 0 ? ' · tap to read & open detail' : ''}
        </Text>
        {unreadCount > 0 ? (
          <Pressable onPress={() => void onReadAll()} style={styles.btnAll}>
            <Text style={styles.btnAllText}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>
      {list.length === 0 && !loading ? (
        <Text style={styles.muted}>No notifications yet.</Text>
      ) : null}
      {list.map((n) => {
        const unread = !n.readAt;
        return (
          <Pressable
            key={n.id}
            onPress={() => void onPressRow(n)}
            style={({ pressed }) => [styles.card, unread && styles.cardUnread, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={styles.title}>{n.title}</Text>
            <Text style={styles.msg}>{n.message}</Text>
            <Text style={styles.meta}>
              {fmtTime(n.createdAt)} · {n.type}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  listWrap: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  err: { color: '#b91c1c', marginBottom: 8 },
  muted: { color: '#64748b', marginBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  count: { color: '#475569', fontSize: 12 },
  btnAll: { padding: 4 },
  btnAllText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  card: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  cardUnread: { backgroundColor: '#eff6ff' },
  title: { fontWeight: '600', color: '#0f172a', fontSize: 16 },
  msg: { color: '#334155', fontSize: 15, marginTop: 4 },
  meta: { color: '#94a3b8', fontSize: 11, marginTop: 6 },
});
