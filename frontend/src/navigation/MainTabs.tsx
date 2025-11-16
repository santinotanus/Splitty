// navigation/MainTabs.tsx
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Inicio from '../screens/Inicio';
import Gastos from '../screens/Gastos';
import Amigos from '../screens/Amigos';

// ---------- STACKS POR CADA TAB ----------
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

// ---------- TABS ----------
const Tab = createBottomTabNavigator();

export default function MainTabs() {
    return (
        <Tab.Navigator
            id={undefined}
            initialRouteName="Inicio"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#E6F4F1',
                    height: 70,
                    paddingBottom: 8,
                    paddingTop: 6,
                    borderTopWidth: 0,
                    elevation: 0,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                },
                tabBarActiveTintColor: '#0A4930',
                tabBarInactiveTintColor: '#444444',
            }}
        >
            <Tab.Screen
                name="Inicio"
                component={InicioStack}
                options={{
                    tabBarLabel: 'Inicio',
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 20, color }}>🏠</Text>
                    ),
                }}
            />

            <Tab.Screen
                name="Gastos"
                component={GastosStack}
                options={{
                    tabBarLabel: 'Gastos',
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 20, color }}>💵</Text>
                    ),
                }}
            />

            <Tab.Screen
                name="Amigos"
                component={AmigosStack}
                options={{
                    tabBarLabel: 'Amigos',
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 20, color }}>👥</Text>
                    ),
                }}
            />
        </Tab.Navigator>
    );
}
