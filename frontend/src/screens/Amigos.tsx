import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    TextInput,
    ActivityIndicator,
    Alert,
    RefreshControl, // Importante para recargar
    Image, // 🟢 Importamos Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Header from '../components/Header';
import { useAmigos } from '../viewmodels/useAmigos';

// 🔐 Ajustá este import según tu proyecto (ej. src/contexts/AuthContext)
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const Amigos = ({ navigation }: any) => {
    const { colors } = useTheme();

    const {
        friends,
        loading,
        error,
        addFriend,
        inviteByEmail,
        pendingRequests,
        pendingLoading,
        acceptPending,
        rejectPending,
        removeFriend,
        refresh,
    } = useAmigos();

    // Usuario logueado
    const { user } = useAuth();
    // El formato del QR para que otros lo escaneen (ej: splitty:user:UID)
    const qrValue = user ? `splitty:user:${user.uid}` : '';

    // Estados locales
    const [addFriendVisible, setAddFriendVisible] = useState(false);
    const [myQRVisible, setMyQRVisible] = useState(false);
    const [friendIdToAdd, setFriendIdToAdd] = useState('');
    const [refreshing, setRefreshing] = useState(false); // Estado para el pull-to-refresh

    // 🟢 Lógica de Refresco (Pull to Refresh)
    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await refresh();
        } catch (e) {
            console.error(e);
        } finally {
            setRefreshing(false);
        }
    };

    // 🟢 Ir a la pantalla del escáner
    const handleScanQR = () => {
        setAddFriendVisible(false); // Cerramos el modal actual
        navigation.navigate('EscanearAmigo'); // Navegamos a la cámara
    };

    // Lógica para agregar manual (por ID o Email)
    const handleAddFriend = async () => {
        const id = friendIdToAdd.trim();
        if (!id) {
            Alert.alert('Atención', 'Ingresá el ID o correo del amigo primero.');
            return;
        }

        try {
            // Si tiene arroba, asumimos que es email
            if (id.includes('@')) {
                await inviteByEmail(id);
            } else {
                await addFriend(id);
            }

            setFriendIdToAdd('');
            setAddFriendVisible(false);
            Alert.alert('Listo', 'Solicitud enviada correctamente');
        } catch (err: any) {
            console.error('Error al invitar/agregar amigo', err);

            const msgCode = err?.response?.data?.error || err?.message || String(err);
            let backendMsg = 'No se pudo agregar el amigo. Verificá el dato ingresado.';

            if (msgCode === 'USER_NOT_FOUND' || msgCode === 'NOT_FOUND') {
                backendMsg = 'No se encontró un usuario con ese correo/ID.';
            } else if (msgCode === 'ALREADY_FRIENDS') {
                backendMsg = 'Ya son amigos.';
            } else if (msgCode === 'PENDING_REQUEST_EXISTS') {
                backendMsg = 'Ya existe una solicitud pendiente.';
            } else if (msgCode === 'CANNOT_REQUEST_SELF') {
                backendMsg = 'No podés auto-invitarte.';
            }

            Alert.alert('Error', backendMsg);
        }
    };

    // 🟢 Confirmar eliminación de amigo
    const confirmDeleteFriend = (friend: any) => {
        Alert.alert(
            'Eliminar amigo',
            `¿Estás seguro de eliminar a ${friend.name}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeFriend(friend.id);
                        } catch (e) {
                            Alert.alert('Error', 'No se pudo eliminar al amigo.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header navigation={navigation} variant="amigos" />

            {/* Estado de carga inicial (solo si no estamos refrescando) */}
            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error ? (
                <ScrollView
                    contentContainerStyle={styles.center}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                >
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    <TouchableOpacity onPress={onRefresh} style={{ marginTop: 12 }}>
                         <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Toca para reintentar</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary]}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {/* SECCIÓN 1: Solicitudes Recibidas */}
                    {pendingLoading && !refreshing ? (
                        <View style={{ paddingVertical: 12 }}>
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : (
                        pendingRequests.length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Solicitudes recibidas</Text>
                                {pendingRequests.map((s: any) => (
                                    <View key={s.id} style={[styles.requestCard, { backgroundColor: colors.modalBackground, borderColor: colors.borderLight }]}>
                                        {/* 🟢 LÓGICA DE FOTO PARA SOLICITUDES */}
                                        <View style={styles.friendAvatarWrapper}>
                                            {s.solicitanteFotoUrl ? (
                                                <Image
                                                    source={{ uri: s.solicitanteFotoUrl }}
                                                    style={[styles.avatarImage, { backgroundColor: colors.borderLight }]}
                                                />
                                            ) : (
                                                <View style={[styles.avatarCircleSmall, { backgroundColor: colors.emojiCircle }]}>
                                                    <Text style={[styles.avatarInitialSmall, { color: colors.text }]}>
                                                        {(s.solicitanteNombre || '?').charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: '600', color: colors.text }}>
                                                {s.solicitanteNombre || 'Usuario'}
                                            </Text>
                                            <Text style={{ color: colors.textSecondary }}>
                                                {s.solicitanteCorreo || ''}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity
                                                style={[styles.acceptButton, { backgroundColor: colors.primary }]}
                                                onPress={() => acceptPending(s.id)}
                                            >
                                                <Text style={{ color: '#FFF' }}>Aceptar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.rejectButton, { backgroundColor: colors.cardBackground }]}
                                                onPress={() => rejectPending(s.id)}
                                            >
                                                <Text style={{ color: colors.text }}>Rechazar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )
                    )}

                    {/* SECCIÓN 2: Botones de Acción */}
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                        onPress={() => setMyQRVisible(true)}
                    >
                        <MaterialCommunityIcons
                            name="qrcode"
                            size={20}
                            color="#FFFFFF"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.primaryButtonText}>Mi código QR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, { backgroundColor: colors.modalBackground, borderColor: colors.borderLight }]}
                        onPress={() => setAddFriendVisible(true)}
                    >
                        <Ionicons
                            name="person-add-outline"
                            size={18}
                            color={colors.text}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Agregar amigo</Text>
                    </TouchableOpacity>

                    {/* SECCIÓN 3: Lista de Amigos */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Mis amigos</Text>
                        <View style={[styles.badge, { backgroundColor: colors.badgeBackground }]}>
                            <Text style={[styles.badgeText, { color: colors.badgeText }]}>{friends.length} amigos</Text>
                        </View>
                    </View>

                    {friends.map((friend: any) => (
                        <View key={friend.id} style={[styles.friendCard, { backgroundColor: colors.modalBackground, borderColor: colors.borderLight }]}>
                            <View style={styles.friendRow}>
                                <View style={styles.friendLeft}>
                                    <View style={styles.friendAvatarWrapper}>
                                        {/* 🟢 LÓGICA CONDICIONAL PARA FOTO O INICIAL */}
                                        {friend.foto_url ? (
                                            <Image
                                                source={{ uri: friend.foto_url }}
                                                style={[styles.avatarImage, { backgroundColor: colors.borderLight }]}
                                            />
                                        ) : (
                                            <View style={[styles.avatarCircleSmall, { backgroundColor: colors.emojiCircle }]}>
                                                <Text style={[styles.avatarInitialSmall, { color: colors.text }]}>
                                                    {(friend.name || '?').charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        {friend.online && <View style={styles.onlineDot} />}
                                    </View>

                                    <View>
                                        <Text style={[styles.friendName, { color: colors.text }]}>{friend.name}</Text>
                                        <Text style={[styles.friendSubtitle, { color: colors.textSecondary }]}>
                                            {friend.groupsInCommon} grupo
                                            {friend.groupsInCommon !== 1 && 's'} en común
                                        </Text>
                                        {friend.groupsNames && friend.groupsNames.length > 0 && (
                                            <Text
                                                style={{
                                                    color: colors.textMuted,
                                                    marginTop: 4,
                                                    fontSize: 12,
                                                }}
                                            >
                                                {friend.groupsNames.join(', ')}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Botón Eliminar */}
                                <TouchableOpacity onPress={() => confirmDeleteFriend(friend)} style={{ padding: 8 }}>
                                    <Ionicons name="trash-outline" size={20} color={colors.iconColor} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    {friends.length === 0 && (
                        <Text style={[styles.emptyFilteredText, { color: colors.textMuted }]}>
                            Todavía no tenés amigos agregados.
                        </Text>
                    )}
                </ScrollView>
            )}

            {/* MODAL: Agregar amigo */}
            <Modal
                visible={addFriendVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setAddFriendVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setAddFriendVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.addFriendCard, { backgroundColor: colors.modalBackground }]}>
                                <View style={styles.addFriendHeader}>
                                    <Text style={[styles.addFriendTitle, { color: colors.text }]}>Agregar amigo</Text>
                                    <TouchableOpacity
                                        onPress={() => setAddFriendVisible(false)}
                                    >
                                        <Ionicons name="close" size={20} color={colors.iconColor} />
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.searchInputWrapper, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                                    <Ionicons
                                        name="search"
                                        size={18}
                                        color={colors.iconColor}
                                        style={{ marginRight: 8 }}
                                    />
                                    <TextInput
                                        style={[styles.searchInput, { color: colors.text }]}
                                        placeholder="Ingresar correo o ID del amigo..."
                                        placeholderTextColor={colors.textMuted}
                                        value={friendIdToAdd}
                                        onChangeText={setFriendIdToAdd}
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.addFriendButtonsRow}>
                                    <TouchableOpacity
                                        style={[styles.scanButton, { backgroundColor: colors.cardBackground }]}
                                        onPress={handleScanQR} // 🟢 CONECTADO AL ESCÁNER
                                    >
                                        <Ionicons
                                            name="qr-code-outline"
                                            size={18}
                                            color={colors.text}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={[styles.scanButtonText, { color: colors.text }]}>Escanear QR</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.confirmAddButton, { backgroundColor: colors.primary }]}
                                        onPress={handleAddFriend}
                                    >
                                        <Text style={styles.confirmAddButtonText}>Agregar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* MODAL: Mi código QR */}
            <Modal
                visible={myQRVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMyQRVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setMyQRVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.qrCard, { backgroundColor: colors.modalBackground }]}>
                                <View style={styles.qrHeader}>
                                    <Text style={[styles.addFriendTitle, { color: colors.text }]}>Mi código QR</Text>
                                    <TouchableOpacity onPress={() => setMyQRVisible(false)}>
                                        <Ionicons name="close" size={20} color={colors.iconColor} />
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.qrPlaceholder, { backgroundColor: colors.cardBackground }]}>
                                    {qrValue ? (
                                        <QRCode value={qrValue} size={140} />
                                    ) : (
                                        <MaterialCommunityIcons
                                            name="qrcode"
                                            size={64}
                                            color={colors.iconColor}
                                        />
                                    )}
                                </View>

                                <Text style={[styles.qrUserName, { color: colors.text }]}>
                                    {user?.displayName || user?.email || 'Tu Usuario'}
                                </Text>

                                <Text style={[styles.qrHelpText, { color: colors.textSecondary }]}>
                                    Comparte este código para que otros puedan agregarte como
                                    amigo
                                </Text>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {},
    emptyFilteredText: {
        textAlign: 'center',
        marginTop: 16,
    },

    primaryButton: {
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    badge: {
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    badgeText: {
        fontSize: 12,
    },

    friendCard: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    friendRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    friendLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    friendAvatarWrapper: {
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarCircleSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // 🟢 NUEVO ESTILO PARA LA IMAGEN
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarInitialSmall: {
        fontWeight: '700',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#1ECD4E',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    friendName: {
        fontSize: 15,
        fontWeight: '600',
    },
    friendSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    addFriendCard: {
        width: '100%',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    addFriendHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    addFriendTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
    },
    addFriendButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    scanButton: {
        flex: 1,
        marginRight: 8,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanButtonText: {
        fontWeight: '500',
        fontSize: 14,
    },
    confirmAddButton: {
        flex: 1,
        marginLeft: 8,
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmAddButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },

    qrCard: {
        width: '100%',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 20,
        alignItems: 'center',
    },
    qrHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignSelf: 'stretch',
        alignItems: 'center',
        marginBottom: 16,
    },
    qrPlaceholder: {
        width: 160,
        height: 160,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    qrUserName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    qrHelpText: {
        fontSize: 13,
        textAlign: 'center',
    },
    requestCard: {
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    acceptButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default Amigos;