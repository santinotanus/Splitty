import React, { useState, useEffect } from 'react';
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
    RefreshControl,
    Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { Share } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import Header from '../components/Header';
import OfflineBanner from '../components/OfflineBanner';
import { useAmigos } from '../viewmodels/useAmigos';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOfflineGuard } from '../hooks/useOfflineGuard';
import { getFriendsOffline, getPendingRequestsOffline } from '../api/offlineApi';
import { getCurrentUser } from '../api/client';

const Amigos = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isOnline, guardOnlineAction } = useOfflineGuard();

    const {
        friends: onlineFriends,
        loading: onlineLoading,
        error,
        addFriend,
        inviteByEmail,
        pendingRequests: onlinePendingRequests,
        pendingLoading,
        acceptPending,
        rejectPending,
        removeFriend,
        refresh: refreshOnline,
    } = useAmigos();

    const { user } = useAuth();

    // Estados locales
    const [friends, setFriends] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [fromCache, setFromCache] = useState(false);

    const [addFriendVisible, setAddFriendVisible] = useState(false);
    const [myQRVisible, setMyQRVisible] = useState(false);
    const [friendIdToAdd, setFriendIdToAdd] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // QR data
    const qrValue = user ? `splitty:user:${user.uid}` : '';
    const [myQrImageUrl, setMyQrImageUrl] = useState<string | null>(null);

    // Función para cargar datos (online u offline)
    const loadData = async (forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            if (isOnline) {
                // Usar datos online del viewmodel
                const refreshed = await refreshOnline();
                setFriends(refreshed || onlineFriends || []);
                setPendingRequests(onlinePendingRequests || []);
                setFromCache(false);
            } else {
                // Cargar datos offline
                const friendsResult = await getFriendsOffline();
                const pendingResult = await getPendingRequestsOffline();

                setFriends(friendsResult.data || []);
                setPendingRequests(pendingResult.data || []);
                setFromCache(friendsResult.fromCache || pendingResult.fromCache);
            }
        } catch (error) {
            console.error('Error loading friends:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Cargar datos al montar
    useEffect(() => {
        loadData();

        // Configurar QR fallback
        if (user && user.uid) {
            // Ya tenemos el QR en qrValue
        } else {
            (async () => {
                try {
                    const me = await getCurrentUser();
                    if (me && me.id) {
                        const img = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`splitty:user:${me.id}`)}`;
                        setMyQrImageUrl(img);
                    }
                } catch (e) {
                    // ignore
                }
            })();
        }
    }, []);

    // Recargar al volver a la pantalla si estamos online
    useEffect(() => {
        const unsubFocus = navigation.addListener('focus', () => {
            if (isOnline) loadData(true);
        });
        return unsubFocus;
    }, [navigation, isOnline]);

    // Función de refresco (Pull to Refresh)
    const onRefresh = async () => {
        if (isOnline) {
            await loadData(true);
        }
    };

    // Ir a la pantalla del escáner
    const handleScanQR = () => {
        if (!isOnline) {
            guardOnlineAction(() => {}, 'Necesitas conexión para escanear QR');
            return;
        }
        setAddFriendVisible(false);
        navigation.navigate('EscanearAmigo');
    };

    // Lógica para agregar manual (por ID o Email)
    const handleAddFriend = async () => {
        if (!isOnline) {
            guardOnlineAction(() => {}, 'Necesitas conexión para agregar amigos');
            return;
        }

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

            // Recargar lista
            await loadData(true);
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

    // Confirmar eliminación de amigo
    const confirmDeleteFriend = (friend: any) => {
        if (!isOnline) {
            guardOnlineAction(() => {}, 'Necesitas conexión para eliminar amigos');
            return;
        }

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
                            await loadData(true);
                        } catch (e) {
                            Alert.alert('Error', 'No se pudo eliminar al amigo.');
                        }
                    }
                }
            ]
        );
    };

    // Aceptar solicitud
    const handleAcceptPending = async (requestId: string) => {
        if (!isOnline) {
            guardOnlineAction(() => {}, 'Necesitas conexión para aceptar solicitudes');
            return;
        }
        try {
            await acceptPending(requestId);
            await loadData(true);
        } catch (e) {
            Alert.alert('Error', 'No se pudo aceptar la solicitud.');
        }
    };

    // Rechazar solicitud
    const handleRejectPending = async (requestId: string) => {
        if (!isOnline) {
            guardOnlineAction(() => {}, 'Necesitas conexión para rechazar solicitudes');
            return;
        }
        try {
            await rejectPending(requestId);
            await loadData(true);
        } catch (e) {
            Alert.alert('Error', 'No se pudo rechazar la solicitud.');
        }
    };

    // Copiar código QR
    const handleCopyQR = async () => {
        try {
            if (qrValue) {
                await ExpoClipboard.setStringAsync(qrValue);
                Alert.alert('Copiado', 'El código fue copiado al portapapeles');
            }
        } catch (e) {
            Alert.alert('Error', 'No se pudo copiar');
        }
    };

    // Compartir código QR
    const handleShareQR = async () => {
        try {
            if (qrValue) {
                await Share.share({ message: qrValue });
            }
        } catch (e) {
            Alert.alert('Error', 'No se pudo compartir');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Banner offline */}
            <OfflineBanner />

            <Header navigation={navigation} variant="amigos" />

            {/* Banner de caché cuando hay datos offline */}
            {fromCache && !loading && (
                <View style={[styles.cacheBanner, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="cloud-offline-outline" size={14} color={colors.success} />
                    <Text style={[styles.cacheBannerText, { color: colors.success }]}>
                        Datos guardados localmente
                    </Text>
                    {isOnline && (
                        <TouchableOpacity onPress={() => loadData(true)}>
                            <Text style={[styles.cacheBannerButton, { color: colors.primary }]}>
                                Actualizar
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Estado de carga inicial (solo si no estamos refrescando) */}
            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error && isOnline ? (
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
                            enabled={isOnline}
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

                                        {isOnline ? (
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                <TouchableOpacity
                                                    style={[styles.acceptButton, { backgroundColor: colors.primary }]}
                                                    onPress={() => handleAcceptPending(s.id)}
                                                >
                                                    <Text style={{ color: '#FFF' }}>Aceptar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.rejectButton, { backgroundColor: colors.cardBackground }]}
                                                    onPress={() => handleRejectPending(s.id)}
                                                >
                                                    <Text style={{ color: colors.text }}>Rechazar</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <Text style={{ fontSize: 10, color: colors.textMuted }}>
                                                (offline)
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )
                    )}

                    {/* SECCIÓN 2: Botones de Acción */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            {
                                backgroundColor: isOnline ? colors.primary : colors.textMuted,
                                opacity: isOnline ? 1 : 0.5
                            }
                        ]}
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
                        style={[
                            styles.secondaryButton,
                            {
                                backgroundColor: colors.modalBackground,
                                borderColor: colors.borderLight,
                                opacity: isOnline ? 1 : 0.5
                            }
                        ]}
                        onPress={() => {
                            if (!isOnline) {
                                guardOnlineAction(() => {}, 'Necesitas conexión para agregar amigos');
                                return;
                            }
                            setAddFriendVisible(true);
                        }}
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
                                <TouchableOpacity
                                    onPress={() => confirmDeleteFriend(friend)}
                                    style={{ padding: 8 }}
                                    disabled={!isOnline}
                                >
                                    <Ionicons
                                        name="trash-outline"
                                        size={20}
                                        color={isOnline ? colors.iconColor : colors.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}

                    {friends.length === 0 && (
                        <Text style={[styles.emptyFilteredText, { color: colors.textMuted }]}>
                            {isOnline ? 'Todavía no tenés amigos agregados.' : 'Sin amigos guardados'}
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
                                        onPress={handleScanQR}
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
                                    ) : myQrImageUrl ? (
                                        <Image source={{ uri: myQrImageUrl }} style={{ width: 140, height: 140 }} />
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
                                    Comparte este código para que otros puedan agregarte como amigo
                                </Text>

                                {/* Botones Copiar y Compartir */}
                                <View style={styles.qrButtonsRow}>
                                    <TouchableOpacity
                                        onPress={handleCopyQR}
                                        style={[styles.qrActionButton, { backgroundColor: colors.cardBackground }]}
                                    >
                                        <Ionicons name="copy-outline" size={18} color={colors.text} style={{ marginRight: 6 }} />
                                        <Text style={[styles.qrActionButtonText, { color: colors.text }]}>Copiar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleShareQR}
                                        style={[styles.qrActionButton, { backgroundColor: colors.primary }]}
                                    >
                                        <Ionicons name="share-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                        <Text style={[styles.qrActionButtonText, { color: '#FFF' }]}>Compartir</Text>
                                    </TouchableOpacity>
                                </View>
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
    cacheBanner: {
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
        justifyContent: 'center',
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
        justifyContent: 'center',
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
        marginBottom: 16,
    },
    qrButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    qrActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    qrActionButtonText: {
        fontWeight: '600',
        fontSize: 14,
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