import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNetwork } from '../contexts/NetworkContext';

export default function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetwork();

  if (isConnected && isInternetReachable) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Feather name="wifi-off" size={16} color="#FFF" />
      <Text style={styles.text}>Modo offline - Mostrando datos guardados</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
});
