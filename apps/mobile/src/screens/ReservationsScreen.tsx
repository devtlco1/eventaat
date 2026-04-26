import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import {
  cancelMyEventReservation,
  cancelMyReservation,
  fetchMyEventReservations,
  fetchMyReservations,
} from '../lib/api';
import type {
  BookingType,
  EventReservationStatus,
  GuestType,
  MyEventReservation,
  MyReservation,
  ReservationStatus,
  SeatingPreference,
} from '../lib/types';
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

const EVENT_STATUS_BADGE: Record<
  EventReservationStatus,
  { bg: string; text: string; display: string }
> = {
  PENDING: { bg: '#ede9fe', text: '#5b21b6', display: 'Pending approval' },
  CONFIRMED: { bg: '#d1fae5', text: '#065f46', display: 'Confirmed' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b', display: 'Rejected' },
  CANCELLED: { bg: '#f1f5f9', text: '#475569', display: 'Cancelled' },
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

const STATUS_CUSTOMER_MAY_CANCEL: ReadonlySet<ReservationStatus> = new Set([
  'PENDING',
  'HELD',
  'CONFIRMED',
]);

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

function placeSubtitleEvent(r: MyEventReservation): string {
  const p = r.restaurant;
  if (p.area) {
    return `${p.city} · ${p.area}`;
  }
  return p.city;
}

export function ReservationsScreen(_props: Props) {
  const { token, signOut } = useAuth();
  const [reservations, setReservations] = useState<MyReservation[]>([]);
  const [eventReservations, setEventReservations] = useState<MyEventReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Table ids or `event:` + id to avoid collision */
  const [cancellingId, setCancellingId] = useState<string | null>(null);

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
        const [list, evList] = await Promise.all([
          fetchMyReservations(token),
          fetchMyEventReservations(token),
        ]);
        setReservations(list);
        setEventReservations(evList);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Something went wrong';
        if (msg.includes('401')) {
          await signOut();
          return;
        }
        setError(msg);
        setReservations([]);
        setEventReservations([]);
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

  const requestCancelTable = useCallback(
    async (r: MyReservation) => {
      if (!token) return;
      setCancellingId(r.id);
      try {
        await cancelMyReservation(token, r.id, {});
        const list = await fetchMyReservations(token);
        setReservations(list);
        Alert.alert('Cancelled', 'Your reservation was cancelled.');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not cancel';
        if (msg.includes('401')) {
          await signOut();
          return;
        }
        Alert.alert('Error', msg);
      } finally {
        setCancellingId(null);
      }
    },
    [token, signOut],
  );

  const requestCancelEvent = useCallback(
    async (r: MyEventReservation) => {
      if (!token) return;
      setCancellingId(`ev:${r.id}`);
      try {
        await cancelMyEventReservation(token, r.id, {});
        const list = await fetchMyEventReservations(token);
        setEventReservations(list);
        Alert.alert('Cancelled', 'Your event request was cancelled.');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not cancel';
        if (msg.includes('401')) {
          await signOut();
          return;
        }
        Alert.alert('Error', msg);
      } finally {
        setCancellingId(null);
      }
    },
    [token, signOut],
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

  const empty = reservations.length === 0 && eventReservations.length === 0;
  const busyAny = cancellingId != null;

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={empty ? [styles.listContent, styles.listContentEmpty] : styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
      }
    >
      {empty ? (
        <View style={styles.emptyInner}>
          <Text style={styles.emptyText}>No reservations yet.</Text>
        </View>
      ) : (
        <>
      <Text style={styles.sectionLabel}>Event reservations</Text>
      {eventReservations.length === 0 ? (
        <Text style={styles.sectionEmpty}>No event night requests yet.</Text>
      ) : null}
      {eventReservations.map((r) => {
        const st = r.status;
        const badge = EVENT_STATUS_BADGE[st];
        const endMs = new Date(r.event.endsAt).getTime();
        const beforeEnd = endMs > Date.now();
        const mayCancel = (st === 'PENDING' || st === 'CONFIRMED') && beforeEnd;
        const key = `ev:${r.id}`;
        const busyThis = cancellingId === key;
        return (
          <View
            key={r.id}
            style={styles.card}
            accessibilityLabel={`Event reservation ${badge.display}`}
          >
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>EVENT</Text>
            </View>
            <View style={styles.cardHeader}>
              <View style={styles.titleBlock}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {r.event.title}
                </Text>
                <Text style={styles.placeName}>{r.restaurant.name}</Text>
                {placeSubtitleEvent(r) ? (
                  <Text style={styles.placeLoc}>{placeSubtitleEvent(r)}</Text>
                ) : null}
              </View>
              <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.badgeText, { color: badge.text }]}>{badge.display}</Text>
              </View>
            </View>
            <Text style={styles.whenLabel}>Date & time (event)</Text>
            <Text style={styles.whenText}>
              {formatWhereWhen(r.event.startsAt, r.event.endsAt)}
            </Text>
            <View style={styles.row}>
              <Text style={styles.k}>Party</Text>
              <Text style={styles.v}>
                {r.partySize} {r.partySize === 1 ? 'guest' : 'guests'}
              </Text>
            </View>
            {r.rejectionReason && st === 'REJECTED' ? (
              <View style={styles.noteBlock}>
                <Text style={styles.k}>Rejection</Text>
                <Text style={styles.note}>{r.rejectionReason}</Text>
              </View>
            ) : null}
            {r.specialRequest ? (
              <View style={styles.noteBlock}>
                <Text style={styles.k}>Your note</Text>
                <Text style={styles.note}>{r.specialRequest}</Text>
              </View>
            ) : null}
            {r.statusHistory && r.statusHistory.length > 0 ? (
              <View style={styles.historyBlock}>
                <Text style={styles.historyLabel}>Status updates</Text>
                {r.statusHistory.map((h) => {
                  const line = `${h.fromStatus ?? '—'} → ${h.toStatus}${
                    h.note ? ` · ${h.note}` : ''
                  }`;
                  return (
                    <Text key={h.id} style={styles.historyLine}>
                      {formatHistoryWhen(h.createdAt)} — {line}
                    </Text>
                  );
                })}
              </View>
            ) : null}
            {mayCancel ? (
              <Pressable
                style={[styles.cancelBtn, busyThis && styles.btnDisabled]}
                onPress={() => {
                  if (busyAny) return;
                  Alert.alert('Cancel this event request?', undefined, [
                    { text: 'Keep', style: 'cancel' },
                    {
                      text: 'Cancel request',
                      style: 'destructive',
                      onPress: () => {
                        void requestCancelEvent(r);
                      },
                    },
                  ]);
                }}
                disabled={busyThis}
                accessibilityLabel="Cancel event reservation"
              >
                {busyThis ? (
                  <ActivityIndicator size="small" color="#b91c1c" />
                ) : (
                  <Text style={styles.cancelBtnText}>Cancel request</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        );
      })}

      <Text style={[styles.sectionLabel, { marginTop: eventReservations.length > 0 ? 20 : 0 }]}>
        Table reservations
      </Text>
      {reservations.length === 0 ? (
        <Text style={styles.sectionEmpty}>No table requests yet.</Text>
      ) : null}
      {reservations.map((r) => {
        const st = r.status;
        const badge = STATUS_BADGE[st] ?? {
          bg: '#f4f4f5',
          text: '#3f3f46',
          display: r.status,
        };
        const name = r.restaurant.name;
        const loc = placeSubtitle(r);
        const startMs = new Date(r.startAt).getTime();
        const beforeStart = startMs > Date.now();
        const mayCancel = STATUS_CUSTOMER_MAY_CANCEL.has(st) && beforeStart;
        const busyThis = cancellingId === r.id;
        return (
          <View key={r.id} style={styles.card} accessibilityLabel={`Table reservation ${badge.display}`}>
            <View style={styles.typeTagNeutral}>
              <Text style={styles.typeTagTextNeutral}>TABLE</Text>
            </View>
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
            {mayCancel ? (
              <Pressable
                style={[styles.cancelBtn, busyThis && styles.btnDisabled]}
                onPress={() => {
                  if (busyAny) return;
                  Alert.alert('Cancel this reservation?', undefined, [
                    { text: 'Keep', style: 'cancel' },
                    {
                      text: 'Cancel reservation',
                      style: 'destructive',
                      onPress: () => {
                        void requestCancelTable(r);
                      },
                    },
                  ]);
                }}
                disabled={busyThis}
                accessibilityLabel="Cancel reservation"
              >
                {busyThis ? (
                  <ActivityIndicator size="small" color="#b91c1c" />
                ) : (
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        );
      })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f1f5f9' },
  listContent: { padding: 16, paddingBottom: 32 },
  listContentEmpty: { flexGrow: 1 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  sectionEmpty: { color: '#94a3b8', fontSize: 15, marginBottom: 8 },
  emptyInner: {
    paddingVertical: 32,
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
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeTagText: { fontSize: 11, fontWeight: '800', color: '#5b21b6', letterSpacing: 0.5 },
  typeTagNeutral: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeTagTextNeutral: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  eventTitle: { fontSize: 18, fontWeight: '800', color: '#4c1d95', lineHeight: 24 },
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
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  cancelBtnText: { color: '#b91c1c', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
});
