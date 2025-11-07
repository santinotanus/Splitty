import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useGastos } from '../hooks/useGastos';

export default function Gastos() {
  const { data, loading, error } = useGastos();

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#7A2A2A" /></View>
  );

  if (error) return (
    <View style={styles.center}><Text style={styles.errorText}>Error cargando gastos</Text></View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gastos</Text>
      <FlatList
        data={data}
        keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
        renderItem={({ item }) => (
          <View style={{ padding: 12 }}>
            <Text>{JSON.stringify(item)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F7',
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9F7',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7A2A2A',
    marginBottom: 12,
  },
  errorText: {
    color: '#B00020',
  },
});
