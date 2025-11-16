import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useGastos } from '../viewmodels/useGastos';
import { useIsFocused } from '@react-navigation/native';

export default function Gastos() {
  const { data, loading, error, refresh } = useGastos();
  const isFocused = useIsFocused();

  React.useEffect(() => {
    if (isFocused) refresh();
  }, [isFocused]);

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#7A2A2A" /></View>
  );

  if (error) return (
    <View style={styles.center}><Text style={styles.errorText}>Error cargando gastos</Text></View>
  );

  // Mostrar placeholder cuando no hay datos (evita pantalla en blanco)
  if (!loading && Array.isArray(data) && data.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.emptyText}>No hay gastos para mostrar.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gastos</Text>
      <FlatList
        data={data}
        keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.cardGroup}>{item.groupName || item.groupId}</Text>
                <Text style={styles.cardDesc}>{item.descripcion || 'Gasto sin descripción'}</Text>
                <Text style={styles.cardMeta}>Pagador: {item.pagador_nombre || item.pagador_correo || item.pagador_id}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amount}>${Number(item.importe || 0).toFixed(2)}</Text>
                {typeof item.owedAmount === 'number' ? (
                  item.owedAmount > 0 ? (
                    <Text style={{ color: '#0A8F4A' }}>Te deben ${Number(item.owedAmount).toFixed(2)}</Text>
                  ) : item.owedAmount < 0 ? (
                    <Text style={{ color: '#B00020' }}>Debés ${Number(Math.abs(item.owedAmount)).toFixed(2)}</Text>
                  ) : (
                    <Text style={{ color: '#666' }}>Saldado</Text>
                  )
                ) : null}
                <Text style={{ color: '#999', fontSize: 12 }}>{(item.participantes || []).length} participantes</Text>
              </View>
            </View>
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
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardGroup: { fontSize: 12, color: '#666' },
  cardDesc: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  cardMeta: { fontSize: 12, color: '#666', marginTop: 6 },
  amount: { fontSize: 18, fontWeight: '700', color: '#7A2A2A' },
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
  emptyText: {
    color: '#6b6b6b',
    fontSize: 16,
    textAlign: 'center',
  },
});
