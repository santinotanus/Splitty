import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Modal,
  TouchableOpacity as RNTouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import * as groupsApi from '../api/groups';
import Header from '../components/Header';

export default function Inicio({ navigation }: any) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);

  // Calculate total balance from all groups
  const totalBalance = useMemo(() => {
    return groups.reduce((sum, group) => {
      const balance = group.saldo ?? group.balance ?? 0;
      return sum + Number(balance);
    }, 0);
  }, [groups]);

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await groupsApi.getMyGroups();
      // expect an array
      let groupsArr = Array.isArray(res) ? res : [];
      // merge local emojis saved on the client
      try {
        const { loadGroupEmojis } = await import('../utils/groupEmoji');
        const map = await loadGroupEmojis();
        groupsArr = groupsArr.map((g: any) => ({ ...g, emoji: map[g.id] ?? g.emoji ?? '✈️' }));
      } catch (e) {
        // if anything fails, just fall back
        groupsArr = groupsArr.map((g: any) => ({ ...g, emoji: g.emoji ?? '✈️' }));
      }
      setGroups(groupsArr);
    } catch (e: any) {
      console.error('getMyGroups error', e);
      setError('Error cargando grupos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    const unsubFocus = navigation.addListener('focus', () => fetchGroups());
    const unsubBlur = navigation.addListener('blur', () => setOptionsVisible(false));
    return () => {
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {/* Placeholder circle (removed image to avoid bundling issues) */}
      <View style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>Sin grupos aún</Text>
      <Text style={styles.emptySubtitle}>Todavía no sos parte de ningún grupo. Unite a uno existente o creá el tuyo propio.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Component */}
      <Header navigation={navigation} balance={totalBalance} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#033E30" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {groups.length === 0 ? (
            renderEmpty()
          ) : (
            <FlatList
              data={groups}
              keyExtractor={(item) => item.id}
              // Add extra top padding so group cards render lower on the screen (accounting for header)
              contentContainerStyle={{ padding: 16, paddingTop: 100 }}
              renderItem={({ item }) => {
                const membersCount = item.miembros?.length || item.members?.length || 0;
                const balance = item.saldo ?? item.balance ?? 0;
                const balanceFormatted = (typeof balance === 'number') ? balance.toFixed(2) : String(balance);
                const balanceSign = Number(balance) > 0 ? '+' : Number(balance) < 0 ? '-' : '';
                const balanceColor = Number(balance) > 0 ? '#0A8F4A' : Number(balance) < 0 ? '#D9534F' : '#666';
                return (
                  <TouchableOpacity style={styles.groupCard} onPress={() => navigation.navigate('Grupo', { grupoId: item.id, nombre: item.nombre || item.name, emoji: item.emoji })}>
                    <View style={styles.groupLeft}>
                      <View style={styles.emojiCircle}>
                        <Text style={styles.emojiText}>{item.emoji || '✈️'}</Text>
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.groupName}>{item.nombre || item.name}</Text>
                        <Text style={styles.groupSubtitle}>{membersCount} miembros • {item.descripcion || 'Sin descripción'}</Text>
                      </View>
                    </View>
                    <View style={styles.balanceContainer}>
                      <Text style={[styles.balanceText, { color: balanceColor }]}>{balanceSign}${Math.abs(Number(balance)).toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Floating + button */}
      <TouchableOpacity style={styles.fab} onPress={() => setOptionsVisible(true)}>
        <Text style={{ color: '#fff', fontSize: 28 }}>+</Text>
      </TouchableOpacity>

      {/* Options bottom modal */}
      <Modal visible={optionsVisible} animationType="slide" transparent>
        <RNTouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOptionsVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>¿Qué querés hacer?</Text>
              <TouchableOpacity style={styles.modalButton} onPress={() => { setOptionsVisible(false); navigation.navigate('CrearGrupo'); }}>
                <Text style={styles.modalButtonText}>Crear Grupo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6eee9' }]} onPress={() => { setOptionsVisible(false); navigation.navigate('UnirseGrupo'); }}>
                <Text style={[styles.modalButtonText, { color: '#033E30' }]}>Unirse a un Grupo</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#E6F4F1',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 12,
  },
  errorText: {
    color: '#B00020',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 70,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#033E30',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalButton: {
    backgroundColor: '#033E30',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  groupCard: {
    backgroundColor: '#F2F7F4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#033E30',
  },
  groupSubtitle: {
    color: '#666',
    marginTop: 6,
  },
  groupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DFF4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 20 },
  balanceContainer: { justifyContent: 'center', alignItems: 'flex-end' },
  balanceText: { fontSize: 16, fontWeight: '700' },
});
