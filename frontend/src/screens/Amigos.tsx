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
    RefreshControl, // 🟢 Importante para recargar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Header from '../components/Header';
import { useAmigos } from '../viewmodels/useAmigos';

// 🔐 Ajustá este import según tu proyecto (ej. src/contexts/AuthContext)
import { useAuth } from '../contexts/AuthContext';

const PRIMARY = '#0A4930';
const BG = '#E6F4F1';
const CARD = '#FFFFFF';

export default function Amigos({ navigation }: any) {
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
        removeFriend, // 🟢 Función para eliminar
        refresh,      // 🟢 Función para recargar todo
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
        <View style={styles.container}>
            <Header navigation={navigation} variant="amigos" />

            {/* Estado de carga inicial (solo si no estamos refrescando) */}
            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                </View>
            ) : error ? (
                // Si hay error, permitimos refrescar para reintentar
                <ScrollView
                    contentContainerStyle={styles.center}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />
                    }
                >
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={onRefresh} style={{ marginTop: 12 }}>
                         <Text style={{ color: PRIMARY, fontWeight: 'bold' }}>Toca para reintentar</Text>
                    </TouchableOpacity>
                </ScrollView>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[PRIMARY]}
                            tintColor={PRIMARY}
                        />
                    }
                >
                    {/* SECCIÓN 1: Solicitudes Recibidas */}
                    {pendingLoading && !refreshing ? (
                        <View style={{ paddingVertical: 12 }}>
                            <ActivityIndicator color={PRIMARY} />
                        </View>
                    ) : (
                        pendingRequests.length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={styles.sectionTitle}>Solicitudes recibidas</Text>
                                {pendingRequests.map((s: any) => (
                                    <View key={s.id} style={styles.requestCard}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: '600' }}>
                                                {s.solicitanteNombre || 'Usuario'}
                                            </Text>
                                            <Text style={{ color: '#666' }}>
                                                {s.solicitanteCorreo || ''}
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity
                                                style={styles.acceptButton}
                                                onPress={() => acceptPending(s.id)}
                                            >
                                                <Text style={{ color: '#FFF' }}>Aceptar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.rejectButton}
                                                onPress={() => rejectPending(s.id)}
                                            >
                                                <Text style={{ color: '#333' }}>Rechazar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )
                    )}

                    {/* SECCIÓN 2: Botones de Acción */}
                    <TouchableOpacity
                        style={styles.primaryButton}
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
                        style={styles.secondaryButton}
                        onPress={() => setAddFriendVisible(true)}
                    >
                        <Ionicons
                            name="person-add-outline"
                            size={18}
                            color="#2E3D37"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.secondaryButtonText}>Agregar amigo</Text>
                    </TouchableOpacity>

                    {/* SECCIÓN 3: Lista de Amigos */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Mis amigos</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{friends.length} amigos</Text>
                        </View>
                    </View>

                    {friends.map((friend: any) => (
                        <View key={friend.id} style={styles.friendCard}>
                            <View style={styles.friendRow}>
                                <View style={styles.friendLeft}>
                                    <View style={styles.friendAvatarWrapper}>
                                        <View style={styles.avatarCircleSmall}>
                                            <Text style={styles.avatarInitialSmall}>
                                                {(friend.name || '?').charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        {friend.online && <View style={styles.onlineDot} />}
                                    </View>

                                    <View>
                                        <Text style={styles.friendName}>{friend.name}</Text>
                                        <Text style={styles.friendSubtitle}>
                                            {friend.groupsInCommon} grupo
                                            {friend.groupsInCommon !== 1 && 's'} en común
                                        </Text>
                                        {friend.groupsNames && friend.groupsNames.length > 0 && (
                                            <Text
                                                style={{
                                                    color: '#8A9A92',
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
                                    <Ionicons name="trash-outline" size={20} color="#A1A8AA" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    {friends.length === 0 && (
                        <Text style={styles.emptyFilteredText}>
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
                            <View style={styles.addFriendCard}>
                                <View style={styles.addFriendHeader}>
                                    <Text style={styles.addFriendTitle}>Agregar amigo</Text>
                                    <TouchableOpacity
                                        onPress={() => setAddFriendVisible(false)}
                                    >
                                        <Ionicons name="close" size={20} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.searchInputWrapper}>
                                    <Ionicons
                                        name="search"
                                        size={18}
                                        color="#A0A7A3"
                                        style={{ marginRight: 8 }}
                                    />
                                    <TextInput
                                        style={styles.searchInput}
                                        placeholder="Ingresar correo o ID del amigo..."
                                        placeholderTextColor="#A0A7A3"
                                        value={friendIdToAdd}
                                        onChangeText={setFriendIdToAdd}
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.addFriendButtonsRow}>
                                    <TouchableOpacity
                                        style={styles.scanButton}
                                        onPress={handleScanQR} // 🟢 CONECTADO AL ESCÁNER
                                    >
                                        <Ionicons
                                            name="qr-code-outline"
                                            size={18}
                                            color="#2E3D37"
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={styles.scanButtonText}>Escanear QR</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.confirmAddButton}
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
                            <View style={styles.qrCard}>
                                <View style={styles.qrHeader}>
                                    <Text style={styles.addFriendTitle}>Mi código QR</Text>
                                    <TouchableOpacity onPress={() => setMyQRVisible(false)}>
                                        <Ionicons name="close" size={20} color="#666" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.qrPlaceholder}>
                                    {qrValue ? (
                                        <QRCode value={qrValue} size={140} />
                                    ) : (
                                        <MaterialCommunityIcons
                                            name="qrcode"
                                            size={64}
                                            color="#A0A7A3"
                                        />
                                    )}
                                </View>

                                <Text style={styles.qrUserName}>
                                    {user?.displayName || user?.email || 'Tu Usuario'}
                                </Text>

                                <Text style={styles.qrHelpText}>
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
        backgroundColor: BG,
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
    errorText: {
        color: '#B00020',
    },
    emptyFilteredText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 16,
    },

    primaryButton: {
        backgroundColor: PRIMARY,
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
        backgroundColor: CARD,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    secondaryButtonText: {
        color: '#2E3D37',
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
        color: '#1E2B26',
    },
    badge: {
        backgroundColor: '#DDE8E2',
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    badgeText: {
        fontSize: 12,
        color: '#4C5A54',
    },

    friendCard: {
        backgroundColor: CARD,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
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
        backgroundColor: '#C5DAD1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitialSmall: {
        color: '#1E2B26',
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
        borderColor: CARD,
    },
    friendName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E2B26',
    },
    friendSubtitle: {
        fontSize: 13,
        color: '#5F6C68',
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
        backgroundColor: '#FFFFFF',
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
        color: '#1E2B26',
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D7E0DB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1E2B26',
    },
    addFriendButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    scanButton: {
        flex: 1,
        marginRight: 8,
        backgroundColor: '#F2F5F3',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanButtonText: {
        color: '#2E3D37',
        fontWeight: '500',
        fontSize: 14,
    },
    confirmAddButton: {
        flex: 1,
        marginLeft: 8,
        backgroundColor: '#5E7E71',
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
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#F3F5F4',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    qrUserName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E2B26',
        marginBottom: 4,
    },
    qrUserId: {
        fontSize: 14,
        color: '#5F6C68',
        marginBottom: 8,
    },
    qrHelpText: {
        fontSize: 13,
        color: '#7B8682',
        textAlign: 'center',
    },
    requestCard: {
        backgroundColor: CARD,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: PRIMARY,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectButton: {
        backgroundColor: '#F2F5F3',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
});