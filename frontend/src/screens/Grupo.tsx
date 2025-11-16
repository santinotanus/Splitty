import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Modal, Alert, TouchableOpacity as RNTouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useGrupo } from '../viewmodels/useGrupo';
import * as friendsApi from '../api/friends';
import * as groupsApi from '../api/groups';
import * as balancesApi from '../api/balances';
import * as gastosApi from '../api/gastos';

export default function Grupo({ route, navigation }: any) {
  const { grupoId, nombre, emoji } = route.params || {};
  const [optionsVisible, setOptionsVisible] = useState(false);
  const { members, loading, refreshMembers, groupTotal } = useGrupo(grupoId) as any;
  const [activeTab, setActiveTab] = useState<'gastos' | 'deudas'>('gastos');
  const [debts, setDebts] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [groupExpenses, setGroupExpenses] = useState<any[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    const unsubBlur = navigation.addListener('blur', () => setOptionsVisible(false));
    const unsubFocus = navigation.addListener('focus', () => {
      // refresh members when returning to the screen (e.g., after adding via InvitarMiembro)
      refreshMembers();
    });
    return () => {
      unsubBlur();
      unsubFocus();
    };
  }, [grupoId]);

  useEffect(() => {
    // load debts when switching to deudas tab
    if (activeTab === 'deudas') {
      fetchDebts();
    }
    if (activeTab === 'gastos') {
      fetchGroupExpenses();
    }
  }, [activeTab, grupoId]);

  const fetchDebts = async () => {
    if (!grupoId) return;
    setDebtsLoading(true);
    try {
      const d = await balancesApi.getMyDebts(grupoId);
      const c = await balancesApi.getMyCredits(grupoId);
      setDebts(Array.isArray(d) ? d : []);
      setCredits(Array.isArray(c) ? c : []);
    } catch (e) {
      console.error('fetchDebts error', e);
      setDebts([]);
      setCredits([]);
    } finally {
      setDebtsLoading(false);
    }
  };

  const fetchGroupExpenses = async () => {
    if (!grupoId) return;
    setExpensesLoading(true);
    try {
      const rows = await gastosApi.listExpenses(grupoId);
      const list = Array.isArray(rows) ? rows : [];
      // Enrich each expense with participantes count by fetching detail
      const detailed: any[] = [];
      for (const r of list) {
        try {
          const d = await gastosApi.getExpense(grupoId, r.id);
          detailed.push({ ...r, participantes: d.participantes || [] });
        } catch (e) {
          // fallback
          detailed.push({ ...r, participantes: r.participantes || [] });
        }
      }
      setGroupExpenses(detailed);
    } catch (e) {
      console.error('fetchGroupExpenses error', e);
      setGroupExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  };

  const membersCount = members.length;

  const handleInvite = () => {
    // navigate to the dedicated invite screen where user can copy/share link or add friends
    navigation.navigate('InvitarMiembro', { grupoId, nombre, emoji });
    setOptionsVisible(false);
  };

  // Add-friend flow lives inside the InvitarMiembro screen now.

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{nombre || 'Grupo'}</Text>
          <Text style={styles.headerSubtitle}>{membersCount} miembro{membersCount !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => Alert.alert('Ajustes', 'Aquí van los ajustes del grupo')}>
          <Text style={styles.settings}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Balance */}
      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>Balance del grupo</Text>
        <Text style={styles.balanceAmount}>${(groupTotal ?? 0).toFixed(2)}</Text>
        <Text style={styles.totalSpent}>Total gastado</Text>
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
          {members.map((m: any) => (
            <View key={m.id} style={{ alignItems: 'center' }}>
              <View style={[styles.avatarCircle, { backgroundColor: '#033E30' }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{(m.nombre || m.correo || 'U').charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={{ marginTop: 6, fontWeight: '700' }}>{m.nombre || m.correo}</Text>
              <Text style={{ color: '#333' }}>${(m.totalPagado || 0).toFixed(2)}</Text>
              <Text style={{ color: (m.balance || 0) >= 0 ? '#0A8F4A' : '#B00020' }}>{(m.balance || 0) >= 0 ? '+' : '-'}${Math.abs((m.balance || 0)).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'gastos' ? { backgroundColor: '#033E30' } : { backgroundColor: '#f0f0f0' }]} onPress={() => setActiveTab('gastos')}>
          <Text style={{ color: activeTab === 'gastos' ? '#fff' : '#666' }}>Gastos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'deudas' ? { backgroundColor: '#033E30' } : { backgroundColor: '#f0f0f0' }]} onPress={() => setActiveTab('deudas')}>
          <Text style={{ color: activeTab === 'deudas' ? '#fff' : '#666' }}>Deudas</Text>
        </TouchableOpacity>
      </View>

      {/* Content for each tab */}
      {activeTab === 'gastos' ? (
        <>
          <View style={styles.recentHeader}>
            <Text style={{ fontWeight: '700' }}>Gastos recientes</Text>
            <Text style={{ color: '#666' }}>{(groupExpenses || []).length} gastos</Text>
          </View>
          {expensesLoading ? (
            <ActivityIndicator />
          ) : (groupExpenses.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: '#666' }}>No hay gastos en este grupo.</Text>
            </View>
          ) : (
            <View style={{ padding: 12 }}>
              {groupExpenses.map((g: any) => (
                <View key={g.id} style={{ padding: 10, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8 }}>
                  <Text style={{ fontWeight: '700' }}>{g.descripcion || 'Gasto'}</Text>
                  <Text style={{ color: '#666' }}>Pagador: {g.pagador_nombre || g.pagador_correo}</Text>
                  <Text style={{ marginTop: 6, fontWeight: '700' }}>${Number(g.importe || 0).toFixed(2)}</Text>
                  <Text style={{ color: '#999', fontSize: 12 }}>{g.participantes?.length ?? 0} participantes</Text>
                </View>
              ))}
            </View>
          ))}
        </>
      ) : (
        <View style={{ padding: 16 }}>
          {debtsLoading ? (
            <ActivityIndicator />
          ) : (
            <>
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>Deudas</Text>
              {debts.length === 0 ? <Text style={{ color: '#666' }}>No tenés deudas en este grupo</Text> : debts.map((d: any, idx: number) => (
                <View key={idx} style={{ padding: 10, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8 }}>
                  <Text style={{ fontWeight: '700' }}>{d.haciaUsuarioNombre || d.haciaUsuarioCorreo}</Text>
                  <Text style={{ color: '#B00020' }}>Debés ${Number(d.importe).toFixed(2)}</Text>
                </View>
              ))}

              <Text style={{ fontWeight: '700', marginTop: 12 }}>Créditos</Text>
              {credits.length === 0 ? <Text style={{ color: '#666' }}>Nadie te debe</Text> : credits.map((c: any, idx: number) => (
                <View key={idx} style={{ padding: 10, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8 }}>
                  <Text style={{ fontWeight: '700' }}>{c.desdeUsuarioNombre || c.desdeUsuarioCorreo}</Text>
                  <Text style={{ color: '#0A8F4A' }}>Te deben ${Number(c.importe).toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Recent header */}
      <View style={styles.recentHeader}>
        <Text style={{ fontWeight: '700' }}>Gastos recientes</Text>
        <Text style={{ color: '#666' }}>0 gastos</Text>
      </View>


      {/* Floating + */}
      <TouchableOpacity style={styles.fab} onPress={() => setOptionsVisible(true)}>
        <Text style={{ color: '#fff', fontSize: 28 }}>+</Text>
      </TouchableOpacity>

      {/* Modal for + options */}
      <Modal visible={optionsVisible} animationType="slide" transparent>
        <RNTouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOptionsVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>¿Qué querés hacer?</Text>
              <TouchableOpacity style={[styles.modalButton, membersCount <= 1 && { opacity: 0.5 }]} disabled={membersCount <= 1} onPress={() => { setOptionsVisible(false); navigation.navigate('AddGasto', { grupoId, nombre }); }}>
                <Text style={styles.modalButtonText}>Añadir Gastos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButtonSecondary]} onPress={() => { setOptionsVisible(false); handleInvite(); }}>
                <Text style={styles.modalButtonTextSecondary}>Invitar a alguien</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setOptionsVisible(false)}>
                <Text style={{ color: '#666' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </RNTouchableOpacity>
      </Modal>

      {/* Add-friend flow moved to InvitarMiembro screen */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F4F1' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingTop: 60, backgroundColor: '#fff' },
  back: { fontSize: 28, color: '#033E30', width: 32 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#033E30' },
  headerSubtitle: { color: '#666', fontSize: 12 },
  settings: { fontSize: 20 },
  balanceBox: { backgroundColor: '#fff', padding: 16, alignItems: 'center' },
  balanceLabel: { color: '#666' },
  balanceAmount: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  totalSpent: { color: '#666', marginTop: 6 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#033E30', alignItems: 'center', justifyContent: 'center' },
  tabsRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#E6F4F1' },
  tab: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  recentHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionsCard: { padding: 16, margin: 16, backgroundColor: '#fff', borderRadius: 12 },
  actionPrimary: { backgroundColor: '#033E30', padding: 12, borderRadius: 8, alignItems: 'flex-start' },
  actionSecondary: { marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: '#f6f9f6' },
  fab: { position: 'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 28, backgroundColor: '#033E30', alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  modalOption: { padding: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6eee9', marginBottom: 8, alignItems: 'center' },
  // modal button styles (align with Inicio)
  modalButton: { backgroundColor: '#033E30', padding: 12, borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontWeight: '700' },
  modalButtonSecondary: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e6eee9' },
  modalButtonTextSecondary: { color: '#033E30', fontWeight: '700' },
  friendRow: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e6eee9', marginBottom: 8, backgroundColor: '#fff' },
  friendRowSelected: { borderColor: '#033E30', backgroundColor: '#e9f7f3' },
});
