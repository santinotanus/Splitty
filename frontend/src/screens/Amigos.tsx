import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useAmigos } from '../hooks/useAmigos';

export default function Amigos() {
  const { data, loading, error } = useAmigos();

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#0A3E9D" /></View>
  );

  if (error) return (
    <View style={styles.center}><Text style={styles.errorText}>Error cargando amigos</Text></View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Amigos</Text>
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
    backgroundColor: '#F7F9FF',
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A3E9D',
    marginBottom: 12,
  },
  errorText: {
    color: '#B00020',
  },
});
