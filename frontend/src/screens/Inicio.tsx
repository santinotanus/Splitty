import React, { useEffect, useMemo } from 'react';
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
import Header from '../components/Header';
import { useInicio } from '../viewmodels/useInicio';

export default function Inicio({ navigation }: any) {
    const { groups, loading, error, refresh } = useInicio();
    const [optionsVisible, setOptionsVisible] = React.useState(false);

    // Calculate total balance from all groups
    const totalBalance = useMemo(() => {
        return groups.reduce((sum, group) => {
            const balance = group.saldo ?? group.balance ?? 0;
            return sum + Number(balance);
        }, 0);
    }, [groups]);

    useEffect(() => {
        const unsubFocus = navigation.addListener('focus', () => refresh());
        const unsubBlur = navigation.addListener('blur', () => setOptionsVisible(false));
        return () => {
            unsubFocus();
            unsubBlur();
        };
    }, [navigation, refresh]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Sin grupos aún</Text>
            <Text style={styles.emptySubtitle}>
                Todavía no sos parte de ningún grupo. Unite a uno existente o creá el tuyo propio.
            </Text>
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
                        <>
                            {/* Tus grupos + cantidad activos */}
                            <View style={styles.groupsHeaderRow}>
                                <Text style={styles.groupsHeaderTitle}>Tus grupos</Text>
                                <View style={styles.groupsHeaderBadge}>
                                    <Text style={styles.groupsHeaderBadgeText}>
                                        {groups.length} activo{groups.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>

                            <FlatList
                                data={groups}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={{
                                    paddingHorizontal: 16,
                                    paddingTop: 8,
                                    paddingBottom: 24,
                                }}
                                renderItem={({ item }) => {
                                    const membersCount =

                                        item.miembrosCount ??          // si lo mapea el viewmodel
                                        item.membersCount ??           // otro nombre posible
                                        item.miembros?.length ??
                                        item.members?.length ??
                                        0;


                                       // item.miembros?.length || item.members?.length || 0;
                                    const balance = item.saldo ?? item.balance ?? 0;
                                    const balanceSign =
                                        Number(balance) > 0 ? '+' : Number(balance) < 0 ? '-' : '';
                                    const balanceColor =
                                        Number(balance) > 0
                                            ? '#0A8F4A'
                                            : Number(balance) < 0
                                                ? '#D9534F'
                                                : '#666';

                                    return (
                                        <TouchableOpacity
                                            style={styles.groupCard}
                                            onPress={() =>
                                                navigation.navigate('Grupo', {
                                                    grupoId: item.id,
                                                    nombre: item.nombre || item.name,
                                                    emoji: item.emoji,
                                                })
                                            }
                                        >
                                            <View style={styles.groupLeft}>
                                                <View style={styles.emojiCircle}>
                                                    <Text style={styles.emojiText}>
                                                        {item.emoji || '✈️'}
                                                    </Text>
                                                </View>
                                                <View style={{ marginLeft: 12, flex: 1 }}>
                                                    <Text style={styles.groupName}>
                                                        {item.nombre || item.name}
                                                    </Text>
                                                    <Text style={styles.groupSubtitle}>
                                                        {membersCount} miembros •{' '}
                                                        {item.descripcion || 'Sin descripción'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.balanceContainer}>
                                                <Text
                                                    style={[
                                                        styles.balanceText,
                                                        { color: balanceColor },
                                                    ]}
                                                >
                                                    {balanceSign}$
                                                    {Math.abs(Number(balance)).toFixed(2)}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </>
                    )}
                </View>
            )}

            {/* Floating + button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setOptionsVisible(true)}
            >
                <Text style={{ color: '#fff', fontSize: 28 }}>+</Text>
            </TouchableOpacity>

            {/* Options bottom modal */}
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
                                style={styles.modalButton}
                                onPress={() => {
                                    setOptionsVisible(false);
                                    navigation.navigate('CrearGrupo');
                                }}
                            >
                                <Text style={styles.modalButtonText}>Crear Grupo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6eee9' },
                                ]}
                                onPress={() => {
                                    setOptionsVisible(false);
                                    navigation.navigate('UnirseGrupo');
                                }}
                            >
                                <Text
                                    style={[styles.modalButtonText, { color: '#033E30' }]}
                                >
                                    Unirse a un Grupo
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ marginTop: 12, alignItems: 'center' }}
                                onPress={() => setOptionsVisible(false)}
                            >
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

    // ----- NUEVO: header "Tus grupos" -----
    groupsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    groupsHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#033E30',
    },
    groupsHeaderBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#E0F2E9',
    },
    groupsHeaderBadgeText: {
        fontSize: 12,
        color: '#033E30',
        fontWeight: '600',
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
        flexDirection: 'row',
        justifyContent: 'space-between',
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
    groupName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#033E30',
    },
    groupSubtitle: {
        color: '#666',
        marginTop: 6,
    },
    balanceContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    balanceText: { fontSize: 16, fontWeight: '700' },
});
