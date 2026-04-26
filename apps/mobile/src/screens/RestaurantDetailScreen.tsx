import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  fetchOperatingSettings,
  fetchRestaurantById,
} from '../lib/api';
import type {
  AvailabilityResponse,
  BookingType,
  GuestType,
  RestaurantDetail,
  RestaurantOperatingSettings,
  SeatingPreference,
} from '../lib/types';
import { RootStackParamList } from '../navigation/RootNavigator';

type ScreenProps = NativeStackScreenProps<RootStackParamList, 'RestaurantDetail'>;
const DEFAULT_DURATION = '90';
const DEFAULT_PARTY = '2';
const DEFAULT_TIME = '19:00';

const GUEST_OPTIONS: { value: GuestType; label: string }[] = [
  { value: 'FAMILY', label: 'Families' },
  { value: 'YOUTH', label: 'Youth' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'OTHER', label: 'Other' },
];

const SEATING_OPTIONS: { value: SeatingPreference; label: string }[] = [
  { value: 'INDOOR', label: 'Indoor' },
  { value: 'OUTDOOR', label: 'Outdoor' },
  { value: 'NO_PREFERENCE', label: 'No preference' },
];

const BOOKING_OPTIONS: { value: BookingType; label: string }[] = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'EVENT_NIGHT', label: 'Event night' },
  { value: 'VIP', label: 'VIP' },
  { value: 'OCCASION', label: 'Occasion' },
  { value: 'OTHER', label: 'Other' },
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
    return { error: 'Use 24-hour time, for example 19:00 (HH:mm).' };
  }
  const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
  const [y, m, d] = dateYmd.split('-').map((x) => parseInt(x, 10));
  const start = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (isNaN(start.getTime())) {
    return { error: 'That date or time is not valid.' };
  }
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

/** Avoid showing raw JSON to users if something mis-serializes. */
function toFriendlyRequestError(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message.trim();
    if (m.startsWith('Unauthorized (401)')) {
      return m;
    }
    if (m.startsWith('{') || m.startsWith('[') || m.includes('"statusCode"')) {
      return "We couldn’t send your request. Check your details and try again.";
    }
    if (m.length > 0 && m.length < 240) {
      return m;
    }
    return "We couldn’t send your request. Please try again in a moment.";
  }
  return "Something went wrong. Please try again.";
}

