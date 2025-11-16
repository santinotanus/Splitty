import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, Share, ScrollView } from 'react-native';
import { useInvitarMiembro } from '../viewmodels/useInvitarMiembro';
import { Feather } from '@expo/vector-icons';

export default function InvitarMiembro({ route, navigation }: any) {
  const { grupoId, nombre, emoji } = route.params || {};
  const { inviteData, loadingInvite, friends, loadingFriends, addMember, fetchInvite, fetchFriends } = useInvitarMiembro(grupoId);
  const [addingIds, setAddingIds] = useState<Record<string, boolean>>({});
  const [QRComponent, setQRComponent] = useState<any | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    const tryLoadQR = async () => {
      try {
        const mod = await import('react-native-qrcode-svg');
        const comp = (mod && (mod.default || mod));
        setQRComponent(() => comp);
      } catch (err) {
        console.log('QR not available:', err);
      }
    };
    tryLoadQR();
  }, [grupoId]);

  const copyToClipboard = async (text: string) => {
    try {
      const mod = await import('expo-clipboard').catch(() => null);
      const Clip = mod && (mod.default || mod);
      if (Clip && Clip.setStringAsync) {
        await Clip.setStringAsync(text);
        Alert.alert('✓ Copiado', 'Link copiado al portapapeles');
        return;
      }
    } catch (e) {}

    try {
      const mod2 = await import('@react-native-clipboard/clipboard').catch(() => null);
      const RNClip = mod2 && (mod2.default || mod2);
      if (RNClip && RNClip.setString) {
        RNClip.setString(text);
        Alert.alert('✓ Copiado', 'Link copiado al portapapeles');
        return;
      }
    } catch (e) {}

    Alert.alert('Link de invitación', text);
  };

  const shareLink = async (text: string) => {
    try {
      await Share.share({
        message: `¡Unite a mi grupo "${nombre}" en Splitty!\n\n${text}`,
        title: `Invitación a ${nombre}`
      });
    } catch (e) {
      console.error('share error', e);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    setAddingIds(prev => ({ ...prev, [friendId]: true }));
    try {
      const res = await addMember(friendId);
      const added = res?.added ?? (res?.ok ? 1 : 0);
      if (added > 0) {
        Alert.alert('✓ Hecho', 'Miembro añadido al grupo');
        setTimeout(() => navigation.goBack(), 1000);
      } else {
        Alert.alert('Info', 'El usuario ya es miembro del grupo o no se pudo agregar.');
      }
    } catch (e: any) {
      console.error('addMembers error', e);
      const code = e?.response?.data?.error || e?.message;
      if (code === 'FORBIDDEN') {
        Alert.alert('Error', 'No tenés permiso para agregar miembros (solo admin puede).');
      } else if (code === 'ALREADY_MEMBER') {
        Alert.alert('Info', 'Ese usuario ya es miembro del grupo.');
      } else {
        Alert.alert('Error', 'No se pudo añadir al miembro');
      }
    } finally {
      setAddingIds(prev => ({ ...prev, [friendId]: false }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#033E30" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Invitar miembro</Text>
          <Text style={styles.subtitle}>{nombre}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.emojiCircle}>
              <Text style={{ fontSize: 20 }}>{emoji ?? '✈️'}</Text>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontWeight: '700', fontSize: 16 }}>{nombre}</Text>
              <Text style={{ color: '#666' }}>Invitá a alguien a unirse al grupo</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Link de invitación</Text>
            {loadingInvite ? (
              <ActivityIndicator style={{ marginTop: 12 }} />
            ) : inviteData ? (
              <View style={{ marginTop: 8 }}>
                <View style={styles.linkBox}>
                  <Text numberOfLines={2} style={{ color: '#333', fontSize: 12 }}>
                    {inviteData.url ?? inviteData.token ?? 'Link generado'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => copyToClipboard(inviteData.url ?? inviteData.token ?? '')}
                  >
                    <Feather name="copy" size={16} color="#033E30" style={{ marginRight: 6 }} />
                    <Text style={styles.smallButtonText}>Copiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() => shareLink(inviteData.url ?? inviteData.token ?? '')}
                  >
                    <Feather name="share-2" size={16} color="#033E30" style={{ marginRight: 6 }} />
                    <Text style={styles.smallButtonText}>Compartir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={{ color: '#666', marginTop: 8 }}>No se pudo generar el link</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Código QR</Text>
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              {inviteData && QRComponent ? (
                <View style={styles.qrContainer}>
                  <QRComponent
                    value={inviteData.url ?? inviteData.token ?? 'https://splitty.app'}
                    size={160}
                    backgroundColor="#FFFFFF"
                    color="#033E30"
                  />
                </View>
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Feather name="maximize" size={32} color="#999" />
                  <Text style={{ color: '#999', marginTop: 8 }}>QR no disponible</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text style={styles.bigSectionTitle}>Añadir a un amigo</Text>
          <Text style={styles.sectionSubtitle}>Seleccioná un amigo para agregarlo directamente</Text>
          
          {loadingFriends ? (
            <ActivityIndicator style={{ marginTop: 12 }} />
          ) : friends.length === 0 ? (
            <View style={styles.emptyFriends}>
              <Feather name="users" size={32} color="#999" />
              <Text style={{ color: '#666', marginTop: 8 }}>No tenés amigos aún</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                Agregá amigos desde la pestaña "Amigos"
              </Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.friendCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={styles.avatarSmall}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>
                        {(item.nombre || item.correo || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.friendName}>{item.nombre || item.correo}</Text>
                      <Text style={styles.friendEmail}>{item.correo || ''}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.addPill, addingIds[item.id] && { opacity: 0.6 }]} 
                    onPress={() => handleAddFriend(item.id)} 
                    disabled={!!addingIds[item.id]}
                  >
                    {addingIds[item.id] ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="user-plus" size={14} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Añadir</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F4F1' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    paddingTop: 60, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6eee9'
  },
  title: { fontSize: 18, fontWeight: '700', color: '#033E30' },
  subtitle: { color: '#666', fontSize: 12, marginTop: 2 },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e6eee9' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  emojiCircle: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: '#DFF4EA', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  section: { marginTop: 16 },
  sectionTitle: { fontWeight: '700', fontSize: 15, color: '#033E30', marginBottom: 8 },
  linkBox: { 
    backgroundColor: '#f6f9f6', 
    padding: 12, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e6eee9'
  },
  smallButton: { 
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10, 
    borderRadius: 8, 
    backgroundColor: '#f6f9f6',
    borderWidth: 1,
    borderColor: '#e6eee9'
  },
  smallButtonText: {
    color: '#033E30',
    fontWeight: '600',
    fontSize: 14
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e6eee9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  qrPlaceholder: { 
    width: 192,
    height: 192,
    borderRadius: 12, 
    borderWidth: 2, 
    borderStyle: 'dashed', 
    borderColor: '#e6e6e6', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#f9f9f9'
  },
  bigSectionTitle: { fontSize: 18, fontWeight: '800', color: '#033E30', marginBottom: 4 },
  sectionSubtitle: { color: '#666', marginBottom: 16, fontSize: 13 },
  emptyFriends: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e6eee9',
    marginTop: 8
  },
  friendCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginBottom: 8, 
    borderWidth: 1, 
    borderColor: '#e6eee9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  avatarSmall: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#033E30', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  friendName: { fontWeight: '700', fontSize: 15, color: '#033E30' },
  friendEmail: { color: '#666', fontSize: 12, marginTop: 2 },
  addPill: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#033E30', 
    paddingVertical: 8, 
    paddingHorizontal: 14, 
    borderRadius: 20 
  },
});