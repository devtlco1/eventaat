import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ReservationDetailScreen } from '../screens/ReservationDetailScreen';
import { ReservationsScreen } from '../screens/ReservationsScreen';
import { RestaurantDetailScreen } from '../screens/RestaurantDetailScreen';

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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { token, isReady, signOut } = useAuth();

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
            options={({ navigation }) => ({
              title: 'Home',
              headerRight: () => (
                <View style={styles.headerRow}>
                  <Pressable
                    onPress={() => navigation.navigate('Reservations')}
                    hitSlop={8}
                    style={styles.headerPress}
                  >
                    <Text style={styles.headerLink}>Reservations</Text>
                  </Pressable>
                  <Pressable onPress={() => signOut()} hitSlop={8} style={styles.headerPress}>
                    <Text style={styles.headerMuted}>Log out</Text>
                  </Pressable>
                </View>
              ),
            })}
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
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerPress: { marginLeft: 8 },
  headerLink: { color: '#2563eb', fontSize: 16, fontWeight: '500' },
  headerMuted: { color: '#64748b', fontSize: 16, fontWeight: '500' },
});
