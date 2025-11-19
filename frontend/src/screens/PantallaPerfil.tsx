import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useNetwork } from '../contexts/NetworkContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../config/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { updateUser, getCurrentUser, checkClaveAvailable } from '../api/client';

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.modalBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
    backgroundColor: colors.background,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: colors.modalBackground,
    borderWidth: 3,
    borderColor: colors.modalBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  changePhotoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.modalBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.emojiCircle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  editButton: {
    padding: 8,
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.modalBackground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.modalBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    color: colors.text,
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
    backgroundColor: colors.emojiCircle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonTextSave: {
    color: colors.primaryText,
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 16,
    gap: 8,
  },
  logoutButtonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalHeader: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  imageModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});

export default function PantallaPerfil({ navigation }: any) {
  const { user, logout } = useAuth();
  const { profileImage, setProfileImage, uploadProfileImage, loadProfileImage, loading: profileLoading } = useProfile();
  const { colors } = useTheme();
  const { isConnected, isInternetReachable } = useNetwork();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [clavePago, setClavePago] = useState('');

  // Modal states
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showClaveModal, setShowClaveModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newClave, setNewClave] = useState('');

  // Load user data
  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      // Load from backend
      const backendUser = await getCurrentUser();
      setNombre(backendUser?.nombre || user.displayName || '');
      setClavePago(backendUser?.clave_pago || '');
      setEmail(user.email || '');

      // Load profile image from ProfileContext (Firestore + cache)
      await loadProfileImage(user.uid);
    } catch (error) {
      console.error('Error loading user data:', error);
      setNombre(user.displayName || '');
      setEmail(user.email || '');
      // Profile image will use default from ProfileContext
    }
  };

  const handleEditClave = () => {
    setNewClave(clavePago);
    setShowClaveModal(true);
  };

  const handleSaveClave = async () => {
    if (!newClave.trim()) {
      Alert.alert('Error', 'El Alias/CVU no puede estar vacío');
      return;
    }
    if (newClave.trim().length > 50) {
      Alert.alert('Error', 'El Alias/CVU no puede tener más de 50 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Check availability first
      try {
        const { available } = await checkClaveAvailable(newClave.trim());
        if (!available) {
          Alert.alert('Error', 'El Alias/CVU ya está en uso por otro usuario');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('No se pudo verificar disponibilidad del alias:', err);
        // let the server handle uniqueness
      }

      await updateUser({ clave_pago: newClave.trim() });
      setClavePago(newClave.trim());
      setShowClaveModal(false);
      Alert.alert('Éxito', 'Alias/CVU actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating clave_pago:', error);
      if (error.response?.status === 409) {
        Alert.alert('Error', 'El Alias/CVU ya está en uso por otro usuario');
      } else {
        Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el Alias/CVU');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto');
        return;
      }

      // Abrir selector de imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Reducir un poco la calidad para que sea más liviano
        base64: true, // ✅ Pedir base64
      });

      if (!result.canceled && result.assets[0] && user?.uid) {
        const asset = result.assets[0];

        console.log('📷 Image selected:', {
          uri: asset.uri?.substring(0, 50) + '...',
          hasBase64: !!asset.base64,
          base64Length: asset.base64?.length || 0
        });

        // ✅ Actualizar UI inmediatamente con la imagen local
        setProfileImage(asset.uri);

        // 🔥 FIX: Verificar que tenemos el base64
        if (!asset.base64) {
          console.error('❌ No base64 data from ImagePicker');
          Alert.alert('Error', 'No se pudo leer la imagen');
          return;
        }

        // 🔥 FIX: Pasar el base64 completo (con el prefijo data:image)
        const mimeType = asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        const base64WithPrefix = `data:${mimeType};base64,${asset.base64}`;

        console.log('📤 Uploading with base64, length:', base64WithPrefix.length);

        // Subir la imagen (pasa el base64, NO el uri)
        try {
          await uploadProfileImage(base64WithPrefix, user.uid);
          Alert.alert('✅ Listo', 'Foto de perfil actualizada');
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          Alert.alert('Error', 'No se pudo subir la foto: ' + (uploadError?.message || 'Error desconocido'));
          // Revertir la UI a la imagen anterior
          loadProfileImage(user.uid);
        }
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleEditName = () => {
    setNewName(nombre);
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    setLoading(true);
    try {
      await updateUser({ nombre: newName.trim() });
      setNombre(newName.trim());
      setShowNameModal(false);
      Alert.alert('Éxito', 'Nombre actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating name:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el nombre');
    } finally {
      setLoading(false);
    }
  };


  const handleEditPassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Usuario no autenticado');
      }

      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setShowPasswordModal(false);
      Alert.alert('Éxito', 'Contraseña actualizada correctamente');
    } catch (error: any) {
      console.error('Error updating password:', error);
      let errorMessage = 'No se pudo actualizar la contraseña';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'La contraseña actual es incorrecta';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar sesión');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.iconColor} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <TouchableOpacity 
            style={styles.photoContainer}
            onPress={() => setShowImageModal(true)}
            disabled={profileLoading}
            activeOpacity={0.8}
          >
            {profileLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profilePhoto}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="user" size={36} color={colors.text} />
                </View>
              )
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleChangePhoto}
            style={styles.changePhotoButton}
            disabled={profileLoading}
          >
            <Feather name="edit-2" size={14} color={colors.primary} />
            <Text style={styles.changePhotoText}>Cambiar foto</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Information Section */}
        <Text style={styles.sectionTitle}>Información personal</Text>

        {/* Full Name Card */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Feather name="user" size={20} color={colors.iconColor} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Nombre completo</Text>
            <Text style={styles.cardValue}>{nombre}</Text>
          </View>
          <TouchableOpacity onPress={handleEditName} style={styles.editButton}>
            <Feather name="edit-2" size={18} color={colors.iconColor} />
          </TouchableOpacity>
        </View>

        {/* Email Card */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Feather name="mail" size={20} color={colors.iconColor} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Correo electrónico</Text>
            <Text style={styles.cardValue}>{email}</Text>
          </View>
        </View>

        {/* Alias / CVU Card */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Feather name="hash" size={20} color={colors.iconColor} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Alias / CVU</Text>
            <Text style={styles.cardValue}>{clavePago || 'No establecido'}</Text>
          </View>
          <TouchableOpacity onPress={handleEditClave} style={styles.editButton}>
            <Feather name="edit-2" size={18} color={colors.iconColor} />
          </TouchableOpacity>
        </View>

        {/* Password Card */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Feather name="lock" size={20} color={colors.iconColor} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Contraseña</Text>
            <Text style={styles.cardValue}>••••••••</Text>
          </View>
          <TouchableOpacity onPress={handleEditPassword} style={styles.editButton}>
            <Feather name="edit-2" size={18} color={colors.iconColor} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={20} color={colors.primaryText} />
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal
        visible={showNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNameModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar nombre completo</Text>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nombre completo"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveName}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar contraseña</Text>
            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Contraseña actual"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nueva contraseña"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmar nueva contraseña"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSavePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Alias/CVU Modal */}
      <Modal
        visible={showClaveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClaveModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Alias / CVU</Text>
            <TextInput
              style={styles.modalInput}
              value={newClave}
              onChangeText={setNewClave}
              placeholder="Alias o CVU"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowClaveModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveClave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={showImageModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowImageModal(false)}
      >
        <TouchableOpacity 
          style={styles.imageModalOverlay}
          activeOpacity={1}
          onPress={() => setShowImageModal(false)}
        >
          <View style={styles.imageModalHeader}>
            <TouchableOpacity 
              onPress={() => setShowImageModal(false)}
              style={styles.imageModalCloseButton}
            >
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.imageModalContent}
          >
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.fullImage, { alignItems: 'center', justifyContent: 'center' }]}>
                <Feather name="user" size={80} color={colors.textMuted} />
                <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Sin foto de perfil</Text>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
