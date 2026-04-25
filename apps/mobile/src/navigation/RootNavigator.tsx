import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { ReservationsScreen } from '../screens/ReservationsScreen';
import { RestaurantDetailScreen } from '../screens/RestaurantDetailScreen';
import { RestaurantsScreen } from '../screens/RestaurantsScreen';

export type RootStackParamList = {
  Login: undefined;
  Restaurants: undefined;
  RestaurantDetail: { restaurantId: string; name: string };
  Reservations: undefined;
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
            name="Restaurants"
            component={RestaurantsScreen}
            options={({ navigation }) => ({
              title: 'Restaurants',
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
            name="RestaurantDetail"
            component={RestaurantDetailScreen}
            options={({ route }) => ({ title: route.params.name })}
          />
          <Stack.Screen
            name="Reservations"
            component={ReservationsScreen}
            options={{ title: 'Reservations' }}
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
