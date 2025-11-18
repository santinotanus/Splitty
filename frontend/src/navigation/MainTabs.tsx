import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
// 1. Importación necesaria para manejar el área segura
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

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
    // 2. Obtener los insets del área segura
    const insets = useSafeAreaInsets();
    
    // Forzar actualización de estilos cuando cambia el tema o los insets
    const tabBarStyle = useMemo(() => [
        styles.tabBar, 
        { 
            backgroundColor: colors.modalBackground, 
            borderTopColor: colors.borderLight,
            shadowColor: theme === 'dark' ? '#000' : '#000',
            shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
            // 3. Aplicar el padding dinámico
            paddingBottom: styles.tabBar.paddingBase + insets.bottom,
            // 4. Establecer altura dinámica (si el 'height' estático se elimina)
            height: styles.tabBar.minHeight + insets.bottom
        }
    ], [colors.modalBackground, colors.borderLight, theme, insets.bottom]);
    
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
        // Se define una altura mínima y un padding base para el cálculo dinámico.
        // Se remueven los valores fijos de height y paddingBottom para dar paso al cálculo dinámico.
        minHeight: 60, // Altura base mínima para el contenido (iconos + labels)
        paddingBase: 10, // Base padding que quieres debajo de los iconos (antes era 20)
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