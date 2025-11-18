// frontend/src/navigation/MainTabs.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

import Inicio from '../screens/Inicio';
import Gastos from '../screens/Gastos';
import Amigos from '../screens/Amigos';

const InicioStackNav = createNativeStackNavigator();
const GastosStackNav = createNativeStackNavigator();
const AmigosStackNav = createNativeStackNavigator();

function InicioStack() {
    return (
        <InicioStackNav.Navigator
            id={undefined}
            screenOptions={{ headerShown: false }}
        >
            <InicioStackNav.Screen name="InicioHome" component={Inicio} />
        </InicioStackNav.Navigator>
    );
}

function GastosStack() {
    return (
        <GastosStackNav.Navigator
            id={undefined}
            screenOptions={{ headerShown: false }}
        >
            <GastosStackNav.Screen name="GastosHome" component={Gastos} />
        </GastosStackNav.Navigator>
    );
}

function AmigosStack() {
    return (
        <AmigosStackNav.Navigator
            id={undefined}
            screenOptions={{ headerShown: false }}
        >
            <AmigosStackNav.Screen name="AmigosHome" component={Amigos} />
        </AmigosStackNav.Navigator>
    );
}

const Tab = createBottomTabNavigator();

export default function MainTabs() {
    const { colors, theme } = useTheme();
    
    // Forzar actualización de estilos cuando cambia el tema
    const tabBarStyle = useMemo(() => [
        styles.tabBar, 
        { 
            backgroundColor: colors.modalBackground, 
            borderTopColor: colors.borderLight,
            shadowColor: theme === 'dark' ? '#000' : '#000',
            shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
        }
    ], [colors.modalBackground, colors.borderLight, theme]);
    
    return (
        <Tab.Navigator
            key={theme}
            id={undefined}
            initialRouteName="Inicio"
            screenOptions={{
                headerShown: false,
                tabBarStyle: tabBarStyle,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
            }}
        >
            <Tab.Screen
                name="Inicio"
                component={InicioStack}
                options={{
                    tabBarLabel: 'Inicio',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.emojiCircle }]}>
                                <Feather name="home" size={24} color={color} />
                            </View>
                        </View>
                    ),
                }}
            />

            <Tab.Screen
                name="Gastos"
                component={GastosStack}
                options={{
                    tabBarLabel: 'Gastos',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.emojiCircle }]}>
                                <Feather name="file-text" size={24} color={color} />
                            </View>
                        </View>
                    ),
                }}
            />

            <Tab.Screen
                name="Amigos"
                component={AmigosStack}
                options={{
                    tabBarLabel: 'Amigos',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.emojiCircle }]}>
                                <Feather name="users" size={24} color={color} />
                            </View>
                        </View>
                    ),
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: 80,
        paddingBottom: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabBarLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
});
