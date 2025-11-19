import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Header from '../components/Header';
import OfflineBanner from '../components/OfflineBanner';
import { useTheme } from '../contexts/ThemeContext';
import { useOfflineGuard } from '../hooks/useOfflineGuard';
import { getFriendsOffline, getPendingRequestsOffline } from '../api/offlineApi';

export default function Amigos({ navigation }: any) {
    const { colors } = useTheme();
    const { isOnline, guardOnlineAction } = useOfflineGuard();

    const [friends, setFriends] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fromCache, setFromCache] = useState(false);

    const loadData = async (forceRefresh = false) => {
        if (forceRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const friendsResult = await getFriendsOffline();
            const pendingResult = await getPendingRequestsOffline();

            setFriends(friendsResult.data || []);
            setPendingRequests(pendingResult.data || []);
            setFromCache(friendsResult.fromCache || pendingResult.fromCache);
        } catch (error) {
            console.error('Error loading friends:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const unsubFocus = navigation.addListener('focus', () => {
            if (isOnline) loadData(true);
        });
        return unsubFocus;
    }, [navigation, isOnline]);

    const handleAddFriend = () => {
        guardOnlineAction(
            () => {
                Alert.alert('Info', 'Implementar modal de agregar amigo');
            },
            'Necesitas conexión para agregar amigos'
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <OfflineBanner />
            <Header navigation={navigation} variant="amigos" />

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
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{item.name || item.nombre}</Text>
                            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                                {item.groupsInCommon || 0} grupos en común
                            </Text>
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