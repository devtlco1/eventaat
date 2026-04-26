import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { type EventBookingContext } from '../lib/bookingContext';
import { fetchRestaurantById, fetchRestaurantEvent } from '../lib/api';
import type { RestaurantDetail, RestaurantEvent } from '../lib/types';
import { RootStackParamList } from '../navigation/RootNavigator';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

function formatEventDateTimeRange(isoStart: string, isoEnd: string): string {
  const opt: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
  try {
    return `${new Date(isoStart).toLocaleString(undefined, opt)} – ${new Date(isoEnd).toLocaleString(
      undefined,
      opt,
    )}`;
  } catch {
    return `${isoStart} – ${isoEnd}`;
  }
}

function galleryAsStrings(g: unknown): string[] {
  if (Array.isArray(g) && g.every((x) => typeof x === 'string')) {
    return g;
  }
  return [];
}

export function EventDetailScreen({ route, navigation }: ScreenProps) {
  const { eventId, restaurantId } = route.params;
  const { token, signOut } = useAuth();

  // Step 35: use when posting event holds — never rely on restaurantId alone.
  const _eventBookingContext: EventBookingContext = {
    type: 'EVENT',
    eventId,
    restaurantId,
  };
  void _eventBookingContext;

  const [event, setEvent] = useState<RestaurantEvent | null>(null);
  const [host, setHost] = useState<RestaurantDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadPending, setLoadPending] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoadError(null);
    setLoadPending(true);
    try {
      const [ev, rest] = await Promise.all([
        fetchRestaurantEvent(token, restaurantId, eventId),
        fetchRestaurantById(token, restaurantId),
      ]);
      setEvent(ev);
      setHost(rest);
      navigation.setOptions({ title: ev.title });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load event';
      setLoadError(msg);
      setEvent(null);
      setHost(null);
      if (msg.includes('401')) {
        void signOut();
      }
    } finally {
      setLoadPending(false);
    }
  }, [token, restaurantId, eventId, navigation, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.mutedLoad}>Loading event…</Text>
      </View>
    );
  }

  if (loadError || !event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorBanner}>{loadError ?? 'Event not found'}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => void load()}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const gallery = galleryAsStrings(event.galleryImageUrls);
  const hostName = host?.name ?? 'Host restaurant';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.contextLine}>
        Event: date and time are fixed by this event. (Separate from a normal table reservation at
        the same venue.)
      </Text>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.when}>{formatEventDateTimeRange(event.startsAt, event.endsAt)}</Text>
      <Text style={styles.line}>
        {event.isFree
          ? 'Free event'
          : `Price: ${event.price ?? '—'} ${event.currency}`}
      </Text>
      {typeof event.capacity === 'number' ? (
        <Text style={styles.line}>Capacity: {event.capacity}</Text>
      ) : null}
      {event.seatsAvailableNote?.trim() ? (
        <Text style={styles.line}>Seating: {event.seatsAvailableNote}</Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Host restaurant</Text>
        <Text style={styles.line}>{hostName}</Text>
        {host ? (
          <Text style={styles.mutedAddr}>
            {host.city}
            {host.area ? ` · ${host.area}` : ''} · {host.address}
          </Text>
        ) : null}
        {host ? (
          <Pressable
            onPress={() =>
              navigation.navigate('RestaurantDetail', {
                restaurantId: host.id,
                name: host.name,
              })
            }
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>View restaurant (table booking)</Text>
          </Pressable>
        ) : null}
      </View>

      {event.description?.trim() ? (
        <Text style={styles.description}>{event.description}</Text>
      ) : null}
      {event.entertainmentInfo?.trim() ? (
        <Text style={styles.description}>{event.entertainmentInfo}</Text>
      ) : null}
      {event.whatIsIncluded?.trim() ? (
        <Text style={styles.description}>Included: {event.whatIsIncluded}</Text>
      ) : null}
      {event.specialMenuDescription?.trim() ? (
        <Text style={styles.description}>
          Special menu: {event.specialMenuDescription}
        </Text>
      ) : null}
      {event.specialMenuUrl?.trim() && !event.specialMenuDescription?.trim() ? (
        <Text style={styles.mutedCallout}>Menu link: {event.specialMenuUrl.trim()}</Text>
      ) : null}
      {event.coverImageUrl?.trim() ? (
        <Text style={styles.mutedCallout}>
          Cover image: {event.coverImageUrl.trim()}
        </Text>
      ) : null}
      {gallery.length > 0
        ? gallery.map((u) => (
            <Text key={u} style={styles.mutedCallout} selectable>
              Image: {u}
            </Text>
          ))
        : null}

      <View style={styles.ctaBlock}>
        <Text style={styles.ctaTitle}>Book this event</Text>
        <Text style={styles.ctaBody}>
          Event reservations are not available in the app yet. A dedicated flow is planned next.
        </Text>
        <Pressable
          style={[styles.primaryBtn, styles.btnDisabled]}
          disabled
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
        >
          <Text style={styles.primaryBtnTextDim}>Event booking (coming soon)</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  contextLine: { fontSize: 13, color: '#64748b', lineHeight: 20, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  when: { fontSize: 16, color: '#334155', marginTop: 8 },
  line: { fontSize: 16, color: '#334155', marginTop: 6 },
  card: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mutedAddr: { fontSize: 14, color: '#64748b', marginTop: 2 },
  description: { marginTop: 14, fontSize: 15, lineHeight: 22, color: '#475569' },
  mutedCallout: { fontSize: 14, color: '#64748b', lineHeight: 21, marginTop: 8 },
  ctaBlock: { marginTop: 28, padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  ctaBody: { fontSize: 15, color: '#64748b', marginTop: 6, lineHeight: 22 },
  linkBtn: { marginTop: 10, alignSelf: 'flex-start' },
  linkText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  centered: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mutedLoad: { marginTop: 12, color: '#64748b' },
  errorBanner: { color: '#b91c1c', fontSize: 16, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  primaryBtnTextDim: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
});
