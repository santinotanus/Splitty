import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import PantallaBienvenida from './src/screens/PantallaBienvenida';
import InicioSesion from './src/screens/InicioSesion';
import CrearCuenta from './src/screens/CrearCuenta';
import CrearGrupo from './src/screens/CrearGrupo';
import UnirseGrupo from './src/screens/UnirseGrupo';
import Grupo from './src/screens/Grupo';
import AddGasto from './src/screens/AddGasto';
import MainTabs from './src/navigation/MainTabs';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#033E30" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen key="Main" name="Main" component={MainTabs} />
          <Stack.Screen key="CrearGrupo" name="CrearGrupo" component={CrearGrupo} />
          <Stack.Screen key="UnirseGrupo" name="UnirseGrupo" component={UnirseGrupo} />
          <Stack.Screen key="Grupo" name="Grupo" component={Grupo} />
          <Stack.Screen key="InvitarMiembro" name="InvitarMiembro" component={require('./src/screens/InvitarMiembro').default} />
          <Stack.Screen key="AddGasto" name="AddGasto" component={AddGasto} />
        </>
      ) : (
        <>
          <Stack.Screen key="PantallaBienvenida" name="PantallaBienvenida" component={PantallaBienvenida} />
          <Stack.Screen key="InicioSesion" name="InicioSesion" component={InicioSesion} />
          <Stack.Screen key="CrearCuenta" name="CrearCuenta" component={CrearCuenta} />
        </>
      )}
    </Stack.Navigator>
  );
}

const App = () => (
  <AuthProvider>
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  </AuthProvider>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
  },
});

export default App;