import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, Alert, RefreshControl, Image, Modal } from 'react-native';
import * as balancesApi from '../api/balances';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useOfflineGuard } from '../hooks/useOfflineGuard';
import OfflineBanner from '../components/OfflineBanner';
import { getGroupMembersOffline, getGroupExpensesOffline, getMyBalanceOffline, getGroupDetailsOffline } from '../api/offlineApi';
import { useGrupo } from '../viewmodels/useGrupo';

export default function Grupo({ route, navigation }: any) {
  const { grupoId, nombre, emoji } = route.params || {};
  const { colors } = useTheme();
  const { isOnline, guardOnlineAction } = useOfflineGuard();

  const [members, setMembers] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [myBalance, setMyBalance] = useState(0);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [viewMode, setViewMode] = useState<'gastos' | 'deudas'>('gastos');
  const [fabModalVisible, setFabModalVisible] = useState(false);

  const { members: onlineMembers, loading: membersLoading, refreshMembers, groupTotal } = useGrupo(grupoId);

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
      // prefer onlineMembers when online and available (richer with balances)
      if (isOnline && Array.isArray(onlineMembers) && onlineMembers.length > 0) {
        setMembers(onlineMembers as any[]);
      } else {
        setMembers(membersResult.data || []);
      }

      const expensesResult = await getGroupExpensesOffline(grupoId);
      setExpenses(expensesResult.data || []);

      // If viewing debts or on initial load and online, try to fetch debts
      if (isOnline) {
        try {
          const d = await balancesApi.getMyDebts(grupoId);
          setDebts(Array.isArray(d) ? d : []);
        } catch (e) {
          console.warn('No se pudieron obtener deudas:', e?.message || e);
          setDebts([]);
        }
      }

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

  // keep members in sync when VM updates
  useEffect(() => {
    if (isOnline && Array.isArray(onlineMembers) && onlineMembers.length > 0) {
      setMembers(onlineMembers as any[]);
    }
  }, [onlineMembers, isOnline]);

  // when switching to 'deudas' refresh debts if online
  useEffect(() => {
    if (viewMode === 'deudas' && isOnline) {
      (async () => {
        try {
          const d = await balancesApi.getMyDebts(grupoId);
          setDebts(Array.isArray(d) ? d : []);
        } catch (e) {
          console.warn('Error cargando deudas al cambiar vista:', e?.message || e);
          setDebts([]);
        }
      })();
    }
  }, [viewMode, isOnline, grupoId]);

  const handleAddExpense = () => {
    setFabModalVisible(false);
    guardOnlineAction(
      () => navigation.navigate('AddGasto', { grupoId, nombre }),
      'Necesitas conexión para crear un gasto'
    );
  };

  const handleInviteMember = () => {
    setFabModalVisible(false);
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
        borderBottomColor: colors.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.iconColor} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12, marginRight: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }} numberOfLines={1}>
            {emoji || (groupDetails?.emoji)} {nombre || (groupDetails?.nombre)}
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
            {groupDetails?.descripcion || ` ${members.length} miembros`}
          </Text>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('ConfiguracionGrupo', { grupoId, nombre: nombre || groupDetails?.nombre, descripcion: groupDetails?.descripcion, emoji: emoji || groupDetails?.emoji })}>
          <Feather name="settings" size={22} color={colors.iconColor} />
        </TouchableOpacity>
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

      {/* Balance card (moved to top) */}
      <View style={{
        backgroundColor: colors.modalBackground,
        margin: 16,
        padding: 20,
        borderRadius: 12,
        alignItems: 'center'
      }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Balance del grupo</Text>
        <Text style={{ 
          fontSize: 32, 
          fontWeight: '700', 
          color: myBalance >= 0 ? colors.success : colors.error,
          marginTop: 8 
        }}>
          ${Math.abs(myBalance).toFixed(2)}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
          Total gastado
        </Text>
      </View>

      {/* Miembros del grupo */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Miembros</Text>
        {members.length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No hay miembros registrados</Text>
        ) : (
          <FlatList
            data={members}
            horizontal
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={{ paddingVertical: 12, flexGrow: 1, justifyContent: 'center' }}
            renderItem={({ item }) => (
              <View style={{ width: 120, marginRight: 12, alignItems: 'center' }}>
                {item.foto_url ? (
                  <Image source={{ uri: item.foto_url }} style={{ width: 56, height: 56, borderRadius: 28, marginBottom: 8 }} />
                ) : (
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.emojiCircle, marginBottom: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="user" size={20} color={colors.primaryText} />
                  </View>
                )}
                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{item.nombre || item.name || item.name}</Text>
                {typeof item.balance !== 'undefined' && (
                  <Text style={{ color: item.balance > 0 ? colors.success : item.balance < 0 ? colors.error : colors.textMuted, marginTop: 4 }}>
                    ${Math.abs(Number(item.balance || 0)).toFixed(2)}
                  </Text>
                )}
              </View>
            )}
          />
        )}
      </View>

      {/* Selector Gastos / Deudas as pill under avatars (more spacing) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, alignItems: 'center', marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.cardBackground, borderRadius: 999, padding: 6, paddingHorizontal: 6 }}>
          <TouchableOpacity onPress={() => setViewMode('gastos')} style={{ paddingVertical: 10, paddingHorizontal: 28, borderRadius: 999, backgroundColor: viewMode === 'gastos' ? colors.primary : 'transparent', marginHorizontal: 6 }}>
            <Text style={{ color: viewMode === 'gastos' ? colors.primaryText : colors.textSecondary, fontWeight: viewMode === 'gastos' ? '700' : '600' }}>Gastos</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setViewMode('deudas')} style={{ paddingVertical: 10, paddingHorizontal: 28, borderRadius: 999, backgroundColor: viewMode === 'deudas' ? colors.error : 'transparent', marginHorizontal: 6 }}>
            <Text style={{ color: viewMode === 'deudas' ? '#fff' : colors.textSecondary, fontWeight: viewMode === 'deudas' ? '700' : '600' }}>Deudas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Balance moved below content */}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {viewMode === 'gastos' ? (
            <FlatList
              data={expenses}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => isOnline ? loadGroupData(true) : null}
              enabled={isOnline}
            />
          }
          contentContainerStyle={{ paddingTop: 16 }}
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
          ) : (
            // Deudas view
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              {!isOnline ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted }}>Las deudas sólo están disponibles con conexión</Text>
                </View>
              ) : debts.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Feather name="inbox" size={48} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginTop: 16 }}>No hay deudas pendientes</Text>
                </View>
              ) : (
                <FlatList
                  data={debts}
                  keyExtractor={(d) => d.id || String(d.debtId || Math.random())}
                  renderItem={({ item }) => (
                    <View style={{ 
                      backgroundColor: colors.cardBackground, 
                      padding: 16, 
                      borderRadius: 12, 
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}>
                      <View style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: 20, 
                        backgroundColor: colors.error,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Feather name="arrow-up-right" size={20} color={colors.primaryText} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontWeight: '700', color: colors.text, fontSize: 15, marginBottom: 2 }}>
                          {item.haciaUsuarioNombre || item.acreedorNombre || item.usuarioNombre || item.deudorNombre || '—'}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                          {item.gastoDescripcion || item.descripcion || item.concepto || 'Pago pendiente'}
                        </Text>
                        <Text style={{ fontWeight: '700', fontSize: 16, color: colors.error }}>
                          ${Number(item.importe || item.monto || 0).toFixed(2)}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={{ 
                          backgroundColor: colors.primary, 
                          paddingHorizontal: 20, 
                          paddingVertical: 12, 
                          borderRadius: 8,
                          minWidth: 80,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onPress={() => guardOnlineAction(() => navigation.navigate('DebtDetail', { debt: item, grupoId }), 'Necesitas conexión para ver la deuda')}
                      >
                        <Text style={{ color: colors.primaryText, fontWeight: '700', fontSize: 15 }}>Pagar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}
            </View>
          )}
        </>
      )}

      {/* Balance card below content as requested */}
      

      <Modal visible={fabModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <View style={{ backgroundColor: colors.modalBackground, padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <TouchableOpacity onPress={handleAddExpense} style={{ padding: 12, backgroundColor: colors.primary, borderRadius: 8, marginBottom: 8, alignItems: 'center' }}>
              <Text style={{ color: colors.primaryText, fontWeight: '700' }}>Agregar gasto</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleInviteMember} style={{ padding: 12, backgroundColor: colors.cardBackground, borderRadius: 8, marginBottom: 8, alignItems: 'center' }}>
              <Text style={{ color: colors.text }}>Invitar miembro</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFabModalVisible(false)} style={{ alignItems: 'center', padding: 8 }}>
              <Text style={{ color: colors.textMuted }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
        onPress={() => setFabModalVisible(true)}
      >
        <Text style={{ color: colors.primaryText, fontSize: 28 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
