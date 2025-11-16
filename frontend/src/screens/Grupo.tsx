import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Modal, Alert, TouchableOpacity as RNTouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useGrupo } from '../viewmodels/useGrupo';

export default function Grupo({ route, navigation }: any) {
  const { grupoId, nombre, emoji } = route.params || {};
  const [optionsVisible, setOptionsVisible] = useState(false);
  const { members, loading, refreshMembers } = useGrupo(grupoId);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    const unsubBlur = navigation.addListener('blur', () => setOptionsVisible(false));
    return () => unsubBlur();
  }, [grupoId]);

  const membersCount = members.length;

  const handleInvite = () => {
    // navigate to the dedicated invite screen where user can copy/share link or add friends
    navigation.navigate('InvitarMiembro', { grupoId, nombre, emoji });
    setOptionsVisible(false);
  };

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
        <Text style={styles.balanceAmount}>$0</Text>
        <Text style={styles.totalSpent}>Total gastado</Text>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <View style={styles.avatarCircle}><Text style={{ color: '#fff' }}>Tú</Text></View>
          <Text style={{ marginTop: 6, fontWeight: '700' }}>Tú</Text>
          <Text style={{ color: '#0A8F4A' }}>+$0</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <View style={[styles.tab, { backgroundColor: '#033E30' }]}>
          <Text style={{ color: '#fff' }}>Gastos</Text>
        </View>
        <View style={[styles.tab, { backgroundColor: '#f0f0f0' }]}>
          <Text style={{ color: '#666' }}>Deudas</Text>
        </View>
      </View>

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
});
