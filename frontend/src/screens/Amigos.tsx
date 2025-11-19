import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, Image, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../components/Header';
import OfflineBanner from '../components/OfflineBanner';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentUser } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Share } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useOfflineGuard } from '../hooks/useOfflineGuard';
import { getFriendsOffline, getPendingRequestsOffline } from '../api/offlineApi';
import { useAmigos } from '../viewmodels/useAmigos';

export default function Amigos({ navigation }: any) {
    const { colors } = useTheme();
    const { isOnline, guardOnlineAction } = useOfflineGuard();

    const [friends, setFriends] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [myQrModalVisible, setMyQrModalVisible] = useState(false);
    const [myQrData, setMyQrData] = useState<string | null>(null);
    const [myQrImageUrl, setMyQrImageUrl] = useState<string | null>(null);
    const { user } = useAuth();

    // useAmigos provides online flows and helpers (add/invite/refresh)
    const amigosVM = useAmigos();
    const { friends: onlineFriends, loading: onlineLoading, refresh: refreshOnline, inviteByEmail, addFriend } = amigosVM;

    const loadData = async (forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            if (isOnline) {
                // prefer online viewmodel data when online
                const refreshed = await refreshOnline();
                setFriends(refreshed || amigosVM.friends || []);
                // pending requests come from the VM (use the hook's state)
                setPendingRequests(amigosVM.pendingRequests || []);
                setFromCache(false);
            } else {
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

    useEffect(() => {
        loadData();
        // prefer Firebase auth user for offline-ready QR
        if (user && user.uid) {
            const qr = `splitty:user:${user.uid}`;
            setMyQrData(qr);
            setMyQrImageUrl(null);
        } else {
            // fallback to backend user if auth not available
            (async () => {
                try {
                    const me = await getCurrentUser();
                    if (me && me.id) {
                        const qr = `splitty:user:${me.id}`;
                        setMyQrData(qr);
                        const img = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
                        setMyQrImageUrl(img);
                    }
                } catch (e) {
                    // ignore
                }
            })();
        }
    }, []);

    useEffect(() => {
        const unsubFocus = navigation.addListener('focus', () => {
            if (isOnline) loadData(true);
        });
        return unsubFocus;
    }, [navigation, isOnline]);

    const handleAddFriend = () => {
        // show modal with options (search by email / scan QR)
        if (!isOnline) {
            guardOnlineAction(() => {}, 'Necesitas conexión para agregar amigos');
            return;
        }
        setAddModalVisible(true);
    };

    const handleInviteByEmail = async () => {
        if (!searchEmail) return Alert.alert('Email vacío', 'Ingresá un email válido');
        try {
            await inviteByEmail(searchEmail);
            Alert.alert('Listo', 'Invitación enviada');
            setAddModalVisible(false);
            setSearchEmail('');
            // refresh lists
            const refreshed = await refreshOnline();
            setFriends(refreshed || amigosVM.friends || []);
        } catch (err: any) {
            const msg = err?.message || err?.response?.data?.error || 'Error';
            Alert.alert('Error', msg.toString());
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <OfflineBanner />
            <Header navigation={navigation} variant="amigos" />

            <Modal visible={addModalVisible} transparent animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <View style={{ backgroundColor: colors.modalBackground, padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Agregar amigo</Text>

                        <TextInput
                            placeholder="Buscar por email"
                            placeholderTextColor={colors.textMuted}
                            value={searchEmail}
                            onChangeText={setSearchEmail}
                            style={{ backgroundColor: colors.cardBackground, padding: 12, borderRadius: 8, color: colors.text, marginBottom: 8 }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' }}
                                onPress={handleInviteByEmail}
                            >
                                <Text style={{ color: colors.primaryText, fontWeight: '600' }}>Invitar amigo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: colors.cardBackground, padding: 12, borderRadius: 8, alignItems: 'center' }}
                                onPress={() => { setAddModalVisible(false); navigation.navigate('EscanearAmigo'); }}
                            >
                                <Text style={{ color: colors.text }}>Escanear QR</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => setAddModalVisible(false)} style={{ alignItems: 'center', padding: 8 }}>
                            <Text style={{ color: colors.textMuted }}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={myQrModalVisible} transparent animationType="fade" onRequestClose={() => setMyQrModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: colors.modalBackground, padding: 16, borderRadius: 12, alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Mi código QR</Text>
                        {myQrData ? (
                            <View style={{ marginBottom: 12, alignItems: 'center' }}>
                                <QRCode value={myQrData} size={220} />
                            </View>
                        ) : myQrImageUrl ? (
                            <Image source={{ uri: myQrImageUrl }} style={{ width: 260, height: 260, marginBottom: 12 }} />
                        ) : (
                            <View style={{ width: 260, height: 260, backgroundColor: colors.cardBackground, marginBottom: 12, borderRadius: 8 }} />
                        )}

                        <Text style={{ color: colors.textSecondary, marginBottom: 12, textAlign: 'center' }}>Mostrá este código para que te agreguen como amigo. También podés compartir o copiar tu código.</Text>

                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                            <TouchableOpacity
                                onPress={async () => {
                                    try {
                                        if (myQrData) {
                                            await ExpoClipboard.setStringAsync(myQrData);
                                            Alert.alert('Copiado', 'El código fue copiado al portapapeles');
                                        }
                                    } catch (e) {
                                        Alert.alert('Error', 'No se pudo copiar');
                                    }
                                }}
                                style={{ padding: 10, borderRadius: 8, backgroundColor: colors.cardBackground }}
                            >
                                <Text style={{ color: colors.text, fontWeight: '700' }}>Copiar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={async () => {
                                    try {
                                        if (myQrData) {
                                            await Share.share({ message: myQrData });
                                        }
                                    } catch (e) {
                                        Alert.alert('Error', 'No se pudo compartir');
                                    }
                                }}
                                style={{ padding: 10, borderRadius: 8, backgroundColor: colors.primary }}
                            >
                                <Text style={{ color: colors.primaryText, fontWeight: '700' }}>Compartir</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => setMyQrModalVisible(false)} style={{ padding: 12 }}>
                            <Text style={{ color: colors.primary, fontWeight: '700' }}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {fromCache && !loading && (
                <View style={{ 
                    backgroundColor: colors.successLight, 
                    padding: 8, 
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8
                }}>
                    <Feather name="database" size={14} color={colors.success} />
                    <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>
                        Datos guardados localmente
                    </Text>
                    {isOnline && (
                        <TouchableOpacity onPress={() => loadData(true)}>
                            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
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
                        onRefresh={() => isOnline ? loadData(true) : null}
                        enabled={isOnline}
                    />
                }
                ListHeaderComponent={
                    <View style={{ padding: 16 }}>
                        {pendingRequests.length > 0 && (
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 }}>
                                    Solicitudes recibidas ({pendingRequests.length})
                                </Text>
                                {pendingRequests.map((request: any) => (
                                    <View
                                        key={request.id}
                                        style={{
                                            backgroundColor: colors.modalBackground,
                                            padding: 12,
                                            borderRadius: 12,
                                            marginBottom: 8,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: '600', color: colors.text }}>
                                                {request.solicitanteNombre}
                                            </Text>
                                            <Text style={{ color: colors.textSecondary }}>
                                                {request.solicitanteCorreo}
                                            </Text>
                                        </View>
                                        {isOnline ? (
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                <TouchableOpacity
                                                    style={{
                                                        backgroundColor: colors.primary,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        borderRadius: 8
                                                    }}
                                                    onPress={() => {/* Aceptar */}}
                                                >
                                                    <Text style={{ color: colors.primaryText, fontSize: 12 }}>Aceptar</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={{
                                                        backgroundColor: colors.cardBackground,
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        borderRadius: 8
                                                    }}
                                                    onPress={() => {/* Rechazar */}}
                                                >
                                                    <Text style={{ color: colors.text, fontSize: 12 }}>Rechazar</Text>
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
                        )}

                        <TouchableOpacity
                            style={{
                                backgroundColor: isOnline ? colors.primary : colors.textMuted,
                                padding: 14,
                                borderRadius: 12,
                                marginBottom: 24,
                                opacity: isOnline ? 1 : 0.5,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                            }}
                            onPress={handleAddFriend}
                        >
                            <Feather name="user-plus" size={18} color={colors.primaryText} />
                            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
                                Agregar amigo
                            </Text>
                        </TouchableOpacity>

                        {/* My QR: show a small preview and allow opening full-screen */}
                        {(myQrData || myQrImageUrl) && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>Mi código QR</Text>
                                <TouchableOpacity onPress={() => setMyQrModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, padding: 12, borderRadius: 12 }}>
                                    {myQrData ? (
                                        <View style={{ width: 56, height: 56, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                                            <QRCode value={myQrData} size={56} />
                                        </View>
                                    ) : (
                                        <Image source={{ uri: myQrImageUrl }} style={{ width: 56, height: 56, marginRight: 12 }} />
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '700', color: colors.text }}>Mostrar mi QR</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Que otros puedan escanearme</Text>
                                    </View>
                                    <Feather name="chevron-right" size={20} color={colors.iconColor} />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={{ 
                            flexDirection: 'row', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: 12 
                        }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                                Mis amigos
                            </Text>
                            <View style={{
                                backgroundColor: colors.badgeBackground,
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 12
                            }}>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.badgeText }}>
                                    {friends.length} amigos
                                </Text>
                            </View>
                        </View>
                    </View>
                }
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={{
                        backgroundColor: colors.modalBackground,
                        marginHorizontal: 16,
                        marginBottom: 12,
                        padding: 14,
                        borderRadius: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            {item.foto_url ? (
                                <Image
                                    source={{ uri: item.foto_url }}
                                    style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                                />
                            ) : (
                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.emojiCircle, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                                    <Feather name="user" size={20} color={colors.primaryText} />
                                </View>
                            )}

                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{item.name || item.nombre}</Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                                    {item.groupsInCommon ?? 0} grupos en común
                                </Text>
                            </View>
                        </View>
                        <Feather name="chevron-right" size={20} color={colors.iconColor} />
                    </View>
                )}
                ListEmptyComponent={
                    <View style={{ padding: 32, alignItems: 'center' }}>
                        <Feather name="users" size={48} color={colors.textMuted} />
                        <Text style={{ color: colors.textMuted, marginTop: 16 }}>
                            {isOnline ? 'No tienes amigos aún' : 'Sin amigos guardados'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}