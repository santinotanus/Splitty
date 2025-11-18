import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useCrearGrupo } from '../viewmodels/useCrearGrupo';
import { useTheme } from '../contexts/ThemeContext';

export default function CrearGrupo({ navigation }: any) {
  const { colors } = useTheme();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [inviteMode, setInviteMode] = useState<'link' | 'qr'>('link');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const { loading, createGroup, createInviteLink } = useCrearGrupo();

  const handleCreate = async () => {
    if (!nombre.trim()) {
      Alert.alert('Nombre requerido', 'Ingresá un nombre para el grupo');
      return;
    }
    try {
      const grupoId = await createGroup({ nombre, descripcion, emoji });
      setCreatedGroupId(grupoId);
      Alert.alert('Grupo creado', 'Tu grupo se creó correctamente');
      try {
        if (grupoId) {
          const invite = await createInviteLink(grupoId, 60 * 24 * 30);
          const url = invite?.url || (invite?.token ? (invite.url || `https://app.example.com/join/${invite.token}`) : null);
          setInviteUrl(url || null);
          if (url) {
            try {
              await Clipboard.setStringAsync(url);
            } catch (cErr) {
              console.warn('clipboard error', cErr);
            }
            Alert.alert('Grupo creado', 'Link de invitación copiado al portapapeles. Podés compartirlo con tus amigos.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            return;
          }
        }
      } catch (linkErr) {
        console.warn('No se pudo generar link de invitación', linkErr);
      }
      navigation.goBack();
    } catch (e: any) {
      console.error('createGroup error', e);
      Alert.alert('Error', e?.response?.data?.error || e?.message || 'Error al crear grupo');
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
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Crear Grupo</Text>

      <View style={[styles.card, { backgroundColor: colors.modalBackground, borderColor: colors.borderLight }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Información del grupo</Text>
        <Text style={[styles.label, { color: colors.text }]}>Nombre del grupo *</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight, color: colors.text }]} 
          value={nombre} 
          onChangeText={setNombre} 
          placeholder="Ej: Viaje a Brasil 2026"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={[styles.label, { color: colors.text }]}>Descripción (opcional)</Text>
        <TextInput 
          style={[styles.input, { height: 100, backgroundColor: colors.cardBackground, borderColor: colors.borderLight, color: colors.text }]} 
          value={descripcion} 
          onChangeText={setDescripcion} 
          placeholder="Describe brevemente el propósito del grupo" 
          placeholderTextColor={colors.textMuted}
          multiline 
        />

        <Text style={[styles.label, { color: colors.text }]}>Emoji del grupo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
          {['✈️','🍖','🚗','🏖️','🎉','💼','🏠','🍹','🎂','🏕️','🚴‍♂️'].map((em) => (
            <TouchableOpacity 
              key={em} 
              style={[
                styles.emojiButton, 
                { backgroundColor: colors.cardBackground },
                emoji === em && { backgroundColor: colors.emojiCircle }
              ]} 
              onPress={() => setEmoji(em)}
            >
              <Text style={{ fontSize: 20 }}>{em}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Roles removed per request */}

      <View style={[styles.card, { backgroundColor: colors.modalBackground, borderColor: colors.borderLight }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Invitar miembros</Text>
        <View style={[styles.inviteTabs, { backgroundColor: colors.cardBackground }]}>
          <TouchableOpacity 
            style={[styles.tab, inviteMode === 'link' && { backgroundColor: colors.primary }]} 
            onPress={() => setInviteMode('link')}
          >
            <Text style={inviteMode === 'link' ? [styles.tabTextActive, { color: colors.primaryText }] : [styles.tabText, { color: colors.text }]}>Link</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, inviteMode === 'qr' && { backgroundColor: colors.primary }]} 
            onPress={() => setInviteMode('qr')}
          >
            <Text style={inviteMode === 'qr' ? [styles.tabTextActive, { color: colors.primaryText }] : [styles.tabText, { color: colors.text }]}>Código QR</Text>
          </TouchableOpacity>
        </View>

        {inviteMode === 'link' ? (
          <>
            <TextInput 
              style={[styles.input, { marginTop: 8, backgroundColor: colors.cardBackground, borderColor: colors.borderLight, color: colors.text }]} 
              value={inviteUrl ?? ''} 
              placeholder="El link de invitación aparecerá aquí"
              placeholderTextColor={colors.textMuted}
              editable={false} 
            />
            <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: colors.primary }]} onPress={handleShareInvite}>
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>Compartir link</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, { flex: 1, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.borderLight }]} 
                onPress={handleCopyInvite}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>Copiar</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', padding: 12 }}>
            {inviteUrl ? (
              <View style={{ backgroundColor: colors.modalBackground, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.borderLight }}>
                <QRCode value={inviteUrl} size={160} />
              </View>
            ) : (
              <View style={{ width: 160, height: 160, backgroundColor: colors.cardBackground, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderLight }}>
                <Text style={{ color: colors.textMuted }}>QR generado aquí</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: colors.primary }]} onPress={handleCopyInvite}>
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>Copiar link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: colors.primary }]} onPress={handleShareInvite}>
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>Compartir QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]} 
        onPress={handleCreate} 
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.buttonText, { color: colors.primaryText }]}>Crear Grupo</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={{ color: colors.primary }}>Volver</Text>
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
