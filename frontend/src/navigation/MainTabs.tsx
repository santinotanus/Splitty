import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Inicio from '../screens/Inicio';
import Gastos from '../screens/Gastos';
import Amigos from '../screens/Amigos';

const Tab = createBottomTabNavigator<any>();
const Stack = createNativeStackNavigator<any>();

function InicioStack() {
    return (
        <Stack.Navigator
            id={undefined}
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen name="InicioHome" component={Inicio} />
        </Stack.Navigator>
    );
}

function GastosStack() {
    return (
        <Stack.Navigator
            id={undefined}
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen name="GastosHome" component={Gastos} />
        </Stack.Navigator>
    );
}

function AmigosStack() {
    return (
        <Stack.Navigator
            id={undefined}
            screenOptions={{ headerShown: false }}
        >
            <Stack.Screen name="AmigosHome" component={Amigos} />
        </Stack.Navigator>
    );
}

export default function MainTabs() {
    return (
        <Tab.Navigator
            id={undefined}
            initialRouteName="Inicio"
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#0A4930',
                tabBarInactiveTintColor: '#444',
            }}
        >
            <Tab.Screen
                name="Inicio"
                component={InicioStack}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 20, color }}>🏠</Text>
                    ),
                }}
            />

            <Tab.Screen
                name="Gastos"
                component={GastosStack}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 20, color }}>💵</Text>
                    ),
                }}
            />

            <Tab.Screen
                name="Amigos"
                component={AmigosStack}
                options={{
                    tabBarIcon: ({ color }) => (
                        <Text style={{ fontSize: 20, color }}>👥</Text>
                    ),
                }}
            />
        </Tab.Navigator>
    );
}
