import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
    navigation: any;
    balance?: number;                 // usado en modo "inicio"
    variant?: 'inicio' | 'amigos';    // nuevo: modo de header
}

export default function Header({
                                   navigation,
                                   balance = 0,
                                   variant = 'inicio',
                               }: HeaderProps) {
    const { user } = useAuth();
    const { profileImage, loadProfileImage } = useProfile();
    const { theme, toggleTheme, colors } = useTheme();
    const insets = useSafeAreaInsets();

    const balanceFormatted = Math.abs(balance).toFixed(2);
    const balanceSign = balance > 0 ? '+' : balance < 0 ? '-' : '';
    const balanceColor = balance > 0 ? '#0A8F4A' : balance < 0 ? '#D9534F' : '#666';
    const isPositive = balance > 0;

    const isInicio = variant === 'inicio';
    const isAmigos = variant === 'amigos';

    useEffect(() => {
        if (user?.uid) {
            loadProfileImage(user.uid);
        }
    }, [user?.uid, loadProfileImage]);

    return (
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.headerBackground }]}>
            {/* Zona izquierda: cambia según el modo */}
            <View style={styles.balanceSection}>
                {isInicio && (
                    <>
                        <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>Tu balance</Text>
                        <View style={styles.balanceRow}>
                            <Text style={[styles.balanceAmount, { color: balanceColor }]}>
                                {balanceSign}${balanceFormatted}
                            </Text>
                            {isPositive && (
                                <View style={[styles.balanceBadge, { backgroundColor: colors.balanceBadgeBackground }]}>
                                    <Text style={[styles.balanceBadgeText, { color: colors.balanceBadgeText }]}>A favor</Text>
                                </View>
                            )}
                        </View>
                    </>
                )}

                {isAmigos && (
                    <>
                        <Text style={[styles.screenTitle, { color: colors.text }]}>Amigos</Text>
                        <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>Gestiona tus contactos</Text>
                    </>
                )}
            </View>

            {/* Zona derecha: sol + avatar (común a todos los modos) */}
            <View style={styles.rightSection}>
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={toggleTheme}
                >
                    <Feather 
                        name={theme === 'light' ? 'sun' : 'moon'} 
                        size={20} 
                        color={colors.iconColor} 
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        try {
                            let rootNav = navigation;
                            while (rootNav?.getParent()) {
                                rootNav = rootNav.getParent();
                            }

                            rootNav?.dispatch(
                                CommonActions.navigate({
                                    name: 'PantallaPerfil',
                                })
                            );
                        } catch (error) {
                            console.error('Navigation error:', error);
                            try {
                                navigation.getParent()?.getParent()?.navigate('PantallaPerfil');
                            } catch {
                                navigation.getParent()?.navigate('PantallaPerfil');
                            }
                        }
                    }}
                    style={styles.profileButton}
                >
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: '#E6F4F1',
    },
    // Contenedor izquierdo (antes era sólo para balance, ahora sirve para ambos modos)
    balanceSection: {
        flex: 1,
    },

    // MODO INICIO
    balanceLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    balanceAmount: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0A8F4A',
    },
    balanceBadge: {
        backgroundColor: '#DFF4EA',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    balanceBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0A8F4A',
    },

    // MODO AMIGOS
    screenTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#182321',
    },
    screenSubtitle: {
        fontSize: 14,
        color: '#5F6C68',
        marginTop: 4,
    },

    // Zona derecha (común)
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 8,
    },
    profileButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#fff',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
});
