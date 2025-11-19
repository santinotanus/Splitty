import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useOfflineGuard } from '../hooks/useOfflineGuard';
import OfflineBanner from '../components/OfflineBanner';
import { getGroupMembersOffline, getGroupExpensesOffline, getMyBalanceOffline, getGroupDetailsOffline } from '../api/offlineApi';

export default function Grupo({ route, navigation }: any) {
  const { grupoId, nombre, emoji } = route.params || {};
  const { colors } = useTheme();
  const { isOnline, guardOnlineAction } = useOfflineGuard();

  const [members, setMembers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [myBalance, setMyBalance] = useState(0);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const loadGroupData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // Load group metadata (name/emoji/description) from cache/api when available
      try {
        const detailsResult = await getGroupDetailsOffline(grupoId);
        const details = detailsResult.data || {};
        if (details) setGroupDetails(details);
      } catch (err) {
        // ignore if no cached group details
      }
      const membersResult = await getGroupMembersOffline(grupoId);
      setMembers(membersResult.data || []);

      const expensesResult = await getGroupExpensesOffline(grupoId);
      setExpenses(expensesResult.data || []);

      const balanceResult = await getMyBalanceOffline(grupoId);
      setMyBalance(balanceResult.data?.balance || 0);

      setFromCache(membersResult.fromCache || expensesResult.fromCache || balanceResult.fromCache);
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del grupo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGroupData();
  }, [grupoId]);

  const handleAddExpense = () => {
    guardOnlineAction(
      () => navigation.navigate('AddGasto', { grupoId, nombre }),
      'Necesitas conexión para crear un gasto'
    );
  };

  const handleInviteMember = () => {
    guardOnlineAction(
      () => navigation.navigate('InvitarMiembro', { grupoId, nombre, emoji }),
      'Necesitas conexión para invitar miembros'
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />

      <View style={{ 
        padding: 16, 
        backgroundColor: colors.modalBackground,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight 
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.iconColor} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8 }}>
          {emoji || (groupDetails?.emoji)} {nombre || (groupDetails?.nombre)}
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
          {groupDetails?.descripcion || ` ${members.length} miembros`}
        </Text>
      </View>

      {fromCache && !loading && (
        <View style={{ 
          backgroundColor: colors.successLight, 
          padding: 8, 
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8
        }}>
          <Feather name="database" size={14} color={colors.success} />
          <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>
            Datos guardados localmente
          </Text>
          {isOnline && (
            <TouchableOpacity onPress={() => loadGroupData(true)}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                Actualizar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{
        backgroundColor: colors.modalBackground,
        margin: 16,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center'
      }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Tu balance</Text>
        <Text style={{ 
          fontSize: 32, 
          fontWeight: '700', 
          color: myBalance >= 0 ? colors.success : colors.error,
          marginTop: 8 
        }}>
          ${Math.abs(myBalance).toFixed(2)}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
          {myBalance > 0 ? 'Te deben' : myBalance < 0 ? 'Debes' : 'Sin deudas'}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={expenses}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => isOnline ? loadGroupData(true) : null}
              enabled={isOnline}
            />
          }
          ListHeaderComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                Gastos recientes
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{
              backgroundColor: colors.cardBackground,
              marginHorizontal: 16,
              marginBottom: 12,
              padding: 16,
              borderRadius: 12
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {item.descripcion || 'Gasto'}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                Pagado por {item.pagador_nombre}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary, marginTop: 8 }}>
                ${Number(item.importe || 0).toFixed(2)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Feather name="inbox" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, marginTop: 16 }}>
                No hay gastos registrados
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: isOnline ? colors.primary : colors.textMuted,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isOnline ? 1 : 0.5,
        }}
        onPress={handleAddExpense}
      >
        <Text style={{ color: colors.primaryText, fontSize: 28 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
