import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import * as groupsApi from '../api/groups';
import { getCurrentUser } from '../api/client';
import { saveGroupEmoji } from '../utils/groupEmoji';
import { useAuth } from '../contexts/AuthContext';

export default function CrearGrupo({ navigation }: any) {
  const { user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [inviteMode, setInviteMode] = useState<'link' | 'qr'>('link');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!nombre.trim()) {
      Alert.alert('Nombre requerido', 'Ingresá un nombre para el grupo');
      return;
    }
    setLoading(true);
    try {
      // create group
      // Backend expects initialMembers to have at least 1 item — fetch backend user id (UUID) from /users/me
      let initialMembers: string[] = [];
      try {
        const me = await getCurrentUser();
        const backendId = me?.id || me?.userId || me?.uid;
        if (backendId) {
          initialMembers = [backendId];
        } else {
          console.warn('No backend user id found in /users/me response, falling back to firebase uid');
          if (user?.uid) initialMembers = [user.uid];
        }
      } catch (meErr) {
        console.warn('Could not fetch /users/me', meErr);
        if (user?.uid) initialMembers = [user.uid];
      }

      const res = await groupsApi.createGroup({ nombre: nombre.trim(), descripcion: descripcion.trim(), initialMembers, emoji } as any);
      const grupoId = res?.id || res?._id || res?.grupoId || null;
      setCreatedGroupId(grupoId);
      // persist emoji locally so the front can show it even if backend doesn't save it
      if (grupoId && emoji) {
        await saveGroupEmoji(grupoId, emoji);
      }
      Alert.alert('Grupo creado', 'Tu grupo se creó correctamente');

      // generar link de invitación si el backend lo permite
      try {
        if (grupoId) {
          const invite = await groupsApi.createInviteLink(grupoId, 60 * 24 * 30); // 30 days
          const url = invite?.url || (invite?.token ? (invite.url || `https://app.example.com/join/${invite.token}`) : null);
          setInviteUrl(url || null);
          if (url) {
            // copiar automáticamente al portapapeles
            try {
              await Clipboard.setStringAsync(url);
            } catch (cErr) {
              console.warn('clipboard error', cErr);
            }
            // mostrar alerta y volver a Inicio al confirmar
            Alert.alert('Grupo creado', 'Link de invitación copiado al portapapeles. Podés compartirlo con tus amigos.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            return; // ya navegamos atrás
          }
        }
      } catch (linkErr) {
        console.warn('No se pudo generar link de invitación', linkErr);
      }
      // si no hubo link, volvemos a Inicio igualmente
      navigation.goBack();
    } catch (e: any) {
      console.error('createGroup error', e);
      Alert.alert('Error', e?.response?.data?.error || e?.message || 'Error al crear grupo');
    } finally {
      setLoading(false);
    }
  };

  const handleShareInvite = async () => {
    if (!inviteUrl) {
      Alert.alert('Sin link', 'Aún no hay un link de invitación disponible');
      return;
    }
    try {
      await Share.share({ message: inviteUrl });
    } catch (e) {
      console.warn('share error', e);
      Alert.alert('Error', 'No se pudo compartir el link');
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) {
      Alert.alert('Sin link', 'Aún no hay un link de invitación disponible');
      return;
    }
    try {
      await Clipboard.setStringAsync(inviteUrl);
      Alert.alert('Copiado', 'Link copiado al portapapeles');
    } catch (e) {
      console.warn('clipboard error', e);
      Alert.alert('Error', 'No se pudo copiar el link');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crear Grupo</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Información del grupo</Text>
        <Text style={styles.label}>Nombre del grupo *</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Ej: Viaje a Brasil 2026" />

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput style={[styles.input, { height: 100 }]} value={descripcion} onChangeText={setDescripcion} placeholder="Describe brevemente el propósito del grupo" multiline />

        <Text style={styles.label}>Emoji del grupo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
          {['✈️','🍖','🚗','🏖️','🎉','💼','🏠','🍹','🎂','🏕️','🚴‍♂️'].map((em) => (
            <TouchableOpacity key={em} style={[styles.emojiButton, emoji === em && styles.emojiSelected]} onPress={() => setEmoji(em)}>
              <Text style={{ fontSize: 20 }}>{em}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Roles removed per request */}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Invitar miembros</Text>
        <View style={styles.inviteTabs}>
          <TouchableOpacity style={[styles.tab, inviteMode === 'link' && styles.tabActive]} onPress={() => setInviteMode('link')}>
            <Text style={inviteMode === 'link' ? styles.tabTextActive : styles.tabText}>Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, inviteMode === 'qr' && styles.tabActive]} onPress={() => setInviteMode('qr')}>
            <Text style={inviteMode === 'qr' ? styles.tabTextActive : styles.tabText}>Código QR</Text>
          </TouchableOpacity>
        </View>

        {inviteMode === 'link' ? (
          <>
            <TextInput style={[styles.input, { marginTop: 8 }]} value={inviteUrl ?? ''} placeholder="El link de invitación aparecerá aquí" editable={false} />
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
              <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={handleShareInvite}>
                <Text style={styles.buttonText}>Compartir link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6eee9' }]} onPress={handleCopyInvite}>
                <Text style={[styles.buttonText, { color: '#033E30' }]}>Copiar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', padding: 12 }}>
            {inviteUrl ? (
              <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e6eee9' }}>
                <QRCode value={inviteUrl} size={160} />
              </View>
            ) : (
              <View style={{ width: 160, height: 160, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e6eee9' }}>
                <Text style={{ color: '#666' }}>QR generado aquí</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={handleCopyInvite}>
                <Text style={styles.buttonText}>Copiar link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={handleShareInvite}>
                <Text style={styles.buttonText}>Compartir QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear Grupo</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={{ color: '#033E30' }}>Volver</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#E6F4F1',
    flexGrow: 1,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#033E30', marginBottom: 12 },
  label: { marginBottom: 8, color: '#033E30', fontWeight: '600' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e6eee9' },
  button: { backgroundColor: '#033E30', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  backButton: { marginTop: 12, alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e6eee9' },
  sectionTitle: { fontWeight: '700', color: '#033E30', marginBottom: 8 },
  emojiRow: { flexDirection: 'row', paddingVertical: 4 },
  emojiButton: { padding: 8, borderRadius: 8, backgroundColor: '#f6f9f7', marginRight: 8 },
  emojiSelected: { backgroundColor: '#DFF4EA' },
  inviteTabs: { flexDirection: 'row', backgroundColor: '#f6f9f7', padding: 4, borderRadius: 8 },
  tab: { flex: 1, padding: 8, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: '#033E30' },
  tabText: { color: '#033E30', fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
});
