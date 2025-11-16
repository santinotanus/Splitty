// frontend/src/navigation/MainTabs.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

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
    return (
        <Tab.Navigator
            id={undefined}
            initialRouteName="Inicio"
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarActiveTintColor: '#033E30',
                tabBarInactiveTintColor: '#8A9A92',
            }}
        >
            <Tab.Screen
                name="Inicio"
                component={InicioStack}
                options={{
                    tabBarLabel: 'Inicio',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={styles.iconContainer}>
                            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
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
                            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
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
                            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
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
        backgroundColor: '#FFFFFF',
        height: 80,
        paddingBottom: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#E8EEE8',
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
    iconWrapperActive: {
        backgroundColor: '#E6F4F1',
    },
});