import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { fetchMyEventReservation, fetchMyTableReservation } from '../lib/api';
import {
  type EventStatusHistoryItem,
  type MyEventReservation,
  type MyTableReservation,
  type TableStatusHistoryItem,
} from '../lib/types';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ReservationDetail'>;

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function tableHistoryLine(h: TableStatusHistoryItem): string {
  return `${h.fromStatus ?? '—'} → ${h.toStatus}${
    h.note ? ` · ${h.note}` : ''
  }${
    h.changedBy
      ? ` · ${h.changedBy.fullName || h.changedBy.email}`
      : ''
  }`;
}

function eventHistoryLine(h: EventStatusHistoryItem): string {
  return `${h.fromStatus ?? '—'} → ${h.toStatus}${
    h.note ? ` · ${h.note}` : ''
  }${
    h.changedBy
      ? ` · ${h.changedBy.fullName || h.changedBy.email}`
      : ''
  }`;
}

export function ReservationDetailScreen({ route, navigation }: Props) {
  const { kind, id } = route.params;
  const { token, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [table, setTable] = useState<MyTableReservation | null>(null);
  const [ev, setEv] = useState<MyEventReservation | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      if (kind === 'TABLE') {
        setEv(null);
        setTable(await fetchMyTableReservation(token, id));
        navigation.setOptions({ title: 'Table reservation' });
      } else {
        setTable(null);
        setEv(await fetchMyEventReservation(token, id));
        navigation.setOptions({ title: 'Event reservation' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      if (msg.includes('401')) void signOut();
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [token, id, kind, navigation, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (err) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{err}</Text>
        <Pressable style={styles.retry} onPress={() => void load()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (kind === 'EVENT' && ev) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
        <Text style={styles.badgeEvent}>EVENT reservation</Text>
        <Text style={styles.h1}>{ev.event.title}</Text>
        <Text style={styles.line}>{ev.restaurant.name}</Text>
        <Text style={styles.line}>Status: {ev.status}</Text>
        <Text style={styles.sub}>When (event)</Text>
        <Text style={styles.line}>
          {fmtWhen(ev.event.startsAt)} – {fmtWhen(ev.event.endsAt)}
        </Text>
        {ev.event.isFree ? (
          <Text style={styles.line}>Free event</Text>
        ) : (
          <Text style={styles.line}>
            Price: {ev.event.price ?? '—'} {ev.event.currency}
          </Text>
        )}
        <Text style={styles.sub}>Party</Text>
        <Text style={styles.line}>
          {ev.partySize} {ev.partySize === 1 ? 'guest' : 'guests'}
        </Text>
        {ev.note?.trim() ? (
          <>
            <Text style={styles.sub}>Your note</Text>
            <Text style={styles.line}>{ev.note}</Text>
          </>
        ) : null}
        {ev.rejectionReason?.trim() ? (
          <Text style={styles.warn}>Rejection: {ev.rejectionReason}</Text>
        ) : null}
        {ev.cancellationReason?.trim() ? (
          <Text style={styles.warn}>Cancellation: {ev.cancellationReason}</Text>
        ) : null}
        <Text style={styles.sub}>Status history (oldest first)</Text>
        {ev.statusHistory.map((h) => (
          <Text key={h.id} style={styles.histLine}>
            {fmtWhen(h.createdAt)} — {eventHistoryLine(h)}
          </Text>
        ))}
      </ScrollView>
    );
  }

  if (kind === 'TABLE' && table) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
        <Text style={styles.badgeTable}>TABLE reservation</Text>
        <Text style={styles.h1}>{table.restaurant.name}</Text>
        <Text style={styles.line}>Status: {table.status}</Text>
        <Text style={styles.sub}>When</Text>
        <Text style={styles.line}>
          {fmtWhen(table.startAt)} – {fmtWhen(table.endAt)}
        </Text>
        <Text style={styles.sub}>Party</Text>
        <Text style={styles.line}>{table.partySize}</Text>
        {table.occasionNote?.trim() ? (
          <Text style={styles.line}>Occasion: {table.occasionNote}</Text>
        ) : null}
        {table.specialRequest?.trim() ? (
          <Text style={styles.line}>Request: {table.specialRequest}</Text>
        ) : null}
        {table.rejectionReason?.trim() ? (
          <Text style={styles.warn}>Rejection: {table.rejectionReason}</Text>
        ) : null}
        {table.cancellationReason?.trim() ? (
          <Text style={styles.warn}>Cancellation: {table.cancellationReason}</Text>
        ) : null}
        <Text style={styles.sub}>Status history (oldest first)</Text>
        {table.statusHistory.map((h) => (
          <Text key={h.id} style={styles.histLine}>
            {fmtWhen(h.createdAt)} — {tableHistoryLine(h)}
          </Text>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.muted}>Not found</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  pad: { padding: 16, paddingBottom: 32 },
  centered: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  muted: { marginTop: 8, color: '#64748b' },
  error: { color: '#b91c1c', textAlign: 'center' },
  retry: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  badgeEvent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5b21b6',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  badgeTable: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  h1: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  sub: { marginTop: 14, fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  line: { fontSize: 16, color: '#334155', marginTop: 4, lineHeight: 22 },
  warn: { marginTop: 10, color: '#b45309', fontSize: 15, lineHeight: 22 },
  histLine: { fontSize: 14, color: '#475569', marginTop: 6, lineHeight: 20 },
});
