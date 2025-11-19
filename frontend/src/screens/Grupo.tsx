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
  TouchableWithoutFeedback,
  Image,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGrupo } from '../viewmodels/useGrupo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import * as balancesApi from '../api/balances';
import * as gastosApi from '../api/gastos';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// 🟢 IMPORTS OFFLINE
import { useOfflineGuard } from '../hooks/useOfflineGuard';
import OfflineBanner from '../components/OfflineBanner';
import { getGroupMembersOffline, getGroupExpensesOffline } from '../api/offlineApi';

export default function Grupo({ route, navigation }: any) {
  const { grupoId, nombre, emoji, descripcion } = route.params || {};
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets);

  // 🟢 OFFLINE GUARD
  const { isOnline, guardOnlineAction } = useOfflineGuard();

  const [optionsVisible, setOptionsVisible] = useState(false);
  const { members, loading, refreshMembers, groupTotal } = useGrupo(grupoId) as any;
  const [activeTab, setActiveTab] = useState<'gastos' | 'deudas'>('gastos');
  const [debts, setDebts] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [debtsLoading, setDebtsLoading] = useState(false);
  const [groupExpenses, setGroupExpenses] = useState<any[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  // 🟢 ESTADOS OFFLINE
  const [fromCache, setFromCache] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Determinar el rol del usuario actual
  const currentMember = members.find((m: any) => m.firebase_uid === user?.uid);
  const userRole = currentMember?.rol || 'miembro';
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    const unsubBlur = navigation.addListener('blur', () => setOptionsVisible(false));
    const unsubFocus = navigation.addListener('focus', () => {
      if (isOnline) {
        refreshMembers();
      }
    });
    return () => {
      unsubBlur();
      unsubFocus();
    };
  }, [grupoId, isOnline]);

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

    // 🟢 SOLO CARGAR DEUDAS SI HAY CONEXIÓN
    if (!isOnline) {
      setDebts([]);
      setCredits([]);
      return;
    }

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
      if (isOnline) {
        // 🟢 Online: cargar desde API con detalles
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
        setFromCache(false);
      } else {
        // 🟢 Offline: cargar desde caché
        const expensesResult = await getGroupExpensesOffline(grupoId);
        setGroupExpenses(expensesResult.data || []);
        setFromCache(expensesResult.fromCache);
      }
    } catch (e) {
      console.error('fetchGroupExpenses error', e);
      setGroupExpenses([]);
    } finally {
      setExpensesLoading(false);
    }
  };

  const membersCount = members.length;

  const handleInvite = () => {
    // 🟢 PROTEGER ACCIÓN OFFLINE
    guardOnlineAction(
      () => {
        navigation.navigate('InvitarMiembro', { grupoId, nombre, emoji });
        setOptionsVisible(false);
      },
      'Necesitas conexión para invitar miembros'
    );
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

  const handleAddExpensePress = () => {
    // 🟢 PROTEGER ACCIÓN OFFLINE
    if (!isOnline) {
      guardOnlineAction(() => {}, 'Necesitas conexión para crear un gasto');
      return;
    }

    if (membersCount <= 1) {
      Alert.alert(
        'Necesitás más miembros',
        'Debés tener al menos 2 miembros en el grupo para crear un gasto. ¿Querés invitar a alguien?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Invitar', onPress: () => {
            setOptionsVisible(false);
            navigation.navigate('InvitarMiembro', { grupoId, nombre, emoji });
          }}
        ]
      );
    } else {
      setOptionsVisible(false);
      navigation.navigate('AddGasto', { grupoId, nombre });
    }
  };

  // 🟢 REFRESH HANDLER
  const onRefresh = async () => {
    if (isOnline) {
      setRefreshing(true);
      await refreshMembers();
      if (activeTab === 'gastos') {
        await fetchGroupExpenses();
      }
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 🟢 OFFLINE BANNER */}
      <OfflineBanner />

      {/* Header Fijo (con Safe Area) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.emojiHeader}>{emoji || '✈️'}</Text>
            <Text style={styles.headerTitle}>{nombre || 'Grupo'}</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {membersCount} miembro{membersCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSettings}>
          <Feather name="settings" size={22} color={colors.iconColor} />
        </TouchableOpacity>
      </View>

      {/* 🟢 BANNER DE CACHÉ */}
      {fromCache && !refreshing && (
        <View style={styles.cacheBanner}>
          <Feather name="database" size={14} color={colors.success} />
          <Text style={[styles.cacheBannerText, { color: colors.success }]}>
            Datos guardados localmente
          </Text>
          {isOnline && (
            <TouchableOpacity onPress={onRefresh}>
              <Text style={[styles.cacheBannerButton, { color: colors.primary }]}>
                Actualizar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            enabled={isOnline}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={() => (
          <View>
            {/* Balance */}
            <View style={styles.balanceBox}>
              <Text style={styles.balanceLabel}>Balance del grupo</Text>
              <Text style={styles.balanceAmount}>${(groupTotal ?? 0).toFixed(2)}</Text>
              <Text style={styles.totalSpent}>Total gastado</Text>

              {/* Miembros con sus balances */}
              {members.length > 0 && (
                <View style={styles.memberBalancesRow}>
                  {members.map((m: any) => {
                    const balance = m.balance || 0;
                    const isPositive = balance >= 0;
                    const memberPhoto = m.foto_url || null;
                    const memberName = m.nombre || m.correo || 'U';

                    return (
                      <View key={m.id} style={styles.memberBalanceItem}>
                        {memberPhoto ? (
                          <Image
                            source={{ uri: memberPhoto }}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <View style={styles.avatarCircle}>
                            <Text style={styles.avatarText}>
                              {memberName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}

                        <Text style={styles.memberName} numberOfLines={1}>
                          {memberName}
                        </Text>
                        <Text style={styles.memberPaid}>
                          Pagó ${(m.totalPagado || 0).toFixed(2)}
                        </Text>
                        <Text
                          style={[
                            styles.memberBalance,
                            { color: isPositive ? colors.success : colors.error },
                          ]}
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
            <View style={styles.tabsRowWrapper}>
              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'gastos' && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setActiveTab('gastos')}
                >
                  <Text style={[styles.tabText, activeTab === 'gastos' && { color: colors.primaryText }]}>
                    Gastos
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === 'deudas' && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setActiveTab('deudas')}
                >
                  <Text style={[styles.tabText, activeTab === 'deudas' && { color: colors.primaryText }]}>
                    Deudas
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Header de la sección de gastos o deudas */}
            {activeTab === 'gastos' && (
              <View style={styles.recentHeader}>
                <Text style={styles.recentTitle}>Gastos recientes</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{(groupExpenses || []).length} gastos</Text>
                </View>
              </View>
            )}

            {/* Manejo de estados de carga y vacío */}
            {activeTab === 'gastos' && expensesLoading ? (
              <View style={styles.tabCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : activeTab === 'gastos' && groupExpenses.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Feather name="inbox" size={48} color={colors.iconColor} />
                <Text style={styles.emptyStateText}>
                  No hay gastos en este grupo
                </Text>
                <Text style={styles.emptyStateMutedText}>
                  {membersCount <= 1
                    ? 'Invitá a alguien al grupo para empezar a registrar gastos'
                    : 'Presiona el botón + para agregar el primer gasto'
                  }
                </Text>
              </View>
            ) : activeTab === 'deudas' && debtsLoading ? (
              <View style={styles.tabCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : activeTab === 'deudas' ? (
              <View style={styles.debtsSection}>
                {/* 🟢 MENSAJE OFFLINE PARA DEUDAS */}
                {!isOnline ? (
                  <View style={styles.emptyStateContainer}>
                    <Feather name="wifi-off" size={48} color={colors.textMuted} />
                    <Text style={styles.emptyStateText}>
                      Las deudas sólo están disponibles con conexión
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Deudas */}
                    <View style={styles.debtSectionWrapper}>
                      <Text style={styles.debtSectionTitle}>Tus deudas</Text>
                      {debts.length === 0 ? (
                        <View style={styles.emptyDebtCard}>
                          <Feather name="check-circle" size={32} color={colors.success} />
                          <Text style={styles.emptyDebtText}>¡No tenés deudas!</Text>
                        </View>
                      ) : (
                        debts.map((d: any, idx: number) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.debtCard}
                            onPress={() => navigation.navigate('DebtDetail', { debt: d, grupoId, deudorId: currentMember?.id })}
                          >
                            <View style={[styles.debtIcon, { backgroundColor: colors.error }]}>
                              <Feather name="arrow-up-right" size={20} color={colors.primaryText} />
                            </View>
                            <View style={styles.debtInfo}>
                              <Text style={styles.debtName}>{d.haciaUsuarioNombre || d.haciaUsuarioCorreo}</Text>
                              <Text style={styles.debtLabel}>{d.gastoDescripcion || 'Pago pendiente'}</Text>
                            </View>
                            <View style={styles.debtAmountContainer}>
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
                      <Text style={styles.debtSectionTitle}>Te deben</Text>
                      {credits.length === 0 ? (
                        <View style={styles.emptyDebtCard}>
                          <Feather name="inbox" size={32} color={colors.iconColor} />
                          <Text style={styles.emptyDebtText}>Nadie te debe</Text>
                        </View>
                      ) : (
                        credits.map((c: any, idx: number) => (
                          <View key={idx} style={styles.debtCard}>
                            <View style={[styles.debtIcon, { backgroundColor: colors.success }]}>
                              <Feather name="arrow-down-left" size={20} color={colors.primaryText} />
                            </View>
                            <View style={styles.debtInfo}>
                              <Text style={styles.debtName}>{c.desdeUsuarioNombre || c.desdeUsuarioCorreo}</Text>
                              <Text style={styles.debtLabel}>Te debe</Text>
                            </View>
                            <Text style={[styles.debtAmount, { color: colors.success }]}>
                              ${Number(c.importe).toFixed(2)}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  </>
                )}
              </View>
            ) : null}
          </View>
        )}
        data={activeTab === 'gastos' && !expensesLoading && groupExpenses.length > 0 ? groupExpenses : []}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item: g }) => (
          <View style={styles.expenseCard}>
            <View style={styles.expenseHeader}>
              <View style={styles.expenseIcon}>
                <Feather name="shopping-bag" size={20} color={colors.primary} />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseTitle}>{g.descripcion || 'Gasto'}</Text>
                <Text style={styles.expenseMeta}>
                  Pagado por {g.pagador_nombre || g.pagador_correo}
                </Text>
                <Text style={styles.expenseDate}>
                  {new Date(g.fecha_pago).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </Text>
              </View>
              <View style={styles.expenseAmountContainer}>
                <Text style={styles.expenseAmount}>
                  ${Number(g.importe || 0).toFixed(2)}
                </Text>
                <View style={styles.participantsBadge}>
                  <Feather name="users" size={12} color={colors.iconColor} />
                  <Text style={styles.participantsBadgeText}>
                    {g.participantes?.length ?? 0}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* Floating + (con Safe Area) - 🟢 DESHABILITADO OFFLINE */}
      <TouchableOpacity
        style={[
          styles.fab,
          !isOnline && { backgroundColor: colors.textMuted, opacity: 0.5 }
        ]}
        onPress={() => {
          if (isOnline) {
            setOptionsVisible(true);
          } else {
            guardOnlineAction(() => {}, 'Necesitas conexión para agregar gastos o invitar miembros');
          }
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal for + options (con Safe Area) */}
      <Modal visible={optionsVisible} animationType="slide" transparent>
        <RNTouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setOptionsVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>¿Qué querés hacer?</Text>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  membersCount <= 1 && { opacity: 0.5 }
                ]}
                onPress={handleAddExpensePress}
                disabled={loading}
              >
                <Feather name="plus-circle" size={20} color={colors.primaryText} style={{ marginRight: 8 }} />
                <Text style={styles.modalButtonText}>Añadir Gasto</Text>
              </TouchableOpacity>

              {membersCount <= 1 && (
                <Text style={styles.warningText}>
                  Necesitás al menos 2 miembros para crear gastos
                </Text>
              )}

              {/* Botón de Invitar: CONDICIONADO POR ROL */}
              <TouchableOpacity
                style={[
                  styles.modalButtonSecondary,
                  !isAdmin && { opacity: 0.5 }
                ]}
                onPress={() => {
                  if (isAdmin) {
                    handleInvite();
                  } else {
                    Alert.alert('Permiso denegado', 'Solo los administradores pueden invitar miembros al grupo.');
                  }
                }}
                disabled={!isAdmin || loading}
              >
                <Feather name="user-plus" size={20} color={colors.text} style={{ marginRight: 8 }} />
                <Text style={styles.modalButtonTextSecondary}>Invitar a alguien</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setOptionsVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </RNTouchableOpacity>
      </Modal>
    </View>
  );
}

// Estilos dinámicos
const getStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // 🟢 NUEVO: Banner de caché
  cacheBanner: {
    backgroundColor: colors.successLight,
    padding: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  cacheBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cacheBannerButton: {
    fontSize: 12,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: insets.top + 16,
    backgroundColor: colors.modalBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  back: {
    fontSize: 28,
    color: colors.text,
    width: 32,
    fontWeight: '300',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center'
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
    color: colors.text
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  balanceBox: {
    backgroundColor: colors.modalBackground,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  balanceLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
    color: colors.text,
  },
  totalSpent: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
  },
  memberBalancesRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  memberBalanceItem: {
    alignItems: 'center',
    width: 80
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarText: {
    color: colors.primaryText,
    fontWeight: '700',
    fontSize: 16
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.borderLight,
  },
  memberName: {
    marginTop: 6,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    color: colors.text,
  },
  memberPaid: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  memberBalance: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  tabsRowWrapper: {
    padding: 12,
    backgroundColor: colors.background
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.cardBackground
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: '600'
  },
  recentHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  recentTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.text
  },
  badge: {
    backgroundColor: colors.badgeBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.badgeText,
  },
  tabCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 200
  },
  emptyStateText: {
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16
  },
  emptyStateMutedText: {
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14
  },
  expenseCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.emojiCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
    marginLeft: 12
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  expenseMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  expenseDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  expenseAmountContainer: {
    alignItems: 'flex-end'
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  participantsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  participantsBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  debtsSection: {
    flex: 1,
    padding: 16
  },
  debtSectionWrapper: {
    marginBottom: 24
  },
  debtSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  emptyDebtCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyDebtText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 12,
    fontWeight: '600',
  },
  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  debtIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtInfo: {
    flex: 1,
    marginLeft: 12
  },
  debtName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  debtLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  debtAmountContainer: {
    alignItems: 'flex-end'
  },
  debtAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20 + insets.bottom,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: colors.primaryText,
    fontSize: 28
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: colors.modalBackground,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20 + insets.bottom,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.text,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalButtonText: {
    color: colors.primaryText,
    fontWeight: '700',
    fontSize: 16,
  },
  modalButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  modalButtonTextSecondary: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  warningText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 8,
    fontStyle: 'italic',
    color: colors.textMuted
  },
  modalCancelButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8
  },
  modalCancelText: {
    color: colors.textMuted,
    fontSize: 15
  }
});