import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { fetchMyReservations, fetchRestaurants } from '../lib/api';
import type { ReservationRecord, ReservationStatus, Restaurant } from '../lib/types';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Reservations'>;

const STATUS_BADGE: Record<
  ReservationStatus,
  { bg: string; text: string; label: string }
> = {
  PENDING: { bg: '#fef3c7', text: '#92400e', label: 'PENDING' },
  HELD: { bg: '#dbeafe', text: '#1e40af', label: 'HELD' },
  CONFIRMED: { bg: '#d1fae5', text: '#065f46', label: 'CONFIRMED' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b', label: 'REJECTED' },
  CANCELLED: { bg: '#f4f4f5', text: '#52525b', label: 'CANCELLED' },
  COMPLETED: { bg: '#ecfdf5', text: '#047857', label: 'COMPLETED' },
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function displaySeating(s: string): string {
  return s.replace(/_/g, ' ');
}

function displayBooking(s: string): string {
  return s.replace(/_/g, ' ');
}

export function ReservationsScreen(_props: Props) {
  const { token, signOut } = useAuth();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!token) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const [list, restaurants] = await Promise.all([
          fetchMyReservations(token),
          fetchRestaurants(token).catch((): Restaurant[] => []),
        ]);
        setReservations(list);
        const map: Record<string, string> = {};
        for (const r of restaurants) {
          map[r.id] = r.name;
        }
        setNameById(map);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong';
        if (msg.includes('401')) {
          await signOut();
          return;
        }
        setError(msg);
        setReservations([]);
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [token, signOut],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const renderItem: ListRenderItem<ReservationRecord> = useCallback(
    ({ item: r }) => {
      const st = r.status as ReservationStatus;
      const badge = STATUS_BADGE[st] ?? {
        bg: '#f4f4f5',
        text: '#3f3f46',
        label: r.status,
      };
      const placeName =
        nameById[r.restaurantId] ??
        (r as { restaurantName?: string | null }).restaurantName ??
        null;

      return (
        <View style={styles.card} accessibilityLabel={`Reservation ${r.status}`}>
          <View style={styles.cardHeader}>
            {placeName ? (
              <Text style={styles.placeName}>{placeName}</Text>
            ) : (
              <Text style={styles.placeNameMuted}>Restaurant</Text>
            )}
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>
          {placeName == null ? <Text style={styles.meta}>{r.restaurantId}</Text> : null}
          <View style={styles.row}>
            <Text style={styles.k}>Party</Text>
            <Text style={styles.v}>{r.partySize}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.k}>Start</Text>
            <Text style={styles.v}>{formatWhen(r.startAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.k}>End</Text>
            <Text style={styles.v}>{formatWhen(r.endAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.k}>Guest</Text>
            <Text style={styles.v}>{r.guestType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.k}>Seating</Text>
            <Text style={styles.v}>{displaySeating(r.seatingPreference)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.k}>Type</Text>
            <Text style={styles.v}>{displayBooking(r.bookingType)}</Text>
          </View>
          {r.specialRequest ? (
            <View style={styles.noteBlock}>
              <Text style={styles.k}>Request</Text>
              <Text style={styles.note}>{r.specialRequest}</Text>
            </View>
          ) : null}
        </View>
      );
    },
    [nameById],
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered} accessibilityLabel="Loading reservations">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.mutedLoad}>Loading reservations…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => void load(false)}
          accessibilityLabel="Try again"
        >
          <Text style={styles.retryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={reservations}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={
        reservations.length === 0
          ? [styles.listContent, styles.listContentEmpty]
          : styles.listContent
      }
      ListEmptyComponent={
        <View style={styles.emptyInner}>
          <Text style={styles.emptyText}>No reservations yet.</Text>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 16, paddingBottom: 32 },
  listContentEmpty: { flexGrow: 1 },
  emptyInner: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mutedLoad: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyText: { color: '#64748b', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  errorText: {
    color: '#b91c1c',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  placeName: { fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1, flexWrap: 'wrap' },
  placeNameMuted: { fontSize: 16, fontWeight: '600', color: '#94a3b8', flex: 1 },
  meta: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 12 },
  k: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  v: { fontSize: 15, color: '#334155', textAlign: 'right', flex: 1, flexWrap: 'wrap' },
  noteBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  note: { marginTop: 4, fontSize: 15, color: '#334155', lineHeight: 22 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
