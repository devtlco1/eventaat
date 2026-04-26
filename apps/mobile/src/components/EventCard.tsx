import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RestaurantEvent } from '../lib/types';

type Props = {
  event: RestaurantEvent;
  /** Display name of the host restaurant. */
  hostName: string;
  onPress: () => void;
};

function shortWhen(isoStart: string, isoEnd: string): string {
  const opt: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
  try {
    return `${new Date(isoStart).toLocaleString(undefined, opt)} → ${new Date(
      isoEnd,
    ).toLocaleTimeString(undefined, { timeStyle: 'short' })}`;
  } catch {
    return `${isoStart} – ${isoEnd}`;
  }
}

export function EventCard({ event, hostName, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <Text style={styles.kicker}>Event</Text>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.line}>{shortWhen(event.startsAt, event.endsAt)}</Text>
      <Text style={styles.host}>At {hostName}</Text>
      <Text style={styles.meta}>
        {event.isFree ? 'Free' : `From ${event.price ?? '—'} ${event.currency}`}
      </Text>
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
    borderColor: '#e0e7ff',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4f46e5',
    letterSpacing: 0.4,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  line: { fontSize: 14, color: '#475569', marginTop: 4 },
  host: { fontSize: 14, color: '#64748b', marginTop: 4 },
  meta: { fontSize: 14, color: '#334155', marginTop: 4 },
});
