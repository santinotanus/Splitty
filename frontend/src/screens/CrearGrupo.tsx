import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
  Platform,
  Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useCrearGrupo } from '../viewmodels/useCrearGrupo';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isMediumDevice = width >= 375 && width < 414;

export default function CrearGrupo({ navigation }: any) {
  const { colors } = useTheme();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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

      // Generar link de invitación
      try {
        if (grupoId) {
          const invite = await createInviteLink(grupoId, 60 * 24 * 30);
          const url = invite?.url || invite?.webUrl || null;
          setInviteUrl(url);

          // Mostrar modal de éxito
          setShowSuccessModal(true);
        }
      } catch (linkErr) {
        console.warn('No se pudo generar link de invitación', linkErr);
        Alert.alert('Grupo creado', 'El grupo fue creado pero no se pudo generar el link de invitación');
        navigation.goBack();
      }
    } catch (e: any) {
      console.error('createGroup error', e);
      Alert.alert('Error', e?.response?.data?.error || e?.message || 'Error al crear grupo');
    }
  };

  const handleShareInvite = async () => {
    if (!inviteUrl) {
      Alert.alert('Sin link', 'No hay link de invitación disponible');
      return;
    }
    try {
      await Share.share({
        message: `¡Unite a mi grupo "${nombre}" en Splitty!\n\n${inviteUrl}`,
        title: `Invitación a ${nombre}`,
      });
    } catch (e) {
      console.warn('share error', e);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) {
      Alert.alert('Sin link', 'No hay link de invitación disponible');
      return;
    }
    try {
      await Clipboard.setStringAsync(inviteUrl);
      Alert.alert('✓ Copiado', 'Link copiado al portapapeles');
    } catch (e) {
      console.warn('clipboard error', e);
      Alert.alert('Error', 'No se pudo copiar el link');
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigation.goBack();
  };

  const responsiveStyles = {
    cardPadding: isSmallDevice ? 12 : isMediumDevice ? 14 : 16,
    titleSize: isSmallDevice ? 20 : isMediumDevice ? 22 : 24,
    subtitleSize: isSmallDevice ? 12 : 13,
    labelSize: isSmallDevice ? 13 : 14,
    inputPadding: isSmallDevice ? 10 : 12,
    buttonPadding: isSmallDevice ? 12 : 14,
    emojiSize: isSmallDevice ? 36 : 40,
    qrSize: isSmallDevice ? 140 : isMediumDevice ? 160 : 180,
    modalWidth: width * (isSmallDevice ? 0.88 : 0.85),
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { padding: responsiveStyles.cardPadding }]}>
        <Text style={[styles.title, { color: colors.text, fontSize: responsiveStyles.titleSize }]}>
          Crear Grupo
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: responsiveStyles.subtitleSize }]}>
          Creá un nuevo grupo para compartir gastos
        </Text>

        <View style={[styles.card, {
          backgroundColor: colors.modalBackground,
          borderColor: colors.borderLight,
          padding: responsiveStyles.cardPadding
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Información del grupo</Text>

          <Text style={[styles.label, { color: colors.text, fontSize: responsiveStyles.labelSize }]}>
            Nombre del grupo *
          </Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.cardBackground,
              borderColor: colors.borderLight,
              color: colors.text,
              padding: responsiveStyles.inputPadding
            }]}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: Viaje a Brasil 2026"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { color: colors.text, fontSize: responsiveStyles.labelSize }]}>
            Descripción (opcional)
          </Text>
          <TextInput
            style={[styles.input, {
              height: isSmallDevice ? 80 : 100,
              backgroundColor: colors.cardBackground,
              borderColor: colors.borderLight,
              color: colors.text,
              padding: responsiveStyles.inputPadding
            }]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Describe brevemente el propósito del grupo"
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <Text style={[styles.label, { color: colors.text, fontSize: responsiveStyles.labelSize }]}>
            Emoji del grupo
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiRow}
          >
            {['✈️','🍖','🚗','🏖️','🎉','💼','🏠','🍹','🎂','🏕️','🚴‍♂️'].map((em) => (
              <TouchableOpacity
                key={em}
                style={[
                  styles.emojiButton,
                  {
                    backgroundColor: colors.cardBackground,
                    width: responsiveStyles.emojiSize + 16,
                    height: responsiveStyles.emojiSize + 16,
                  },
                  emoji === em && { backgroundColor: colors.emojiCircle }
                ]}
                onPress={() => setEmoji(em)}
              >
                <Text style={{ fontSize: isSmallDevice ? 18 : 20 }}>{em}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.button, {
            backgroundColor: colors.primary,
            padding: responsiveStyles.buttonPadding
          }, loading && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Crear Grupo</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary }}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de éxito */}
      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            {
              backgroundColor: colors.modalBackground,
              width: responsiveStyles.modalWidth,
              maxHeight: height * 0.85,
            }
          ]}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
                <View style={[styles.successIcon, { backgroundColor: colors.successLight }]}>
                  <Text style={{ fontSize: isSmallDevice ? 32 : 40 }}>✓</Text>
                </View>
                <Text style={[styles.modalTitle, {
                  color: colors.text,
                  fontSize: isSmallDevice ? 20 : 24
                }]}>
                  ¡Grupo creado!
                </Text>
                <Text style={[styles.modalSubtitle, {
                  color: colors.textSecondary,
                  fontSize: responsiveStyles.subtitleSize
                }]}>
                  {nombre}
                </Text>
              </View>

              {/* QR Code */}
              <View style={styles.qrSection}>
                <Text style={[styles.sectionLabel, {
                  color: colors.text,
                  fontSize: responsiveStyles.labelSize
                }]}>
                  Código QR
                </Text>
                <View style={[styles.qrContainer, {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.borderLight
                }]}>
                  {inviteUrl ? (
                    <QRCode
                      value={inviteUrl}
                      size={responsiveStyles.qrSize}
                      backgroundColor="transparent"
                      color={colors.text}
                    />
                  ) : (
                    <ActivityIndicator size="large" color={colors.primary} />
                  )}
                </View>
                <Text style={[styles.qrHelp, {
                  color: colors.textMuted,
                  fontSize: isSmallDevice ? 11 : 12
                }]}>
                  Compartí este código para invitar miembros
                </Text>
              </View>

              {/* Link */}
              <View style={styles.linkSection}>
                <Text style={[styles.sectionLabel, {
                  color: colors.text,
                  fontSize: responsiveStyles.labelSize
                }]}>
                  Link de invitación
                </Text>
                <View style={[styles.linkBox, {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.borderLight
                }]}>
                  <Text
                    numberOfLines={2}
                    style={[styles.linkText, {
                      color: colors.textSecondary,
                      fontSize: isSmallDevice ? 11 : 12
                    }]}
                  >
                    {inviteUrl || 'Generando...'}
                  </Text>
                </View>

                {/* Botones de acción */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.borderLight,
                      padding: responsiveStyles.inputPadding
                    }]}
                    onPress={handleCopyInvite}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>
                      📋 Copiar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.borderLight,
                      padding: responsiveStyles.inputPadding
                    }]}
                    onPress={handleShareInvite}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>
                      🔗 Compartir
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botón cerrar */}
              <TouchableOpacity
                style={[styles.closeButton, {
                  backgroundColor: colors.primary,
                  padding: responsiveStyles.buttonPadding,
                  marginTop: isSmallDevice ? 16 : 24
                }]}
                onPress={handleCloseModal}
              >
                <Text style={[styles.closeButtonText, { color: colors.primaryText }]}>
                  Ir a mi grupo
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600'
  },
  input: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
    fontSize: 16,
  },
  emojiRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    gap: 8,
  },
  emojiButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 20,
    maxWidth: 500,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalScrollContent: {
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: 12,
    fontSize: 14,
  },
  qrContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  qrHelp: {
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  linkSection: {
    marginBottom: 8,
  },
  linkBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  linkText: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});