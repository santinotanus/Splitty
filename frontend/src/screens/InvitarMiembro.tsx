import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Share,
  ScrollView,
  Image,
  Dimensions
} from 'react-native';
import { useInvitarMiembro } from '../viewmodels/useInvitarMiembro';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function InvitarMiembro({ route, navigation }: any) {
  const { grupoId, nombre, emoji } = route.params || {};
  const { colors } = useTheme();
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

  // 🔥 FIX: Función para obtener el nombre correcto del amigo
  const getFriendName = (friend: any) => {
    return friend.name || friend.nombre || friend.correo || friend.email || 'Usuario';
  };

  // 🔥 FIX: Función para obtener el email correcto del amigo
  const getFriendEmail = (friend: any) => {
    return friend.email || friend.correo || '';
  };

  // 🔥 FIX: Función para obtener la foto del amigo
  const getFriendPhoto = (friend: any) => {
    return friend.foto_url || friend.photoUrl || null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.modalBackground, borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.iconColor} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]}>Invitar miembro</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{nombre}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.card, { backgroundColor: colors.modalBackground, borderColor: colors.borderLight }]}>
          <View style={styles.cardTop}>
            <View style={[styles.emojiCircle, { backgroundColor: colors.emojiCircle }]}>
              <Text style={{ fontSize: 20 }}>{emoji ?? '✈️'}</Text>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[{ fontWeight: '700', fontSize: 16, color: colors.text }]}>{nombre}</Text>
              <Text style={[{ color: colors.textSecondary }]}>Invitá a alguien a unirse al grupo</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Link de invitación</Text>
            {loadingInvite ? (
              <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />
            ) : inviteData ? (
              <View style={{ marginTop: 8 }}>
                <View style={[styles.linkBox, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}>
                  <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {inviteData.url ?? inviteData.token ?? 'Link generado'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}
                    onPress={() => copyToClipboard(inviteData.url ?? inviteData.token ?? '')}
                  >
                    <Feather name="copy" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.smallButtonText, { color: colors.text }]}>Copiar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: colors.cardBackground, borderColor: colors.borderLight }]}
                    onPress={() => shareLink(inviteData.url ?? inviteData.token ?? '')}
                  >
                    <Feather name="share-2" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.smallButtonText, { color: colors.text }]}>Compartir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>No se pudo generar el link</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Código QR</Text>
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              {inviteData && QRComponent ? (
                <View style={[styles.qrContainer, { backgroundColor: colors.modalBackground, borderColor: colors.borderLight }]}>
                  <QRComponent
                    value={inviteData.url ?? inviteData.token ?? 'https://splitty.app'}
                    size={isSmallDevice ? 140 : 160}
                    backgroundColor="transparent"
                    color={colors.text}
                  />
                </View>
              ) : (
                <View style={[styles.qrPlaceholder, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
                  <Feather name="maximize" size={32} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, marginTop: 8 }}>QR no disponible</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text style={[styles.bigSectionTitle, { color: colors.text }]}>Añadir a un amigo</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Seleccioná un amigo para agregarlo directamente
          </Text>

          {loadingFriends ? (
            <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />
          ) : friends.length === 0 ? (
            <View style={[styles.emptyFriends, { backgroundColor: colors.modalBackground, borderColor: colors.borderLight }]}>
              <Feather name="users" size={32} color={colors.textMuted} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No tenés amigos aún</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                Agregá amigos desde la pestaña "Amigos"
              </Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const friendName = getFriendName(item);
                const friendEmail = getFriendEmail(item);
                const friendPhoto = getFriendPhoto(item);

                return (
                  <View style={[styles.friendCard, { backgroundColor: colors.modalBackground, borderColor: colors.borderLight }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      {/* 🔥 FIX: Avatar con foto o inicial */}
                      <View style={styles.friendAvatarWrapper}>
                        {friendPhoto ? (
                          <Image
                            source={{ uri: friendPhoto }}
                            style={[styles.avatarImage, { backgroundColor: colors.borderLight }]}
                          />
                        ) : (
                          <View style={[styles.avatarSmall, { backgroundColor: colors.primary }]}>
                            <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
                              {friendName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={[styles.friendName, { color: colors.text }]}>{friendName}</Text>
                        {friendEmail && (
                          <Text style={[styles.friendEmail, { color: colors.textSecondary }]}>{friendEmail}</Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.addPill, { backgroundColor: colors.primary }, addingIds[item.id] && { opacity: 0.6 }]}
                      onPress={() => handleAddFriend(item.id)}
                      disabled={!!addingIds[item.id]}
                    >
                      {addingIds[item.id] ? (
                        <ActivityIndicator size="small" color={colors.primaryText} />
                      ) : (
                        <>
                          <Feather name="user-plus" size={14} color={colors.primaryText} style={{ marginRight: 6 }} />
                          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>Añadir</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  card: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center'
  },
  section: { marginTop: 16 },
  sectionTitle: { fontWeight: '700', fontSize: 15, marginBottom: 8 },
  linkBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallButtonText: {
    fontWeight: '600',
    fontSize: 14
  },
  qrContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigSectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionSubtitle: { marginBottom: 16, fontSize: 13 },
  emptyFriends: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  friendAvatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendName: { fontWeight: '700', fontSize: 15 },
  friendEmail: { fontSize: 12, marginTop: 2 },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20
  },
});