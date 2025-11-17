import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useConfiguracionGrupo } from '../viewmodels/useConfiguracionGrupo';
import { saveGroupEmoji } from '../utils/groupEmoji';

export default function ConfiguracionGrupo({ route, navigation }: any) {
  const { grupoId, nombre, descripcion, emoji } = route.params || {};

  const {
    loading,
    miembros,
    grupoInfo,
    currentUserId,
    refresh,
    updateGroup,
    removeMember,
    updateMemberRole,
    deleteGroup,
  } = useConfiguracionGrupo(grupoId);

  // Estados de modales
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);

  // Estados de edición
  const [editNombre, setEditNombre] = useState(nombre || '');
  const [editDescripcion, setEditDescripcion] = useState(descripcion || '');
  const [selectedEmoji, setSelectedEmoji] = useState(emoji || '✈️');

  // Configuraciones
  const [notificaciones, setNotificaciones] = useState(true);

  // Determinar si el usuario actual es admin
  const currentMember = miembros.find(m => m.id === currentUserId);
  const isAdmin = currentMember?.rol === 'admin';
  const adminsCount = miembros.filter(m => m.rol === 'admin').length;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const emojis = ['✈️', '🍖', '🚗', '🏖️', '🎉', '💼', '🏠', '🍹', '🎂', '🏕️', '🚴‍♂️', '🎸', '⚽', '🎮', '📚', '🎬'];

  const handleGuardarCambios = async () => {
    if (!editNombre.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    try {
      await updateGroup({
        nombre: editNombre.trim(),
        descripcion: editDescripcion.trim(),
      });

      // Guardar emoji localmente
      if (selectedEmoji !== emoji) {
        await saveGroupEmoji(grupoId, selectedEmoji);
      }

      setShowEditModal(false);
      Alert.alert('✓ Guardado', 'Los cambios se guardaron correctamente');

      // Actualizar params de navegación
      navigation.setParams({
        nombre: editNombre.trim(),
        descripcion: editDescripcion.trim(),
        emoji: selectedEmoji,
      });
    } catch (error: any) {
      console.error('Error guardando cambios', error);
      Alert.alert('Error', error?.response?.data?.error || 'No se pudieron guardar los cambios');
    }
  };

  const handleCambiarRol = (miembro: any) => {
    if (!isAdmin) {
      Alert.alert('Sin permisos', 'Solo los administradores pueden cambiar roles');
      return;
    }

    const nuevoRol = miembro.rol === 'admin' ? 'miembro' : 'admin';
    const accion = nuevoRol === 'admin' ? 'promover a administrador' : 'degradar a miembro';

    // Prevenir que el último admin se degrade a sí mismo
    if (miembro.rol === 'admin' && adminsCount === 1) {
      Alert.alert(
        'No permitido',
        'No puedes degradarte siendo el único administrador. Primero promueve a otro miembro.'
      );
      return;
    }

    Alert.alert(
      'Cambiar rol',
      `¿Deseas ${accion} a ${miembro.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await updateMemberRole(miembro.id, nuevoRol);
              Alert.alert('✓ Rol actualizado', `${miembro.nombre} ahora es ${nuevoRol}`);
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'No se pudo cambiar el rol');
            }
          },
        },
      ]
    );
  };

  const handleEliminarMiembro = (miembro: any) => {
    if (!isAdmin) {
      Alert.alert('Sin permisos', 'Solo los administradores pueden eliminar miembros');
      return;
    }

    if (miembro.id === currentUserId) {
      Alert.alert('No permitido', 'No puedes eliminarte a ti mismo. Si deseas dejar el grupo, pide a otro administrador que te elimine.');
      return;
    }

    // Prevenir eliminar al último admin
    if (miembro.rol === 'admin' && adminsCount === 1) {
      Alert.alert(
        'No permitido',
        'No puedes eliminar al único administrador del grupo. Primero promueve a otro miembro.'
      );
      return;
    }

    Alert.alert(
      'Eliminar miembro',
      `¿Eliminar a ${miembro.nombre} del grupo?\n\nEsta acción no se puede deshacer. El miembro perderá acceso a todos los gastos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMember(miembro.id);
              Alert.alert('✓ Eliminado', `${miembro.nombre} fue eliminado del grupo`);
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'No se pudo eliminar al miembro');
            }
          },
        },
      ]
    );
  };


  const handleEliminarGrupo = () => {
    if (!isAdmin) {
      Alert.alert('Sin permisos', 'Solo los administradores pueden eliminar el grupo');
      return;
    }

    Alert.alert(
      '⚠️ Eliminar grupo',
      'Esta acción es PERMANENTE y no se puede deshacer.\n\n• Se eliminarán todos los gastos\n• Se perderá todo el historial\n• Todos los miembros perderán acceso\n\n¿Estás completamente seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: () => {
            // Segunda confirmación
            Alert.alert(
              '⚠️ Confirmación final',
              `Escribe "${nombre}" para confirmar la eliminación`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Continuar',
                  onPress: () => confirmarEliminacionConTexto(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const confirmarEliminacionConTexto = () => {
    Alert.prompt(
      'Confirmación',
      `Escribe "${nombre}" para confirmar`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async (texto) => {
            if (texto === nombre) {
              try {
                await deleteGroup();
                navigation.navigate('Inicio');
                setTimeout(() => {
                  Alert.alert('Grupo eliminado', 'El grupo fue eliminado permanentemente');
                }, 500);
              } catch (error: any) {
                Alert.alert('Error', error?.response?.data?.error || 'No se pudo eliminar el grupo');
              }
            } else {
              Alert.alert('Error', 'El nombre no coincide');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleCompartirGrupo = async () => {
    try {
      const { createInviteLink } = await import('../api/groups');
      const invite = await createInviteLink(grupoId, 60 * 24 * 7);

      await Share.share({
        message: `¡Unite a mi grupo "${nombre}" en Splitty!\n\n${invite.url || invite.webUrl}`,
        title: `Invitación a ${nombre}`,
      });
    } catch (error) {
      console.error('Error compartiendo grupo', error);
      Alert.alert('Error', 'No se pudo compartir el grupo');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#033E30" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#033E30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración del grupo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Información del grupo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del grupo</Text>

          <View style={styles.card}>
            <View style={styles.cardRow}>
              <TouchableOpacity
                style={styles.emojiCircle}
                onPress={() => isAdmin && setShowEmojiModal(true)}
              >
                <Text style={styles.emojiText}>{selectedEmoji}</Text>
                {isAdmin && (
                  <View style={styles.editEmojiBadge}>
                    <Feather name="edit-2" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{nombre}</Text>
                <Text style={styles.cardSubtitle}>
                  {descripcion || 'Sin descripción'}
                </Text>
                <Text style={styles.cardMeta}>
                  {miembros.length} miembro{miembros.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setShowEditModal(true)}
                  style={styles.editButton}
                >
                  <Feather name="edit-2" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Estadísticas */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Feather name="dollar-sign" size={24} color="#033E30" />
              <Text style={styles.statLabel}>Total gastado</Text>
              <Text style={styles.statValue}>
                ${(grupoInfo?.totalGastado || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Feather name="users" size={24} color="#033E30" />
              <Text style={styles.statLabel}>Miembros</Text>
              <Text style={styles.statValue}>{miembros.length}</Text>
            </View>
          </View>
        </View>

        {/* Miembros (Sin cambios en esta sección) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Miembros del grupo</Text>
            <TouchableOpacity onPress={() => setShowMembersModal(true)}>
              <Text style={styles.sectionLink}>
                Ver todos ({miembros.length})
              </Text>
            </TouchableOpacity>
          </View>

          {miembros.slice(0, 3).map((miembro) => (
            <View key={miembro.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {(miembro.nombre || miembro.correo || '?').charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{miembro.nombre || miembro.correo}</Text>
                  {miembro.rol === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberEmail}>{miembro.correo}</Text>
              </View>

              {miembro.id === currentUserId && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>Tú</Text>
                </View>
              )}
            </View>
          ))}

          {miembros.length > 3 && (
            <TouchableOpacity
              style={styles.verMasButton}
              onPress={() => setShowMembersModal(true)}
            >
              <Text style={styles.verMasText}>
                Ver {miembros.length - 3} miembro{miembros.length - 3 !== 1 ? 's' : ''} más
              </Text>
              <Feather name="chevron-right" size={16} color="#033E30" />
            </TouchableOpacity>
          )}
        </View>

        {/* Configuración */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuración</Text>

          <TouchableOpacity style={styles.settingRow} onPress={handleCompartirGrupo}>
            <View style={styles.settingIcon}>
              <Feather name="share-2" size={20} color="#033E30" />
            </View>
            <Text style={styles.settingText}>Compartir grupo</Text>
            <Feather name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Feather name="bell" size={20} color="#033E30" />
            </View>
            <Text style={styles.settingText}>Notificaciones</Text>
            <Switch
              value={notificaciones}
              onValueChange={setNotificaciones}
              trackColor={{ false: '#e6e6e6', true: '#DFF4EA' }}
              thumbColor={notificaciones ? '#033E30' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Zona de peligro */}
        <View style={styles.section}>
          {/* Solo mostramos la zona de peligro si es admin, porque ya no hay botón de salir para usuarios normales */}
          {isAdmin && (
            <>
              <Text style={[styles.sectionTitle, { color: '#B00020' }]}>Zona de peligro</Text>

              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: '#8B0000', backgroundColor: '#FFF5F5' }]}
                onPress={handleEliminarGrupo}
              >
                <Feather name="trash-2" size={20} color="#8B0000" />
                <Text style={[styles.dangerButtonText, { color: '#8B0000' }]}>
                  Eliminar grupo permanentemente
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal: Editar información */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar grupo</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Nombre del grupo</Text>
            <TextInput
              style={styles.input}
              value={editNombre}
              onChangeText={setEditNombre}
              placeholder="Nombre del grupo"
            />

            <Text style={styles.label}>Descripción (opcional)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={editDescripcion}
              onChangeText={setEditDescripcion}
              placeholder="Descripción del grupo"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleGuardarCambios}
              >
                <Text style={styles.modalButtonTextSave}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Cambiar emoji */}
      <Modal
        visible={showEmojiModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEmojiModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar emoji</Text>
              <TouchableOpacity onPress={() => setShowEmojiModal(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.emojiGrid}>
              {emojis.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[
                    styles.emojiOption,
                    selectedEmoji === em && styles.emojiOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedEmoji(em);
                    setShowEmojiModal(false);
                  }}
                >
                  <Text style={styles.emojiOptionText}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Ver todos los miembros */}
      <Modal
        visible={showMembersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Miembros ({miembros.length})</Text>
              <TouchableOpacity onPress={() => setShowMembersModal(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {miembros.map((miembro) => (
                <View key={miembro.id} style={styles.memberModalCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(miembro.nombre || miembro.correo || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{miembro.nombre || miembro.correo}</Text>
                      {miembro.rol === 'admin' && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>Admin</Text>
                        </View>
                      )}
                      {miembro.id === currentUserId && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>Tú</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberEmail}>{miembro.correo}</Text>
                  </View>

                  {isAdmin && miembro.id !== currentUserId && (
                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        style={styles.memberActionButton}
                        onPress={() => handleCambiarRol(miembro)}
                      >
                        <Feather
                          name={miembro.rol === 'admin' ? 'user-minus' : 'user-plus'}
                          size={18}
                          color="#033E30"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.memberActionButton, { marginLeft: 8 }]}
                        onPress={() => handleEliminarMiembro(miembro)}
                      >
                        <Feather name="trash-2" size={18} color="#B00020" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles no cambian
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F4F1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4F1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6eee9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#033E30',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#033E30',
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 14,
    color: '#033E30',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6eee9',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DFF4EA',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
    },
      emojiText: {
        fontSize: 28,
      },
      editEmojiBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#033E30',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
      },
      cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#033E30',
        marginBottom: 4,
      },
      cardSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
      },
      cardMeta: {
        fontSize: 12,
        color: '#999',
      },
      editButton: {
        padding: 8,
      },
      statsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e6eee9',
        flexDirection: 'row',
      },
      statItem: {
        flex: 1,
        alignItems: 'center',
      },
      statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
        marginBottom: 4,
      },
      statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#033E30',
      },
      statDivider: {
        width: 1,
        backgroundColor: '#e6eee9',
        marginHorizontal: 16,
      },
      memberCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e6eee9',
      },
      memberModalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e6eee9',
      },
      memberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#033E30',
        alignItems: 'center',
        justifyContent: 'center',
      },
      memberAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
      },
      memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      },
      memberName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#033E30',
      },
      memberEmail: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
      },
      adminBadge: {
        backgroundColor: '#DFF4EA',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
      },
      adminBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#033E30',
      },
      youBadge: {
        backgroundColor: '#E6F4F1',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
      },
      youBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#033E30',
      },
      memberActions: {
        flexDirection: 'row',
      },
      memberActionButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f6f9f7',
      },
      verMasButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e6eee9',
        marginTop: 4,
      },
      verMasText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#033E30',
        marginRight: 4,
      },
      settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e6eee9',
      },
      settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f6f9f7',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      },
      settingText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#033E30',
      },
      dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#FFE6E6',
        gap: 8,
      },
      dangerButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#B00020',
      },
      modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
      },
      modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
      },
      modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      },
      modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#033E30',
      },
      label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#033E30',
        marginBottom: 8,
      },
      input: {
        backgroundColor: '#f6f9f7',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e6eee9',
      },
      modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
      },
      modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
      },
      modalButtonCancel: {
        backgroundColor: '#f6f9f7',
        borderWidth: 1,
        borderColor: '#e6eee9',
      },
      modalButtonSave: {
        backgroundColor: '#033E30',
      },
      modalButtonTextCancel: {
        color: '#033E30',
        fontWeight: '600',
        fontSize: 16,
      },
      modalButtonTextSave: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
      },
      emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
      },
      emojiOption: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f6f9f7',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
      },
      emojiOptionSelected: {
        backgroundColor: '#DFF4EA',
        borderColor: '#033E30',
      },
      emojiOptionText: {
        fontSize: 28,
      },
});