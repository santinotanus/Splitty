import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as groupsApi from '../api/groups';

export default function UnirseGrupo({ navigation }: any) {
  const [token, setToken] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinByToken = async () => {
    if (!token.trim()) {
      Alert.alert('Código requerido', 'Ingresá el token o código de invitación');
      return;
    }
    // basic front validation: token should have reasonable length
    if (token.trim().length < 20) {
      Alert.alert('Código inválido', 'El código de invitación parece ser demasiado corto. Verificá el código.');
      return;
    }
    setLoading(true);
    try {
  const res = await groupsApi.joinByInvite(token.trim());
      // regresar a Inicio; Inicio refrescará la lista en focus
      Alert.alert('Solicitud enviada', 'Te uniste al grupo correctamente', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      console.error('joinByInvite error', e);
      // Manejo front: interpretar VALIDATION_ERROR y otros errores para mensajes amigables
      const status = e?.response?.status;
      const body = e?.response?.data;
      if (status === 404 || body?.error === 'NOT_FOUND') {
        Alert.alert('Grupo no existe', 'No se encontró un grupo con ese código de invitación. Verificá el código.');
      } else if (body?.error === 'VALIDATION_ERROR' && Array.isArray(body?.issues)) {
        const issue = body.issues[0];
        if (issue?.code === 'too_small' && issue?.minimum) {
          Alert.alert('Código inválido', 'El código de invitación no tiene el formato esperado. Verificá el código.');
        } else {
          Alert.alert('Error', body?.message || body?.error || e?.message || 'Error al unir al grupo');
        }
      } else {
        Alert.alert('Error', e?.response?.data?.error || e?.message || 'Error al unir al grupo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinById = async () => {
    if (!grupoId.trim()) {
      Alert.alert('ID requerido', 'Ingresá el nombre o ID del grupo');
      return;
    }
    // front validation: backend expects UUID format for grupoId
    const uuidRegex = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    if (!uuidRegex.test(grupoId.trim())) {
      Alert.alert('ID inválido', 'El ID debe tener formato UUID. Si no tenés el ID, pedíle al administrador que te pase el ID o usa el código de invitación.');
      return;
    }

    setLoading(true);
    try {
      const res = await groupsApi.joinGroup(grupoId.trim());
      // regresar a Inicio; Inicio refrescará la lista en focus
      Alert.alert('Solicitud enviada', 'Se envió tu solicitud para unirte al grupo', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      console.error('joinGroup error', e);
      const status = e?.response?.status;
      const body = e?.response?.data;
      if (status === 404 || body?.error === 'NOT_FOUND') {
        Alert.alert('Grupo no existe', 'No se encontró un grupo con ese ID. Verificá el ID y volvé a intentar.');
      } else if (body?.error === 'VALIDATION_ERROR' && Array.isArray(body?.issues)) {
        const issue = body.issues[0];
        if (issue?.code === 'invalid_format' && issue?.format === 'uuid') {
          Alert.alert('ID inválido', 'El ID ingresado no tiene formato de UUID. Verificá y volvé a intentar.');
        } else {
          Alert.alert('Error', body?.message || body?.error || e?.message || 'Error al unir al grupo');
        }
      } else {
        Alert.alert('Error', e?.response?.data?.error || e?.message || 'Error al unir al grupo');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Unirse a un Grupo</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unite a un grupo existente</Text>
        <Text style={styles.cardSubtitle}>Ingresá el nombre o ID del grupo al que querés unirte y enviá tu solicitud.</Text>

        <TextInput style={styles.input} placeholder="Nombre o ID del grupo" value={grupoId} onChangeText={setGrupoId} />
        <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleJoinById} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar solicitud</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>O pegar código de invitación</Text>
        <TextInput style={styles.input} placeholder="Ej: ABC123" value={token} onChangeText={setToken} />
        <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleJoinByToken} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Unirse con código</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={{ color: '#033E30' }}>Volver al inicio</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#E6F4F1', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#033E30', marginBottom: 12 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12 },
  cardTitle: { fontWeight: '700', color: '#033E30', marginBottom: 6 },
  cardSubtitle: { color: '#666', marginBottom: 8 },
  input: { backgroundColor: '#f6f9f7', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e6eee9', marginBottom: 8 },
  button: { backgroundColor: '#033E30', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  backButton: { marginTop: 12, alignItems: 'center' },
});
