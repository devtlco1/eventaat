import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ReservationDetailScreen } from '../screens/ReservationDetailScreen';
import { ReservationsScreen } from '../screens/ReservationsScreen';
import { RestaurantDetailScreen } from '../screens/RestaurantDetailScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  /** Event night detail — customer flow; not the same as table booking. */
  EventDetail: { eventId: string; restaurantId: string; eventTitle?: string };
  /** Normal reservation request; never pass eventId. */
  RestaurantDetail: { restaurantId: string; name: string };
  Reservations: undefined;
  /** Customer-only; TABLE vs EVENT must match the reservation. */
  ReservationDetail: { kind: 'TABLE' | 'EVENT'; id: string };
  /** In-app notifications (database-backed, not push). */
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { token, isReady } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={token == null ? 'auth' : 'app'}
      screenOptions={{
        contentStyle: { backgroundColor: '#f8fafc' },
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {token == null ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Home' }}
          />
          <Stack.Screen
            name="EventDetail"
            component={EventDetailScreen}
            options={({ route }) => ({
              title: route.params.eventTitle ?? 'Event',
            })}
          />
          <Stack.Screen
            name="RestaurantDetail"
            component={RestaurantDetailScreen}
            options={({ route }) => ({ title: route.params.name })}
          />
          <Stack.Screen
            name="Reservations"
            component={ReservationsScreen}
            options={{ title: 'My reservations' }}
          />
          <Stack.Screen
            name="ReservationDetail"
            component={ReservationDetailScreen}
            options={{ title: 'Reservation' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: 'Notifications' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});
