import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'RestaurantDetail'>;

export function RestaurantDetailScreen({ route }: Props) {
  const { restaurantId } = route.params;

  return (
    <View style={styles.root}>
      <Text style={styles.lead}>
        Details for this restaurant will go here. You opened id{' '}
        <Text style={styles.mono}>{restaurantId}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  lead: { color: '#475569', fontSize: 16, lineHeight: 24 },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
});
