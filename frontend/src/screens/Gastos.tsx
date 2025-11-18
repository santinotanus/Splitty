import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useGastos } from '../viewmodels/useGastos';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

export default function Gastos() {
  const { colors } = useTheme();
  const { data, loading, error, refresh } = useGastos();
  const isFocused = useIsFocused();

  React.useEffect(() => {
    if (isFocused) refresh();
  }, [isFocused]);

  if (loading) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (error) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.errorText, { color: colors.error }]}>Error cargando gastos</Text>
    </View>
  );

  if (!loading && Array.isArray(data) && data.length === 0) return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay gastos para mostrar.</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Gastos</Text>
      <FlatList
        data={data}
        keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.modalBackground, borderColor: colors.borderLight }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={[styles.cardGroup, { color: colors.textSecondary }]}>{item.groupName || item.groupId}</Text>
                <Text style={[styles.cardDesc, { color: colors.text }]}>{item.descripcion || 'Gasto sin descripción'}</Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Pagador: {item.pagador_nombre || item.pagador_correo || item.pagador_id}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.amount, { color: colors.text }]}>${Number(item.importe || 0).toFixed(2)}</Text>
                {typeof item.owedAmount === 'number' ? (
                  item.owedAmount > 0 ? (
                    <Text style={{ color: colors.success }}>Te deben ${Number(item.owedAmount).toFixed(2)}</Text>
                  ) : item.owedAmount < 0 ? (
                    <Text style={{ color: colors.error }}>Debés ${Number(Math.abs(item.owedAmount)).toFixed(2)}</Text>
                  ) : (
                    <Text style={{ color: colors.textMuted }}>Saldado</Text>
                  )
                ) : null}
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{(item.participantes || []).length} participantes</Text>
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
    padding: 16,
  },
  card: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
  },
  cardGroup: { fontSize: 12 },
  cardDesc: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  cardMeta: { fontSize: 12, marginTop: 6 },
  amount: { fontSize: 18, fontWeight: '700' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorText: {},
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