export function RestaurantDetailScreen({ route, navigation }: ScreenProps) {
  const { restaurantId } = route.params;
  const { token, signOut } = useAuth();

  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [operatingSettings, setOperatingSettings] = useState<RestaurantOperatingSettings | null>(
    null,
  );
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
  const [requestSuccess, setRequestSuccess] = useState(false);

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availError, setAvailError] = useState<string | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const clearSuccessOnEdit = useCallback(() => {
    if (requestSuccess) setRequestSuccess(false);
  }, [requestSuccess]);

  const loadRestaurant = useCallback(async () => {
    if (!token) return;
    setLoadError(null);
    setLoadPending(true);
    try {
      const [data, settings] = await Promise.all([
        fetchRestaurantById(token, restaurantId),
        fetchOperatingSettings(token, restaurantId),
      ]);
      setRestaurant(data);
      setOperatingSettings(settings);
      setDurationStr(String(settings.defaultReservationDurationMinutes));
      navigation.setOptions({ title: data.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load restaurant';
      setLoadError(msg);
      setRestaurant(null);
      setOperatingSettings(null);
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
      setFormError('Use reservation date in YYYY-MM-DD format (for example 2026-12-15).');
      return null;
    }
    const partySize = parseInt(partyStr, 10);
    if (!Number.isInteger(partySize) || partySize < 1) {
      setFormError('Party size must be a whole number of at least 1.');
      return null;
    }
    const durationMinutes = parseInt(durationStr, 10);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 240) {
      setFormError('Session duration must be 30 to 240 minutes (default 90).');
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
      setAvailError(toFriendlyRequestError(e));
      setAvailability(null);
      const is401 = e instanceof Error && e.message.includes('401');
      if (is401) {
        await signOut();
      }
    } finally {
      setAvailLoading(false);
    }
  };

  const onSubmitReservation = async () => {
    if (!token) return;
    setRequestError(null);
    setRequestSuccess(false);
    const parsed = parseAndValidateForm();
    if (!parsed) {
      setRequestError('Please check party size, date, and session duration, then try again.');
      return;
    }
    const window = buildReservationWindow(parsed.date, timeStr, parsed.durationMinutes);
    if ('error' in window) {
      setRequestError(window.error);
      return;
    }
    const startAtMs = new Date(window.startAt).getTime();
    if (startAtMs <= Date.now()) {
      setRequestError('Reservation time must be in the future.');
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
      setRequestSuccess(true);
    } catch (e) {
      const msg = toFriendlyRequestError(e);
      setRequestError(msg);
      if (e instanceof Error && e.message.includes('401')) {
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

  const acceptsReservations = operatingSettings?.acceptsReservations !== false;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.pageSectionLabel}>Restaurant</Text>
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

      {operatingSettings && !operatingSettings.acceptsReservations ? (
        <View style={styles.noticeCard} accessibilityRole="alert">
          <Text style={styles.noticeTitle}>Reservations are off</Text>
          <Text style={styles.noticeBody}>
            This restaurant is not accepting new reservation requests right now.
          </Text>
        </View>
      ) : null}

      {requestSuccess ? (
        <View style={styles.successCard}>
          <View style={styles.successIcon} accessibilityLabel="Success" />
          <Text style={styles.successTitle}>Reservation request sent</Text>
          <Text style={styles.successBody}>
            The restaurant will review and confirm.
          </Text>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Reservations')}
            accessibilityLabel="View my reservations"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryBtnText}>View my reservations</Text>
          </Pressable>
          <Pressable
            onPress={() => setRequestSuccess(false)}
            hitSlop={8}
            style={styles.dismissLink}
            accessibilityLabel="Submit another request"
          >
            <Text style={styles.dismissLinkText}>Submit another request</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.pageSectionLabel}>Reservation request</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Party size</Text>
        <Text style={styles.hintText}>Number of people in your group.</Text>
        <TextInput
          style={styles.input}
          value={partyStr}
          onChangeText={(t) => {
            setPartyStr(t);
            clearSuccessOnEdit();
          }}
          keyboardType="number-pad"
          accessibilityLabel="Party size"
        />
        <Text style={styles.label}>Reservation date</Text>
        <Text style={styles.hintText}>Format YYYY-MM-DD (day you plan to visit).</Text>
        <TextInput
          style={styles.input}
          value={dateStr}
          onChangeText={(t) => {
            setDateStr(t);
            clearSuccessOnEdit();
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="2026-12-20"
          placeholderTextColor="#94a3b8"
          accessibilityLabel="Reservation date"
        />
        <Text style={styles.label}>Reservation time</Text>
        <Text style={styles.hintText}>24-hour time (HH:mm), e.g. 19:00 for 7:00 PM.</Text>
        <TextInput
          style={styles.input}
          value={timeStr}
          onChangeText={(t) => {
            setTimeStr(t);
            clearSuccessOnEdit();
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="19:00"
          placeholderTextColor="#94a3b8"
          accessibilityLabel="Reservation time"
        />
        <Text style={styles.label}>Session duration</Text>
        <Text style={styles.hintText}>Default 90 minutes. Between 30 and 240.</Text>
        <TextInput
          style={styles.input}
          value={durationStr}
          onChangeText={(t) => {
            setDurationStr(t);
            clearSuccessOnEdit();
          }}
          keyboardType="number-pad"
          accessibilityLabel="Session duration in minutes"
        />
        <Text style={styles.label}>Guest type</Text>
        <View style={styles.chipRow}>
          {GUEST_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                setGuestType(opt.value);
                clearSuccessOnEdit();
              }}
              style={[styles.chip, guestType === opt.value && styles.chipSelected]}
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: guestType === opt.value }}
            >
              <Text
                style={[styles.chipText, guestType === opt.value && styles.chipTextSelected]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Seating preference</Text>
        <View style={styles.chipRow}>
          {SEATING_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                setSeatingPreference(opt.value);
                clearSuccessOnEdit();
              }}
              style={[styles.chip, seatingPreference === opt.value && styles.chipSelected]}
              accessibilityLabel={opt.label}
            >
              <Text
                style={[
                  styles.chipText,
                  seatingPreference === opt.value && styles.chipTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Booking type</Text>
        <View style={styles.chipRow}>
          {BOOKING_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                setBookingType(opt.value);
                clearSuccessOnEdit();
              }}
              style={[styles.chip, bookingType === opt.value && styles.chipSelected]}
              accessibilityLabel={opt.label}
            >
              <Text
                style={[styles.chipText, bookingType === opt.value && styles.chipTextSelected]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Phone number</Text>
        <Text style={styles.hintText}>Optional. Lets the restaurant reach you.</Text>
        <TextInput
          style={styles.input}
          value={phoneStr}
          onChangeText={(t) => {
            setPhoneStr(t);
            clearSuccessOnEdit();
          }}
          keyboardType="phone-pad"
          placeholder="e.g. +1 234 567 8900"
          placeholderTextColor="#94a3b8"
          accessibilityLabel="Phone number optional"
        />
        <Text style={styles.label}>Special request</Text>
        <Text style={styles.hintText}>Optional. Allergies, occasion, or other details.</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={noteStr}
          onChangeText={(t) => {
            setNoteStr(t);
            clearSuccessOnEdit();
          }}
          placeholder="Dietary needs, birthday, access needs…"
          placeholderTextColor="#94a3b8"
          multiline
          accessibilityLabel="Special request optional"
        />
        {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}
        {requestError ? <Text style={styles.formErrorText}>{requestError}</Text> : null}
        <Pressable
          style={[
            styles.primaryBtn,
            (requestSubmitting || !acceptsReservations) && styles.btnDisabled,
          ]}
          onPress={() => void onSubmitReservation()}
          disabled={requestSubmitting || !acceptsReservations}
        >
          {requestSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Send reservation request</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.pageSectionLabelMuted}>Availability (optional guide)</Text>
      <View style={styles.cardMuted}>
        <Text style={styles.mutedCallout}>
          Availability is only a guide. Final confirmation depends on the restaurant.
        </Text>
        {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}
        <Pressable
          style={[styles.ghostBtn, availLoading && styles.btnDisabled]}
          onPress={() => void onSearchAvailability()}
          disabled={availLoading}
        >
          {availLoading ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={styles.ghostBtnText}>Search available times</Text>
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
              <Text style={styles.emptyTitle}>No open slots in this view</Text>
              <Text style={styles.emptySub}>
                This check uses table layout only. You can still send a request above; the
                restaurant may be able to seat you.
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
                  <Text style={styles.tableLabel}>Table capacity (reference)</Text>
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
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  pageSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pageSectionLabelMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
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
  noticeCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 20,
  },
  noticeTitle: { fontSize: 16, fontWeight: '700', color: '#854d0e' },
  noticeBody: { marginTop: 8, fontSize: 15, lineHeight: 22, color: '#a16207' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  cardMuted: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4, marginTop: 14 },
  hintText: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fafafa',
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 2 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  chipSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  chipTextSelected: { color: '#1d4ed8' },
  formErrorText: { color: '#b91c1c', marginTop: 8, fontSize: 14, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  successCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 20,
  },
  successIcon: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginBottom: 10,
  },
  successTitle: { fontSize: 18, fontWeight: '700', color: '#065f46' },
  successBody: { marginTop: 8, fontSize: 15, lineHeight: 22, color: '#047857' },
  secondaryBtn: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  secondaryBtnText: { textAlign: 'center', color: '#047857', fontSize: 16, fontWeight: '600' },
  dismissLink: { marginTop: 12, alignItems: 'center' },
  dismissLinkText: { color: '#047857', fontSize: 15, textDecorationLine: 'underline' },
  ghostBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  ghostBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  mutedCallout: { fontSize: 14, color: '#64748b', lineHeight: 21, marginBottom: 12 },
  errorBox: { marginBottom: 12 },
  errorBanner: { color: '#b91c1c', fontSize: 15, lineHeight: 22 },
  slotsBlock: { gap: 12, marginTop: 4, marginBottom: 8 },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  tableLabel: { marginTop: 10, fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' },
  tableRow: { fontSize: 15, color: '#334155', marginTop: 4 },
  spacer: { height: 8 },
});
