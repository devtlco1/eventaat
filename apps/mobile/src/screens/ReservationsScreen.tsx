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
import { fetchMyReservations } from '../lib/api';
import type { BookingType, GuestType, MyReservation, ReservationStatus, SeatingPreference } from '../lib/types';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Reservations'>;

const STATUS_BADGE: Record<
  ReservationStatus,
  { bg: string; text: string; display: string }
> = {
  PENDING: { bg: '#fef3c7', text: '#92400e', display: 'Pending' },
  HELD: { bg: '#dbeafe', text: '#1e40af', display: 'Held' },
  CONFIRMED: { bg: '#d1fae5', text: '#065f46', display: 'Confirmed' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b', display: 'Rejected' },
  CANCELLED: { bg: '#f1f5f9', text: '#475569', display: 'Cancelled' },
  COMPLETED: { bg: '#d1fae5', text: '#047857', display: 'Completed' },
};

const GUEST_LABEL: Record<GuestType, string> = {
  FAMILY: 'Families',
  YOUTH: 'Youth',
  MIXED: 'Mixed',
  BUSINESS: 'Business',
  OTHER: 'Other',
};

const SEAT_LABEL: Record<SeatingPreference, string> = {
  INDOOR: 'Indoor',
  OUTDOOR: 'Outdoor',
  NO_PREFERENCE: 'No preference',
};

const BOOK_LABEL: Record<BookingType, string> = {
  STANDARD: 'Standard',
  EVENT_NIGHT: 'Event night',
  VIP: 'VIP',
  OCCASION: 'Occasion',
  OTHER: 'Other',
};

function formatHistoryWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatWhereWhen(startIso: string, endIso: string): string {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return `${startIso} – ${endIso}`;
    }
    const dateLine = s.toLocaleDateString(undefined, { dateStyle: 'medium' });
    const t1 = s.toLocaleTimeString(undefined, { timeStyle: 'short' });
    const t2 = e.toLocaleTimeString(undefined, { timeStyle: 'short' });
    return `${dateLine} · ${t1} – ${t2}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}

function placeSubtitle(r: MyReservation): string {
  const p = r.restaurant;
  if (p.area) {
    return `${p.city} · ${p.area}`;
  }
  return p.city;
}

export function ReservationsScreen(_props: Props) {
  const { token, signOut } = useAuth();
  const [reservations, setReservations] = useState<MyReservation[]>([]);
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
        const list = await fetchMyReservations(token);
        setReservations(list);
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

  const renderItem: ListRenderItem<MyReservation> = useCallback(({ item: r }) => {
    const st = r.status;
    const badge = STATUS_BADGE[st] ?? {
      bg: '#f4f4f5',
      text: '#3f3f46',
      display: r.status,
    };
    const name = r.restaurant.name;
    const loc = placeSubtitle(r);
    return (
      <View style={styles.card} accessibilityLabel={`Reservation ${badge.display}`}>
        <View style={styles.cardHeader}>
          <View style={styles.titleBlock}>
            <Text style={styles.placeName}>{name}</Text>
            {loc ? <Text style={styles.placeLoc}>{loc}</Text> : null}
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.display}</Text>
          </View>
        </View>
        <Text style={styles.whenLabel}>Date & time</Text>
        <Text style={styles.whenText}>{formatWhereWhen(r.startAt, r.endAt)}</Text>
        <View style={styles.row}>
          <Text style={styles.k}>Guest type</Text>
          <Text style={styles.v}>{GUEST_LABEL[r.guestType]}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.k}>Seating</Text>
          <Text style={styles.v}>{SEAT_LABEL[r.seatingPreference]}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.k}>Booking</Text>
          <Text style={styles.v}>{BOOK_LABEL[r.bookingType]}</Text>
        </View>
        {r.specialRequest ? (
          <View style={styles.noteBlock}>
            <Text style={styles.k}>Request</Text>
            <Text style={styles.note}>{r.specialRequest}</Text>
          </View>
        ) : null}
        {r.statusHistory && r.statusHistory.length > 0 ? (
          <View style={styles.historyBlock}>
            <Text style={styles.historyLabel}>Status updates</Text>
            {r.statusHistory.map((h, i) => {
              const line = `${h.fromStatus ?? '—'} → ${h.toStatus}${
                h.note ? ` · ${h.note}` : ''
              }`;
              return (
                <Text key={`${h.createdAt}-${i}`} style={styles.historyLine}>
                  {formatHistoryWhen(h.createdAt)} — {line}
                </Text>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  }, []);

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
      style={styles.list}
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
  list: { flex: 1, backgroundColor: '#f1f5f9' },
  listContent: { padding: 16, paddingBottom: 32 },
  listContentEmpty: { flexGrow: 1 },
  emptyInner: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    backgroundColor: '#f1f5f9',
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
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  titleBlock: { flex: 1, paddingRight: 8 },
  placeName: { fontSize: 20, fontWeight: '800', color: '#0f172a', lineHeight: 26 },
  placeLoc: { marginTop: 5, fontSize: 15, color: '#64748b' },
  whenLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4, marginBottom: 4 },
  whenText: { fontSize: 16, lineHeight: 24, color: '#1e293b', fontWeight: '500', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 12 },
  k: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  v: { fontSize: 15, color: '#334155', textAlign: 'right', flex: 1, flexWrap: 'wrap' },
  historyBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  historyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  historyLine: { fontSize: 13, color: '#64748b', lineHeight: 20, marginTop: 2 },
  noteBlock: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  note: { marginTop: 4, fontSize: 15, color: '#334155', lineHeight: 22 },
  badge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '800' },
});
