import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useGastos } from '../viewmodels/useGastos';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import CacheIndicator from '../components/CacheIndicator';

export default function Gastos() {
  const { colors } = useTheme();
  // 1. Usar getStyles con los colores del tema
  const styles = getStyles(colors);
  const { data, loading, error, refresh, fromCache } = useGastos();
  const isFocused = useIsFocused();

  React.useEffect(() => {
    if (isFocused) refresh();
  }, [isFocused]);

  if (loading) return (
    // Se usan los estilos definidos dinámicamente
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={[styles.errorText, { color: colors.error }]}>Error cargando gastos</Text>
    </View>
  );

  if (!loading && Array.isArray(data) && data.length === 0) return (
    <View style={styles.center}>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay gastos para mostrar.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gastos</Text>
      <CacheIndicator visible={Boolean(fromCache && !loading)} onRefresh={() => refresh()} />
      <FlatList
        data={data}
        keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Contenedor principal de la fila, asegurando espacio entre elementos */}
            <View style={styles.cardContentRow}>
              {/* Contenedor de Texto: Flex: 1 para ocupar la mayor parte del espacio */}
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardGroup}>{item.groupName || item.groupId}</Text>
                <Text style={styles.cardDesc}>{item.descripcion || 'Gasto sin descripción'}</Text>
                <Text style={styles.cardMeta}>Pagador: {item.pagador_nombre || item.pagador_correo || item.pagador_id}</Text>
              </View>

              {/* Contenedor de Monto: Se alinea a la derecha */}
              <View style={styles.cardAmountContainer}>
                <Text style={styles.amount}>${Number(item.importe || 0).toFixed(2)}</Text>
                {typeof item.owedAmount === 'number' ? (
                  item.owedAmount > 0 ? (
                    <Text style={{ color: colors.success }}>Te deben ${Number(item.owedAmount).toFixed(2)}</Text>
                  ) : item.owedAmount < 0 ? (
                    <Text style={{ color: colors.error }}>Debés ${Number(Math.abs(item.owedAmount)).toFixed(2)}</Text>
                  ) : (
                    <Text style={{ color: colors.textMuted }}>Saldado</Text>
                  )
                ) : null}
                <Text style={styles.cardParticipantCount}>{(item.participantes || []).length} participantes</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

// Estilos definidos como una función para usar colores del tema
const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16, // Padding Horizontal
    paddingTop: 50,      // <--- CAMBIO: Padding Top aumentado para bajar el título
    backgroundColor: colors.background,
  },
  card: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: colors.modalBackground,
    borderColor: colors.borderLight,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
  },
  cardContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  cardAmountContainer: {
    alignItems: 'flex-end',
  },
  cardGroup: {
    fontSize: 12,
    color: colors.textSecondary
  },
  cardDesc: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    color: colors.text,
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 6,
    color: colors.textSecondary
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  cardParticipantCount: {
    color: colors.textMuted,
    fontSize: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.text,
  },
  errorText: {},
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});