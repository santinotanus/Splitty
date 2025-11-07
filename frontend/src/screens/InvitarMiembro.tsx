import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, Share } from 'react-native';
import * as groupsApi from '../api/groups';
import * as friendsApi from '../api/friends';

export default function InvitarMiembro({ route, navigation }: any) {
  const { grupoId, nombre, emoji } = route.params || {};
  const [inviteData, setInviteData] = useState<any | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [addingIds, setAddingIds] = useState<Record<string, boolean>>({});
  const [QRComponent, setQRComponent] = useState<any | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchInvite();
    fetchFriends();
  }, [grupoId]);

  const fetchInvite = async () => {
    setLoadingInvite(true);
    try {
      const res = await groupsApi.createInviteLink(grupoId);
      setInviteData(res);
      // Try to load QR component dynamically (optional dependency)
      try {
        const mod = await import('react-native-qrcode-svg');
        // some bundlers export default, some named
        const comp = (mod && (mod.default || mod));
        setQRComponent(() => comp);
      } catch (err) {
        // not available, keep QRComponent null
      }
    } catch (e) {
      console.error('createInviteLink error', e);
      setInviteData(null);
    } finally {
      setLoadingInvite(false);
    }
  };

  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const res = await friendsApi.getFriends();
      const arr = Array.isArray(res) ? res : res?.friends ?? [];
      setFriends(arr);
    } catch (e) {
      console.error('getFriends error', e);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    // Prefer expo-clipboard (recommended for Expo). Fallback to community clipboard.
    try {
      const mod = await import('expo-clipboard').catch(() => null);
      const Clip = mod && (mod.default || mod);
      if (Clip && Clip.setStringAsync) {
        await Clip.setStringAsync(text);
        Alert.alert('Copiado', 'Link copiado al portapapeles');
        return;
      }
    } catch (e) {
      // ignore
    }
    try {
      const mod2 = await import('@react-native-clipboard/clipboard').catch(() => null);
      const RNClip = mod2 && (mod2.default || mod2);
      if (RNClip && RNClip.setString) {
        RNClip.setString(text);
        Alert.alert('Copiado', 'Link copiado al portapapeles');
        return;
      }
    } catch (e) {
      // ignore
    }
    Alert.alert('Copiar', 'No se pudo copiar automáticamente. Por favor copiá manualmente: ' + text);
  };

  const shareLink = async (text: string) => {
    try {
      await Share.share({ message: text });
    } catch (e) {
      console.error('share error', e);
      Alert.alert('Error', 'No se pudo abrir el diálogo de compartir');
    }
  };

  const handleAddFriend = async (friendId: string) => {
    setAddingIds(prev => ({ ...prev, [friendId]: true }));
    try {
      await groupsApi.addMembers(grupoId, [friendId]);
      Alert.alert('Hecho', 'Miembro añadido al grupo');
      // remove friend from list or mark invited
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch (e) {
      console.error('addMembers error', e);
      Alert.alert('Error', 'No se pudo añadir al miembro');
    } finally {
      setAddingIds(prev => ({ ...prev, [friendId]: false }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Invitar miembro</Text>
          <Text style={styles.subtitle}>{nombre}</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.emojiCircle}><Text style={{ fontSize: 20 }}>{emoji ?? '✈️'}</Text></View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontWeight: '700', fontSize: 16 }}>{nombre}</Text>
            <Text style={{ color: '#666' }}>Invitá a alguien a unirse al grupo</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Link de invitación</Text>
          {loadingInvite ? (
            <ActivityIndicator />
          ) : inviteData ? (
            <View style={{ marginTop: 8 }}>
              <View style={styles.linkBox}>
                <Text numberOfLines={2} style={{ color: '#333' }}>{inviteData.url ?? inviteData.token ?? JSON.stringify(inviteData)}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity style={styles.smallButton} onPress={() => copyToClipboard(inviteData.url ?? inviteData.token ?? '')}>
                  <Text>Copiar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallButton, { marginLeft: 8 }]} onPress={() => shareLink(inviteData.url ?? inviteData.token ?? '')}>
                  <Text>Compartir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={{ color: '#666', marginTop: 8 }}>No se pudo generar el link</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Código QR</Text>
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            {inviteData && QRComponent ? (
              <QRComponent value={inviteData.url ?? inviteData.token ?? ''} size={140} />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={{ color: '#999' }}>QR placeholder</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <Text style={styles.bigSectionTitle}>Añadir a un amigo al grupo</Text>
        <Text style={styles.sectionSubtitle}>Seleccioná un amigo para agregarlo al grupo</Text>
        {loadingFriends ? (
          <ActivityIndicator />
        ) : friends.length === 0 ? (
          <Text style={{ color: '#666' }}>No tenés amigos aún</Text>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.friendCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.avatarSmall}><Text style={{ color: '#fff' }}>{(item.name || '').slice(0,1).toUpperCase() || 'U'}</Text></View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.friendName}>{item.name || item.displayName || item.email}</Text>
                    <Text style={styles.friendEmail}>{item.email || ''}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.addPill} onPress={() => handleAddFriend(item.id)} disabled={!!addingIds[item.id]}>
                  <Text style={{ color: '#fff' }}>{addingIds[item.id] ? '...' : 'Añadir'}</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F4F1' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingTop: 40, backgroundColor: '#fff' },
  back: { fontSize: 28, color: '#033E30', width: 32 },
  title: { fontSize: 16, fontWeight: '700', color: '#033E30' },
  subtitle: { color: '#666', fontSize: 12 },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  emojiCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#DFF4EA', alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 6 },
  smallButton: { padding: 8, borderRadius: 8, backgroundColor: '#f2f7f4', alignItems: 'center' },
  linkBox: { backgroundColor: '#f6f9f6', padding: 12, borderRadius: 8 },
  qrPlaceholder: { height: 140, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#e6e6e6', alignItems: 'center', justifyContent: 'center' },
  friendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  addButton: { backgroundColor: '#033E30', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  // improved friend card styles
  friendCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  avatarSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#033E30', alignItems: 'center', justifyContent: 'center' },
  friendName: { fontWeight: '700' },
  friendEmail: { color: '#666', fontSize: 12 },
  addPill: { backgroundColor: '#033E30', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  bigSectionTitle: { fontSize: 18, fontWeight: '800', color: '#033E30', marginBottom: 6 },
  sectionSubtitle: { color: '#666', marginBottom: 12 },
});
