// frontend/src/screens/Inicio.tsx
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
import { useTheme } from '../contexts/ThemeContext';

export default function Inicio({ navigation }: any) {
    const { groups, loading, error, refresh } = useInicio();
    const { colors } = useTheme();
    const [optionsVisible, setOptionsVisible] = React.useState(false);

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
            {/* Ícono de personas en círculos */}
            <View style={styles.emptyIconContainer}>
                <View style={styles.emptyIcon}>
                    <View style={[styles.personCircle1, { backgroundColor: colors.emojiCircle }]} />
                    <View style={[styles.personCircle2, { backgroundColor: colors.emojiCircle, opacity: 0.7 }]} />
                    <View style={[styles.personCircle3, { backgroundColor: colors.emojiCircle, opacity: 0.5 }]} />
                </View>
            </View>

            {/* Título y descripción */}
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin grupos aún</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Todavía no sos parte de ningún grupo.{'\n'}
                Unite a uno existente o creá el tuyo propio.
            </Text>

            {/* Botones de acción */}
            <View style={styles.emptyButtonsContainer}>
                <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: colors.primary }]}
                    onPress={() => navigation.navigate('CrearGrupo')}
                >
                    <Text style={[styles.createButtonText, { color: colors.primaryText }]}>Crear Grupo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: colors.modalBackground, borderColor: colors.border }]}
                    onPress={() => navigation.navigate('UnirseGrupo')}
                >
                    <Text style={[styles.joinButtonText, { color: colors.text }]}>Unirse a un Grupo</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header navigation={navigation} balance={totalBalance} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
            ) : groups.length === 0 ? (
                renderEmpty()
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.groupsHeaderRow}>
                        <Text style={[styles.groupsHeaderTitle, { color: colors.text }]}>Tus grupos</Text>
                        <View style={[styles.groupsHeaderBadge, { backgroundColor: colors.badgeBackground }]}>
                            <Text style={[styles.groupsHeaderBadgeText, { color: colors.badgeText }]}>
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
                            const membersCount = item.miembrosCount ?? item.membersCount ?? item.miembros?.length ?? item.members?.length ?? 0;
                            const balance = item.saldo ?? item.balance ?? 0;
                            const balanceSign = Number(balance) > 0 ? '+' : Number(balance) < 0 ? '-' : '';
                            const balanceColor = Number(balance) > 0 ? '#0A8F4A' : Number(balance) < 0 ? '#D9534F' : '#666';

                            return (
                                <TouchableOpacity
                                    style={[styles.groupCard, { backgroundColor: colors.cardBackground }]}
                                    onPress={() =>
                                        navigation.navigate('Grupo', {
                                            grupoId: item.id,
                                            nombre: item.nombre || item.name,
                                            emoji: item.emoji,
                                        })
                                    }
                                >
                                    <View style={styles.groupLeft}>
                                        <View style={[styles.emojiCircle, { backgroundColor: colors.emojiCircle }]}>
                                            <Text style={styles.emojiText}>
                                                {item.emoji || '✈️'}
                                            </Text>
                                        </View>
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={[styles.groupName, { color: colors.text }]}>
                                                {item.nombre || item.name}
                                            </Text>
                                            <Text style={[styles.groupSubtitle, { color: colors.textSecondary }]}>
                                                {membersCount} miembros • {item.descripcion || 'Sin descripción'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.balanceContainer}>
                                        <Text style={[styles.balanceText, { color: balanceColor }]}>
                                            {balanceSign}${Math.abs(Number(balance)).toFixed(2)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            )}

            {/* Floating + button */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => setOptionsVisible(true)}
            >
                <Text style={{ color: colors.primaryText, fontSize: 28 }}>+</Text>
            </TouchableOpacity>

            {/* Options bottom modal */}
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
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={() => {
                                    setOptionsVisible(false);
                                    navigation.navigate('CrearGrupo');
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.primaryText }]}>Crear Grupo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.borderLight }]}
                                onPress={() => {
                                    setOptionsVisible(false);
                                    navigation.navigate('UnirseGrupo');
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.text }]}>
                                    Unirse a un Grupo
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ marginTop: 12, alignItems: 'center' }}
                                onPress={() => setOptionsVisible(false)}
                            >
                                <Text style={{ color: colors.textMuted }}>Cancelar</Text>
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

    // Empty state styles
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 100,
    },
    emptyIconContainer: {
        marginBottom: 32,
    },
    emptyIcon: {
        width: 120,
        height: 120,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    personCircle1: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#C5DAD1',
        top: 10,
        left: 10,
    },
    personCircle2: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#9DBFAF',
        top: 10,
        right: 10,
    },
    personCircle3: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#7DA696',
        bottom: 10,
        left: 36,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#182321',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#5F6C68',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
    },
    emptyButtonsContainer: {
        width: '100%',
        gap: 12,
    },
    createButton: {
        backgroundColor: '#033E30',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        width: '100%',
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    joinButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        width: '100%',
        borderWidth: 1,
        borderColor: '#D7E0DB',
    },
    joinButtonText: {
        color: '#033E30',
        fontSize: 16,
        fontWeight: '600',
    },

    // Groups header
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

    // Group cards
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
        fontSize: 13,
    },
    balanceContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    balanceText: { fontSize: 16, fontWeight: '700' },

    // Floating button
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },

    // Modal styles
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
});