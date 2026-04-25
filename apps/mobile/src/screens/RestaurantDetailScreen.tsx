import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import {
  createReservationRequest,
  fetchAvailability,
  fetchRestaurantById,
} from '../lib/api';
import type {
  AvailabilityResponse,
  BookingType,
  GuestType,
  RestaurantDetail,
  SeatingPreference,
} from '../lib/types';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'RestaurantDetail'>;

const DEFAULT_DURATION = '90';
const DEFAULT_PARTY = '2';
const DEFAULT_TIME = '19:00';

const GUEST_TYPES: GuestType[] = ['FAMILY', 'YOUTH', 'MIXED', 'BUSINESS', 'OTHER'];
const SEATING: SeatingPreference[] = ['INDOOR', 'OUTDOOR', 'NO_PREFERENCE'];
const BOOKING_TYPES: BookingType[] = [
  'STANDARD',
  'EVENT_NIGHT',
  'VIP',
  'OCCASION',
  'OTHER',
];

function isValidYyyyMmDd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
  const [ys, ms, ds] = s.trim().split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return (
    !isNaN(dt.getTime()) && dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

function isValidHhMm(s: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(s.trim());
}

function todayYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeRange(isoStart: string, isoEnd: string): { start: string; end: string } {
  const opt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  try {
    return {
      start: new Date(isoStart).toLocaleTimeString(undefined, opt),
      end: new Date(isoEnd).toLocaleTimeString(undefined, opt),
    };
  } catch {
    return { start: isoStart, end: isoEnd };
  }
}

type ParsedAvailabilityForm = { date: string; partySize: number; durationMinutes: number };

function buildReservationWindow(
  dateYmd: string,
  timeHm: string,
  durationMinutes: number,
): { startAt: string; endAt: string } | { error: string } {
  const t = timeHm.trim();
  if (!isValidHhMm(t)) {
    return { error: 'Time must be HH:MM in 24-hour form (e.g. 19:00).' };
  }
  const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
  const [y, m, d] = dateYmd.split('-').map((x) => parseInt(x, 10));
  const start = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (isNaN(start.getTime())) {
    return { error: 'Invalid date or time.' };
  }
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function RestaurantDetailScreen({ route, navigation }: Props) {
  const { restaurantId } = route.params;
  const { token, signOut } = useAuth();

  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadPending, setLoadPending] = useState(true);

  const [dateStr, setDateStr] = useState(todayYyyyMmDd());
  const [partyStr, setPartyStr] = useState(DEFAULT_PARTY);
  const [durationStr, setDurationStr] = useState(DEFAULT_DURATION);
  const [timeStr, setTimeStr] = useState(DEFAULT_TIME);
  const [guestType, setGuestType] = useState<GuestType>('MIXED');
  const [seatingPreference, setSeatingPreference] = useState<SeatingPreference>('NO_PREFERENCE');
  const [bookingType, setBookingType] = useState<BookingType>('STANDARD');
  const [phoneStr, setPhoneStr] = useState('');
  const [noteStr, setNoteStr] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availError, setAvailError] = useState<string | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadRestaurant = useCallback(async () => {
    if (!token) return;
    setLoadError(null);
    setLoadPending(true);
    try {
      const data = await fetchRestaurantById(token, restaurantId);
      setRestaurant(data);
      navigation.setOptions({ title: data.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load restaurant';
      setLoadError(msg);
      setRestaurant(null);
      if (msg.includes('401')) {
        void signOut();
      }
    } finally {
      setLoadPending(false);
    }
  }, [token, restaurantId, navigation, signOut]);

  useEffect(() => {
    void loadRestaurant();
  }, [loadRestaurant]);

  const parseAndValidateForm = useCallback((): ParsedAvailabilityForm | null => {
    setFormError(null);
    const date = dateStr.trim();
    if (!isValidYyyyMmDd(date)) {
      setFormError('Date must be a valid calendar day as YYYY-MM-DD.');
      return null;
    }
    const partySize = parseInt(partyStr, 10);
    if (!Number.isInteger(partySize) || partySize < 1) {
      setFormError('Party size must be a whole number of at least 1.');
      return null;
    }
    const durationMinutes = parseInt(durationStr, 10);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 240) {
      setFormError('Duration must be a whole number between 30 and 240 minutes.');
      return null;
    }
    return { date, partySize, durationMinutes };
  }, [dateStr, partyStr, durationStr]);

  const onSearchAvailability = async () => {
    if (!token) return;
    const parsed = parseAndValidateForm();
    if (!parsed) return;

    setAvailError(null);
    setAvailLoading(true);
    try {
      const result = await fetchAvailability(token, restaurantId, parsed);
      setAvailability(result);
      setHasSearched(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setAvailError(msg);
      setAvailability(null);
      if (msg.includes('401')) {
        await signOut();
      }
    } finally {
      setAvailLoading(false);
    }
  };

  const onSubmitReservation = async () => {
    if (!token) return;
    setRequestError(null);
    const parsed = parseAndValidateForm();
    if (!parsed) {
      setRequestError('Please correct date, party size, and duration (30–240 minutes).');
      return;
    }
    const window = buildReservationWindow(parsed.date, timeStr, parsed.durationMinutes);
    if ('error' in window) {
      setRequestError(window.error);
      return;
    }
    const startAtMs = new Date(window.startAt).getTime();
    if (startAtMs <= Date.now()) {
      setRequestError('Start time must be in the future.');
      return;
    }

    setRequestSubmitting(true);
    try {
      await createReservationRequest(token, restaurantId, {
        partySize: parsed.partySize,
        startAt: window.startAt,
        endAt: window.endAt,
        guestType,
        seatingPreference,
        bookingType,
        customerPhone: phoneStr.trim() || undefined,
        specialRequest: noteStr.trim() || undefined,
      });
      Alert.alert(
        'Request sent',
        'Your reservation request was submitted. The restaurant will confirm or respond based on availability.',
        [{ text: 'OK' }],
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setRequestError(msg);
      if (msg.includes('401')) {
        await signOut();
      }
    } finally {
      setRequestSubmitting(false);
    }
  };

  if (loadPending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.mutedLoad}>Loading restaurant…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorBanner}>{loadError}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => void loadRestaurant()}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!restaurant) {
    return null;
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.heading}>{restaurant.name}</Text>
        <Text style={styles.line}>
          {restaurant.city}
          {restaurant.area ? ` · ${restaurant.area}` : ''}
        </Text>
        <Text style={styles.line}>{restaurant.address}</Text>
        {restaurant.phone ? <Text style={styles.line}>Phone: {restaurant.phone}</Text> : null}
        {restaurant.description ? (
          <Text style={styles.description}>{restaurant.description}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Request a reservation</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={dateStr}
          onChangeText={setDateStr}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="2026-04-30"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Time (24h, HH:MM)</Text>
        <TextInput
          style={styles.input}
          value={timeStr}
          onChangeText={setTimeStr}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="19:00"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Party size</Text>
        <TextInput
          style={styles.input}
          value={partyStr}
          onChangeText={setPartyStr}
          keyboardType="number-pad"
        />
        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          value={durationStr}
          onChangeText={setDurationStr}
          keyboardType="number-pad"
        />
        <Text style={styles.label}>Guest type</Text>
        <View style={styles.chipRow}>
          {GUEST_TYPES.map((g) => (
            <Pressable
              key={g}
              onPress={() => setGuestType(g)}
              style={[styles.chip, guestType === g && styles.chipSelected]}
            >
              <Text style={[styles.chipText, guestType === g && styles.chipTextSelected]}>{g}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Seating</Text>
        <View style={styles.chipRow}>
          {SEATING.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSeatingPreference(s)}
              style={[styles.chip, seatingPreference === s && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, seatingPreference === s && styles.chipTextSelected]}
              >
                {s.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Booking type</Text>
        <View style={styles.chipRow}>
          {BOOKING_TYPES.map((b) => (
            <Pressable
              key={b}
              onPress={() => setBookingType(b)}
              style={[styles.chip, bookingType === b && styles.chipSelected]}
            >
              <Text
                style={[styles.chipText, bookingType === b && styles.chipTextSelected]}
              >
                {b.replace(/_/g, ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          style={styles.input}
          value={phoneStr}
          onChangeText={setPhoneStr}
          keyboardType="phone-pad"
          placeholder="For the restaurant to reach you"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={noteStr}
          onChangeText={setNoteStr}
          placeholder="Diet, occasion, or other details"
          placeholderTextColor="#94a3b8"
          multiline
        />
        {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}
        {requestError ? <Text style={styles.formErrorText}>{requestError}</Text> : null}
        <Pressable
          style={[styles.primaryBtn, requestSubmitting && styles.btnDisabled]}
          onPress={() => void onSubmitReservation()}
          disabled={requestSubmitting}
        >
          {requestSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Send reservation request</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Check availability (optional)</Text>
      <View style={styles.card}>
        <Text style={styles.hintP}>
          Uses table capacity for reference only. You can send a request above without matching a
          specific table.
        </Text>
        {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}
        <Pressable
          style={[styles.primaryBtn, availLoading && styles.btnDisabled]}
          onPress={() => void onSearchAvailability()}
          disabled={availLoading}
        >
          {availLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Search availability</Text>
          )}
        </Pressable>
      </View>

      {availError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorBanner}>{availError}</Text>
        </View>
      ) : null}

      {hasSearched && !availLoading && availability && (
        <View style={styles.slotsBlock}>
          {availability.slots.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No open slots</Text>
              <Text style={styles.emptySub}>
                No tables with enough capacity for {availability.partySize} guests on {availability.date}, or
                all possible times are booked. You can still submit a request if the restaurant can
                accommodate you another way.
              </Text>
            </View>
          ) : (
            availability.slots.map((slot) => {
              const { start, end } = formatTimeRange(slot.startAt, slot.endAt);
              return (
                <View key={slot.startAt} style={styles.slotCard}>
                  <Text style={styles.slotTime}>
                    {start} – {end}
                  </Text>
                  <Text style={styles.tableLabel}>Sample tables (capacity reference)</Text>
                  {slot.tables.map((t) => (
                    <Text key={t.id} style={styles.tableRow}>
                      {t.name} — seats {t.capacity}
                    </Text>
                  ))}
                </View>
              );
            })
          )}
        </View>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  centered: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mutedLoad: { marginTop: 12, color: '#64748b' },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  line: { marginTop: 6, fontSize: 16, color: '#334155' },
  description: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#475569' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fafafa',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  chipSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipTextSelected: { color: '#1d4ed8' },
  hintP: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 12 },
  formErrorText: { color: '#b91c1c', marginTop: 8, fontSize: 14 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  errorBox: { marginBottom: 12 },
  errorBanner: { color: '#b91c1c', fontSize: 15, textAlign: 'center' },
  slotsBlock: { gap: 12 },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', textAlign: 'center' },
  emptySub: { marginTop: 8, fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  slotCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
  },
  slotTime: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  tableLabel: { marginTop: 10, fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { fontSize: 15, color: '#334155', marginTop: 4 },
  spacer: { height: 8 },
});
