import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
  TouchableOpacity as RNTouchableOpacity,
  TouchableWithoutFeedback
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGrupo } from '../viewmodels/useGrupo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as balancesApi from '../api/balances';
import * as gastosApi from '../api/gastos';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

export default function Grupo({ route, navigation }: any) {
  const { grupoId, nombre, emoji, descripcion } = route.params || {};
  const { user } = useAuth();
  const { colors } = useTheme();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const { members, loading, refreshMembers, groupTotal } = useGrupo(grupoId) as any;
  const [activeTab, setActiveTab] = useState<'gastos' | 'deudas'>('gastos');
  const [debts, setDebts] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [groupExpenses, setGroupExpenses] = useState<any[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  // Determinar el rol del usuario actual
  const currentMember = members.find((m: any) => m.firebase_uid === user?.uid);
  const userRole = currentMember?.rol || 'miembro';

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    const unsubBlur = navigation.addListener('blur', () => setOptionsVisible(false));
    const unsubFocus = navigation.addListener('focus', () => {
      refreshMembers();
    });
    return () => {
      unsubBlur();
      unsubFocus();
    };
  }, [grupoId]);

  useEffect(() => {
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
      const detailed: any[] = [];
      for (const r of list) {
        try {
          const d = await gastosApi.getExpense(grupoId, r.id);
          detailed.push({ ...r, participantes: d.participantes || [] });
        } catch (e) {
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
    navigation.navigate('InvitarMiembro', { grupoId, nombre, emoji });
    setOptionsVisible(false);
  };

  const handleSettings = () => {
    navigation.navigate('ConfiguracionGrupo', {
      grupoId,
      nombre,
      descripcion: descripcion || '',
      emoji,
      rol: userRole
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.modalBackground, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: colors.text }]}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.emojiHeader}>{emoji || '✈️'}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{nombre || 'Grupo'}</Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {membersCount} miembro{membersCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSettings}>
          <Feather name="settings" size={22} color={colors.iconColor} />
        </TouchableOpacity>
      </View>

      {/* Balance */}
      <View style={[styles.balanceBox, { backgroundColor: colors.modalBackground, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Balance del grupo</Text>
        <Text style={[styles.balanceAmount, { color: colors.text }]}>${(groupTotal ?? 0).toFixed(2)}</Text>
        <Text style={[styles.totalSpent, { color: colors.textSecondary }]}>Total gastado</Text>

        {/* Miembros con sus balances */}
        {members.length > 0 && (
          <View style={{ flexDirection: 'row', marginTop: 16, gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {members.map((m: any) => {
              const balance = m.balance || 0;
              const isPositive = balance >= 0;

              return (
                <View key={m.id} style={{ alignItems: 'center', width: 80 }}>
                  <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: colors.primaryText, fontWeight: '700', fontSize: 16 }}>
                      {(m.nombre || m.correo || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={{
                      marginTop: 6,
                      fontWeight: '700',
                      fontSize: 12,
                      textAlign: 'center',
                      color: colors.text,
                    }}
                    numberOfLines={1}
                  >
                    {m.nombre || m.correo}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    Pagó ${(m.totalPagado || 0).toFixed(2)}
                  </Text>
                  <Text
                    style={{
                      color: isPositive ? colors.success : colors.error,
                      fontSize: 12,
                      fontWeight: '600',
                      marginTop: 2,
                    }}
                  >
                    {isPositive ? '+' : '-'}${Math.abs(balance).toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            { backgroundColor: activeTab === 'gastos' ? colors.primary : colors.cardBackground }
          ]}
          onPress={() => setActiveTab('gastos')}
        >
          <Text style={{ color: activeTab === 'gastos' ? colors.primaryText : colors.textMuted, fontWeight: '600' }}>
            Gastos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { backgroundColor: activeTab === 'deudas' ? colors.primary : colors.cardBackground }
          ]}
          onPress={() => setActiveTab('deudas')}
        >
          <Text style={{ color: activeTab === 'deudas' ? colors.primaryText : colors.textMuted, fontWeight: '600' }}>
            Deudas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content for each tab */}
      {activeTab === 'gastos' ? (
        <View style={{ flex: 1 }}>
          <View style={[styles.recentHeader, { backgroundColor: colors.background }]}>
            <Text style={{ fontWeight: '700', fontSize: 16, color: colors.text }}>Gastos recientes</Text>
            <View style={[styles.badge, { backgroundColor: colors.badgeBackground }]}>
              <Text style={[styles.badgeText, { color: colors.badgeText }]}>{(groupExpenses || []).length} gastos</Text>
            </View>
          </View>

          {expensesLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (groupExpenses.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
              <Feather name="inbox" size={48} color={colors.iconColor} />
              <Text style={{ color: colors.textSecondary, marginTop: 16, textAlign: 'center', fontSize: 16 }}>
                No hay gastos en este grupo
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 8, textAlign: 'center', fontSize: 14 }}>
                Presiona el botón + para agregar el primer gasto
              </Text>
            </View>
          ) : (
            <FlatList
              data={groupExpenses}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80 }}
              renderItem={({ item: g }) => (
                <View style={[styles.expenseCard, { backgroundColor: colors.cardBackground }]}>
                  <View style={styles.expenseHeader}>
                    <View style={[styles.expenseIcon, { backgroundColor: colors.emojiCircle }]}>
                      <Feather name="shopping-bag" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.expenseTitle, { color: colors.text }]}>{g.descripcion || 'Gasto'}</Text>
                      <Text style={[styles.expenseMeta, { color: colors.textSecondary }]}>
                        Pagado por {g.pagador_nombre || g.pagador_correo}
                      </Text>
                      <Text style={[styles.expenseDate, { color: colors.textMuted }]}>
                        {new Date(g.fecha_pago).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.expenseAmount, { color: colors.text }]}>
                        ${Number(g.importe || 0).toFixed(2)}
                      </Text>
                      <View style={[styles.participantsBadge, { backgroundColor: colors.emojiCircle }]}>
                        <Feather name="users" size={12} color={colors.iconColor} />
                        <Text style={[styles.participantsBadgeText, { color: colors.textSecondary }]}>
                          {g.participantes?.length ?? 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            />
          ))}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {debtsLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={{ flex: 1, padding: 16 }}>
              {/* Deudas */}
              <View style={{ marginBottom: 24 }}>
                <Text style={[styles.debtSectionTitle, { color: colors.text }]}>Tus deudas</Text>
                {debts.length === 0 ? (
                  <View style={[styles.emptyDebtCard, { backgroundColor: colors.cardBackground }]}>
                    <Feather name="check-circle" size={32} color={colors.success} />
                    <Text style={[styles.emptyDebtText, { color: colors.textSecondary }]}>¡No tenés deudas!</Text>
                  </View>
                ) : (
                  debts.map((d: any, idx: number) => (
                    <TouchableOpacity key={idx} style={[styles.debtCard, { backgroundColor: colors.cardBackground }]} onPress={() => navigation.navigate('DebtDetail', { debt: d, grupoId, deudorId: currentMember?.id })}>
                      <View style={[styles.debtIcon, { backgroundColor: colors.successLight }]}>
                        <Feather name="arrow-up-right" size={20} color={colors.error} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.debtName, { color: colors.text }]}>{d.haciaUsuarioNombre || d.haciaUsuarioCorreo}</Text>
                        <Text style={[styles.debtLabel, { color: colors.textSecondary }]}>{d.gastoDescripcion || 'Pago pendiente'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.debtAmount, { color: colors.error }]}>
                          ${Number(d.importe).toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Créditos */}
              <View>
                <Text style={[styles.debtSectionTitle, { color: colors.text }]}>Te deben</Text>
                {credits.length === 0 ? (
                  <View style={[styles.emptyDebtCard, { backgroundColor: colors.cardBackground }]}>
                    <Feather name="inbox" size={32} color={colors.iconColor} />
                    <Text style={[styles.emptyDebtText, { color: colors.textSecondary }]}>Nadie te debe</Text>
                  </View>
                ) : (
                  credits.map((c: any, idx: number) => (
                    <View key={idx} style={[styles.debtCard, { backgroundColor: colors.cardBackground }]}>
                      <View style={[styles.debtIcon, { backgroundColor: colors.successLight }]}>
                        <Feather name="arrow-down-left" size={20} color={colors.success} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.debtName, { color: colors.text }]}>{c.desdeUsuarioNombre || c.desdeUsuarioCorreo}</Text>
                        <Text style={[styles.debtLabel, { color: colors.textSecondary }]}>Te debe</Text>
                      </View>
                      <Text style={[styles.debtAmount, { color: colors.success }]}>
                        ${Number(c.importe).toFixed(2)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Floating + */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setOptionsVisible(true)}>
        <Text style={{ color: colors.primaryText, fontSize: 28 }}>+</Text>
      </TouchableOpacity>

      {/* Modal for + options */}
      <Modal visible={optionsVisible} animationType="slide" transparent>
        <RNTouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setOptionsVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: colors.modalBackground }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>¿Qué querés hacer?</Text>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }, membersCount === 0 && { opacity: 0.5 }]}
                disabled={membersCount === 0}
                onPress={() => {
                  setOptionsVisible(false);
                  navigation.navigate('AddGasto', { grupoId, nombre });
                }}
              >
                <Feather name="plus-circle" size={20} color={colors.primaryText} style={{ marginRight: 8 }} />
                <Text style={[styles.modalButtonText, { color: colors.primaryText }]}>Añadir Gasto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButtonSecondary, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}
                onPress={() => {
                  setOptionsVisible(false);
                  handleInvite();
                }}
              >
                <Feather name="user-plus" size={20} color={colors.text} style={{ marginRight: 8 }} />
                <Text style={[styles.modalButtonTextSecondary, { color: colors.text }]}>Invitar a alguien</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 12, alignItems: 'center', paddingVertical: 8 }}
                onPress={() => setOptionsVisible(false)}
              >
                <Text style={{ color: colors.textMuted, fontSize: 15 }}>Cancelar</Text>
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
    backgroundColor: '#E6F4F1'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6eee9',
  },
  back: {
    fontSize: 28,
    color: '#033E30',
    width: 32,
    fontWeight: '300',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emojiHeader: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#033E30'
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  balanceBox: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e6eee9',
  },
  balanceLabel: {
    color: '#666',
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
    color: '#033E30',
  },
  totalSpent: {
    color: '#666',
    marginTop: 4,
    fontSize: 13,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#033E30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#E6F4F1'
  },
  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  recentHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
  },
  badge: {
    backgroundColor: '#DFF4EA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#033E30',
  },
  expenseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e6eee9',
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DFF4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 4,
  },
  expenseMeta: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 11,
    color: '#999',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 6,
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f6f9f7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantsBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  debtSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 12,
  },
  emptyDebtCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e6eee9',
  },
  emptyDebtText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e6eee9',
  },
  debtIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 2,
  },
  debtLabel: {
    fontSize: 12,
    color: '#666',
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#033E30',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    },
      modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)'
      },
      modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
      },
      modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        color: '#033E30',
      },
      modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#033E30',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
      },
      modalButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
      },
      modalButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e6eee9'
      },
      modalButtonTextSecondary: {
        color: '#033E30',
        fontWeight: '700',
        fontSize: 16,
      },
    });