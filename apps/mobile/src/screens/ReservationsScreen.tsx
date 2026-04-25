import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Reservations'>;

export function ReservationsScreen(_props: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>
        Your reservations will show here in a later step. For now this screen is a placeholder.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', padding: 20, justifyContent: 'center' },
  text: { color: '#475569', fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
