// screens/Amigos.tsx
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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import { useAmigos } from '../viewmodels/useAmigos';

const PRIMARY = '#0A4930';
const BG = '#E6F4F1';
const CARD = '#FFFFFF';

export default function Amigos({ navigation }: any) {
    const { friends, loading, error, addFriend } = useAmigos();

    const [addFriendVisible, setAddFriendVisible] = useState(false);
    const [myQRVisible, setMyQRVisible] = useState(false);
    const [friendIdToAdd, setFriendIdToAdd] = useState('');

    const handleAddFriend = async () => {
        const id = friendIdToAdd.trim();
        if (!id) {
            Alert.alert('Atención', 'Ingresá el ID del amigo primero.');
            return;
        }

        try {
            await addFriend(id);
            setFriendIdToAdd('');
            setAddFriendVisible(false);
            // si querés, podés sumar un toast o Alert de éxito
            // Alert.alert('Listo', 'Amigo agregado correctamente');
        } catch (err: any) {
            console.error(err);
            const backendMsg =
                'No se pudo agregar el amigo. Verificá el ID.';

            Alert.alert('Error', backendMsg);
        }
    };


    return (
        <View style={styles.container}>
            <Header navigation={navigation} variant="amigos" />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={PRIMARY} />
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Botón "Mi código QR" */}
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

                    {/* Botón "Agregar amigo" */}
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

                    {/* Cabecera de lista */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Mis amigos</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{friends.length} amigos</Text>
                        </View>
                    </View>

                    {/* Lista de amigos */}
                    {friends.map(friend => (
                        <View key={friend.id} style={styles.friendCard}>
                            <View style={styles.friendRow}>
                                <View style={styles.friendLeft}>
                                    <View style={styles.friendAvatarWrapper}>
                                        <View style={styles.avatarCircleSmall}>
                                            <Text style={styles.avatarInitialSmall}>
                                                {(friend.name || '?').charAt(0)}
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
                                    </View>
                                </View>

                                <TouchableOpacity>
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
                                    <TouchableOpacity onPress={() => setAddFriendVisible(false)}>
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
                                        placeholder="Ingresar ID del amigo..."
                                        placeholderTextColor="#A0A7A3"
                                        value={friendIdToAdd}
                                        onChangeText={setFriendIdToAdd}
                                    />
                                </View>

                                <View style={styles.addFriendButtonsRow}>
                                    <TouchableOpacity style={styles.scanButton}>
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
                                    <MaterialCommunityIcons
                                        name="qrcode"
                                        size={64}
                                        color="#A0A7A3"
                                    />
                                </View>

                                <Text style={styles.qrUserName}>Tu Usuario</Text>
                                <Text style={styles.qrUserId}>ID: #TU123456</Text>
                                <Text style={styles.qrHelpText}>
                                    Comparte este código para que otros puedan agregarte como amigo
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
});
